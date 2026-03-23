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

import { useTranslation } from 'react-i18next';

/** Translation key for the default site name (within the `common` namespace). */
export const DEFAULT_SITE_NAME_KEY = 'defaultSiteName';

export interface SeoMetaProps {
    /**
     * Page title. How it renders depends on `rawTitle`:
     *
     * - **Default** (`rawTitle` omitted): `"My Page | NextGen PWA Kit Store"` — site name is appended.
     * - **`rawTitle` set**: `"My Page"` — rendered exactly as given, no suffix.
     *
     * When omitted entirely, the site name alone is used as the title.
     */
    title?: string;
    /**
     * Render `title` exactly as provided, without appending ` | {siteName}`.
     * Useful for pages where the title already contains the site name or needs
     * full control (e.g., the homepage: `<SeoMeta rawTitle title="Store Name" />`).
     */
    rawTitle?: boolean;
    /** Meta description. */
    description?: string;
    /** When true, renders `<meta name="robots" content="noindex">` to prevent search engine indexing. */
    noIndex?: boolean;
    /** Override the default site name used in the title suffix. Defaults to the localized `common:defaultSiteName` translation. */
    siteName?: string;
    /** Twitter Card metadata. Omit to skip Twitter Card tags entirely. */
    twitter?: {
        cardType?: 'summary' | 'summary_large_image';
        image?: string;
    };
}

/**
 * Renders SEO `<title>` and `<meta>` tags using React 19 document metadata hoisting.
 *
 * Tags rendered anywhere in the component tree are automatically hoisted to `<head>`
 * and deduplicated (by `name` for `<meta>`, single instance for `<title>`).
 * This works with streaming/Suspense — when data resolves, the tags are sent and hoisted.
 *
 * Usage: render `<SeoMeta>` inside any route component.
 *
 * @example
 * ```tsx
 * // Standard page — title gets the site name appended automatically
 * // Renders: <title>Classic Leather Jacket | NextGen PWA Kit Store</title>
 * <SeoMeta
 *     title="Classic Leather Jacket"
 *     description="Premium leather jacket with a tailored fit."
 * />
 *
 * // Full control over title (e.g., homepage) — no site name suffix
 * // Renders: <title>NextGen PWA Kit Store</title>
 * <SeoMeta rawTitle title="NextGen PWA Kit Store" />
 *
 * // Auth-protected page — no indexing
 * // Renders: <title>Order History | NextGen PWA Kit Store</title>
 * <SeoMeta title="Order History" noIndex />
 * ```
 */
export function SeoMeta({ title, rawTitle, description, noIndex, twitter, siteName }: SeoMetaProps) {
    const { t } = useTranslation('common');
    const resolvedSiteName = siteName ?? t(DEFAULT_SITE_NAME_KEY);
    const fullTitle = title ? (rawTitle ? title : `${title} | ${resolvedSiteName}`) : resolvedSiteName;
    return (
        <>
            <title>{fullTitle}</title>
            {description && <meta name="description" content={description} />}
            {noIndex && <meta name="robots" content="noindex" />}
            {twitter && (
                <>
                    <meta name="twitter:card" content={twitter.cardType ?? 'summary'} />
                    <meta name="twitter:title" content={title || resolvedSiteName} />
                    {description && <meta name="twitter:description" content={description} />}
                    {twitter.image && <meta name="twitter:image" content={twitter.image} />}
                </>
            )}
        </>
    );
}
