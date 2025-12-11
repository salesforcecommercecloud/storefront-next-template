import type { LoaderFunctionArgs } from 'react-router';
import { fetchPage, type PageDesignerPageParams } from '@/lib/api/page';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { registry } from '@/lib/registry';
import { isDesignModeActive, isPreviewModeActive } from '@salesforce/storefront-next-runtime/design/mode';

type PageParams = Omit<PageDesignerPageParams, 'mode' | 'pdToken'>;
export function fetchPageFromLoader(
    args: LoaderFunctionArgs,
    params: PageParams
): Promise<ShopperExperience.schemas['Page']> {
    const isPageDesignerActive = isDesignModeActive(args.request) || isPreviewModeActive(args.request);
    const url = new URL(args.request.url);

    if (!isPageDesignerActive) {
        return fetchPage(args.context, params);
    }

    const pageDesignerParams: Partial<PageDesignerPageParams> = {
        mode: url.searchParams.get('mode') || undefined,
        pdToken: url.searchParams.get('pdToken') || undefined,
        pageId: url.searchParams.get('pageId') || undefined,
    };

    const cleanParams = Object.fromEntries(
        Object.entries(pageDesignerParams).filter(([, value]) => value !== undefined)
    );

    return fetchPage(args.context, { ...params, ...cleanParams });
}

/**
 * Recursively collect component data promises from regions
 */
function collectFromRegions(
    ctx: LoaderFunctionArgs,
    regions: ShopperExperience.schemas['Region'][] | undefined,
    map: Record<string, Promise<unknown>>
): void {
    if (!regions) return;

    for (const region of regions) {
        for (const comp of region.components || []) {
            // Check if component has a loader before calling it
            const hasLoaders = registry.hasLoaders(comp.typeId);

            if (hasLoaders) {
                map[comp.id] = registry.callLoader(
                    comp.typeId,
                    {
                        componentData: comp,
                        context: ctx.context,
                    },
                    'loader'
                );
            }

            // Recursively process nested regions (components can have their own regions)
            if (comp.regions && comp.regions.length > 0) {
                collectFromRegions(ctx, comp.regions, map);
            }
        }
    }
}

export function collectComponentDataPromises(
    ctx: LoaderFunctionArgs,
    pagePromise: Promise<ShopperExperience.schemas['Page']>
): Promise<Record<string, Promise<unknown>>> {
    // Return a promise that resolves to a map of component data promises
    // This allows the page to load in parallel with other data fetching
    return pagePromise.then((page) => {
        const map: Record<string, Promise<unknown>> = {};

        // Process top-level regions and recursively process nested regions
        collectFromRegions(ctx, page.regions, map);

        return map;
    });
}
