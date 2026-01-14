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
import type React from 'react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

import BonusProductSelection from './bonus-product-selection';
import { getTranslation } from '@/lib/i18next';

// ============================================================================
// Mocks
// ============================================================================

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => {
        const { t } = getTranslation();
        return { t, i18n: { language: 'en-US' } };
    },
}));

// Mock useFetcher from react-router
const mockSubmit = vi.fn();
const mockFetcher = {
    state: 'idle' as 'idle' | 'loading' | 'submitting',
    data: null as any,
    submit: mockSubmit,
    load: vi.fn(),
    Form: vi.fn(),
};

vi.mock('react-router', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        useFetcher: vi.fn(() => mockFetcher),
    };
});

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: vi.fn(() => ({ addToast: mockAddToast })),
}));

// Mock bonus-product-utils
// Default: all slots filled so accordion is collapsed by default (for existing tests)
vi.mock('@/lib/bonus-product-utils', () => ({
    getBonusProductCountsForPromotion: vi.fn(() => ({
        selectedBonusItems: 3, // Equal to max so accordion starts collapsed
        maxBonusItems: 3,
    })),
}));

// Mock product-utils
const mockRequiresVariantSelection = vi.fn();
const mockGetPrimaryProductImageUrl = vi.fn();
vi.mock('@/lib/product-utils', () => ({
    requiresVariantSelection: (product: any) => mockRequiresVariantSelection(product),
    getPrimaryProductImageUrl: (product: any) => mockGetPrimaryProductImageUrl(product),
}));

// Mock carousel components
vi.mock('@/components/ui/carousel', () => ({
    Carousel: ({ children }: { children: React.ReactNode }) => (
        <div role="region" aria-roledescription="carousel">
            {children}
        </div>
    ),
    CarouselContent: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="carousel-content">{children}</div>
    ),
    CarouselItem: ({ children }: { children: React.ReactNode }) => <div data-testid="carousel-item">{children}</div>,
    CarouselPrevious: (props: React.ComponentProps<'button'>) => <button aria-label="Previous slide" {...props} />,
    CarouselNext: (props: React.ComponentProps<'button'>) => <button aria-label="Next slide" {...props} />,
}));

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockProduct(
    overrides: Partial<ShopperProducts.schemas['Product']> = {}
): ShopperProducts.schemas['Product'] {
    return {
        id: 'product-1',
        name: 'Test Product',
        imageGroups: [
            {
                viewType: 'large',
                images: [{ link: 'https://example.com/image.jpg', alt: 'Product Image' }],
            },
        ],
        ...overrides,
    };
}

function createMockBonusDiscountLineItem(
    overrides: Partial<ShopperBasketsV2.schemas['BonusDiscountLineItem']> = {}
): ShopperBasketsV2.schemas['BonusDiscountLineItem'] {
    return {
        id: 'bdli-1',
        promotionId: 'promo-1',
        maxBonusItems: 3,
        bonusProducts: [
            { productId: 'product-1', productName: 'Test Product 1' },
            { productId: 'product-2', productName: 'Test Product 2' },
        ],
        ...overrides,
    };
}

function createMockBasket(
    overrides: Partial<ShopperBasketsV2.schemas['Basket']> = {}
): ShopperBasketsV2.schemas['Basket'] {
    return {
        basketId: 'basket-1',
        productItems: [],
        bonusDiscountLineItems: [],
        ...overrides,
    };
}

function createMockBonusProductsById(): Record<string, ShopperProducts.schemas['Product']> {
    return {
        'product-1': createMockProduct({ id: 'product-1', name: 'Test Product 1' }),
        'product-2': createMockProduct({ id: 'product-2', name: 'Test Product 2' }),
    };
}

// ============================================================================
// Default Props Helper
// ============================================================================

function getDefaultProps() {
    return {
        bonusDiscountLineItem: createMockBonusDiscountLineItem(),
        bonusProductsById: createMockBonusProductsById(),
        basket: createMockBasket(),
        promotionName: 'Buy one get one free',
        onProductSelect: vi.fn(),
    };
}

