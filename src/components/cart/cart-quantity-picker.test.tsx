import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMemoryRouter, RouterProvider, type FetcherWithComponents } from 'react-router';
import CartQuantityPicker from './cart-quantity-picker';
import { useCartQuantityUpdate } from '@/hooks/use-cart-quantity-update';
import uiStrings from '@/temp-ui-string';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';

// Mock the useCartQuantityUpdate hook
const mockHandleQuantityChange = vi.fn();
const mockHandleQuantityBlur = vi.fn();
const mockHandleKeepItem = vi.fn();
const mockHandleRemoveItem = vi.fn();
const mockSetShowRemoveConfirmation = vi.fn();

vi.mock('@/hooks/use-cart-quantity-update', () => ({
    useCartQuantityUpdate: vi.fn(),
}));

describe('CartQuantityPicker', () => {
    const createMockFetcher = (state: 'idle' | 'submitting' = 'idle') => ({ state }) as FetcherWithComponents<unknown>;

    const defaultProps = {
        value: '2',
        itemId: 'item-123',
        fetcher: createMockFetcher('idle'),
    };

    // Helper function to render component with router context and ConfigProvider
    const renderComponent = (props: typeof defaultProps & { className?: string }) => {
        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router = createMemoryRouter(
            [
                {
                    path: '/cart',
                    element: (
                        <ConfigProvider config={mockConfig}>
                            <CartQuantityPicker {...props} />
                        </ConfigProvider>
                    ),
                },
            ],
            { initialEntries: ['/cart'] }
        );
        return render(<RouterProvider router={router} />);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useCartQuantityUpdate).mockReturnValue({
            quantity: 2,
            stockValidationError: null,
            showRemoveConfirmation: false,
            handleQuantityChange: mockHandleQuantityChange,
            handleQuantityBlur: mockHandleQuantityBlur,
            handleKeepItem: mockHandleKeepItem,
            handleRemoveItem: mockHandleRemoveItem,
            setShowRemoveConfirmation: mockSetShowRemoveConfirmation,
        });
    });

    test('renders quantity picker with correct label and value', () => {
        renderComponent(defaultProps);

        expect(screen.getByText(uiStrings.quantitySelector.quantity)).toBeInTheDocument();
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    test('renders with custom className', () => {
        const { container } = renderComponent({ ...defaultProps, className: 'custom-class' });

        const cartQuantityPicker = container.firstChild as HTMLElement;
        expect(cartQuantityPicker).toHaveClass('custom-class');
    });

    test('displays stock validation error when present', () => {
        vi.mocked(useCartQuantityUpdate).mockReturnValue({
            quantity: 5,
            stockValidationError: 'Only 3 left in stock',
            showRemoveConfirmation: false,
            handleQuantityChange: mockHandleQuantityChange,
            handleQuantityBlur: mockHandleQuantityBlur,
            handleKeepItem: mockHandleKeepItem,
            handleRemoveItem: mockHandleRemoveItem,
            setShowRemoveConfirmation: mockSetShowRemoveConfirmation,
        });

        renderComponent(defaultProps);

        expect(screen.getByText('Only 3 left in stock')).toBeInTheDocument();
        expect(screen.getByText('Only 3 left in stock')).toHaveAttribute('role', 'alert');
        expect(screen.getByText('Only 3 left in stock')).toHaveAttribute('aria-live', 'polite');
    });

    test('does not display stock validation error when null', () => {
        renderComponent(defaultProps);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('shows remove confirmation dialog when showRemoveConfirmation is true', () => {
        vi.mocked(useCartQuantityUpdate).mockReturnValue({
            quantity: 0,
            stockValidationError: null,
            showRemoveConfirmation: true,
            handleQuantityChange: mockHandleQuantityChange,
            handleQuantityBlur: mockHandleQuantityBlur,
            handleKeepItem: mockHandleKeepItem,
            handleRemoveItem: mockHandleRemoveItem,
            setShowRemoveConfirmation: mockSetShowRemoveConfirmation,
        });

        renderComponent(defaultProps);

        expect(screen.getByText(uiStrings.removeItem.confirmTitle)).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.removeItemConfirmDescription)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: uiStrings.removeItem.keepItemAriaLabel })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: uiStrings.removeItem.removeItemAriaLabel })).toBeInTheDocument();
    });

    test('does not show remove confirmation dialog when showRemoveConfirmation is false', () => {
        renderComponent(defaultProps);

        expect(screen.queryByText(uiStrings.removeItem.confirmTitle)).not.toBeInTheDocument();
    });

    test('calls handleKeepItem when keep item button is clicked', async () => {
        const user = userEvent.setup();

        vi.mocked(useCartQuantityUpdate).mockReturnValue({
            quantity: 0,
            stockValidationError: null,
            showRemoveConfirmation: true,
            handleQuantityChange: mockHandleQuantityChange,
            handleQuantityBlur: mockHandleQuantityBlur,
            handleKeepItem: mockHandleKeepItem,
            handleRemoveItem: mockHandleRemoveItem,
            setShowRemoveConfirmation: mockSetShowRemoveConfirmation,
        });

        renderComponent(defaultProps);

        const keepButton = screen.getByRole('button', { name: uiStrings.removeItem.keepItemAriaLabel });
        await user.click(keepButton);

        expect(mockHandleKeepItem).toHaveBeenCalledTimes(1);
    });

    test('calls handleRemoveItem when remove item button is clicked', async () => {
        const user = userEvent.setup();

        vi.mocked(useCartQuantityUpdate).mockReturnValue({
            quantity: 0,
            stockValidationError: null,
            showRemoveConfirmation: true,
            handleQuantityChange: mockHandleQuantityChange,
            handleQuantityBlur: mockHandleQuantityBlur,
            handleKeepItem: mockHandleKeepItem,
            handleRemoveItem: mockHandleRemoveItem,
            setShowRemoveConfirmation: mockSetShowRemoveConfirmation,
        });

        renderComponent(defaultProps);

        const removeButton = screen.getByRole('button', { name: uiStrings.removeItem.removeItemAriaLabel });
        await user.click(removeButton);

        expect(mockHandleRemoveItem).toHaveBeenCalledTimes(1);
    });

    test('passes correct props to useCartQuantityUpdate hook', () => {
        const props = {
            value: '3',
            itemId: 'item-456',
            fetcher: createMockFetcher('idle'),
            debounceDelay: 500,
            stockLevel: 10,
        };

        renderComponent(props);

        expect(vi.mocked(useCartQuantityUpdate)).toHaveBeenCalledWith({
            itemId: 'item-456',
            initialValue: 3,
            stockLevel: 10,
            debounceDelay: 500,
            fetcher: expect.objectContaining({
                state: 'idle',
                submit: expect.any(Function),
            }),
        });
    });

    test('uses default debounceDelay when not provided', () => {
        renderComponent(defaultProps);

        expect(vi.mocked(useCartQuantityUpdate)).toHaveBeenCalledWith({
            itemId: 'item-123',
            initialValue: 2,
            stockLevel: undefined,
            debounceDelay: 750,
            fetcher: expect.objectContaining({
                state: 'idle',
                submit: expect.any(Function),
            }),
        });
    });

    test('confirmation dialog has correct aria labels', () => {
        vi.mocked(useCartQuantityUpdate).mockReturnValue({
            quantity: 0,
            stockValidationError: null,
            showRemoveConfirmation: true,
            handleQuantityChange: mockHandleQuantityChange,
            handleQuantityBlur: mockHandleQuantityBlur,
            handleKeepItem: mockHandleKeepItem,
            handleRemoveItem: mockHandleRemoveItem,
            setShowRemoveConfirmation: mockSetShowRemoveConfirmation,
        });

        renderComponent(defaultProps);

        const keepButton = screen.getByRole('button', { name: uiStrings.removeItem.keepItemAriaLabel });
        const removeButton = screen.getByRole('button', { name: uiStrings.removeItem.removeItemAriaLabel });

        expect(keepButton).toHaveAttribute('aria-label', uiStrings.removeItem.keepItemAriaLabel);
        expect(removeButton).toHaveAttribute('aria-label', uiStrings.removeItem.removeItemAriaLabel);
    });

    test('handles quantity changes through QuantityPicker', async () => {
        const user = userEvent.setup();

        renderComponent(defaultProps);

        const quantityInput = screen.getByDisplayValue('2');
        await user.clear(quantityInput);
        await user.type(quantityInput, '5');

        expect(mockHandleQuantityChange).toHaveBeenCalled();
    });

    test('handles increment button clicks through QuantityPicker', async () => {
        const user = userEvent.setup();

        renderComponent(defaultProps);

        const incrementButton = screen.getByTestId('quantity-increment');
        await user.click(incrementButton);

        expect(mockHandleQuantityChange).toHaveBeenCalledWith('3', 3);
    });

    test('handles decrement button clicks through QuantityPicker', async () => {
        const user = userEvent.setup();

        renderComponent(defaultProps);

        const decrementButton = screen.getByTestId('quantity-decrement');
        await user.click(decrementButton);

        expect(mockHandleQuantityChange).toHaveBeenCalledWith('1', 1);
    });

    test('handles quantity blur through QuantityPicker', async () => {
        const user = userEvent.setup();

        renderComponent(defaultProps);

        const quantityInput = screen.getByDisplayValue('2');
        await user.click(quantityInput);
        await user.tab();

        expect(mockHandleQuantityBlur).toHaveBeenCalled();
    });

    describe('Disabled state', () => {
        test('renders disabled quantity picker when disabled prop is true', () => {
            const props = { ...defaultProps, disabled: true };
            renderComponent(props as any);

            const quantityInput = screen.getByDisplayValue('2');
            expect(quantityInput).toBeDisabled();
        });

        test('disabled prop defaults to false', () => {
            // Don't pass disabled prop
            const propsWithoutDisabled = {
                value: '2',
                itemId: 'item-123',
                fetcher: createMockFetcher('idle'),
            };
            renderComponent(propsWithoutDisabled as any);

            const quantityInput = screen.getByDisplayValue('2');
            expect(quantityInput).not.toBeDisabled();
        });
    });
});
