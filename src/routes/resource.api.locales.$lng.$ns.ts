import { data } from 'react-router';
import { z } from 'zod';
// TODO: how to grab translations from the extensions?
import resources from '@/locales/.server';
import type { Route } from './+types/resource.api.locales.$lng.$ns';

/**
 * API endpoint to serve translations for a particular language/locale and namespace
 */
// eslint-disable-next-line custom/no-universal-loaders
export function loader({ params }: Route.LoaderArgs) {
    // NOTE: in i18next world, a 'resource' means a collection of translations. It's different than the concept of resource route in React Router.
    const lng = z.enum(Object.keys(resources) as Array<keyof typeof resources>).safeParse(params.lng);
    if (lng.error) return data({ error: lng.error }, { status: 400 });

    const namespaces = resources[lng.data];
    const ns = z.enum(Object.keys(namespaces) as Array<keyof typeof namespaces>).safeParse(params.ns);
    if (ns.error) return data({ error: ns.error }, { status: 400 });

    const headers = new Headers();
    // On production, we want to add cache headers to the response
    if (process.env.NODE_ENV === 'production') {
        headers.set(
            'Cache-Control',
            // TODO: if we still keep this resource route, extract this into the config
            // Cache in browser for 5 minutes (300s), CDN for 1 day (86400s),
            // serve stale content while revalidating or on error for 7 days (604800s)
            'max-age=300, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800'
        );
    }

    return data(namespaces[ns.data], { headers });
}
