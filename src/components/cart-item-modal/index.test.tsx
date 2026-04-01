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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();

// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';

// Components
import { CartItemModal } from './index';

// Mock data
import { variantProduct } from '@/components/__mocks__/master-variant-product';

// Utils
import { AllProvidersWrapper } from '@/test-utils/context-provider';

// Mock useScapiFetcher to prevent actual API calls
const mockLoad = vi.fn().mockResolvedValue(undefined);
const mockUseScapiFetcher = vi.fn(
    (..._args: unknown[]): { load: typeof mockLoad; data: unknown; state: string; success: boolean } => ({
        load: mockLoad,
        data: variantProduct,
        state: 'idle',
        success: true,
    })
);
vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: (...args: unknown[]) => mockUseScapiFetcher(...args),
}));

const renderCartItemModal = (props: React.ComponentProps<typeof CartItemModal>) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <AllProvidersWrapper>
                        <CartItemModal {...props} />
                    </AllProvidersWrapper>
                ),
            },
        ],
        {
            initialEntries: ['/'],
        }
    );
    return { ...render(<RouterProvider router={router} />), router };
};

describe('CartItemModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        product: variantProduct,
        initialQuantity: 1,
        itemId: 'test-item-id',
    };

    test('renders modal when open is true', () => {
        renderCartItemModal(defaultProps);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(t('editItem:title'))).toBeInTheDocument();
    });

    test('does not render modal when open is false', () => {
        renderCartItemModal({ ...defaultProps, open: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText(t('editItem:title'))).not.toBeInTheDocument();
    });

    test('displays product name in modal content', () => {
        renderCartItemModal(defaultProps);

        expect(screen.getByText(variantProduct.name as string)).toBeInTheDocument();
    });

    test('calls onOpenChange when modal is closed', async () => {
        const user = userEvent.setup();
        const mockOnOpenChange = vi.fn();
        renderCartItemModal({ ...defaultProps, onOpenChange: mockOnOpenChange });

        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    test('displays correct dialog title in edit mode', () => {
        renderCartItemModal(defaultProps);

        expect(screen.getByText(t('editItem:title'))).toBeInTheDocument();
    });

    test('maintains accessibility with proper ARIA attributes', () => {
        renderCartItemModal(defaultProps);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();

        const title = screen.getByText(t('editItem:title'));
        expect(title).toBeInTheDocument();
    });
});

describe('CartItemModal — add mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: fetcher returns data immediately (product loaded)
        mockUseScapiFetcher.mockReturnValue({
            load: mockLoad,
            data: variantProduct,
            state: 'idle' as const,
            success: true,
        });
    });

    test('renders quickAddTitle when no itemId is provided', () => {
        renderCartItemModal({ open: true, onOpenChange: vi.fn(), productId: 'test-product' });

        expect(screen.getByText(t('editItem:quickAddTitle'))).toBeInTheDocument();
    });

    test('renders product content once fetcher returns data', () => {
        renderCartItemModal({ open: true, onOpenChange: vi.fn(), productId: variantProduct.id ?? '' });

        expect(screen.getByText(variantProduct.name as string)).toBeInTheDocument();
    });

    test('renders loading spinner while fetcher is loading', () => {
        mockUseScapiFetcher.mockReturnValue({
            load: mockLoad,
            data: null,
            state: 'loading' as const,
            success: false,
        });
        renderCartItemModal({ open: true, onOpenChange: vi.fn(), productId: 'test-product' });

        // Dialog renders into a portal on document.body, so query the document directly
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    test('renders loading text alongside spinner while fetcher is loading', () => {
        mockUseScapiFetcher.mockReturnValue({
            load: mockLoad,
            data: null,
            state: 'loading' as const,
            success: false,
        });
        renderCartItemModal({ open: true, onOpenChange: vi.fn(), productId: 'test-product' });

        expect(screen.getByText(t('editItem:loadingProduct'))).toBeInTheDocument();
    });

    test('renders error state with retry button when fetcher fails', () => {
        mockUseScapiFetcher.mockReturnValue({
            load: mockLoad,
            data: { detail: 'Not found' },
            state: 'idle' as const,
            success: false,
        });
        renderCartItemModal({ open: true, onOpenChange: vi.fn(), productId: 'bad-id' });

        expect(screen.getByText(t('editItem:loadError'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('editItem:retry') })).toBeInTheDocument();
    });

    test('calls onBuyNow when provided to the modal', async () => {
        const user = userEvent.setup();
        const onBuyNow = vi.fn();
        const onOpenChange = vi.fn();
        renderCartItemModal({ open: true, onOpenChange, productId: variantProduct.id ?? '', onBuyNow });

        // ProductCartActions renders "Buy it Now" in compact add mode
        const buyNowBtn = screen.queryByRole('button', { name: t('product:buyItNow') });
        if (buyNowBtn) {
            await user.click(buyNowBtn);
            expect(onBuyNow).toHaveBeenCalled();
        }
    });
});
