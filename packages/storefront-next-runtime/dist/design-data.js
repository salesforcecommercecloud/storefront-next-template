//#region src/design/data/errors/visitor-context-error.ts
var VisitorContextError = class VisitorContextError extends Error {
	constructor(message) {
		super(message);
		this.name = "VisitorContextError";
	}
	static assert(parentType, childType) {
		if (parentType === "component" && childType !== "region" || parentType === "page" && childType !== "region" || parentType === "region" && childType !== "component") throw new VisitorContextError(`Invalid child context type ${childType} for parent context type ${parentType}`);
	}
};

//#endregion
//#region src/design/data/page/transform.ts
/**
* Context object passed to {@link PageVisitor} handler methods during page tree
* traversal. Provides access to the current node via {@link node}, the tree
* position via {@link page}, {@link parentRegion}, and {@link parentComponent},
* and traversal methods ({@link visitRegions}, {@link visitComponents}) for
* continuing into child nodes.
*
* When a visitor handler is defined, the handler is responsible for traversing
* into children by calling the appropriate context method. If the handler does
* not call these methods, children will not be visited.
*/
var VisitorContext = class VisitorContext {
	constructor(context) {
		this.context = context;
	}
	get type() {
		return this.context.type;
	}
	/**
	* The current node being visited.
	*/
	get node() {
		return this.context.node;
	}
	/**
	* The root page being traversed.
	*/
	get page() {
		return this.context.page;
	}
	/**
	* The parent region of the current node, if traversing within a region.
	*/
	get parentRegion() {
		return this.context.parentRegion;
	}
	/**
	* The parent component of the current node, if traversing within a component's nested regions.
	*/
	get parentComponent() {
		return this.context.parentComponent;
	}
	/**
	* Traverses an array of regions, invoking the visitor's `visitRegion` handler
	* on each one. Regions for which the handler returns `null` are excluded from
	* the result. Call this from within a `visitPage` or `visitComponent` handler
	* to continue traversal into child regions.
	*
	* @param regions - The regions to traverse.
	* @returns The filtered array of transformed regions.
	*
	* @example
	* ```ts
	* transformPage(page, {
	*     visitPage(context) {
	*         // Traverse into regions explicitly
	*         const regions = context.visitRegions(context.node.regions);
	*         return { ...context.node, regions };
	*     },
	* });
	* ```
	*/
	visitRegions(regions = []) {
		const newRegions = [];
		for (const region of regions) {
			const newRegion = this.visitRegion(region);
			if (newRegion) newRegions.push(newRegion);
		}
		return newRegions;
	}
	/**
	* Traverses a single region. If the visitor has a `visitRegion` handler, the
	* handler is called with a new {@link VisitorContext} for the region. Otherwise,
	* the region's child components are traversed automatically.
	*
	* @param region - The region to visit.
	* @returns The transformed region, or `null` to exclude it.
	*/
	visitRegion(region) {
		const regionContext = this.toChildContext("region", region);
		if (this.context.visitor.visitRegion) return this.context.visitor.visitRegion(regionContext);
		else if (region.components) return {
			...region,
			components: regionContext.visitComponents(region.components)
		};
		return region;
	}
	/**
	* Traverses an array of components, invoking the visitor's `visitComponent`
	* handler on each one. Components for which the handler returns `null` are
	* excluded from the result. Call this from within a `visitRegion` handler to
	* continue traversal into child components.
	*
	* @param components - The components to traverse.
	* @returns The filtered array of transformed components.
	*
	* @example
	* ```ts
	* transformPage(page, {
	*     visitRegion(context) {
	*         // Traverse into components explicitly
	*         const components = context.visitComponents(context.node.components);
	*         return { ...context.node, components };
	*     },
	* });
	* ```
	*/
	visitComponents(components = []) {
		const newComponents = [];
		for (const component of components) {
			const newComponent = this.visitComponent(component);
			if (newComponent) newComponents.push(newComponent);
		}
		return newComponents;
	}
	/**
	* Traverses a single component. If the visitor has a `visitComponent` handler,
	* the handler is called with a new {@link VisitorContext} for the component.
	* Otherwise, the component's nested regions are traversed automatically.
	*
	* @param component - The component to visit.
	* @returns The transformed component, or `null` to exclude it.
	*/
	visitComponent(component) {
		const componentContext = this.toChildContext("component", component);
		if (this.context.visitor.visitComponent) return this.context.visitor.visitComponent(componentContext);
		else if (component.regions) return {
			...component,
			regions: componentContext.visitRegions(component.regions)
		};
		return component;
	}
	/**
	* Traverses a single page. If the visitor has a `visitPage` handler, the
	* handler is called with a new {@link VisitorContext} for the page. Otherwise,
	* the page's regions are traversed automatically.
	*
	* @param page - The page to visit.
	* @returns The transformed page, or `null` to exclude it.
	*/
	visitPage(page) {
		const pageContext = new VisitorContext({
			type: "page",
			visitor: this.context.visitor,
			page,
			parentComponent: void 0,
			parentRegion: void 0,
			node: page
		});
		if (this.context.visitor.visitPage) return this.context.visitor.visitPage(pageContext);
		else if (page.regions) return {
			...page,
			regions: pageContext.visitRegions(page.regions)
		};
		return page;
	}
	toChildContext(type, node) {
		VisitorContextError.assert(this.context.type, type);
		if (type === "region") return new VisitorContext({
			type: "region",
			visitor: this.context.visitor,
			page: this.page,
			node,
			parentComponent: this.node,
			parentRegion: this.parentRegion
		});
		return new VisitorContext({
			type: "component",
			visitor: this.context.visitor,
			page: this.page,
			node,
			parentComponent: this.parentComponent,
			parentRegion: this.node
		});
	}
};
var RootVisitorContext = class extends VisitorContext {
	constructor(visitor) {
		super({
			node: null,
			type: "root",
			visitor
		});
	}
};
/**
* Traverses a page tree using the visitor pattern, applying the visitor's
* callbacks to the page, its regions, and their nested components. This is
* the top-level entry point for page tree transformation.
*
* When a visitor handler is defined, it receives a {@link VisitorContext} and
* is responsible for traversing into children using the context's traversal
* methods (`visitRegions`, `visitComponents`). If the handler does not call
* these methods, children will not be visited. When no handler is defined for
* a node type, children are traversed automatically.
*
* Returning `null` from a `visitRegion` or `visitComponent` callback removes
* that element and its children from the resulting tree.
*
* @param page - The page to traverse.
* @param visitor - The visitor with callbacks to apply at each tree node.
* @returns A new page with visitor transformations applied, or `null`.
*
* @example
* ```ts
* import { transformPage } from '@salesforce/storefront-next-runtime/design/data';
*
* const page = { id: 'homepage', typeId: 'storePage', regions: [
*     { id: 'header', components: [
*         { id: 'hero-banner', typeId: 'commerce_assets.heroBanner', regions: [] },
*         { id: 'promo-tile', typeId: 'commerce_assets.promoTile', regions: [] },
*     ]},
* ]};
*
* // When only visitComponent is defined, regions are traversed automatically.
* // The handler receives a VisitorContext — use context.node to access the component.
* transformPage(page, {
*     visitComponent(context) {
*         console.log(`Component: ${context.node.typeId} in region ${context.parentRegion?.id}`);
*         return context.node;
*     },
* });
*
* // When visitRegion is defined, the handler must traverse into children explicitly.
* // Without calling context.visitComponents(), components inside the region are skipped.
* transformPage(page, {
*     visitRegion(context) {
*         console.log(`Entering region: ${context.node.id}`);
*         const components = context.visitComponents(context.node.components);
*         return { ...context.node, components };
*     },
*     visitComponent(context) {
*         console.log(`  Component: ${context.node.typeId}`);
*         return context.node;
*     },
* });
* ```
*/
function transformPage(page, visitor) {
	return new RootVisitorContext(visitor).visitPage(page);
}
/**
* Applies the visitor to a single component. If the visitor's `visitComponent`
* handler is defined, it receives a {@link VisitorContext} and is responsible
* for traversing into the component's nested regions using `context.visitRegions()`.
* If no `visitComponent` handler is defined, nested regions are traversed
* automatically. Returns `null` to exclude the component from the result.
*
* @param component - The component to transform.
* @param visitor - The visitor with callbacks.
* @returns The transformed component, or `null` to exclude it.
*
* @example
* ```ts
* import { transformComponent } from '@salesforce/storefront-next-runtime/design/data';
*
* // Replace the image URL in a hero banner component and traverse its nested regions
* const heroBanner = {
*     id: 'hero-1',
*     typeId: 'commerce_assets.heroBanner',
*     data: { imageUrl: '/images/summer-sale.jpg' },
*     regions: [{ id: 'banner-content', components: [] }],
* };
*
* const result = transformComponent(heroBanner, {
*     visitComponent(context) {
*         // Traverse into nested regions using the context API
*         const regions = context.visitRegions(context.node.regions);
*
*         if (context.node.typeId === 'commerce_assets.heroBanner') {
*             return { ...context.node, regions, data: { ...context.node.data, imageUrl: '/images/winter-sale.jpg' } };
*         }
*         return { ...context.node, regions };
*     },
* });
* ```
*/
function transformComponent(component, visitor) {
	return new RootVisitorContext(visitor).visitComponent(component);
}
/**
* Applies the visitor to a single region. If the visitor's `visitRegion`
* handler is defined, it receives a {@link VisitorContext} and is responsible
* for traversing into the region's child components using `context.visitComponents()`.
* If no `visitRegion` handler is defined, child components are traversed
* automatically. Returns `null` to exclude the region and all its children
* from the result.
*
* @param region - The region to transform.
* @param visitor - The visitor with callbacks.
* @returns The transformed region, or `null` to exclude it.
*
* @example
* ```ts
* import { transformRegion } from '@salesforce/storefront-next-runtime/design/data';
*
* // Filter empty regions and traverse into non-empty ones
* const emptyRegion = { id: 'sidebar', components: [] };
* const populatedRegion = { id: 'main', components: [
*     { id: 'product-grid', typeId: 'commerce_assets.productGrid', regions: [] },
* ]};
*
* const visitor = {
*     visitRegion(context) {
*         if (!context.node.components?.length) {
*             return null; // Remove empty regions
*         }
*         // Traverse into child components using the context API
*         const components = context.visitComponents(context.node.components);
*         return { ...context.node, components };
*     },
* };
*
* transformRegion(emptyRegion, visitor);      // => null (removed)
* transformRegion(populatedRegion, visitor);   // => { id: 'main', components: [...] }
* ```
*/
function transformRegion(region, visitor) {
	return new RootVisitorContext(visitor).visitRegion(region);
}

