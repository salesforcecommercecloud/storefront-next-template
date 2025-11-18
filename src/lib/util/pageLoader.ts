import type { LoaderFunctionArgs } from 'react-router';
import { fetchPage, type PageDesignerPageParams } from '@/lib/api/page';
import type { ShopperExperienceTypes } from 'commerce-sdk-isomorphic';
import { registry } from '@/lib/registry';

type PageParams = Omit<PageDesignerPageParams, 'mode' | 'pdToken'>;
export function fetchPageFromLoader(
    args: LoaderFunctionArgs,
    params: PageParams
): Promise<ShopperExperienceTypes.Page> {
    const url = new URL(args.request.url);
    // ToDo @mjuraschik: move to commerce-sdk-isomorphic
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

export function collectComponentDataPromises(
    ctx: LoaderFunctionArgs,
    pagePromise: Promise<ShopperExperienceTypes.Page>
): Promise<Record<string, Promise<unknown>>> {
    // Return a promise that resolves to a map of component data promises
    // This allows the page to load in parallel with other data fetching
    return pagePromise.then((page) => {
        const map: Record<string, Promise<unknown>> = {};

        for (const region of page.regions || []) {
            for (const comp of region.components || []) {
                const loaders = registry.getLoaders(comp.typeId);
                if (loaders?.server) {
                    // Each component gets its own independent promise
                    map[comp.id] = loaders.server({
                        componentData: comp,
                        context: ctx.context,
                    });
                }
            }
        }

        return map;
    });
}
