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
import type { IdentifierType, ManifestStorage, ContextResolver, QualifierContext } from '../types';
import type { ShopperExperience } from '@/scapi-client/types';
import { ContentAssignmentResolvers } from '../manifest/content-assignment-resolvers';
import { resolveDynamicPageId } from '../manifest/resolve-dynamic-page-id';
import { getPageFromManifest } from '../manifest/get-page';
import { processPage } from './process-page';
import { RequiredError } from '../errors/required';

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
 *         async getPageManifest(id) {
 *             // Fetch from CDN, filesystem, or database
 *             return fetchManifest(`/manifests/${id}.json`);
 *         },
 *         async getSiteManifest() {
 *             return fetchManifest('/manifests/site.json');
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
export async function resolvePage({
    id,
    identifierType,
    aspectType,
    locale,
    manifestStorage,
    contextResolver,
    pruneInvisible = true,
}: {
    id: string;
    identifierType: IdentifierType;
    aspectType?: string;
    locale: string;
    manifestStorage: ManifestStorage;
    contextResolver?: ContextResolver;
    pruneInvisible?: boolean;
}): Promise<ShopperExperience.schemas['Page'] | null> {
    let resolvedId: string | null = null;

    if (ContentAssignmentResolvers.has(identifierType)) {
        const siteManifest = await manifestStorage.getSiteManifest();

        RequiredError.assert(aspectType, `Aspect type is required for identifier type ${identifierType}`, (v) => !v);

        resolvedId = resolveDynamicPageId({ id, identifierType, aspectType, siteManifest });
    } else {
        resolvedId = id;
    }

    if (!resolvedId) {
        return null;
    }

    const pageManifest = await manifestStorage.getPageManifest(resolvedId);

    if (!pageManifest) {
        return null;
    }

    const pageResults = await getPageFromManifest(pageManifest, {
        contextResolver,
        locale,
    });

    if (!pageResults) {
        return null;
    }

    let context: QualifierContext | null = null;

    if (pageResults.entry.pageRequiresContext) {
        context = pageResults.context ?? (await contextResolver?.(pageManifest.context)) ?? null;
    }

    return processPage(pageResults.entry.page, {
        qualifiers: context,
        componentInfo: pageManifest.componentInfo,
        pageInfo: {
            regions: pageResults.entry.regions,
        },
        locale,
        pruneInvisible,
    });
}