//#endregion
//#region src/design/data/page/resolve-data-bindings.ts
/**
* Pattern matching bare expressions: `type.field`.
*/
const BARE_EXPRESSION_PATTERN = /^(\w+)\.(\w+)$/;
/**
* Parses a binding expression string into its provider type and field name.
* Supports the bare `type.field` format.
*
* @param expression - The expression string to parse.
* @returns The parsed type and field, or `null` if the expression is invalid.
*
* @example
* ```ts
* parseExpression('content_asset.title');  // { type: 'content_asset', field: 'title' }
* parseExpression('invalid');              // null
* ```
*/
function parseExpression(expression) {
	const match = expression.trim().match(BARE_EXPRESSION_PATTERN);
	if (match) return {
		type: match[1],
		field: match[2]
	};
	return null;
}
/**
* Resolves a single binding expression against the component's data contexts
* and the resolved data bindings from context resolution.
*
* Returns the resolved field value, or an empty string if the expression is
* invalid, the matching context or record is not found, or the field does not
* exist on the resolved record.
*
* @param expression - The expression string (e.g. `"content_asset.body"`).
* @param contexts - The component's data binding contexts.
* @param dataBindings - The resolved data bindings from {@link QualifierContext}.
* @returns The resolved value, or `''` if resolution fails.
*/
function resolveExpression(expression, contexts, dataBindings) {
	const parsed = parseExpression(expression);
	if (!parsed) return "";
	const context = contexts.find((c) => c.type === parsed.type);
	if (!context) return "";
	const record = dataBindings[context.type]?.[context.id];
	if (!record) return "";
	return record[parsed.field] ?? "";
}
/**
* Resolves data binding expressions for a single component. Replaces attribute
* values in the component's `data` with the resolved values from context
* resolution. Attributes without a matching expression are preserved as-is.
* When an expression cannot be resolved, the attribute value is set to an
* empty string.
*
* Returns the component unchanged if it has no data binding metadata or if
* `dataBindings` is `undefined`.
*
* @param component - The component to resolve data bindings for.
* @param binding - The component's data binding metadata from the page manifest's `componentInfo`, or `null`/`undefined` if not bound.
* @param dataBindings - The resolved data bindings from {@link QualifierContext}, or `undefined` if no bindings were resolved.
* @returns The component with resolved attribute values, or the original component if no bindings apply.
*
* @example
* ```ts
* import { resolveComponentDataBindings } from '@salesforce/storefront-next-runtime/design/data';
*
* const component = {
*     id: 'banner',
*     typeId: 'commerce_assets.contentBanner',
*     data: { heading: 'Fallback Title', body: 'Fallback Body' },
*     regions: [],
* };
*
* const binding = {
*     expressions: {
*         heading: 'content_asset.title',
*         body: 'content_asset.body',
*     },
*     contexts: [{ type: 'content_asset', id: 'winter-sale-uuid' }],
* };
*
* const dataBindings = {
*     content_asset: {
*         'winter-sale-uuid': {
*             title: 'Winter Sale',
*             body: '<div>Free Shipping on all orders!</div>',
*         },
*     },
* };
*
* const resolved = resolveComponentDataBindings(component, binding, dataBindings);
* // resolved.data.heading === 'Winter Sale'
* // resolved.data.body === '<div>Free Shipping on all orders!</div>'
* ```
*/
function resolveComponentDataBindings(component, binding, dataBindings) {
	if (!dataBindings) return component;
	if (!binding?.contexts?.length) return component;
	const expressionEntries = Object.entries(binding.expressions ?? {});
	if (expressionEntries.length === 0) return component;
	const resolvedData = { ...component.data };
	for (const [attrName, expression] of expressionEntries) resolvedData[attrName] = resolveExpression(expression, binding.contexts, dataBindings);
	return {
		...component,
		data: resolvedData
	};
}

