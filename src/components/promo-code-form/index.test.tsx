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
import { createMemoryRouter, RouterProvider, type FetcherWithComponents } from 'react-router';
import { usePromoCodeActions } from '@/hooks/use-promo-code-actions';
import { type PromoCodeFetcherData } from './types';
import PromoCodeForm from './index';
import { Toaster } from '@/components/toast';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();
const mockApplyPromoCode = vi.fn();

const mockAddToast = vi.fn();

const createMockFetcher = (overrides = {}) =>
    ({
        state: 'idle' as const,
        data: null as unknown,
        submit: vi.fn(),
        formMethod: undefined,
        formAction: undefined,
        formEncType: undefined,
        text: undefined,
        formData: undefined,
        json: undefined,
        Form: vi.fn(),
        load: vi.fn(),
        ...overrides,
    }) as unknown;

let mockApplyFetcher = createMockFetcher();

vi.mock('@/hooks/use-promo-code-actions', () => ({
    usePromoCodeActions: vi.fn(() => ({
        applyPromoCode: mockApplyPromoCode,
        applyFetcher: mockApplyFetcher,
        removePromoCode: vi.fn(),
        removeFetcher: createMockFetcher(),
    })),
}));

vi.mock('@/components/toast', () => ({
    useToast: vi.fn(() => ({
        addToast: mockAddToast,
    })),
    Toaster: vi.fn(() => <div data-testid="toaster" />),
}));

// Helper function to render component with routes stub and toaster
const renderWithRoutesStub = ({ basketId = 'test-basket-id' }: { basketId?: string } = {}) => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/cart',
                element: (
                    <>
                        <PromoCodeForm basket={basketId ? { basketId } : undefined} />
                        <Toaster richColors expand position="top-right" />
                    </>
                ),
            },
        ],
        { initialEntries: ['/cart'] }
    );

    return render(<RouterProvider router={router} />);
};

