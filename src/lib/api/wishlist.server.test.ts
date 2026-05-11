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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { NormalizedApiError } from './normalized-api-error';
import { getWishlist } from './wishlist.server';

const mockGetCustomerProductList = vi.fn();
const mockGetCustomerProductLists = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(() => ({
        shopperCustomers: {
            getCustomerProductList: mockGetCustomerProductList,
            getCustomerProductLists: mockGetCustomerProductLists,
        },
    })),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: mockLoggerError,
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

describe('getWishlist — list-search branch (no listId)', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoggerError.mockClear();
    });

    test('returns the wish_list product list when present', async () => {
        const wishlist = {
            id: 'list-1',
            type: 'wish_list',
            customerProductListItems: [{ productId: 'sku-1', id: 'item-1' }],
        };
        mockGetCustomerProductLists.mockResolvedValue({ data: { data: [wishlist] } });

        const result = await getWishlist(mockContext, 'cust-1');

        expect(result.wishlist).toEqual(wishlist);
        expect(result.items).toEqual(wishlist.customerProductListItems);
        expect(result.id).toBe('list-1');
    });

    test('returns null shape when no wish_list type list is found (success path)', async () => {
        mockGetCustomerProductLists.mockResolvedValue({ data: { data: [{ id: 'other-1', type: 'gift_registry' }] } });

        const result = await getWishlist(mockContext, 'cust-1');

        expect(result).toEqual({ wishlist: null, items: [], id: null });
    });

    test('throws NormalizedApiError when API call fails with ApiError', async () => {
        const apiError = new ApiError({
            status: 401,
            statusText: 'Unauthorized',
            headers: new Headers(),
            body: { type: 'Unauthorized', title: 'Unauthorized', detail: 'Invalid credentials' },
            rawBody: JSON.stringify({ detail: 'Invalid credentials' }),
            url: 'https://api.example.com/customers/cust-1/product-lists',
            method: 'GET',
        });
        mockGetCustomerProductLists.mockRejectedValue(apiError);

        await expect(getWishlist(mockContext, 'cust-1')).rejects.toThrow(NormalizedApiError);
        await expect(getWishlist(mockContext, 'cust-1')).rejects.toMatchObject({ status: 401 });
    });

    test('throws NormalizedApiError when API call fails with non-API error', async () => {
        mockGetCustomerProductLists.mockRejectedValue(new TypeError('Network failure'));

        await expect(getWishlist(mockContext, 'cust-1')).rejects.toThrow(NormalizedApiError);
        await expect(getWishlist(mockContext, 'cust-1')).rejects.toThrow('Network failure');
    });

    test('logs operation context when API call fails', async () => {
        mockGetCustomerProductLists.mockRejectedValue(new Error('boom'));

        await getWishlist(mockContext, 'cust-1').catch(() => {});

        expect(mockLoggerError).toHaveBeenCalledWith(
            'shopperCustomers.getCustomerProductLists failed',
            expect.objectContaining({ customerId: 'cust-1' })
        );
    });
});

describe('getWishlist — listId-direct branch', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoggerError.mockClear();
    });

    test('returns the wishlist when fetched directly by listId', async () => {
        const wishlist = {
            id: 'list-1',
            type: 'wish_list',
            customerProductListItems: [{ productId: 'sku-1', id: 'item-1' }],
        };
        mockGetCustomerProductList.mockResolvedValue({ data: wishlist });

        const result = await getWishlist(mockContext, 'cust-1', 'list-1');

        expect(result.wishlist).toEqual(wishlist);
        expect(result.items).toEqual(wishlist.customerProductListItems);
        expect(result.id).toBe('list-1');
        expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
    });

    test('throws NormalizedApiError when listId-direct API call fails with ApiError', async () => {
        const apiError = new ApiError({
            status: 404,
            statusText: 'Not Found',
            headers: new Headers(),
            body: { type: 'Not Found', title: 'Not Found', detail: 'Wishlist not found' },
            rawBody: JSON.stringify({ detail: 'Wishlist not found' }),
            url: 'https://api.example.com/customers/cust-1/product-lists/list-1',
            method: 'GET',
        });
        mockGetCustomerProductList.mockRejectedValue(apiError);

        await expect(getWishlist(mockContext, 'cust-1', 'list-1')).rejects.toThrow(NormalizedApiError);
        await expect(getWishlist(mockContext, 'cust-1', 'list-1')).rejects.toMatchObject({ status: 404 });
    });

    test('throws NormalizedApiError when listId-direct API call fails with non-API error', async () => {
        mockGetCustomerProductList.mockRejectedValue(new TypeError('Network failure'));

        await expect(getWishlist(mockContext, 'cust-1', 'list-1')).rejects.toThrow(NormalizedApiError);
        await expect(getWishlist(mockContext, 'cust-1', 'list-1')).rejects.toThrow('Network failure');
    });

    test('logs operation context when listId-direct API call fails', async () => {
        mockGetCustomerProductList.mockRejectedValue(new Error('boom'));

        await getWishlist(mockContext, 'cust-1', 'list-1').catch(() => {});

        expect(mockLoggerError).toHaveBeenCalledWith(
            'shopperCustomers.getCustomerProductList failed',
            expect.objectContaining({ customerId: 'cust-1', listId: 'list-1' })
        );
    });
});
