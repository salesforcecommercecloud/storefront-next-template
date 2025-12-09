import type { LoaderFunctionArgs } from 'react-router';
import { fetchPage, type PageDesignerPageParams } from '@/lib/api/page';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { registry } from '@/lib/registry';

type PageParams = Omit<PageDesignerPageParams, 'mode' | 'pdToken'>;
export function fetchPageFromLoader(
    args: LoaderFunctionArgs,
    params: PageParams
): Promise<ShopperExperience.schemas['Page']> {
    const url = new URL(args.request.url);
    const mode = url.searchParams.get('mode');
    const isPageDesignerActive = mode === 'EDIT' || mode === 'PREVIEW';
    const pdToken = isPageDesignerActive ? (url.searchParams.get('pdToken') ?? undefined) : undefined;
    const pageId = isPageDesignerActive ? (url.searchParams.get('pageId') ?? undefined) : undefined;

    return fetchPage(args.context, {
        ...params,
        ...(mode ? { mode } : {}),
        ...(pdToken ? { pdToken } : {}),
        ...(pageId ? { pageId } : {}),
    });
}

/**
 * Recursively collect component data promises from regions
 */
function collectFromRegions(
    ctx: LoaderFunctionArgs,
    regions: ShopperExperienceTypes.Region[] | undefined,
    map: Record<string, Promise<unknown>>
): void {
    if (!regions) return;

    for (const region of regions) {
        for (const comp of region.components || []) {
            const loaders = registry.getLoaders(comp.typeId);
            if (loaders?.server) {
                // Each component gets its own independent promise
                map[comp.id] = loaders.server({
                    componentData: comp,
                    context: ctx.context,
                });
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
