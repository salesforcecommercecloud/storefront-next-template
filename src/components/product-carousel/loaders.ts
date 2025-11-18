import { fetchSearchProducts } from '@/lib/api/search';
import type { LoaderFunctionArgs } from 'react-router';

const dataLoader = async (args: {
    componentData: { [key: string]: unknown };
    context: LoaderFunctionArgs['context'];
}) => {
    const { componentData, context: routeContext } = args;

    // Extract configuration from component data
    // ToDo: The fallback should be removed and put in the component default data instead
    const categoryId = (componentData?.categoryId as string) || 'mens-clothing-shorts';
    const limit = (componentData?.limit as number) || 12;

    return fetchSearchProducts(routeContext, {
        categoryId,
        limit,
    });
};

export const loader = {
    server: dataLoader,
    client: dataLoader,
};
