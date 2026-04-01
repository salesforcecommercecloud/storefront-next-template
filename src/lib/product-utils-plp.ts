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

/**
 * PLP-only product helpers (brand, description, rating).
 * Kept in a separate module so cart and other routes don't pull this code.
 */

export type ProductSearchHitLike = {
    productId?: string;
    productName?: string;
    representedProduct?: Record<string, unknown>;
    [key: string]: unknown;
};

function getCustomPropertyValue(
    customProperties: Array<{ id?: string; value?: unknown }> | undefined,
    id: string
): string | undefined {
    if (!customProperties?.length) return undefined;
    const prop = customProperties.find((p) => p.id === id || p.id?.toLowerCase() === id.toLowerCase());
    const val = prop?.value;
    return typeof val === 'string' && val.trim() ? val : undefined;
}

export function getProductBrand(product: ProductSearchHitLike): string | undefined {
    const rep = product?.representedProduct;
    const customProps = product?.customProperties as Array<{ id?: string; value?: unknown }> | undefined;
    const brand =
        (rep?.brand as string) ??
        (rep?.c_brand as string) ??
        (product?.brand as string) ??
        (product?.c_brand as string) ??
        getCustomPropertyValue(customProps, 'c_brand') ??
        getCustomPropertyValue(customProps, 'brand');
    return typeof brand === 'string' && brand.trim() ? brand : undefined;
}

export function getProductShortDescription(product: ProductSearchHitLike, maxLength?: number): string | undefined {
    const rep = product?.representedProduct;
    const customProps = product?.customProperties as Array<{ id?: string; value?: unknown }> | undefined;
    const raw =
        (rep?.c_shortDescription as string) ??
        (rep?.shortDescription as string) ??
        (product?.c_shortDescription as string) ??
        (product?.shortDescription as string) ??
        getCustomPropertyValue(customProps, 'c_shortDescription') ??
        getCustomPropertyValue(customProps, 'shortDescription');
    if (typeof raw !== 'string' || !raw.trim()) return undefined;
    const text = raw.trim();
    if (maxLength != null && text.length > maxLength) {
        return `${text.slice(0, maxLength).trim()}…`;
    }
    return text;
}

const MOCK_RATING = { rating: 4, reviewCount: 218 };

export function getProductRating(_product: ProductSearchHitLike): { rating: number; reviewCount: number } {
    return MOCK_RATING;
}
