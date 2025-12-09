import { fetchCategory } from '@/lib/api/categories';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperProducts, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';

const dataLoader = async (args: {
    componentData: unknown;
    context: LoaderFunctionArgs['context'];
}): Promise<ShopperProducts.schemas['Category']> => {
    const { componentData, context: routeContext } = args;

    // Type cast to component structure
    const comp = componentData as ShopperExperience.schemas['Component'];

    // Extract category ID from component data
    // componentData is the full component object, componentData.data contains Page Designer attributes
    const categoryId = (comp.data as { category?: string })?.category;

    if (!categoryId || typeof categoryId !== 'string') {
        throw new Error('Category ID is required for PopularCategory component');
    }

    // Fetch the full category object
    return fetchCategory(routeContext, categoryId, 0);
};

export const loader = {
    server: dataLoader,
    client: dataLoader,
};
