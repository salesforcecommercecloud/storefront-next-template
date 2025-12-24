import type { LoaderFunctionArgs, ClientLoaderFunctionArgs } from 'react-router';
import { fetchSearchSuggestions } from '@/lib/api/search';
import { extractResponseError } from '@/lib/utils';
import { currencyContext } from '@/lib/currency';

async function getSearchSuggestionsData({
    request,
    context,
}: {
    request: Request;
    context: LoaderFunctionArgs['context'];
}) {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const expandParam = url.searchParams.get('expand');
    const expand = expandParam ? (expandParam.split(',') as ('images' | 'prices')[]) : [];
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam && !isNaN(parseInt(limitParam, 10)) ? parseInt(limitParam, 10) : undefined;
    const includeEinsteinParam = url.searchParams.get('includeEinsteinSuggestedPhrases');
    const includeEinsteinSuggestedPhrases = includeEinsteinParam !== null ? includeEinsteinParam === 'true' : undefined;
    const currency = context.get(currencyContext) as string;

    try {
        const result = await fetchSearchSuggestions(context, {
            q,
            expand,
            limit,
            includeEinsteinSuggestedPhrases,
            currency,
        });
        return Response.json({ success: true, data: result });
    } catch (error) {
        const { responseMessage, status_code } = await extractResponseError(error as Error);
        return Response.json({ success: false, error: responseMessage }, { status: Number(status_code) });
    }
}

export function loader({ request, context }: LoaderFunctionArgs) {
    return getSearchSuggestionsData({ request, context });
}

// eslint-disable-next-line custom/no-client-loaders
export function clientLoader(args: ClientLoaderFunctionArgs) {
    return getSearchSuggestionsData(args);
}
