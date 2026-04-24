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
import { transformPage } from './transform';
import { resolveComponentDataBindings } from './resolve-data-bindings';
import { validateRule } from '../validate-rule';
import type { QualifierContext, PageManifest } from '../types';
import type { ShopperExperience } from '@/scapi-client/types';

/**
 * Context required for page processing. Contains the shopper's runtime
 * qualifiers, the component-level visibility rules, and the locale used
 * to resolve locale-specific component content from the page manifest.
 */
export interface PageProcessorContext {
    /** The shopper's active qualifiers (campaigns, customer groups), or `null` if not resolved. */
    qualifiers: QualifierContext | null;
    /** Component visibility rule definitions extracted from the page layout. */
    componentInfo: PageManifest['componentInfo'];
    /** The locale to use when resolving locale-specific component content (e.g. `"en_US"`). */
    locale: string;
    /**
     * When `true` (default), invisible components are removed from the tree and
     * regions are truncated to their `maxComponents` limit. When `false`, invisible
     * components and overflow components are kept in the tree but marked with
     * `visible: false` — used in design/preview mode so the editor can display them.
     */
    pruneInvisible?: boolean;
}

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
export function processPage(
    page: ShopperExperience.schemas['Page'],
    processorContext: PageProcessorContext
): ShopperExperience.schemas['Page'] {
    return transformPage(page, {
        visitRegion(ctx) {
            const componentInfo = ctx.parentComponent ? processorContext.componentInfo[ctx.parentComponent.id] : null;
            const regionInfo = componentInfo?.regions?.[ctx.node.id];
            const pruneInvisible = processorContext.pruneInvisible ?? true;

            // Visit each component first — this runs visitComponent which
            // filters out components that fail their visibility rules.
            let components = ctx.visitComponents(ctx.node.components);

            if (regionInfo?.maxComponents != null) {
                if (pruneInvisible) {
                    components = components.slice(0, regionInfo.maxComponents);
                } else {
                    const result: ShopperExperience.schemas['Component'][] = [];
                    let visibleCount = 0;

                    for (const comp of components) {
                        if (comp.visible) {
                            visibleCount++;
                        }

                        if (visibleCount > regionInfo.maxComponents) {
                            result.push({ ...comp, visible: false });
                        } else {
                            result.push(comp);
                        }
                    }

                    components = result;
                }
            }

            return {
                ...ctx.node,
                // After visibility filtering, enforce the region's max component
                // limit by keeping only the first N visible components.
                components,
            };
        },
        visitComponent(ctx) {
            const componentInfo = processorContext.componentInfo[ctx.node.id];
            const visibilityRules = componentInfo?.visibilityRules ?? [];
            const pruneInvisible = processorContext.pruneInvisible ?? true;
            let isVisible = true;

            // Visibility rules use OR logic: the component is visible
            // if ANY rule passes. Only remove it when it has its own
            // rules and none of them pass.
            if (visibilityRules.length > 0) {
                const anyRulePassed = visibilityRules.some((rule) =>
                    validateRule(rule, processorContext.locale, processorContext.qualifiers)
                );

                if (!anyRulePassed) {
                    if (pruneInvisible) {
                        return null;
                    }

                    isVisible = false;
                }
            }

            // Apply locale-specific content from the manifest to the component's data.
            // The "default" locale provides base values; the current locale overrides them.
            const defaultContent = componentInfo?.content?.default ?? {};
            const localeContent = componentInfo?.content?.[processorContext.locale] ?? {};
            const content = { ...defaultContent, ...localeContent };
            const isLocalized = Boolean(componentInfo?.content?.[processorContext.locale]);

            let node: ShopperExperience.schemas['Component'] = {
                ...ctx.node,
                localized: isLocalized,
                visible: isVisible,
                data: {
                    ...(ctx.node.data as Record<string, unknown>),
                    ...content,
                } as typeof ctx.node.data,
            };

            // Resolve data binding expressions (overrides content for bound attributes).
            node = resolveComponentDataBindings(
                node,
                componentInfo?.dataBinding,
                processorContext.qualifiers?.dataBindings
            );

            return {
                ...node,
                regions: ctx.visitRegions(ctx.node.regions),
            };
        },
    }) as ShopperExperience.schemas['Page'];
}
