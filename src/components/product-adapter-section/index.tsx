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
'use client';

import { type ReactElement, useState, useEffect, useContext } from 'react';
import type { HtmlContent } from '@/lib/adapters/product-content-data-types';
import type { HtmlContentAdapterMethod } from '@/lib/adapters/product-content-types';
import { useProductContent } from '@/hooks/product-content/use-product-content';
import HtmlFragment from '@/components/html-fragment';
import { useTranslation } from 'react-i18next';
import { CollapsibleLoadingContext } from '@/components/collapsible-section/collapsible-loading-context';

export interface ProductAdapterSectionProps {
    /** Name of the ProductContentAdapter method to call — must return Promise<HtmlContent> */
    adapterMethod: HtmlContentAdapterMethod;
    /** Optional product ID forwarded to the adapter method */
    productId?: string;
}

/**
 * Client-side body for an adapter-backed collapsible section on the PDP.
 *
 * Fetches content on mount via the ProductContentAdapter and renders it via HtmlFragment.
 * Lazy mounting is handled by the parent CollapsibleSection — this component is only
 * created once the user first opens the section, so the fetch naturally defers until needed.
 *
 * While the fetch is in progress, signals loading to the parent CollapsibleSection via
 * CollapsibleLoadingContext so the chevron is replaced with a spinner. Content renders in a
 * single step once the fetch completes — no intermediate layout shift in the content area.
 *
 * Shows a localized "coming soon" fallback in two cases:
 *   - The adapter method is not implemented by the active adapter.
 *   - The adapter method runs but returns null, or throws.
 * Renders nothing while the fetch is in progress, or when the product content feature
 * is disabled / no adapter is registered.
 * Intended to be rendered as the child of a CollapsibleSection shell.
 *
 * @example
 * ```tsx
 * <CollapsibleSection label={t('materials')}>
 *     <ProductAdapterSection adapterMethod="getIngredientsData" productId={product.id} />
 * </CollapsibleSection>
 * ```
 */
export default function ProductAdapterSection({
    adapterMethod,
    productId,
}: ProductAdapterSectionProps): ReactElement | null {
    const { adapter, isEnabled } = useProductContent();
    const { t } = useTranslation('product');
    const loadingCtx = useContext(CollapsibleLoadingContext);

    // null = fetch in progress; false = no content (method absent, returned null, or threw); HtmlContent = has content
    const [content, setContent] = useState<HtmlContent | null | false>(null);

    useEffect(() => {
        if (!isEnabled || !adapter) return;
        const method = adapter[adapterMethod]?.bind(adapter);
        if (!method) {
            setContent(false);
            return;
        }
        // Signal loading before the async fetch starts. The parent
        // CollapsibleSection reads isLoadingRef (written synchronously here)
        // in its own useEffect, which fires after children's effects, so it
        // always sees this write before deciding whether to open the section.
        let cancelled = false;
        loadingCtx?.setLoading(true);
        void (async () => {
            try {
                const data = await method(productId);
                if (!cancelled) {
                    setContent(data ?? false);
                    loadingCtx?.setLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setContent(false);
                    loadingCtx?.setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
            loadingCtx?.setLoading(false);
        };
    }, [adapter, adapterMethod, isEnabled, loadingCtx, productId]);

    if (content === null) return null;

    if (content === false) {
        return <p className="text-sm text-muted-foreground">{t('contentComingSoon')}</p>;
    }

    return <HtmlFragment content={content.html} contentType={content.contentType} />;
}