//#endregion
//#region src/design/data/validate-rule.ts
/**
* Evaluates a visibility rule against a shopper's qualifier context.
*
* Campaign-based and non-campaign rules are **mutually exclusive** paths,
* matching the server's `VisibilityDefinition.isVisible()` logic:
*
* - **Campaign-based rule** (has `campaignQualifiers`): only the campaign
*   qualifiers are checked. Schedule, locale, and customer-group fields are
*   ignored because the campaign qualification already incorporates those
*   checks server-side.
* - **Non-campaign rule**: locale, schedule, AND customer groups are checked.
*   All specified conditions must pass.
*
* When no context is provided and the rule requires campaign or customer group
* checks, those checks will fail (returning `false`). Schedule checks do not
* require context and are evaluated against `Date.now()`.
*
* @param rule - The visibility rule to evaluate.
* @param locale - The current locale (e.g. `"en_US"`). Used to check whether the rule applies to this locale.
* @param context - The shopper's active qualifiers, or `null`/`undefined` if not yet resolved.
* @returns `true` if the rule's conditions pass, `false` otherwise.
*
* @example
* ```ts
* import { validateRule } from '@salesforce/storefront-next-runtime/design/data';
*
* // Campaign-based rule — only campaign qualifiers are evaluated
* const campaignRule = {
*     activeLocales: ['en_US'],
*     campaignQualifiers: [{ campaignId: 'holiday-sale-2026', promotionId: 'free-shipping' }],
* };
*
* // Non-campaign rule — locale, schedule AND customer groups are evaluated
* const segmentRule = {
*     activeLocales: ['en_US', 'fr_FR'],
*     customerGroups: ['vip-customers'],
*     schedule: {
*         start: new Date('2026-12-01').toISOString(),
*         end: new Date('2026-12-31').toISOString(),
*     },
* };
* ```
*/
function validateRule(rule, locale, context) {
	if (rule.campaignQualifiers) {
		for (const campaignQualifier of rule.campaignQualifiers) if (!context?.campaignQualifiers[campaignQualifier.campaignId]?.[campaignQualifier.promotionId]) return false;
	} else {
		if (rule.activeLocales && !rule.activeLocales.includes(locale)) return false;
		if (rule.schedule) {
			const now = Date.now();
			if (rule.schedule.start) {
				const startTimeInMillis = new Date(rule.schedule.start).getTime();
				if (Number.isNaN(startTimeInMillis) || startTimeInMillis >= now) return false;
			}
			if (rule.schedule.end) {
				const endTimeInMillis = new Date(rule.schedule.end).getTime();
				if (Number.isNaN(endTimeInMillis) || endTimeInMillis <= now) return false;
			}
		}
		if (rule.customerGroups) {
			for (const customerGroup of rule.customerGroups) if (!context?.customerGroups[customerGroup]) return false;
		}
	}
	return true;
}

