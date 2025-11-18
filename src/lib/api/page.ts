import { type LoaderFunctionArgs } from 'react-router';
import type { ShopperExperienceTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';

export type PageDesignerPageParams = {
    pageId: string;
    mode?: string;
    pdToken?: string;
    aspectType?: string;
    categoryId?: string;
    productId?: string;
};

export const fetchPage = (
    context: LoaderFunctionArgs['context'],
    parameters: PageDesignerPageParams
): Promise<ShopperExperienceTypes.Page> => {
    const { pageId = '', pdToken, mode, aspectType, categoryId, productId } = parameters || {};

    return createClient(context).ShopperExperience.getPage({
        parameters: {
            pageId,
            mode,
            pdToken,
            aspectType,
            categoryId,
            productId,
        },
    });
};