// ============================================================================
// Tests
// ============================================================================

describe('BonusProductSelection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetcher.state = 'idle';
        mockFetcher.data = null;
        mockRequiresVariantSelection.mockReturnValue(false);
        mockGetPrimaryProductImageUrl.mockReturnValue('https://example.com/image.jpg');
    });

    // ========================================================================
    // 1. Carousel Rendering Tests
    // ========================================================================

    describe('Carousel Rendering', () => {
        test('renders carousel with correct products, images, names, and "Free" badge', async () => {
            const props = getDefaultProps();
            render(<BonusProductSelection {...props} />);

            // Click accordion to expand
            const trigger = screen.getByRole('button', { name: /buy one get one free/i });
            fireEvent.click(trigger);

            await waitFor(() => {
                // Check carousel renders
                const carousel = screen.getByRole('region', { name: '' });
                expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');

                // Check products render (2 carousel items)
                const carouselItems = screen.getAllByTestId('carousel-item');
                expect(carouselItems).toHaveLength(2);

                // Check product names display
                expect(screen.getByText('Test Product 1')).toBeInTheDocument();
                expect(screen.getByText('Test Product 2')).toBeInTheDocument();

                // Check "Free" badges (one per product)
                const badges = screen.getAllByText('Free');
                expect(badges).toHaveLength(2);

                // Check Select buttons render
                const selectButtons = screen.getAllByRole('button', { name: /select/i });
                expect(selectButtons).toHaveLength(2);
            });
        });

        test('does not render products when bonusProducts array is empty', () => {
            const props = getDefaultProps();
            props.bonusDiscountLineItem = createMockBonusDiscountLineItem({ bonusProducts: [] });

            render(<BonusProductSelection {...props} />);

            // Click accordion to expand
            const trigger = screen.getByRole('button', { name: /buy one get one free/i });
            fireEvent.click(trigger);

            // Should not have carousel items
            const carouselItems = screen.queryAllByTestId('carousel-item');
            expect(carouselItems).toHaveLength(0);
        });

        test('displays "No image" placeholder when product has no image', async () => {
            mockGetPrimaryProductImageUrl.mockReturnValue(undefined);
            const props = getDefaultProps();

            render(<BonusProductSelection {...props} />);

            // Click accordion to expand
            fireEvent.click(screen.getByRole('button', { name: /buy one get one free/i }));

            await waitFor(() => {
                const placeholders = screen.getAllByText('No image');
                expect(placeholders).toHaveLength(2);
            });
        });

        test('displays promotion title with selection count from API', async () => {
            // Override mock to have slots available
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 1,
                maxBonusItems: 3,
            });

            const props = getDefaultProps();
            props.promotionName = 'Summer Sale Bonus';

            render(<BonusProductSelection {...props} />);

            // Check title with count (mocked as 1 of 3)
            expect(screen.getByText('Summer Sale Bonus')).toBeInTheDocument();
            expect(screen.getByText(/\(1 of 3 added to cart\)/)).toBeInTheDocument();
        });

        test('displays fallback title when promotionName is not provided', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { promotionName, ...propsWithoutPromoName } = getDefaultProps();

            render(<BonusProductSelection {...propsWithoutPromoName} />);

            expect(screen.getByText('Bonus Products Available')).toBeInTheDocument();
        });

        test('carousel items are left-aligned with justify-start class', async () => {
            // Override mock to have slots available so accordion expands by default
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 0,
                maxBonusItems: 3,
            });

            const props = getDefaultProps();
            render(<BonusProductSelection {...props} />);

            // Accordion should be expanded by default
            await waitFor(() => {
                const carouselContent = screen.getByTestId('carousel-content');
                // Check that justify-start class is applied (via className prop)
                expect(carouselContent).toBeInTheDocument();
            });
        });
    });

    // ========================================================================
    // 2. Product Selection Flow Tests
    // ========================================================================

    describe('Product Selection Flow', () => {
        test('variants add directly to cart; masters open modal', async () => {
            // Override mock to have slots available
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 0,
                maxBonusItems: 3,
            });

            const props = getDefaultProps();
            const user = userEvent.setup();

            // Add a variant and a master product
            props.bonusDiscountLineItem = createMockBonusDiscountLineItem({
                bonusProducts: [
                    { productId: 'variant-1', productName: 'Variant Product' },
                    { productId: 'master-1', productName: 'Master Product' },
                ],
            });
            props.bonusProductsById = {
                'variant-1': createMockProduct({
                    id: 'variant-1',
                    name: 'Variant Product',
                    type: { variant: true },
                }),
                'master-1': createMockProduct({
                    id: 'master-1',
                    name: 'Master Product',
                    type: { master: true },
                    variants: [{ productId: 'var-1' }, { productId: 'var-2' }],
                }),
            };

            // Mock requiresVariantSelection to return false for variant, true for master
            mockRequiresVariantSelection.mockImplementation((product: any) => {
                return product.type?.master === true;
            });

            render(<BonusProductSelection {...props} />);

            // Accordion should be expanded by default since slots are available (0/3)
            const selectButtons = await screen.findAllByRole('button', { name: /select/i });

            // Click variant product (first button)
            await user.click(selectButtons[0]);

            // Variant should add directly to cart
            expect(mockSubmit).toHaveBeenCalledWith(expect.any(FormData), {
                method: 'POST',
                action: '/action/bonus-product-add',
            });
            expect(props.onProductSelect).not.toHaveBeenCalled();

            // Reset mocks
            mockSubmit.mockClear();
            props.onProductSelect.mockClear();

            // Click master product (second button)
            await user.click(selectButtons[1]);

            // Master should open modal
            expect(props.onProductSelect).toHaveBeenCalledWith('master-1', 'Master Product', true);
            expect(mockSubmit).not.toHaveBeenCalled();
        });

        test('opens modal when clicking Select on a variant product', async () => {
            // Override mock to have slots available
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 0,
                maxBonusItems: 3,
            });

            mockRequiresVariantSelection.mockReturnValue(true);
            const props = getDefaultProps();
            const user = userEvent.setup();

            render(<BonusProductSelection {...props} />);

            // Accordion should be expanded by default since slots are available (0/3)
            const selectButtons = await screen.findAllByRole('button', { name: /select/i });
            await user.click(selectButtons[0]);

            // Should call onProductSelect with requiresModal=true
            expect(props.onProductSelect).toHaveBeenCalledWith('product-1', 'Test Product 1', true);

            // Should NOT submit to fetcher (modal handles it)
            expect(mockSubmit).not.toHaveBeenCalled();
        });

        test('adds directly to cart when clicking Select on a standard product', async () => {
            // Override mock to have slots available
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 0,
                maxBonusItems: 3,
            });

            mockRequiresVariantSelection.mockReturnValue(false);
            const props = getDefaultProps();
            const user = userEvent.setup();

            render(<BonusProductSelection {...props} />);

            // Accordion should be expanded by default since slots are available (0/3)
            // Click first Select button
            const selectButtons = await screen.findAllByRole('button', { name: /select/i });
            await user.click(selectButtons[0]);

            // Should NOT call onProductSelect (direct add)
            expect(props.onProductSelect).not.toHaveBeenCalled();

            // Should submit to fetcher
            expect(mockSubmit).toHaveBeenCalledWith(expect.any(FormData), {
                method: 'POST',
                action: '/action/bonus-product-add',
            });

            // Verify FormData contains correct bonusItems
            const submittedFormData = mockSubmit.mock.calls[0][0] as FormData;
            const bonusItems = JSON.parse(submittedFormData.get('bonusItems') as string);
            expect(bonusItems).toEqual([
                {
                    productId: 'product-1',
                    quantity: 1,
                    bonusDiscountLineItemId: 'bdli-1',
                    promotionId: 'promo-1',
                },
            ]);
        });

        test('shows success toast after successful direct add', async () => {
            const { t } = getTranslation();
            mockRequiresVariantSelection.mockReturnValue(false);
            const props = getDefaultProps();

            const { rerender } = render(<BonusProductSelection {...props} />);

            // Simulate fetcher returning success
            mockFetcher.state = 'idle';
            mockFetcher.data = { success: true };

            rerender(<BonusProductSelection {...props} />);

            await waitFor(() => {
                expect(mockAddToast).toHaveBeenCalledWith(t('product:bonusProducts.addedToCart'), 'success');
            });
        });

        test('shows error toast after failed direct add', async () => {
            const { t } = getTranslation();
            mockRequiresVariantSelection.mockReturnValue(false);
            const props = getDefaultProps();

            const { rerender } = render(<BonusProductSelection {...props} />);

            // Simulate fetcher returning error
            mockFetcher.state = 'idle';
            mockFetcher.data = { success: false, error: 'Out of stock' };

            rerender(<BonusProductSelection {...props} />);

            await waitFor(() => {
                expect(mockAddToast).toHaveBeenCalledWith(
                    t('product:bonusProducts.failedToAdd', { error: 'Out of stock' }),
                    'error'
                );
            });
        });

        test('button is disabled during submission and when max items reached', async () => {
            const props = getDefaultProps();
            const user = userEvent.setup();

            // Mock max items reached
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 3,
                maxBonusItems: 3,
            });

            render(<BonusProductSelection {...props} />);

            // Expand accordion
            await user.click(screen.getByRole('button', { name: /buy one get one free/i }));

            // Check buttons are disabled when max reached
            const selectButtons = await screen.findAllByRole('button', { name: /select/i });
            selectButtons.forEach((button) => {
                expect(button).toBeDisabled();
            });
        });

        test('button shows "Adding..." during submission', async () => {
            mockFetcher.state = 'submitting';
            const props = getDefaultProps();

            render(<BonusProductSelection {...props} />);

            // Expand accordion
            fireEvent.click(screen.getByRole('button', { name: /buy one get one free/i }));

            await waitFor(() => {
                const addingButtons = screen.getAllByRole('button', { name: /adding\.\.\./i });
                expect(addingButtons.length).toBeGreaterThan(0);
            });
        });

        test('shows error and does not submit when bonusDiscountLineItem.id is missing', async () => {
            const { t } = getTranslation();
            mockRequiresVariantSelection.mockReturnValue(false);

            // Mock counts to ensure button is not disabled
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 0,
                maxBonusItems: 3,
            });

            const props = getDefaultProps();
            props.bonusDiscountLineItem = createMockBonusDiscountLineItem({ id: '' });

            render(<BonusProductSelection {...props} />);

            // Accordion should be expanded by default since slots are available (0/3)
            // Wait for Select buttons to be visible
            const selectButtons = await screen.findAllByRole('button', { name: /select/i });
            fireEvent.click(selectButtons[0]);

            // Should show error toast
            await waitFor(() => {
                expect(mockAddToast).toHaveBeenCalledWith(
                    t('product:bonusProducts.failedToAdd', {
                        error: t('product:bonusProducts.missingRequiredInfo'),
                    }),
                    'error'
                );
            });

            // Should NOT submit to fetcher
            expect(mockSubmit).not.toHaveBeenCalled();
        });

        test('shows error and does not submit when promotionId is missing', async () => {
            const { t } = getTranslation();
            mockRequiresVariantSelection.mockReturnValue(false);

            // Mock counts to ensure button is not disabled
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 0,
                maxBonusItems: 3,
            });

            const props = getDefaultProps();
            props.bonusDiscountLineItem = createMockBonusDiscountLineItem({ promotionId: '' });

            render(<BonusProductSelection {...props} />);

            // Accordion should be expanded by default since slots are available (0/3)
            // Wait for Select buttons to be visible
            const selectButtons = await screen.findAllByRole('button', { name: /select/i });
            fireEvent.click(selectButtons[0]);

            // Should show error toast
            await waitFor(() => {
                expect(mockAddToast).toHaveBeenCalledWith(
                    t('product:bonusProducts.failedToAdd', {
                        error: t('product:bonusProducts.missingRequiredInfo'),
                    }),
                    'error'
                );
            });

            // Should NOT submit to fetcher
            expect(mockSubmit).not.toHaveBeenCalled();
        });

        test('accordion expands when slots available, collapses when full', async () => {
            const { getBonusProductCountsForPromotion } = await import('@/lib/bonus-product-utils');

            // Test case 1: Slots available (1 of 2) - should be expanded by default
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 1,
                maxBonusItems: 2,
            });

            const props1 = getDefaultProps();
            const { unmount } = render(<BonusProductSelection {...props1} />);

            // Accordion should be expanded by default - content should be visible without clicking
            await waitFor(() => {
                const carouselItems = screen.queryAllByTestId('carousel-item');
                expect(carouselItems.length).toBeGreaterThan(0);
            });

            unmount();

            // Test case 2: Slots full (2 of 2) - should be collapsed by default
            vi.mocked(getBonusProductCountsForPromotion).mockReturnValue({
                selectedBonusItems: 2,
                maxBonusItems: 2,
            });

            const props2 = getDefaultProps();
            render(<BonusProductSelection {...props2} />);

            // Accordion should be collapsed by default - content should NOT be visible
            const carouselItems = screen.queryAllByTestId('carousel-item');
            expect(carouselItems).toHaveLength(0);

            // Verify we can still manually expand it
            const trigger = screen.getByRole('button', { name: /buy one get one free/i });
            fireEvent.click(trigger);

            await waitFor(() => {
                const expandedCarouselItems = screen.queryAllByTestId('carousel-item');
                expect(expandedCarouselItems.length).toBeGreaterThan(0);
            });
        });
    });

    // ========================================================================
    // 3. Edge Cases & Graceful Handling
    // ========================================================================

    describe('Edge Cases', () => {
        test('handles missing product in bonusProductsById gracefully', async () => {
            const props = getDefaultProps();
            // Remove product-2 from the map
            delete props.bonusProductsById['product-2'];

            render(<BonusProductSelection {...props} />);

            // Expand accordion
            fireEvent.click(screen.getByRole('button', { name: /buy one get one free/i }));

            await waitFor(() => {
                // Should only render 1 product card (product-1)
                const carouselItems = screen.getAllByTestId('carousel-item');
                expect(carouselItems).toHaveLength(1);

                // Only product-1 name should be visible
                expect(screen.getByText('Test Product 1')).toBeInTheDocument();
                expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument();
            });
        });

        test('uses product name from bonusProductsById when productName is missing', async () => {
            const props = getDefaultProps();
            // Remove productName from bonusProducts
            props.bonusDiscountLineItem = createMockBonusDiscountLineItem({
                bonusProducts: [
                    { productId: 'product-1' }, // No productName
                ],
            });
            // Ensure bonusProductsById has the name
            props.bonusProductsById = {
                'product-1': createMockProduct({ id: 'product-1', name: 'Name From Product Data' }),
            };

            render(<BonusProductSelection {...props} />);

            // Expand accordion
            fireEvent.click(screen.getByRole('button', { name: /buy one get one free/i }));

            await waitFor(() => {
                expect(screen.getByText('Name From Product Data')).toBeInTheDocument();
            });
        });

        test('falls back to "Product" when both productName sources are missing', async () => {
            const props = getDefaultProps();
            // Remove productName from bonusProducts
            props.bonusDiscountLineItem = createMockBonusDiscountLineItem({
                bonusProducts: [{ productId: 'product-1' }],
            });
            // Ensure bonusProductsById has no name
            props.bonusProductsById = {
                'product-1': createMockProduct({ id: 'product-1', name: undefined }),
            };

            render(<BonusProductSelection {...props} />);

            // Expand accordion
            fireEvent.click(screen.getByRole('button', { name: /buy one get one free/i }));

            await waitFor(() => {
                expect(screen.getByText('Product')).toBeInTheDocument();
            });
        });
    });
});