//#endregion
//#region src/design/data/page/process-page.ts
/**
* Filters a page's components based on their visibility rules and resolves
* data binding expressions in a single traversal. Traverses the page tree
* using the visitor pattern and:
*
* 1. Removes any component whose visibility rules do not pass against the
*    shopper's qualifier context.
* 2. Resolves data binding expressions in each surviving component's `data`
*    attributes using the resolved data bindings from context resolution.
*
* A component is visible if **any** of its visibility rules pass (OR logic).
* If a component has rules and none of them pass, it is removed. Components
* without rules are always included.
*
* @param page - The page to process.
* @param context - The processing context with qualifier data, visibility rules, and resolved data bindings.
* @returns A new page with invisible components filtered out and data binding expressions resolved.
*
* @example
* ```ts
* import { processPage } from '@salesforce/storefront-next-runtime/design/data';
*
* const page = {
*     id: 'homepage',
*     typeId: 'storePage',
*     regions: [{
*         id: 'main',
*         components: [
*             { id: 'public-banner', typeId: 'commerce_assets.heroBanner', regions: [] },
*             { id: 'loyalty-offer', typeId: 'commerce_assets.promoTile', regions: [] },
*         ],
*     }],
* };
*
* // The "loyalty-offer" component requires the shopper to be in "loyalty-members"
* const componentInfo = {
*     'public-banner': { visibilityRules: [] },
*     'loyalty-offer': {
*         visibilityRules: [{ customerGroups: ['loyalty-members'] }],
*     },
* };
*
* // Guest shopper — not in any customer group
* const filtered = processPage(page, {
*     qualifiers: { customerGroups: {}, campaignQualifiers: {} },
*     componentInfo,
* });
* // filtered.regions[0].components has only "public-banner"
* // "loyalty-offer" was removed because the shopper isn't a loyalty member
* ```
*/
function processPage(page, processorContext) {
	return transformPage(page, {
		visitRegion(ctx) {
			const regionInfo = processorContext.regionInfo[ctx.node.id];
			const pruneInvisible = processorContext.pruneInvisible ?? true;
			let components = ctx.visitComponents(ctx.node.components);
			if (regionInfo?.maxComponents != null) if (pruneInvisible) components = components.slice(0, regionInfo.maxComponents);
			else {
				const result = [];
				let visibleCount = 0;
				for (const comp of components) {
					if (comp.visible) visibleCount++;
					if (visibleCount > regionInfo.maxComponents) result.push({
						...comp,
						visible: false
					});
					else result.push(comp);
				}
				components = result;
			}
			return {
				...ctx.node,
				components
			};
		},
		visitComponent(ctx) {
			const componentInfo = processorContext.componentInfo[ctx.node.id];
			const visibilityRules = componentInfo?.visibilityRules ?? [];
			const pruneInvisible = processorContext.pruneInvisible ?? true;
			let isVisible = true;
			if (visibilityRules.length > 0) {
				if (!visibilityRules.some((rule) => validateRule(rule, processorContext.locale, processorContext.qualifiers))) {
					if (pruneInvisible) return null;
					isVisible = false;
				}
			}
			const defaultContent = componentInfo?.content?.default ?? {};
			const localeContent = componentInfo?.content?.[processorContext.locale] ?? {};
			const content = {
				...defaultContent,
				...localeContent
			};
			const isLocalized = Boolean(componentInfo?.content?.[processorContext.locale]);
			let node = {
				...ctx.node,
				localized: isLocalized,
				visible: isVisible,
				data: {
					...ctx.node.data,
					...content
				}
			};
			node = resolveComponentDataBindings(node, componentInfo?.dataBinding, processorContext.qualifiers?.dataBindings);
			return {
				...node,
				regions: ctx.visitRegions(ctx.node.regions)
			};
		}
	});
}

