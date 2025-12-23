/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { type ClientLoaderFunctionArgs } from 'react-router';
import type { ShopperCustomers, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { getAuth } from '@/middlewares/auth.client';
import { createApiClients } from '@/lib/api-clients';
import { isRegisteredCustomer } from '@/lib/api/customer';
import { convertProductToProductSearchHit } from '@/lib/product-conversion';
import { fetchProductsForWishlist } from '@/routes/account.wishlist';
import { getConfig } from '@/config';

/**
 * Client loader to fetch product details for a slice of wishlist items
 * This is used by PaginatedProductCarousel to load more products on demand
 */
// eslint-disable-next-line custom/no-async-page-loader,custom/no-client-loaders
export async function clientLoader({ request, context }: ClientLoaderFunctionArgs): Promise<{
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
    if (!session.customer_id) {
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

    const customerId = session.customer_id;
    const clients = createApiClients(context);

    // Get the customer's product lists
    const { data: productListsResponse } = await clients.shopperCustomers.getCustomerProductLists({
        params: {
            path: { customerId },
        },
    });

    // Find the wishlist
    const wishlist = productListsResponse?.data?.find((list) => list.type === 'wish_list');

    if (!wishlist) {
        return {
            products: [],
            productsByProductId: {},
            offset: 0,
            limit: 0,
            total: 0,
        };
    }

    // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
    // @ts-expect-error - listId and id may exist at runtime but are not in type definitions
    const listId = wishlist?.listId || wishlist?.id;
    if (!listId) {
        return {
            products: [],
            productsByProductId: {},
            offset: 0,
            limit: 0,
            total: 0,
        };
    }

    // Get the full wishlist with items
    const { data: fullWishlist } = await clients.shopperCustomers.getCustomerProductList({
        params: {
            path: {
                customerId,
                listId,
            },
        },
    });

    // Commerce SDK may return items in 'items' or 'customerProductListItems' field
    // @ts-expect-error - items and customerProductListItems may exist at runtime but are not in type definitions
    const allItems = fullWishlist?.items || fullWishlist?.customerProductListItems || [];
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
