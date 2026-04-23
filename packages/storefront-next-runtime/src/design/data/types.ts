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
import type { ShopperExperience } from '@/scapi-client/types';

/**
 * A manifest containing all variations of a single Page Designer page for a
 * specific locale. Variations are evaluated in {@link variationOrder} sequence;
 * the first whose visibility rule passes is selected. If none match, the
 * {@link defaultVariation} is used as a fallback.
 */
export interface PageManifest {
    /** The unique identifier of the page this manifest represents. */
    pageId: string;
    /** Campaigns and customer groups referenced across all variations in this manifest. */
    context: PageManifestContext;
    /** Ordered list of variation IDs defining the evaluation sequence. */
    variationOrder: string[];
    /** Map of variation ID to its entry data. */
    variations: Record<string, VariationEntry>;
    /** The variation ID to use when no other variation's rule matches. */
    defaultVariation: string;
    /**
     * Component visibility rule definitions extracted from the page layout.
     * Maps each component ID to its array of rule objects and a flag indicating
     * if any rules are defined for that component.
     */
    componentInfo: {
        [componentId: string]: {
            /** The visibility rules for this component. */
            visibilityRules: VisibilityRuleDef[];
            /**
             * Locale-specific content attributes for this component. Keyed by locale
             * (e.g. `"en_US"`), each entry contains attribute values that are merged
             * into the component's `data` during page processing.
             */
            content?: {
                [locale: string]: Record<string, unknown>;
            };
            /** Data binding metadata for this component, or `null` if not bound. */
            dataBinding?: ComponentDataBinding | null;
            /** Region-level configuration (e.g. maxComponents limits), keyed by region ID. */
            regions: {
                [regionId: string]: {
                    /** The name of the region. */
                    name: string;
                    /** The component type exclusions for the region. */
                    componentTypeExclusions: string[] | null;
                    /** The component type inclusions for the region. */
                    componentTypeInclusions: string[] | null;
                    /** Maximum number of visible components to render in this region, or `null` for no limit. */
                    maxComponents: number | null;
                };
            };
        };
    };
}

/**
 * Site-wide manifest containing content assignments that map product and category
 * identifiers to page IDs, plus the category hierarchy used for parent-category
 * traversal during lookup.
 */
export interface SiteManifest {
    /**
     * Nested mapping of content assignments.
     * Structure: `aspectType -> objectType -> objectId -> assignment`.
     *
     * For example, a PDP assignment for product "nike-air-max-90":
     * `contentObjectAssignments.pdp.product["nike-air-max-90"].contentId`
     */
    contentObjectAssignments: {
        [aspectType: string]: {
            [objectType: string]: {
                [objectId: string]: {
                    /** Whether this assignment was explicitly set or inherited from a parent category. */
                    lookupMode: 'category-implicit' | 'category-explicit';
                    /** The page ID assigned to this object. */
                    contentId: string;
                };
            };
        };
    };
    /**
     * Category hierarchy used to traverse from child to parent when resolving
     * category-based content assignments.
     */
    categories: {
        [categoryId: string]: {
            /** Display name of the category. */
            name: string;
            /** ID of the parent category, or undefined for root categories. */
            parentCategory?: string;
        };
    };
}

/**
 * Data binding metadata for a component instance. Stored in the page manifest's
 * `componentInfo` map, keyed by component ID.
 */
export interface ComponentDataBinding {
    /** Maps attribute names to expression strings (e.g. `"content_asset.body"`). */
    expressions: Record<string, string>;
    /** The data contexts bound to this component, identifying the records to resolve against. */
    contexts: DataBindingRequirement[];
}

/**
 * A campaign and promotion pair used in visibility rules. Both the campaign and
 * the specific promotion within it must be active in the shopper's context for
 * the qualifier to match.
 */
export type CampaignQualifier = ShopperExperience.schemas['CampaignQualifier'];

/**
 * Metadata extracted from all variation rules in a {@link PageManifest}. Lists
 * every campaign qualifier and customer group referenced, so the runtime knows
 * which context values may be needed without inspecting each rule individually.
 */
