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

import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WishlistButton } from './wishlist-button';

let mockIsPending = false;
const mockToggle = vi.fn().mockResolvedValue({ success: true, data: null });
// `mockIsMember` survives as the source of truth for the per-product hook in
// these tests; toast/analytics branches read it via useIsInWishlist below.
const mockIsMember = vi.fn().mockReturnValue(false);

vi.mock('@/providers/wishlist', () => ({
    useIsInWishlist: (productId: string | undefined) => (productId ? (mockIsMember(productId) as boolean) : false),
    useWishlistActions: () => ({
        add: vi.fn(),
        remove: vi.fn(),
        toggle: mockToggle,
        isPending: mockIsPending,
    }),
}));

let capturedOnMatch: ((params: Record<string, unknown>) => void) | null = null;

vi.mock('@/hooks/check-and-execute-pending-action', () => ({
    useCheckAndExecutePendingAction: (opts: { onMatch: (params: Record<string, unknown>) => void }) => {
        capturedOnMatch = opts.onMatch;
    },
}));

// Pass-through useRequireAuth so the component runs the toggle action without an auth context.
vi.mock('@/hooks/use-require-auth', () => ({
    useRequireAuth: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
}));

const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../icons', () => ({
    HeartIcon: ({ isFilled, isLoading, onClick }: { isFilled: boolean; isLoading: boolean; onClick: () => void }) => (
        <button
            data-filled={isFilled}
            data-loading={isLoading}
            onClick={onClick}
            aria-label={isLoading ? 'loading' : isFilled ? 'filled' : 'empty'}>
            heart
        </button>
    ),
}));

const baseProduct = { productId: 'prod-123', productName: 'Test Shoe' } as Parameters<
    typeof WishlistButton
>[0]['product'];

describe('WishlistButton — replaceState cleanup', () => {
    let replaceStateSpy: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIsPending = false;
        capturedOnMatch = null;
        replaceStateSpy = vi.fn();
        vi.spyOn(window.history, 'replaceState').mockImplementation(replaceStateSpy);
    });

    function setLocationUrl(url: string) {
        Object.defineProperty(window, 'location', {
            value: new URL(url),
            writable: true,
            configurable: true,
        });
    }

    test('calls replaceState after pending action completes (isLoading true→false)', () => {
        setLocationUrl('http://localhost/category/shoes?sort=price&action=addToWishlist&actionParams=%7B%7D');

        const { rerender } = render(<WishlistButton product={baseProduct} surface="pdp" />);

        // Simulate onMatch firing (sets pendingActionRef)
        expect(capturedOnMatch).toBeTruthy();
        act(() => capturedOnMatch?.({}));

        // Transition isPending to true
        mockIsPending = true;
        rerender(<WishlistButton product={baseProduct} surface="pdp" />);

        // Transition isPending to false — should trigger replaceState
        mockIsPending = false;
        rerender(<WishlistButton product={baseProduct} surface="pdp" />);

        expect(replaceStateSpy).toHaveBeenCalledTimes(1);
        const replacedUrl = replaceStateSpy.mock.calls[0][2] as string;
        expect(replacedUrl).toContain('sort=price');
        expect(replacedUrl).not.toContain('action=');
        expect(replacedUrl).not.toContain('actionParams=');
    });

    test('does not call replaceState for normal user clicks', async () => {
        setLocationUrl('http://localhost/category/shoes?action=addToWishlist&actionParams=%7B%7D');

        const { rerender } = render(<WishlistButton product={baseProduct} surface="pdp" />);

        // User clicks the heart (not via pending action)
        await userEvent.click(screen.getByRole('button'));

        // Transition isPending true→false
        mockIsPending = true;
        rerender(<WishlistButton product={baseProduct} surface="pdp" />);
        mockIsPending = false;
        rerender(<WishlistButton product={baseProduct} surface="pdp" />);

        expect(replaceStateSpy).not.toHaveBeenCalled();
    });

    test('preserves non-action URL params during cleanup', () => {
        setLocationUrl(
            'http://localhost/category/shoes?sort=price-asc&refine=color%3Ablue&action=addToWishlist&actionParams=%7B%22productId%22%3A%22prod-123%22%7D'
        );

        const { rerender } = render(<WishlistButton product={baseProduct} surface="pdp" />);

        act(() => capturedOnMatch?.({}));

        mockIsPending = true;
        rerender(<WishlistButton product={baseProduct} surface="pdp" />);
        mockIsPending = false;
        rerender(<WishlistButton product={baseProduct} surface="pdp" />);

        expect(replaceStateSpy).toHaveBeenCalledTimes(1);
        const replacedUrl = replaceStateSpy.mock.calls[0][2] as string;
        expect(replacedUrl).toContain('sort=price-asc');
        expect(replacedUrl).toContain('refine=color');
        expect(replacedUrl).not.toContain('action=');
        expect(replacedUrl).not.toContain('actionParams=');
    });
});

describe('WishlistButton — toast UX', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsPending = false;
        mockIsMember.mockReturnValue(false);
        mockToggle.mockReset();
    });

    test('success add: shows addedToWishlist success toast', async () => {
        mockIsMember.mockReturnValue(false);
        mockToggle.mockResolvedValue({ success: true, data: null });

        render(<WishlistButton product={baseProduct} surface="pdp" />);
        await userEvent.click(screen.getByRole('button'));

        expect(mockAddToast).toHaveBeenCalledTimes(1);
        const [message, level] = mockAddToast.mock.calls[0];
        expect(message).toBe('Added Test Shoe to wishlist.');
        expect(level).toBe('success');
    });

    test('success remove: shows removedFromWishlist success toast', async () => {
        mockIsMember.mockReturnValue(true);
        mockToggle.mockResolvedValue({ success: true, data: null });

        render(<WishlistButton product={baseProduct} surface="pdp" />);
        await userEvent.click(screen.getByRole('button'));

        expect(mockAddToast).toHaveBeenCalledTimes(1);
        const [message, level] = mockAddToast.mock.calls[0];
        expect(message).toBe('Removed from wishlist.');
        expect(level).toBe('success');
    });

    test('failure add: shows failedToAddToWishlist error toast', async () => {
        mockIsMember.mockReturnValue(false);
        mockToggle.mockResolvedValue({ success: false, errors: ['Boom'] });

        render(<WishlistButton product={baseProduct} surface="pdp" />);
        await userEvent.click(screen.getByRole('button'));

        expect(mockAddToast).toHaveBeenCalledTimes(1);
        const [message, level] = mockAddToast.mock.calls[0];
        expect(message).toBe('Failed to add item to wishlist.');
        expect(level).toBe('error');
    });

    test('alreadyInWishlist signal: shows alreadyInWishlist info toast', async () => {
        // wasInWishlist=false → would otherwise show addedToWishlist; the
        // alreadyInWishlist signal in result.data must take precedence.
        mockIsMember.mockReturnValue(false);
        mockToggle.mockResolvedValue({ success: true, data: { alreadyInWishlist: true } });

        render(<WishlistButton product={baseProduct} surface="pdp" />);
        await userEvent.click(screen.getByRole('button'));

        expect(mockAddToast).toHaveBeenCalledTimes(1);
        const [message, level] = mockAddToast.mock.calls[0];
        expect(message).toBe('Test Shoe is already in your wishlist.');
        expect(level).toBe('info');
    });
});
