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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import { loader } from './resource.basket-products';
import { createTestContext } from '@/lib/test-utils';

// Mock getBasket
vi.mock('@/middlewares/basket.server', () => ({
    getBasket: vi.fn(),
}));

// Mock createApiClients
vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

// Mock getConfig - use importOriginal to preserve other exports like appConfigContext
vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as Record<string, unknown>),
        getConfig: vi.fn(() => ({
            commerce: {
                api: {
                    organizationId: 'test-org',
                    siteId: 'test-site',
                },
            },
        })),
    };
});

import { getBasket } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients';

describe('resource.basket-products', () => {
    let mockContext: ReturnType<typeof createTestContext>;

    const mockProduct1 = {
        id: 'product-1',
        name: 'Test Product 1',
        imageGroups: [{ viewType: 'small', images: [{ link: 'https://example.com/1.jpg' }] }],
    };

    const mockProduct2 = {
        id: 'product-2',
        name: 'Test Product 2',
        imageGroups: [{ viewType: 'small', images: [{ link: 'https://example.com/2.jpg' }] }],
    };

    const mockGetProducts = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = createTestContext();

        vi.mocked(createApiClients).mockReturnValue({
            shopperProducts: {
                getProducts: mockGetProducts,
            },
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const createLoaderArgs = (): LoaderFunctionArgs => ({
        params: {},
        context: mockContext,
        request: new Request('http://localhost/resource/basket-products'),
    });

    it('should return empty object when basket is undefined', async () => {
        vi.mocked(getBasket).mockResolvedValue({ current: undefined } as any);

        const result = await loader(createLoaderArgs());

        expect(result).toEqual({});
        expect(mockGetProducts).not.toHaveBeenCalled();
    });

    it('should return empty object when basket has no product items', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: { basketId: 'basket-123', productItems: [] },
        } as any);

        const result = await loader(createLoaderArgs());

        expect(result).toEqual({});
        expect(mockGetProducts).not.toHaveBeenCalled();
    });

    it('should return empty object when basket has product items without productId', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'basket-123',
                productItems: [
                    { itemId: 'item-1', quantity: 1 },
                    { itemId: 'item-2', quantity: 2 },
                ],
            },
        } as any);

        const result = await loader(createLoaderArgs());

        expect(result).toEqual({});
        expect(mockGetProducts).not.toHaveBeenCalled();
    });

    it('should fetch and return products by ID', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'basket-123',
                productItems: [
                    { itemId: 'item-1', productId: 'product-1', quantity: 1 },
                    { itemId: 'item-2', productId: 'product-2', quantity: 2 },
                ],
            },
        } as any);

        mockGetProducts.mockResolvedValue({
            data: {
                data: [mockProduct1, mockProduct2],
            },
        });

        const result = await loader(createLoaderArgs());

        expect(result).toEqual({
            'product-1': mockProduct1,
            'product-2': mockProduct2,
        });

        expect(mockGetProducts).toHaveBeenCalledWith({
            params: {
                path: {
                    organizationId: 'test-org',
                },
                query: {
                    siteId: 'test-site',
                    ids: ['product-1', 'product-2'],
                    allImages: true,
                    perPricebook: true,
                    currency: 'USD',
                },
            },
        });
    });

    it('should handle API errors gracefully', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'basket-123',
                productItems: [{ itemId: 'item-1', productId: 'product-1', quantity: 1 }],
            },
        } as any);

        mockGetProducts.mockRejectedValue(new Error('API Error'));

        const result = await loader(createLoaderArgs());

        expect(result).toEqual({});
    });

    it('should return empty object when API returns no data', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'basket-123',
                productItems: [{ itemId: 'item-1', productId: 'product-1', quantity: 1 }],
            },
        } as any);

        mockGetProducts.mockResolvedValue({
            data: { data: null },
        });

        const result = await loader(createLoaderArgs());

        expect(result).toEqual({});
    });

    it('should filter out items without productId', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'basket-123',
                productItems: [
                    { itemId: 'item-1', productId: 'product-1', quantity: 1 },
                    { itemId: 'item-2', quantity: 2 }, // No productId
                    { itemId: 'item-3', productId: '', quantity: 3 }, // Empty productId
                ],
            },
        } as any);

        mockGetProducts.mockResolvedValue({
            data: {
                data: [mockProduct1],
            },
        });

        await loader(createLoaderArgs());

        // Should only request product-1
        expect(mockGetProducts).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    query: expect.objectContaining({
                        ids: ['product-1'],
                    }),
                }),
            })
        );
    });
});
