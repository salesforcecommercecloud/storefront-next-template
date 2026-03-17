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
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';

interface ProductFeaturesProps {
    product: ShopperProducts.schemas['Product'];
    /** Delimiter used to separate features in longDescription. Defaults to '|' */
    delimiter?: string;
    /** CSS classes applied when content is detected as HTML fragment */
    htmlFragmentClassName?: string;
}

/**
 * Helper function to check if a string is a valid HTML fragment
 */
function isHtmlFragment(text: string): boolean {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Check if there are any parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            return false;
        }

        // Check if the parsed content has HTML elements (not just text)
        const body = doc.body;
        if (!body) {
            return false;
        }

        // Check if the parsed content has HTML elements
        const hasHtmlElements = Array.from(body.childNodes).some((node) => node.nodeType === Node.ELEMENT_NODE);

        if (!hasHtmlElements) {
            return false;
        }

        // If we have HTML elements and no parser errors, it's valid HTML
        // HTML content should not be split by delimiters
        return true;
    } catch {
        // If parsing fails, assume it's not HTML
        return false;
    }
}

/**
 * Component to display product features from longDescription
 * Uses DOMParser to detect HTML fragments and renders appropriately
 * Supports both HTML fragments and configurable delimiter-separated text
 * Conditional rendering is handled by the parent component
 */
export default function ProductFeatures({
    product,
    delimiter,
    htmlFragmentClassName,
}: ProductFeaturesProps): ReactElement {
    const { t } = useTranslation('product');
    const longDescription = product.longDescription || '';
    const isHtml = isHtmlFragment(longDescription);
    const hasDelimiterSeparator = delimiter && longDescription.includes(delimiter) && !isHtml;

    return (
        <div className="flex flex-col gap-3">
            {/* Label with same styling as SwatchGroup */}
            <div className="flex items-center gap-2 text-sm text-foreground">
                <span className="font-semibold">{t('features')}:</span>
            </div>

            {/* Features - render based on content format */}
            {isHtml ? (
                // HTML fragment - render directly with configurable styling
                <div
                    className={htmlFragmentClassName}
                    // BM content is trusted, safe to render HTML
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: longDescription }}
                />
            ) : hasDelimiterSeparator ? (
                // Delimiter-separated - split and render with bullets
                <ul className="flex flex-col gap-1.5 list-none m-0 p-0 text-sm text-foreground">
                    {longDescription.split(delimiter).map((item, index) => {
                        const trimmedItem = item.trim();
                        // Skip empty items
                        if (!trimmedItem) return null;

                        return (
                            // eslint-disable-next-line react/no-array-index-key
                            <li key={`product-feature-${index}`} className="flex items-center gap-2">
                                <span
                                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"
                                    aria-hidden="true"
                                />
                                <span
                                    // BM content is trusted, safe to render HTML
                                    // eslint-disable-next-line react/no-danger
                                    dangerouslySetInnerHTML={{ __html: trimmedItem }}
                                />
                            </li>
                        );
                    })}
                </ul>
            ) : (
                // Plain text - render as-is
                <div
                    className="text-sm text-foreground"
                    // BM content is trusted, safe to render HTML
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: longDescription }}
                />
            )}
        </div>
    );
}
