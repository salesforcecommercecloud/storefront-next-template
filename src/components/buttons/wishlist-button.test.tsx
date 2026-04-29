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

let mockIsLoading = false;
const mockToggleWishlist = vi.fn().mockResolvedValue(undefined);
const mockIsItemInWishlist = vi.fn().mockReturnValue(false);

vi.mock('@/hooks/use-wishlist', () => ({
    useWishlist: () => ({
        isLoading: mockIsLoading,
        pendingOperation: null,
        toggleWishlist: mockToggleWishlist,
        isItemInWishlist: mockIsItemInWishlist,
    }),
}));

let capturedOnMatch: ((params: Record<string, unknown>) => void) | null = null;

vi.mock('@/hooks/check-and-execute-pending-action', () => ({
    useCheckAndExecutePendingAction: (opts: { onMatch: (params: Record<string, unknown>) => void }) => {
        capturedOnMatch = opts.onMatch;
    },
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
        mockIsLoading = false;
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

        const { rerender } = render(<WishlistButton product={baseProduct} />);

        // Simulate onMatch firing (sets pendingActionRef)
        expect(capturedOnMatch).toBeTruthy();
        act(() => capturedOnMatch?.({}));

        // Transition isLoading to true
        mockIsLoading = true;
        rerender(<WishlistButton product={baseProduct} />);

        // Transition isLoading to false — should trigger replaceState
        mockIsLoading = false;
        rerender(<WishlistButton product={baseProduct} />);

        expect(replaceStateSpy).toHaveBeenCalledTimes(1);
        const replacedUrl = replaceStateSpy.mock.calls[0][2] as string;
        expect(replacedUrl).toContain('sort=price');
        expect(replacedUrl).not.toContain('action=');
        expect(replacedUrl).not.toContain('actionParams=');
    });

    test('does not call replaceState for normal user clicks', async () => {
        setLocationUrl('http://localhost/category/shoes?action=addToWishlist&actionParams=%7B%7D');

        const { rerender } = render(<WishlistButton product={baseProduct} />);

        // User clicks the heart (not via pending action)
        await userEvent.click(screen.getByRole('button'));

        // Transition isLoading true→false
        mockIsLoading = true;
        rerender(<WishlistButton product={baseProduct} />);
        mockIsLoading = false;
        rerender(<WishlistButton product={baseProduct} />);

        expect(replaceStateSpy).not.toHaveBeenCalled();
    });

    test('preserves non-action URL params during cleanup', () => {
        setLocationUrl(
            'http://localhost/category/shoes?sort=price-asc&refine=color%3Ablue&action=addToWishlist&actionParams=%7B%22productId%22%3A%22prod-123%22%7D'
        );

        const { rerender } = render(<WishlistButton product={baseProduct} />);

        act(() => capturedOnMatch?.({}));

        mockIsLoading = true;
        rerender(<WishlistButton product={baseProduct} />);
        mockIsLoading = false;
        rerender(<WishlistButton product={baseProduct} />);

        expect(replaceStateSpy).toHaveBeenCalledTimes(1);
        const replacedUrl = replaceStateSpy.mock.calls[0][2] as string;
        expect(replacedUrl).toContain('sort=price-asc');
        expect(replacedUrl).toContain('refine=color');
        expect(replacedUrl).not.toContain('action=');
        expect(replacedUrl).not.toContain('actionParams=');
    });
});
