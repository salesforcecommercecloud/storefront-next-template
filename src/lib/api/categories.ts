import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';

export const fetchCategory = (
    context: LoaderFunctionArgs['context'],
    id: string,
    levels: ShopperProductsTypes.GetCategoryLevelsEnum = 0
): Promise<ShopperProductsTypes.Category> => {
    return createClient(context).ShopperProducts.getCategory({
        parameters: {
            id,
            levels,
        },
    });
};

export const fetchCategories = async (
    context: LoaderFunctionArgs['context'],
    parentId: string = 'root',
    levels: ShopperProductsTypes.GetCategoryLevelsEnum = 1
): Promise<ShopperProductsTypes.Category[]> => {
    const parentCategory = await fetchCategory(context, parentId, levels);
    return parentCategory.categories || [];
};
