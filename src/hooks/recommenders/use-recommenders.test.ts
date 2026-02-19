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
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRecommenders, type RecommendersAdapter, type Recommendation, type Product } from './use-recommenders';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the useRecommendersAdapter hook
vi.mock('@/providers/recommenders', () => ({
    useRecommendersAdapter: vi.fn(),
}));

// Mock the currency provider
vi.mock('@/providers/currency', () => ({
    useCurrency: vi.fn().mockReturnValue('USD'),
}));

// Mock the auth provider
vi.mock('@/providers/auth', () => ({
    useAuth: vi.fn().mockReturnValue({
        usid: 'test-usid-123',
        userType: 'guest',
        customerId: null,
    }),
}));

describe('useRecommenders', () => {
    let mockAdapter: RecommendersAdapter;
    let mockFetch: ReturnType<typeof vi.fn>;

    const mockRecommendation: Recommendation = {
        recoUUID: 'test-uuid-123',
        recommenderName: 'test-recommender',
        displayMessage: 'Test recommendations',
        recs: [
            {
                id: 'product-1',
                productId: 'product-1',
                image_url: 'https://example.com/product1.jpg',
                product_name: 'Test Product 1',
            },
            {
                id: 'product-2',
                productId: 'product-2',
                image_url: 'https://example.com/product2.jpg',
                product_name: 'Test Product 2',
            },
        ],
    };

    const mockProductDetails = {
        data: [
            {
                id: 'product-1',
                name: 'Test Product 1',
                price: 99.99,
            },
            {
                id: 'product-2',
                name: 'Test Product 2',
                price: 149.99,
            },
        ],
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockProductDetails),
        } as Response);

        mockAdapter = {
            getRecommenders: vi.fn().mockResolvedValue({ recommenders: [] }),
            getRecommendations: vi.fn().mockResolvedValue(mockRecommendation),
            getZoneRecommendations: vi.fn().mockResolvedValue(mockRecommendation),
        };

        // Mock the useRecommendersAdapter hook to return our mock adapter
        const { useRecommendersAdapter } = await import('@/providers/recommenders');
        vi.mocked(useRecommendersAdapter).mockReturnValue(mockAdapter);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useRecommenders(true));

            expect(result.current.isLoading).toBe(false);
            expect(result.current.isEnabled).toBe(true);
            expect(result.current.recommendations).toEqual({});
        });

        it('should respect isEnabled flag', () => {
            const { result } = renderHook(() => useRecommenders(false));

            expect(result.current.isEnabled).toBe(false);
        });
    });

    describe('getRecommenders', () => {
        it('should call adapter getRecommenders when enabled', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommenders();
            });

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockAdapter.getRecommenders).toHaveBeenCalledTimes(1);
        });

        it('should return empty object when disabled', async () => {
            const { result } = renderHook(() => useRecommenders(false));

            const recommenders = await act(async () => {
                return await result.current.getRecommenders();
            });

            expect(recommenders).toEqual({});
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockAdapter.getRecommenders).not.toHaveBeenCalled();
        });
    });

    describe('getRecommendations', () => {
        it('should fetch and enrich recommendations', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            // Now passes user parameters (cookieId) even when args is undefined
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockAdapter.getRecommendations).toHaveBeenCalledWith('test-recommender', undefined, {
                cookieId: 'test-usid-123',
            });
            // Fetch now uses encoded resource URL format with GET method (no second argument)
            expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/resource\/api\/client\/.+$/));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.recommendations).toHaveProperty('recs');
                expect(result.current.recommendations.recommenderName).toBe('test-recommender');
            });
        });

        it('should set loading state during fetch', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            act(() => {
                void result.current.getRecommendations('test-recommender');
            });

            expect(result.current.isLoading).toBe(true);

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should pass products and args to adapter', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            const products: Product[] = [{ id: 'prod-1', price: 50 }];
            const args = { limit: 5 };

            await act(async () => {
                await result.current.getRecommendations('test-recommender', products, args);
            });

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockAdapter.getRecommendations).toHaveBeenCalledWith('test-recommender', products, {
                ...args,
                cookieId: 'test-usid-123',
            });
        });

        it('should not fetch when disabled', async () => {
            const { result } = renderHook(() => useRecommenders(false));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockAdapter.getRecommendations).not.toHaveBeenCalled();
            expect(result.current.isLoading).toBe(false);
        });

        it('should handle empty recommendations', async () => {
            mockAdapter.getRecommendations = vi.fn().mockResolvedValue({ recs: [] });

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            expect(mockFetch).not.toHaveBeenCalled();
            await waitFor(() => {
                expect(result.current.recommendations).toEqual({
                    recs: [],
                    recommenderName: 'test-recommender',
                });
            });
        });

        it('should handle fetch errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should cancel previous request when new request is made', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            // Start first request
            act(() => {
                void result.current.getRecommendations('recommender-1');
            });

            // Start second request immediately
            await act(async () => {
                await result.current.getRecommendations('recommender-2');
            });

            // Only second request should complete
            await waitFor(() => {
                expect(result.current.recommendations.recommenderName).toBe('recommender-2');
            });
        });
    });

    describe('getZoneRecommendations', () => {
        it('should fetch zone recommendations', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getZoneRecommendations('test-zone');
            });

            // Now passes user parameters (cookieId) even when args is undefined
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockAdapter.getZoneRecommendations).toHaveBeenCalledWith('test-zone', undefined, {
                cookieId: 'test-usid-123',
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.recommendations).toHaveProperty('recs');
            });
        });

        it('should pass products and args to adapter', async () => {
            const { result } = renderHook(() => useRecommenders(true));

            const products: Product[] = [{ id: 'prod-1', price: 50 }];
            const args = { limit: 10 };

            await act(async () => {
                await result.current.getZoneRecommendations('test-zone', products, args);
            });

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockAdapter.getZoneRecommendations).toHaveBeenCalledWith('test-zone', products, {
                ...args,
                cookieId: 'test-usid-123',
            });
        });

        it('should not fetch when disabled', async () => {
            const { result } = renderHook(() => useRecommenders(false));

            await act(async () => {
                await result.current.getZoneRecommendations('test-zone');
            });

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockAdapter.getZoneRecommendations).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should abort pending requests on unmount', async () => {
            const { result, unmount } = renderHook(() => useRecommenders(true));

            // Start a request
            act(() => {
                void result.current.getRecommendations('test-recommender');
            });

            // Unmount before request completes
            unmount();

            // Wait a bit to ensure cleanup happened
            await new Promise((resolve) => setTimeout(resolve, 100));

            // No errors should occur from the aborted request
            expect(result.current.isLoading).toBe(true); // State snapshot before unmount
        });
    });

    describe('product enrichment', () => {
        it('should filter out unavailable products', async () => {
            // Mock Einstein returning 2 products
            // eslint-disable-next-line @typescript-eslint/unbound-method
            vi.mocked(mockAdapter.getRecommendations).mockResolvedValue({
                recoUUID: 'test-uuid',
                recommenderName: 'test-recommender',
                recs: [
                    { id: 'product-1', productId: 'product-1', image_url: 'img1.jpg', product_name: 'Product 1' },
                    { id: 'product-2', productId: 'product-2', image_url: 'img2.jpg', product_name: 'Product 2' },
                ],
            });

            // But fetch only returns product-1 from SCAPI (product-2 will be filtered out)
            mockFetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        data: { data: [{ id: 'product-1', name: 'Test Product 1', price: 99.99 }] },
                    }),
            } as Response);

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                // Should only have product-1 since product-2 wasn't found in SCAPI response
                expect(result.current.recommendations.recs).toHaveLength(1);
                expect(result.current.recommendations.recs?.[0]?.id).toBe('product-1');
            });
        });

        it('should merge product details with recommendations', async () => {
            // Mock Einstein returning product with Einstein metadata
            // eslint-disable-next-line @typescript-eslint/unbound-method
            vi.mocked(mockAdapter.getRecommendations).mockResolvedValue({
                recoUUID: 'test-uuid',
                recommenderName: 'test-recommender',
                recs: [
                    {
                        id: 'product-1',
                        productId: 'product-1',
                        image_url: 'einstein-img.jpg',
                        product_name: 'Einstein Product Name',
                    },
                ],
            });

            // Mock SCAPI product details
            mockFetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        data: {
                            data: [
                                {
                                    id: 'product-1',
                                    name: 'SCAPI Product Name',
                                    price: 99.99,
                                    currency: 'USD',
                                },
                            ],
                        },
                    }),
            } as Response);

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                const recs = result.current.recommendations.recs;
                expect(recs).toBeDefined();
                expect(recs).toHaveLength(1);
                const firstRec = recs?.[0];
                expect(firstRec).toBeDefined();
                // Should have Einstein data preserved
                expect(firstRec?.image_url).toBe('einstein-img.jpg');
                expect(firstRec?.product_name).toBe('Einstein Product Name');
                // Should have SCAPI data merged
                expect(firstRec?.id).toBe('product-1');
                expect(firstRec?.productId).toBe('product-1');
            });
        });
    });

    describe('Silent Error Handling', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should set error state when getRecommendations fails', async () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            vi.mocked(mockAdapter.getRecommendations).mockRejectedValue(new Error('API Error'));

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should set error state when getZoneRecommendations fails', async () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            vi.mocked(mockAdapter.getZoneRecommendations).mockRejectedValue(new Error('API Error'));

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getZoneRecommendations('test-zone');
            });

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should handle network errors in product fetch gracefully', async () => {
            // Mock Einstein returning recommendations
            // eslint-disable-next-line @typescript-eslint/unbound-method
            vi.mocked(mockAdapter.getRecommendations).mockResolvedValue({
                recs: [{ id: 'product-1', productId: 'product-1', image_url: 'img.jpg', product_name: 'Product 1' }],
            });

            // But product fetch fails
            mockFetch.mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            // Product fetch errors are handled gracefully - recommendations are returned unenriched
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                // When fetch fails, original recommendations are returned (not enriched with SCAPI data)
                expect(result.current.recommendations.recs).toHaveLength(1);
                expect(result.current.recommendations.recs?.[0]?.id).toBe('product-1');
                // Einstein metadata should still be present
                expect(result.current.recommendations.recs?.[0]?.image_url).toBe('img.jpg');
            });
        });

        it('should handle non-OK response in product fetch', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
            } as Response);

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            // Should complete without crashing
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should recover from errors on subsequent calls', async () => {
            // First call fails
            // eslint-disable-next-line @typescript-eslint/unbound-method
            vi.mocked(mockAdapter.getRecommendations).mockRejectedValueOnce(new Error('First error'));

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
            });

            // Second call succeeds
            // eslint-disable-next-line @typescript-eslint/unbound-method
            vi.mocked(mockAdapter.getRecommendations).mockResolvedValueOnce({
                recs: [{ id: 'product-1', productId: 'product-1' }],
            });

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            await waitFor(() => {
                expect(result.current.error).toBeNull();
                expect(result.current.recommendations).toBeTruthy();
            });
        });

        it('should handle malformed response data', async () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            vi.mocked(mockAdapter.getRecommendations).mockResolvedValue({
                recs: null as any, // Malformed data
            });

            const { result } = renderHook(() => useRecommenders(true));

            await act(async () => {
                await result.current.getRecommendations('test-recommender');
            });

            // Should not crash
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });
    });
});
