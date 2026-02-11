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
import { type LoaderFunctionArgs } from 'react-router';
import type { ShopperCustomers, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { getAuth } from '@/middlewares/auth.server';
import { isRegisteredCustomer } from '@/lib/api/customer';
import { convertProductToProductSearchHit } from '@/lib/product-conversion';
import { fetchProductsForWishlist, getWishlist } from '@/lib/api/wishlist';
import { getConfig } from '@/config';

/**
 * Server loader to fetch product details for a slice of wishlist items
 * This is used by PaginatedProductCarousel to load more products on demand
 */
// eslint-disable-next-line custom/no-async-page-loader
export async function loader({ request, context }: LoaderFunctionArgs): Promise<{
    products: (ShopperSearch.schemas['ProductSearchHit'] | null)[];
    productsByProductId: Record<string, ShopperProducts.schemas['Product']>;
    offset: number;
    limit: number;
    total: number;
}> {
    if (!isRegisteredCustomer(context)) {
        return {
            products: [],
            productsByProductId: {},
            offset: 0,
            limit: 0,
            total: 0,
        };
    }

    const session = getAuth(context);
    if (!session.customerId) {
        return {
            products: [],
            productsByProductId: {},
            offset: 0,
            limit: 0,
            total: 0,
        };
    }

    const { searchParams } = new URL(request.url);
    const config = getConfig(context);
    const defaultLimit = config.global.paginatedProductCarousel.defaultLimit;
    const maxLimit = config.global.productListing.productsPerPage;
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);

    // Validate offset parameter
    if (isNaN(offset) || offset < 0) {
        throw new Error('Invalid offset parameter: must be a non-negative integer');
    }

    // Validate limit parameter
    if (isNaN(limit) || limit <= 0 || limit > maxLimit) {
        throw new Error(`Invalid limit parameter: must be a positive integer not exceeding ${maxLimit}`);
    }

    const customerId = session.customerId;

    const { wishlist, items: allItems, id: listId } = await getWishlist(context, customerId);

    if (!wishlist || !listId) {
        return {
            products: [],
            productsByProductId: {},
            offset: 0,
            limit: 0,
            total: 0,
        };
    }

    const total = allItems.length;

    // Slice items based on offset and limit (client-side pagination)
    const itemsSlice = allItems.slice(offset, offset + limit);

    if (itemsSlice.length === 0) {
        return {
            products: [],
            productsByProductId: {},
            offset,
            limit,
            total,
        };
    }

    // Fetch product details for the slice, pass allItems to create placeholders
    const productsByProductId = await fetchProductsForWishlist(context, itemsSlice, allItems);

    // Convert products to ProductSearchHit format, keeping null placeholders for unfetched
    const products: (ShopperSearch.schemas['ProductSearchHit'] | null)[] = itemsSlice.map(
        (item: ShopperCustomers.schemas['CustomerProductListItem']) => {
            const product = item.productId ? productsByProductId[item.productId] : undefined;
            // Check if product has actual data (not just a placeholder with only id)
            const hasProductData = product && product.name;
            // Return null placeholder if product not fetched yet
            if (!hasProductData) {
                return null;
            }
            return convertProductToProductSearchHit(product);
        }
    );

    return {
        products,
        productsByProductId,
        offset,
        limit,
        total,
    };
}