export interface PageManifestContext {
    /** All campaign/promotion pairs referenced by any variation's visibility rule. */
    campaignQualifiers: CampaignQualifier[];
    /** All customer group IDs referenced by any variation's visibility rule. */
    customerGroups: string[];
    /** All data bindings required by components on this page, hoisted for batch resolution. */
    dataBindings: DataBindingRequirement[];
}

/**
 * A single data binding requirement declared by a component. The `type`
 * identifies the data provider (e.g. `"content_asset"`, `"product"`) and the
 * `id` identifies the specific record within that provider.
 *
 * These requirements are hoisted into {@link PageManifestContext} so MRT can
 * request all required external data in a single batch during context resolution.
 */
export type DataBindingRequirement = ShopperExperience.schemas['DataBindingRequirement'];

/**
 * A single page variation within a {@link PageManifest}. Each variation holds
 * the full page data and flags indicating whether qualifier context is needed
 * for selection or component-level processing.
 */
export interface VariationEntry {
    /**
     * Whether this variation's page contains components with visibility rules
     * that require qualifier context. When `true`, the context resolver is called
     * before processing the page's components.
     */
    pageRequiresContext: boolean;
    /**
     * Whether this variation's own visibility rule requires qualifier context
     * to evaluate. When `true`, the context resolver is called before checking
     * the variation-level rule.
     */
    ruleRequiresContext: boolean;
    /** The visibility rule that must pass for this variation to be selected. Undefined for the default variation. */
    visibilityRule?: VisibilityRuleDef;
    /** The full page data for this variation. */
    page: ShopperExperience.schemas['Page'];
}

/**
 * A visibility rule definition that controls when a page variation or component
 * is shown. All conditions within a rule use AND logic — every specified
 * condition must pass for the rule to be satisfied.
 */
export interface VisibilityRuleDef {
    /** Customer groups that the shopper must belong to. All groups must match. */
    customerGroups?: string[];
    /** Campaign/promotion pairs that must be active. All qualifiers must match. */
    campaignQualifiers?: CampaignQualifier[];
    /** Time window during which the rule is active, as ISO 8601 UTC strings. */
    schedule?: {
        /** Start time as an ISO 8601 UTC string. Rule fails before this time. */
        start?: string;
        /** End time as an ISO 8601 UTC string. Rule fails after this time. */
        end?: string;
    };
    /** The locales for which this rule is active (e.g. `["en_US", "fr_FR"]`). The rule fails for locales not in this list. When `null`, the rule is valid for every locale. */
    activeLocales: string[] | null;
}

/**
 * Runtime context representing the current shopper's active qualifiers.
 * Passed to {@link validateRule} to evaluate visibility rules. This context
 * is typically resolved lazily — only fetched when a rule actually needs it.
 */
export type QualifierContext = ShopperExperience.schemas['QualifierResolveResponse'];

/**
 * A resolved data binding object containing the fields returned by the data
 * provider for a specific record. For example, a resolved `content_asset`
 * might contain `{ title: "Winter Sale", body: "<div>…</div>" }`.
 */
export type ResolvedDataBinding = ShopperExperience.schemas['ResolvedDataBinding'];

/**
 * The type of identifier used to look up a page. Determines how the ID is
 * resolved to a page manifest:
 * - `'page'` — Direct page ID, used as-is
 * - `'category'` — Category ID, resolved via content assignments with parent traversal
 * - `'product'` — Product ID, resolved via content assignments
 */
export type IdentifierType = 'page' | 'category' | 'product';

/**
 * Storage interface for fetching page and site manifests. Implementations
 * decouple the page resolution logic from the underlying data source (e.g.,
 * filesystem, CDN, database).
 */
export interface ManifestStorage {
    /** Fetch the page manifest for a given page ID. */
    getPageManifest(id: string): Promise<PageManifest | null>;
    /** Fetch the site-wide manifest for a given locale. */
    getSiteManifest(): Promise<SiteManifest | null>;
}

export type ContextResolver = (context: PageManifest['context']) => Promise<QualifierContext | null>;

export type VisitorContextType = 'page' | 'region' | 'component' | 'root';

export type InferNodeFromType<TType extends VisitorContextType> = TType extends 'page'
    ? ShopperExperience.schemas['Page']
    : TType extends 'region'
      ? ShopperExperience.schemas['Region']
      : ShopperExperience.schemas['Component'];
