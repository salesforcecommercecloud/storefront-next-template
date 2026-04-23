/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ReactElement } from 'react';
import { type LoaderFunctionArgs, useLoaderData } from 'react-router';
import {
    getCustomGlobalPreferences,
    getSitePreferences,
    type CustomGlobalPreferences,
    type SitePreferences,
} from '@salesforce/storefront-next-runtime/data-store';
import { SeoMeta } from '@/components/seo-meta';
import { Typography } from '@/components/typography';

export type DataStoreRouteData = {
    sitePreferences: SitePreferences;
    customGlobalPreferences: CustomGlobalPreferences;
};

export function loader({ context }: LoaderFunctionArgs): DataStoreRouteData {
    return {
        sitePreferences: getSitePreferences(context),
        customGlobalPreferences: getCustomGlobalPreferences(context),
    };
}

export default function DataStoreRoute(): ReactElement {
    const data = useLoaderData<DataStoreRouteData>();

    return (
        <div className="max-w-screen-2xl mx-auto px-4 pb-8 pt-6 space-y-6">
            <SeoMeta title="Data Store" noIndex />
            <Typography variant="h2">Data Store</Typography>

            <section className="space-y-3">
                <Typography variant="h4">Custom Site Preferences</Typography>
                <pre className="rounded-none border border-border bg-muted/30 p-4 text-sm overflow-auto">
                    {JSON.stringify(data.sitePreferences, null, 2)}
                </pre>
            </section>

            <section className="space-y-3">
                <Typography variant="h4">Custom Global Preferences</Typography>
                <pre className="rounded-none border border-border bg-muted/30 p-4 text-sm overflow-auto">
                    {JSON.stringify(data.customGlobalPreferences, null, 2)}
                </pre>
            </section>
        </div>
    );
}
