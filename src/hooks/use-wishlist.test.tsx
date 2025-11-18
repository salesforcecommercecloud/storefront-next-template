/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { useWishlist } from './use-wishlist';

// Mock dependencies
const mockAddToast = vi.fn();

const mockAddFetcher = {
    data: null as any,
    state: 'idle' as const,
    submit: vi.fn(),
};
const mockRemoveFetcher = {
    data: null as any,
    state: 'idle' as const,
    submit: vi.fn(),
};

let fetcherCallCount = 0;
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useFetcher: vi.fn(() => {
            // First call returns addFetcher, second call returns removeFetcher
            fetcherCallCount++;
            return fetcherCallCount === 1 ? mockAddFetcher : mockRemoveFetcher;
        }),
    };
});

vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock useRequireAuth to pass through the function without auth requirement for testing
vi.mock('@/hooks/use-require-auth', () => ({
    useRequireAuth: (fn: any) => fn,
}));

vi.mock('@/temp-ui-string', () => ({
    default: {
        product: {
            addedToWishlist: 'Added {productName} to wishlist',
            removedFromWishlist: 'Removed from wishlist',
            failedToAddToWishlist: 'Failed to add to wishlist',
            failedToRemoveFromWishlist: 'Failed to remove from wishlist',
            alreadyInWishlist: '{productName} is already in your wishlist',
            signInToAddToWishlist: 'Please sign in to add to wishlist',
        },
    },
}));

const mockProduct: ShopperSearch.schemas['ProductSearchHit'] = {
    productId: 'product-1',
    productName: 'Test Product',
    price: 99.99,
    currency: 'USD',
};

const mockVariant: ShopperSearch.schemas['ProductSearchHit'] = {
    productId: 'variant-1',
    productName: 'Test Variant',
    price: 99.99,
    currency: 'USD',
};

const wrapper = ({ children }: { children: React.ReactNode }) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: children,
            },
        ],
        {
            initialEntries: ['/'],
        }
    );

    return <RouterProvider router={router} />;
};

describe('useWishlist', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetcherCallCount = 0;
        mockAddFetcher.data = null;
        mockAddFetcher.state = 'idle';
        mockRemoveFetcher.data = null;
        mockRemoveFetcher.state = 'idle';
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should initialize with empty wishlist', () => {
        const { result } = renderHook(() => useWishlist(), { wrapper });

        expect(result.current.wishlist).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });

    test('should check if item is in wishlist', () => {
        const { result } = renderHook(() => useWishlist(), { wrapper });

        // Initially not in wishlist
        expect(result.current.isItemInWishlist(mockProduct)).toBe(false);
    });

    test('should check if variant is in wishlist', () => {
        const { result } = renderHook(() => useWishlist(), { wrapper });

        // Initially not in wishlist
        expect(result.current.isItemInWishlist(mockProduct, mockVariant)).toBe(false);
    });

    test('should add item to wishlist optimistically', async () => {
        // Set successful response
        mockAddFetcher.data = { success: true };

        const { result } = renderHook(() => useWishlist(), { wrapper });

        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        // Item should be added optimistically
        expect(result.current.isItemInWishlist(mockProduct)).toBe(true);
        expect(mockAddFetcher.submit).toHaveBeenCalledWith(
            { productId: 'product-1' },
            {
                method: 'POST',
                action: '/action/wishlist-add',
            }
        );
    });

    test('should remove item from wishlist optimistically', async () => {
        // Set successful responses for both add and remove
        mockAddFetcher.data = { success: true };
        mockRemoveFetcher.data = { success: true };

        const { result } = renderHook(() => useWishlist(), { wrapper });

        // First add the item
        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        expect(result.current.isItemInWishlist(mockProduct)).toBe(true);

        // Then remove it
        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        expect(result.current.isItemInWishlist(mockProduct)).toBe(false);
        expect(mockRemoveFetcher.submit).toHaveBeenCalledWith(
            { productId: 'product-1' },
            {
                method: 'POST',
                action: '/action/wishlist-remove',
            }
        );
    });

    test('should show success toast on successful add', async () => {
        // Mock successful response
        vi.mocked(mockAddFetcher).data = { success: true };

        const { result } = renderHook(() => useWishlist(), { wrapper });

        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        await waitFor(() => {
            expect(mockAddToast).toHaveBeenCalledWith('Added Test Product to wishlist', 'success');
        });
    });

    test('should show success toast on successful remove', async () => {
        // Set successful responses for both add and remove
        mockAddFetcher.data = { success: true };
        mockRemoveFetcher.data = { success: true };

        const { result } = renderHook(() => useWishlist(), { wrapper });

        // First add the item
        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        // Then remove it
        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        await waitFor(() => {
            expect(mockAddToast).toHaveBeenCalledWith('Removed from wishlist', 'success');
        });
    });

    test('should show info toast when product is already in wishlist', async () => {
        vi.mocked(mockAddFetcher).data = { success: true, alreadyInWishlist: true };

        const { result } = renderHook(() => useWishlist(), { wrapper });

        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        await waitFor(() => {
            expect(mockAddToast).toHaveBeenCalledWith('Test Product is already in your wishlist', 'info');
        });
    });

    test('should revert optimistic update on error', async () => {
        vi.mocked(mockAddFetcher).data = { success: false, error: 'Failed to add' };

        const { result } = renderHook(() => useWishlist(), { wrapper });

        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        await waitFor(() => {
            // Should be reverted
            expect(result.current.isItemInWishlist(mockProduct)).toBe(false);
            expect(mockAddToast).toHaveBeenCalledWith('Failed to add', 'error');
        });
    });

    test('should handle missing productId gracefully', async () => {
        const invalidProduct: ShopperSearch.schemas['ProductSearchHit'] = {
            productId: undefined,
            productName: 'Invalid Product',
        };

        const { result } = renderHook(() => useWishlist(), { wrapper });

        await act(async () => {
            await result.current.toggleWishlist(invalidProduct);
        });

        expect(mockAddFetcher.submit).not.toHaveBeenCalled();
        expect(mockRemoveFetcher.submit).not.toHaveBeenCalled();
        expect(mockAddToast).toHaveBeenCalledWith('Failed to add to wishlist', 'error');
    });

    test('should use variant productId when provided', async () => {
        const { result } = renderHook(() => useWishlist(), { wrapper });

        await act(async () => {
            await result.current.toggleWishlist(mockProduct, mockVariant);
        });

        expect(mockAddFetcher.submit).toHaveBeenCalledWith(
            { productId: 'variant-1' },
            {
                method: 'POST',
                action: '/action/wishlist-add',
            }
        );
    });

    test('should handle catch block errors', async () => {
        mockAddFetcher.submit.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useWishlist(), { wrapper });

        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        await waitFor(() => {
            // Should revert optimistic update
            expect(result.current.isItemInWishlist(mockProduct)).toBe(false);
            expect(mockAddToast).toHaveBeenCalledWith('Failed to add to wishlist', 'error');
        });
    });

    test('should indicate loading state when fetcher is not idle', () => {
        vi.mocked(mockAddFetcher).state = 'submitting';

        const { result } = renderHook(() => useWishlist(), { wrapper });

        expect(result.current.isLoading).toBe(true);
    });

    test('should return wishlist as array', async () => {
        // Set successful response
        mockAddFetcher.data = { success: true };

        const { result } = renderHook(() => useWishlist(), { wrapper });

        await act(async () => {
            await result.current.toggleWishlist(mockProduct);
        });

        expect(Array.isArray(result.current.wishlist)).toBe(true);
        expect(result.current.wishlist).toContain('product-1');
    });
});
