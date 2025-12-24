import { fetchSearchProducts } from '@/lib/api/search';
import type { LoaderFunctionArgs } from 'react-router';
import { currencyContext } from '@/lib/currency';

const dataLoader = async (args: {
    componentData: { [key: string]: unknown };
    context: LoaderFunctionArgs['context'];
}) => {
    const { componentData, context: routeContext } = args;
    const currency = routeContext.get(currencyContext) as string;

    // Extract configuration from component data
    // ToDo: The fallback should be removed and put in the component default data instead
    const categoryId = (componentData?.categoryId as string) || 'mens-clothing-shorts';
    const limit = (componentData?.limit as number) || 12;

    return fetchSearchProducts(routeContext, {
        categoryId,
        limit,
        currency,
    });
};

export const loader = {
    server: dataLoader,
    client: dataLoader,
};