//#endregion
//#region src/design/data/errors/required.ts
/**
* Copyright 2026 Salesforce, Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
var RequiredError = class RequiredError extends Error {
	constructor(message) {
		super(message);
		this.name = "RequiredError";
	}
	static assert(value, message, isEmpty = (v) => v == null) {
		if (isEmpty(value)) throw new RequiredError(message);
	}
};

//#endregion
//#region src/design/data/manifest/content-assignment-resolvers.ts
/**
* Registry of content assignment resolvers keyed by {@link IdentifierType}.
* Each resolver knows how to convert its identifier type into a set of lookup
* keys for the site manifest.
*
* Built-in resolvers:
* - **`'product'`** — Maps a product ID to a single PDP lookup key.
* - **`'category'`** — Maps a category ID to an ordered list of keys that
*   traverses the category hierarchy from child to root, enabling inherited
*   page assignments.
*
* The `'page'` identifier type has no resolver — page IDs are used directly.
*
* @example
* ```ts
* import { ContentAssignmentResolvers } from '@salesforce/storefront-next-runtime/design/data';
*
* // Resolve a product identifier for PDP lookup
* const productResolver = ContentAssignmentResolvers.get('product');
* productResolver('nike-air-max-90');
* // => { objectType: 'product', aspectType: 'pdp', keys: ['nike-air-max-90'] }
*
* // Resolve a category identifier — traverses hierarchy to find inherited assignments
* const categoryResolver = ContentAssignmentResolvers.get('category');
* const siteManifest = {
*     categories: {
*         'mens-running-shoes': { name: 'Running Shoes', parentCategory: 'mens-shoes' },
*         'mens-shoes': { name: "Men's Shoes", parentCategory: 'mens' },
*         'mens': { name: 'Men' },
*     },
*     contentObjectAssignments: {},
* };
* categoryResolver('mens-running-shoes', siteManifest);
* // => { objectType: 'category', aspectType: 'plp', keys: ['mens-running-shoes', 'mens-shoes', 'mens'] }
* ```
*/
const ContentAssignmentResolvers = new Map([["product", (key) => ({
	objectType: "product",
	keys: [key]
})], ["category", (key, manifest) => {
	const keys = [];
	const visited = /* @__PURE__ */ new Set();
	let currentCategoryId = key;
	while (currentCategoryId && !visited.has(currentCategoryId)) {
		visited.add(currentCategoryId);
		keys.push(currentCategoryId);
		currentCategoryId = manifest?.categories[currentCategoryId]?.parentCategory;
	}
	return {
		objectType: "category",
		keys
	};
}]]);

