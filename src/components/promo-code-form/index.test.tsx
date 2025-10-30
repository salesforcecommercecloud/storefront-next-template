import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, type FetcherWithComponents } from 'react-router';
import { usePromoCodeActions } from '@/hooks/use-promo-code-actions';
import { type PromoCodeFetcherData } from './types';
import PromoCodeForm from './index';
import { Toaster } from '@/components/toast';
import uiStrings from '@/temp-ui-string';

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

        expect(screen.getByText(uiStrings.cart.promoCode.accordionTitle)).toBeInTheDocument();
    });

    test('accordion is closed by default', () => {
        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button');
        expect(accordionTrigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('form is render properly when accordion is open', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        expect(accordionTrigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByTestId('promo-code-form')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: uiStrings.cart.promoCode.apply })).toBeInTheDocument();
    });

    test('validates minimum length requirement', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        const input = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        const submitButton = screen.getByRole('button', { name: uiStrings.cart.promoCode.apply });

        // Enter invalid code (too short)
        await user.type(input, 'a');
        await user.click(submitButton);

        // Check that validation error message appears
        expect(screen.getByText(uiStrings.cart.promoCode.validation.minLength)).toBeInTheDocument();
        expect(mockApplyPromoCode).not.toHaveBeenCalled();
    });

    test('submits valid promo code', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        const input = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        const submitButton = screen.getByRole('button', { name: uiStrings.cart.promoCode.apply });

        await user.type(input, 'SAVE20');
        await user.click(submitButton);

        expect(mockApplyPromoCode).toHaveBeenCalledWith('SAVE20');
    });

    test('shows loading state when submitting', async () => {
        const user = userEvent.setup();
        mockApplyFetcher = createMockFetcher({ state: 'submitting' as const });

        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        expect(screen.getByRole('button', { name: uiStrings.cart.promoCode.applying })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: uiStrings.cart.promoCode.applying })).toBeDisabled();
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

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        const input = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        await user.type(input, 'SAVE20');

        const submitButton = screen.getByRole('button', { name: uiStrings.cart.promoCode.apply });
        await user.click(submitButton);

        // Check if addToast was called with success message
        expect(mockAddToast).toHaveBeenCalledWith(uiStrings.cart.promoCode.successMessage, 'success');
    });

    test('handles API error response', async () => {
        const user = userEvent.setup();
        const errorMessage = 'Invalid coupon code';

        // Create a mock fetcher with error data
        const mockFetcher = createMockFetcher({
            data: { success: false, error: errorMessage },
        });

        // Mock the hook to return our fetcher with error data
        vi.mocked(usePromoCodeActions).mockReturnValue({
            applyPromoCode: mockApplyPromoCode,
            applyFetcher: mockFetcher as FetcherWithComponents<PromoCodeFetcherData>,
            removePromoCode: vi.fn(),
            removeFetcher: createMockFetcher() as FetcherWithComponents<unknown>,
        });

        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        const input = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        await user.type(input, 'INVALID');

        const submitButton = screen.getByRole('button', { name: uiStrings.cart.promoCode.apply });
        await user.click(submitButton);

        // Check if addToast was called with error message
        expect(mockAddToast).toHaveBeenCalledWith(errorMessage, 'error');
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

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        const input = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        await user.type(input, 'INVALID');

        const submitButton = screen.getByRole('button', { name: uiStrings.cart.promoCode.apply });
        await user.click(submitButton);

        // Check if addToast was called with default error message
        expect(mockAddToast).toHaveBeenCalledWith(uiStrings.cart.promoCode.errorMessage, 'error');
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

        // Create a custom render function that passes undefined basketId
        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
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

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        const input = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        const submitButton = screen.getByRole('button', { name: uiStrings.cart.promoCode.apply });

        await user.type(input, 'SAVE20');
        await user.click(submitButton);

        // Check that the form shows the no basket error message
        expect(screen.getByText(uiStrings.cart.promoCode.noBasketMessage)).toBeInTheDocument();
        expect(mockApplyPromoCode).not.toHaveBeenCalled();
    });

    test('resets form when accordion trigger is clicked', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });

        // Open accordion and enter text
        await user.click(accordionTrigger);
        const input = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        await user.type(input, 'SAVE20');
        expect(input).toHaveValue('SAVE20');

        // Click accordion trigger again to reset
        await user.click(accordionTrigger);

        // Open again and check if form is reset
        await user.click(accordionTrigger);
        const resetInput = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        expect(resetInput).toHaveValue('');
    });

    test('form submission prevents default behavior', async () => {
        const user = userEvent.setup();
        renderWithRoutesStub();

        const accordionTrigger = screen.getByRole('button', { name: uiStrings.cart.promoCode.accordionTitle });
        await user.click(accordionTrigger);

        const input = screen.getByPlaceholderText(uiStrings.cart.promoCode.placeholder);
        const submitButton = screen.getByRole('button', { name: uiStrings.cart.promoCode.apply });

        await user.type(input, 'SAVE20');
        await user.click(submitButton);

        // The form should handle submission internally
        expect(mockApplyPromoCode).toHaveBeenCalledWith('SAVE20');
    });
});
