import { type LoaderFunctionArgs } from 'react-router';
import type { ShopperExperienceTypes } from 'commerce-sdk-isomorphic';
import { createApiClients } from '@/lib/api-clients';

export type PageDesignerPageParams = {
    pageId: string;
    mode?: string;
    pdToken?: string;
    aspectType?: string;
    categoryId?: string;
    productId?: string;
};

export const fetchPage = async (
    context: LoaderFunctionArgs['context'],
    parameters: PageDesignerPageParams
): Promise<ShopperExperienceTypes.Page> => {
    const { pageId = '', pdToken, mode, aspectType, categoryId, productId } = parameters || {};
    const clients = createApiClients(context);

    const result = await clients.shopperExperience.getPage({
        params: {
            path: { pageId },
            query: {
                ...(mode && { mode }),
                ...(pdToken && { pdToken }),
                ...(aspectType && { aspectType }),
                ...(categoryId && { categoryId }),
                ...(productId && { productId }),
            },
        },
    });

    return result.data;
};