//#endregion
//#region src/design/data/manifest/resolve-dynamic-page-id.ts
/**
* Converts a product or category identifier into a page ID by looking up
* content assignments in the site manifest. For categories, the lookup
* traverses the category hierarchy from the given category up to the root,
* returning the first matching assignment.
*
* Returns `null` if no content assignment is found for the identifier or if
* the identifier type has no registered resolver.
*
* @param options - The resolution options.
* @param options.id - The identifier to resolve (product ID, category ID, or page ID).
* @param options.identifierType - The type of identifier: `'product'`, `'category'`, or `'page'`.
* @param options.siteManifest - The site manifest containing content assignments and category hierarchy.
* @returns The resolved page ID, or `null` if no assignment was found.
*
* @example
* ```ts
* import { resolveDynamicPageId } from '@salesforce/storefront-next-runtime/design/data';
*
* const siteManifest = {
*     contentObjectAssignments: {
*         plp: {
*             category: {
*                 'mens-shoes': {
*                     lookupMode: 'category-explicit',
*                     contentId: 'page-mens-shoes-plp',
*                 },
*             },
*         },
*     },
*     categories: {
*         'mens-running-shoes': { name: 'Running Shoes', parentCategory: 'mens-shoes' },
*         'mens-shoes': { name: "Men's Shoes" },
*     },
* };
*
* // Direct match
* resolveDynamicPageId({ id: 'mens-shoes', identifierType: 'category', siteManifest });
* // => 'page-mens-shoes-plp'
*
* // Inherited from parent category
* resolveDynamicPageId({ id: 'mens-running-shoes', identifierType: 'category', siteManifest });
* // => 'page-mens-shoes-plp' (found via parent traversal)
*
* // No assignment found
* resolveDynamicPageId({ id: 'womens-shoes', identifierType: 'category', siteManifest });
* // => null
* ```
*/
function resolveDynamicPageId({ id, identifierType, siteManifest, aspectType }) {
	const resolvedContentAssignmentLookup = ContentAssignmentResolvers.get(identifierType)?.(id, siteManifest);
	if (resolvedContentAssignmentLookup) for (const key of resolvedContentAssignmentLookup.keys) {
		const contentAssignment = siteManifest?.contentObjectAssignments?.[aspectType]?.[resolvedContentAssignmentLookup.objectType]?.[key];
		if (contentAssignment) return contentAssignment.contentId;
	}
	return null;
}

