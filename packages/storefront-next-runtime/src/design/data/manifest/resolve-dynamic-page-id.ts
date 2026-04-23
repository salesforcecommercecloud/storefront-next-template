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
import type { SiteManifest, IdentifierType } from '../types';
import { ContentAssignmentResolvers } from './content-assignment-resolvers';

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
export function resolveDynamicPageId<TIdentifier extends IdentifierType = IdentifierType>({
    id,
    identifierType,
    siteManifest,
    aspectType,
}: {
    id: string;
    identifierType: TIdentifier;
    aspectType: string;
    siteManifest?: SiteManifest | null;
}): string | null {
    const resolvedContentAssignmentLookup = ContentAssignmentResolvers.get(identifierType)?.(id, siteManifest);

    if (resolvedContentAssignmentLookup) {
        for (const key of resolvedContentAssignmentLookup.keys) {
            const contentAssignment =
                siteManifest?.contentObjectAssignments?.[aspectType]?.[resolvedContentAssignmentLookup.objectType]?.[
                    key
                ];

            if (contentAssignment) {
                return contentAssignment.contentId;
            }
        }
    }

    return null;
}
