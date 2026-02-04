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
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import type { AppConfig } from '@/config';

/**
 * Schema.org CollectionPage with ItemList for Product Listing Pages
 * https://schema.org/CollectionPage
 * https://schema.org/ItemList
 */
export interface CategorySchema extends Record<string, unknown> {
    '@context': string;
    '@type': 'CollectionPage';
    name?: string;
    description?: string;
    url?: string;
    mainEntity?: {
        '@type': 'ItemList';
        numberOfItems?: number;
        itemListElement?: Array<{
            '@type': 'ListItem';
            position: number;
            item: {
                '@type': 'Product';
                name?: string;
                url?: string;
                image?: string | string[];
                offers?: {
                    '@type': 'Offer';
                    price?: string;
                    priceCurrency?: string;
                    availability?: string;
                    url?: string;
                };
            };
        }>;
    };
    breadcrumb?: {
        '@type': 'BreadcrumbList';
        itemListElement?: Array<{
            '@type': 'ListItem';
            position: number;
            name?: string;
            item?: string;
        }>;
    };
}

function determineAvailability(
    product: ShopperSearch.schemas['ProductSearchHit'],
    config?: AppConfig
): string | undefined {
    // Make sure explicit `orderable` property takes precedence over `orderableOnly` config
    if (product?.orderable === true) {
        return 'https://schema.org/InStock';
    } else if (product?.orderable === false) {
        return 'https://schema.org/OutOfStock';
    }
    return config?.search?.products?.orderableOnly === true ? 'https://schema.org/InStock' : undefined;
}

/**
 * Generates JSON-LD schema for a Product Listing Page (PLP) / Category page.
 * Creates a CollectionPage with ItemList containing products.
 *
 * @param data - Object containing category, searchResult, pageUrl, and defaultCurrency
 * @param data.category - Category data from SFCC
 * @param data.searchResult - Product search results from SFCC
 * @param data.pageUrl - Full URL of the category page
 * @param data.defaultCurrency - Site's default currency to use as fallback (e.g., from config.site.currency)
 * @param [data.config] - The site configuration
 * @returns JSON-LD schema object for CollectionPage/ItemList
 */
export function generateCategorySchema({
    category,
    searchResult,
    pageUrl,
    defaultCurrency,
    config,
}: {
    category: ShopperProducts.schemas['Category'];
    searchResult: ShopperSearch.schemas['ProductSearchResult'] | null | undefined;
    pageUrl: string;
    defaultCurrency: string;
    config?: AppConfig | undefined;
}): CategorySchema {
    // Validate and parse pageUrl to avoid errors
    let baseUrl: string;
    try {
        const url = new URL(pageUrl);
        baseUrl = url.origin;
    } catch {
        // Fallback to empty string if URL is invalid
        baseUrl = '';
    }

    // Build breadcrumb list from category hierarchy
    const breadcrumbItems: Array<{
        '@type': 'ListItem';
        position: number;
        name?: string;
        item?: string;
    }> = [];

    // Use parentCategoryTree if available, otherwise build from parentCategoryId
    if (
        category.parentCategoryTree &&
        Array.isArray(category.parentCategoryTree) &&
        category.parentCategoryTree.length > 0
    ) {
        category.parentCategoryTree.forEach((parent, index) => {
            breadcrumbItems.push({
                '@type': 'ListItem',
                position: index + 1,
                name: parent.name,
                // parentCategoryTree items only have id and name
                item: parent.id && baseUrl ? `${baseUrl}/category/${parent.id}` : undefined,
            });
        });
    }

    // Add current category to breadcrumb
    breadcrumbItems.push({
        '@type': 'ListItem',
        position: breadcrumbItems.length + 1,
        name: category.name,
        item: pageUrl,
    });

    // Build item list from products (limit to first 20 for performance)
    const MAX_ITEMS = 20;
    const products = searchResult?.hits?.slice(0, MAX_ITEMS) || [];
    const itemListElements = products.map((product, index) => {
        const productUrl = product.productId && baseUrl ? `${baseUrl}/product/${product.productId}` : undefined;

        // Get primary image
        const imageUrl = product.image?.link || product.image?.disBaseLink;

        // Get price information
        const price = product.price;
        const currency = product.currency || defaultCurrency;

        // Check availability using the `orderableOnly` flag from the global search config.
        // Only include `availability` if `orderableOnly` is explicitly set to true. Then we can implicitly assume
        // that all products listed in the search results are in stock.
        const availability = determineAvailability(product, config);

        return {
            '@type': 'ListItem' as const,
            position: index + 1,
            item: {
                '@type': 'Product' as const,
                name: product.productName,
                url: productUrl,
                ...(imageUrl && { image: imageUrl }),
                ...(price && {
                    offers: {
                        '@type': 'Offer' as const,
                        price: price.toString(),
                        priceCurrency: currency,
                        ...(availability && { availability }),
                        ...(productUrl && { url: productUrl }),
                    },
                }),
            },
        };
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.name || category.id,
        ...(category.pageDescription && { description: category.pageDescription }),
        url: pageUrl,
        mainEntity: {
            '@type': 'ItemList',
            ...(searchResult?.total !== undefined && { numberOfItems: searchResult.total }),
            ...(itemListElements.length > 0 && { itemListElement: itemListElements }),
        },
        ...(breadcrumbItems.length > 0 && {
            breadcrumb: {
                '@type': 'BreadcrumbList',
                itemListElement: breadcrumbItems,
            },
        }),
    };
}