//#endregion
//#region src/design/data/manifest/get-page.ts
/**
* Selects the appropriate page variation from a manifest by evaluating each
* variation's visibility rule in order. Returns the first variation whose rule
* passes, or falls back to the manifest's default variation.
*
* The qualifier context is resolved lazily — the `contextResolver` is only
* called when a variation's `ruleRequiresContext` flag is `true`, and only
* once (the result is cached for subsequent variations).
*
* @param manifest - The page manifest containing all variations.
* @param options - Resolution options.
* @param options.contextResolver - Optional async function that returns the shopper's qualifier context. Only called if a variation's rule needs it.
* @param options.locale - The current locale (e.g. `"en_US"`). Used to evaluate locale-based visibility rules.
* @returns The selected variation entry and resolved context, or `null` if no variation (including default) exists.
*
* @example
* ```ts
* import { getPageFromManifest } from '@salesforce/storefront-next-runtime/design/data';
*
* const manifest = {
*     pageId: 'homepage',
*     context: { campaignQualifiers: [], customerGroups: ['vip-customers'], dataBindings: [] },
*     variationOrder: ['vip-homepage', 'holiday-homepage'],
*     variations: {
*         'vip-homepage': {
*             ruleRequiresContext: true,
*             pageRequiresContext: false,
*             visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip-customers'] },
*             page: { id: 'homepage', typeId: 'storePage', regions: [] },
*         },
*         'holiday-homepage': {
*             ruleRequiresContext: false,
*             pageRequiresContext: false,
*             visibilityRule: {
*                 activeLocales: ['en-US'],
*                 schedule: {
*                     start: new Date('2026-12-01').toISOString(),
*                     end: new Date('2026-12-31').toISOString(),
*                 },
*             },
*             page: { id: 'homepage', typeId: 'storePage', regions: [] },
*         },
*         'default-homepage': {
*             ruleRequiresContext: false,
*             pageRequiresContext: false,
*             page: { id: 'homepage', typeId: 'storePage', regions: [] },
*         },
*     },
*     defaultVariation: 'default-homepage',
*     componentInfo: {},
* };
*
* // VIP shopper — matches first variation
* const result = await getPageFromManifest(manifest, {
*     locale: 'en-US',
*     contextResolver: async () => ({
*         customerGroups: { 'vip-customers': true },
*         campaignQualifiers: {},
*     }),
* });
* // result.entry === manifest.variations['vip-homepage']
*
* // Non-VIP shopper outside holiday window — falls back to default
* const fallback = await getPageFromManifest(manifest, {
*     locale: 'en-US',
*     contextResolver: async () => ({
*         customerGroups: {},
*         campaignQualifiers: {},
*     }),
* });
* // fallback.entry === manifest.variations['default-homepage']
* ```
*/
async function getPageFromManifest(manifest, { contextResolver, locale }) {
	let context = null;
	let resolvedVariation = null;
	for (const variationId of manifest.variationOrder) {
		const variation = manifest.variations[variationId];
		if (variation?.ruleRequiresContext && !context) context = await contextResolver?.(manifest.context) ?? null;
		if (!variation?.visibilityRule || validateRule(variation.visibilityRule, locale, context)) {
			resolvedVariation = variation;
			break;
		}
	}
	if (!resolvedVariation) resolvedVariation = manifest.variations[manifest.defaultVariation];
	if (!resolvedVariation) return null;
	return {
		entry: resolvedVariation,
		context
	};
}