describe('PromoCodeForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockApplyFetcher = createMockFetcher();
        mockAddToast.mockClear();
    });

    test('renders accordion with promo code title', () => {
        renderWithRoutesStub();

        expect(screen.getByText(t('cart:promoCode.accordionTitle'))).toBeInTheDocument();
    });

    test('accordion is expanded by default', () => {
        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: t('cart:promoCode.accordionTitle') });
        expect(accordionTrigger).toHaveAttribute('aria-expanded', 'true');
    });

    test('form is rendered when accordion is expanded', () => {
        renderWithRoutesStub();

        expect(screen.getByTestId('promo-code-form')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(t('cart:promoCode.placeholder'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('cart:promoCode.apply') })).toBeInTheDocument();
    });

    test('validates minimum length requirement', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const input = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        const submitButton = screen.getByRole('button', { name: t('cart:promoCode.apply') });

        // Enter invalid code (too short)
        await user.type(input, 'a');
        await user.click(submitButton);

        // Check that validation error message appears
        // The component shows the specific validation message
        expect(screen.getByText(t('cart:promoCode.validation.minLength'))).toBeInTheDocument();
        expect(mockApplyPromoCode).not.toHaveBeenCalled();
    });

    test('submits valid promo code', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const input = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        const submitButton = screen.getByRole('button', { name: t('cart:promoCode.apply') });

        await user.type(input, 'SAVE20');
        await user.click(submitButton);

        expect(mockApplyPromoCode).toHaveBeenCalledWith('SAVE20');
    });

    test('shows loading state when submitting', () => {
        mockApplyFetcher = createMockFetcher({ state: 'submitting' as const });

        renderWithRoutesStub();

        expect(screen.getByRole('button', { name: t('cart:promoCode.applying') })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('cart:promoCode.applying') })).toBeDisabled();
    });

    test('handles successful submission', async () => {
        const user = userEvent.setup();

        // Create a mock fetcher with success data
        const mockFetcher = createMockFetcher({
            data: { success: true, basket: { basketId: 'test-basket' } },
        });

        // Mock the hook to return our fetcher with success data
        vi.mocked(usePromoCodeActions).mockReturnValue({
            applyPromoCode: mockApplyPromoCode,
            applyFetcher: mockFetcher as FetcherWithComponents<PromoCodeFetcherData>,
            removePromoCode: vi.fn(),
            removeFetcher: createMockFetcher() as FetcherWithComponents<unknown>,
        });

        renderWithRoutesStub();

        const input = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        await user.type(input, 'SAVE20');

        const submitButton = screen.getByRole('button', { name: t('cart:promoCode.apply') });
        await user.click(submitButton);

        // Check if addToast was called with success message
        expect(mockAddToast).toHaveBeenCalledWith(t('cart:promoCode.successMessage'), 'success');
    });

    test('handles API error response', async () => {
        const user = userEvent.setup();
        const errorMessage = 'Invalid coupon code';

        // Create a mock fetcher with error data
        const mockFetcher = createMockFetcher({
            data: { success: false, error: { code: 'OPERATION_FAILED', message: errorMessage } },
        });

        // Mock the hook to return our fetcher with error data
        vi.mocked(usePromoCodeActions).mockReturnValue({
            applyPromoCode: mockApplyPromoCode,
            applyFetcher: mockFetcher as FetcherWithComponents<PromoCodeFetcherData>,
            removePromoCode: vi.fn(),
            removeFetcher: createMockFetcher() as FetcherWithComponents<unknown>,
        });

        renderWithRoutesStub();

        const input = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        await user.type(input, 'INVALID');

        const submitButton = screen.getByRole('button', { name: t('cart:promoCode.apply') });
        await user.click(submitButton);

        // Check if addToast was called with translated error message (not raw server error)
        expect(mockAddToast).toHaveBeenCalledWith(t('cart:promoCode.errorMessage'), 'error');
    });

    test('handles API error without specific message', async () => {
        const user = userEvent.setup();

        // Create a mock fetcher with error data without specific message
        const mockFetcher = createMockFetcher({
            data: { success: false },
        });

        // Mock the hook to return our fetcher with error data
        vi.mocked(usePromoCodeActions).mockReturnValue({
            applyPromoCode: mockApplyPromoCode,
            applyFetcher: mockFetcher as FetcherWithComponents<PromoCodeFetcherData>,
            removePromoCode: vi.fn(),
            removeFetcher: createMockFetcher() as FetcherWithComponents<unknown>,
        });

        renderWithRoutesStub();

        const input = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        await user.type(input, 'INVALID');

        const submitButton = screen.getByRole('button', { name: t('cart:promoCode.apply') });
        await user.click(submitButton);

        // Check if addToast was called with default error message
        expect(mockAddToast).toHaveBeenCalledWith(t('cart:promoCode.errorMessage'), 'error');
    });

    test('shows error when no basket ID provided', async () => {
        const user = userEvent.setup();

        // Mock the hook to return a mock fetcher
        const mockFetcher = createMockFetcher();

        vi.mocked(usePromoCodeActions).mockReturnValue({
            applyPromoCode: mockApplyPromoCode,
            applyFetcher: mockFetcher as FetcherWithComponents<PromoCodeFetcherData>,
            removePromoCode: vi.fn(),
            removeFetcher: createMockFetcher() as FetcherWithComponents<unknown>,
        });

        const router = createMemoryRouter(
            [
                {
                    path: '/cart',
                    element: (
                        <>
                            <PromoCodeForm basket={undefined} />
                            <Toaster richColors expand position="top-right" />
                        </>
                    ),
                },
            ],
            { initialEntries: ['/cart'] }
        );

        render(<RouterProvider router={router} />);

        const input = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        const submitButton = screen.getByRole('button', { name: t('cart:promoCode.apply') });

        await user.type(input, 'SAVE20');
        await user.click(submitButton);

        // Check that the form shows the no basket error message
        expect(screen.getByText(t('cart:promoCode.noBasketMessage'))).toBeInTheDocument();
        expect(mockApplyPromoCode).not.toHaveBeenCalled();
    });

    test('resets form when accordion trigger is clicked', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: t('cart:promoCode.accordionTitle') });

        // Accordion is already open, enter text
        const input = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        await user.type(input, 'SAVE20');
        expect(input).toHaveValue('SAVE20');

        // Click accordion trigger to close (resets form)
        await user.click(accordionTrigger);

        // Open again and check if form is reset
        await user.click(accordionTrigger);
        const resetInput = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        expect(resetInput).toHaveValue('');
    });

    test('form submission prevents default behavior', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const input = screen.getByPlaceholderText(t('cart:promoCode.placeholder'));
        const submitButton = screen.getByRole('button', { name: t('cart:promoCode.apply') });

        await user.type(input, 'SAVE20');
        await user.click(submitButton);

        // The form should handle submission internally
        expect(mockApplyPromoCode).toHaveBeenCalledWith('SAVE20');
    });
});