//#endregion
//#region src/design/data/page/resolve-page.ts
/**
* Main entry point for the page resolution pipeline. Orchestrates the full flow:
*
* 1. **Resolve dynamic page ID** — For product/category identifiers, looks up
*    the assigned page ID via content assignments in the site manifest.
* 2. **Fetch page manifest** — Loads all variations for the resolved page.
* 3. **Select variation** — Evaluates visibility rules to pick the right variation.
* 4. **Load qualifier context** — Lazily fetches the shopper's context only if needed.
* 5. **Process page** — Filters out components that fail visibility rules.
*
* Returns `null` if the page ID cannot be resolved, the manifest doesn't exist,
* or no variation is available.
*
* @param options - The resolution options.
* @param options.id - The identifier to resolve (product ID, category ID, or page ID).
* @param options.identifierType - The type of identifier: `'product'`, `'category'`, or `'page'`.
* @param options.locale - The locale to resolve the page for (e.g. `"en-US"`).
* @param options.manifestStorage - Storage implementation for fetching manifests.
* @param options.contextResolver - Optional async function that returns the shopper's qualifier context. Only called if a visibility rule needs it.
* @param options.aspectType - The aspect type to resolve the page for when the identifier type is `'product'` or `'category'`.
* @param options.pruneInvisible - When `true` (default), invisible and overflow components are removed. When `false`, they are kept but marked `visible: false` for design/preview mode.
* @returns The fully resolved and filtered page, or `null`.
*
* @example
* ```ts
* import { resolvePage } from '@salesforce/storefront-next-runtime/design/data';
*
* // Resolve the PDP page for a specific product with an active holiday campaign
* const page = await resolvePage({
*     id: 'nike-air-max-90',
*     identifierType: 'product',
*     aspectType: 'pdp',
*     locale: 'en-US',
*     manifestStorage: {
*         async getPageManifest(id, locale) {
*             // Fetch from CDN, filesystem, or database
*             return fetchManifest(`/manifests/${locale}/${id}.json`);
*         },
*         async getSiteManifest(locale) {
*             return fetchManifest(`/manifests/${locale}/site.json`);
*         },
*     },
*     contextResolver: async () => ({
*         customerGroups: { 'vip-customers': true },
*         campaignQualifiers: {
*             'holiday-sale-2026': { 'free-shipping': true },
*         },
*     }),
* });
*
* if (page) {
*     // page.regions contains only components visible to this VIP shopper
*     // during the holiday sale campaign
*     renderPage(page);
* }
* ```
*/
async function resolvePage({ id, identifierType, aspectType, locale, manifestStorage, contextResolver, pruneInvisible = true }) {
	let resolvedId = null;
	if (ContentAssignmentResolvers.has(identifierType)) {
		const siteManifest = await manifestStorage.getSiteManifest(locale);
		RequiredError.assert(aspectType, `Aspect type is required for identifier type ${identifierType}`, (v) => !v);
		resolvedId = resolveDynamicPageId({
			id,
			identifierType,
			aspectType,
			siteManifest
		});
	} else resolvedId = id;
	if (!resolvedId) return null;
	const pageManifest = await manifestStorage.getPageManifest(resolvedId, locale);
	if (!pageManifest) return null;
	const pageResults = await getPageFromManifest(pageManifest, {
		contextResolver,
		locale
	});
	if (!pageResults) return null;
	let context = null;
	if (pageResults.entry.pageRequiresContext) context = pageResults.context ?? await contextResolver?.(pageManifest.context) ?? null;
	return processPage(pageResults.entry.page, {
		qualifiers: context,
		componentInfo: pageManifest.componentInfo,
		regionInfo: pageManifest.regionInfo,
		locale,
		pruneInvisible
	});
}

//#endregion
export { ContentAssignmentResolvers, RequiredError, getPageFromManifest, parseExpression, processPage, resolveComponentDataBindings, resolveDynamicPageId, resolveExpression, resolvePage, transformComponent, transformPage, transformRegion, validateRule };
//# sourceMappingURL=design-data.js.map