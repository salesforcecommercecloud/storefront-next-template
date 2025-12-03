import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act, type ReactNode, type ComponentProps } from 'react';
import i18next from 'i18next';
import CheckoutFormPage from './checkout-form-page';

// Type definitions for mock components
interface MockButtonProps extends ComponentProps<'button'> {
    children: ReactNode;
}

interface MockCardProps extends ComponentProps<'div'> {
    children: ReactNode;
}

interface MockTypographyProps extends ComponentProps<'p'> {
    children: ReactNode;
    variant?: string;
    as?: string;
}

interface MockFormProps extends ComponentProps<'form'> {
    children: ReactNode;
}

// Mock functions
const mockUseCartStore = vi.fn();
const mockUseActionData = vi.fn();
const mockUseNavigation = vi.fn();
const mockUseBasket = vi.fn();

// Mock UI components
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, disabled, ...props }: MockButtonProps) => (
        <button disabled={disabled} {...props}>
            {children}
        </button>
    ),
}));

vi.mock('@/components/ui/card', () => ({
    Card: ({ children, ...props }: MockCardProps) => (
        <div data-slot="card" {...props}>
            {children}
        </div>
    ),
    CardContent: ({ children, ...props }: MockCardProps) => (
        <div data-slot="card-content" {...props}>
            {children}
        </div>
    ),
    CardHeader: ({ children, ...props }: MockCardProps) => (
        <div data-slot="card-header" {...props}>
            {children}
        </div>
    ),
    CardTitle: ({ children, ...props }: MockCardProps) => (
        <div data-slot="card-title" {...props}>
            {children}
        </div>
    ),
    CardAction: ({ children, ...props }: MockCardProps) => (
        <div data-slot="card-action" {...props}>
            {children}
        </div>
    ),
}));

vi.mock('@/components/ui/input', () => ({
    Input: (props: ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/typography', () => ({
    Typography: ({ children, variant, ...props }: MockTypographyProps) => {
        const Component = variant === 'h4' ? 'h4' : 'p';
        return <Component {...props}>{children}</Component>;
    },
}));

vi.mock('@/components/order-summary', () => ({
    default: () => <div data-testid="order-summary">Order Summary</div>,
}));

vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: vi.fn(),
    }),
}));

const mockAnalytics = {
    trackCheckoutStart: vi.fn(),
    trackCheckoutStep: vi.fn(),
};
const mockUseAnalytics = vi.fn(() => mockAnalytics);
vi.mock('@/hooks/use-analytics', () => ({
    useAnalytics: () => mockUseAnalytics(),
}));

const ExpressPaymentsMock = ({
    onApplePayClick,
    onGooglePayClick,
    onAmazonPayClick,
    onVenmoClick,
    onPayPalClick,
}: {
    onApplePayClick: () => void;
    onGooglePayClick: () => void;
    onAmazonPayClick: () => void;
    onVenmoClick: () => void;
    onPayPalClick: () => void;
}) => (
    <div data-testid="express-payments">
        <button type="button" onClick={onApplePayClick}>
            Apple Pay
        </button>
        <button type="button" onClick={onGooglePayClick}>
            Google Pay
        </button>
        <button type="button" onClick={onAmazonPayClick}>
            Amazon Pay
        </button>
        <button type="button" onClick={onVenmoClick}>
            Venmo
        </button>
        <button type="button" onClick={onPayPalClick}>
            PayPal
        </button>
    </div>
);
vi.mock('./components/express-payments', () => ({
    default: ExpressPaymentsMock,
}));

const mockIsStorePickup = vi.fn<(cart: unknown) => boolean>(() => false);

vi.mock('@/extensions/bopis/lib/basket-utils', () => ({
    isStorePickup: (cart: unknown) => mockIsStorePickup(cart),
}));

vi.mock('@/extensions/bopis/components/checkout/store-pickup', () => ({
    default: () => <div data-testid="store-pickup">Store Pickup</div>,
}));

// Mock the checkout context
const mockUseCheckoutContext = vi.fn();

const defaultSteps = {
    CONTACT_INFO: 0,
    PICKUP_ADDRESS: 1,
    SHIPPING_ADDRESS: 2,
    SHIPPING_OPTIONS: 3,
    PAYMENT: 4,
    REVIEW_ORDER: 5,
} as const;

const buildCheckoutContext = (overrides?: Record<string, unknown>) => ({
    step: 0,
    editingStep: null,
    STEPS: defaultSteps,
    goToNextStep: vi.fn(),
    goToStep: vi.fn(),
    ...(overrides || {}),
});

vi.mock('@/hooks/use-checkout', () => ({
    useCheckoutContext: () => mockUseCheckoutContext(),
}));

// Mock the checkout context utilities
const mockUseCustomerProfile = vi.fn();
const mockUseCompletedSteps = vi.fn();
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: () => mockUseCustomerProfile(),
}));

vi.mock('@/hooks/checkout/use-completed-steps', () => ({
    useCompletedSteps: () => mockUseCompletedSteps(),
}));

// Mock the checkout actions hook
const mockIsSubmitting = vi.fn(() => false);
let mockShouldCreateAccount = false;

vi.mock('@/hooks/use-checkout-actions', () => ({
    useCheckoutActions: () => ({
        submitContactInfo: vi.fn(),
        submitShippingAddress: vi.fn(),
        submitShippingOptions: vi.fn(),
        submitPayment: vi.fn(),
        contactFetcher: { data: null, state: 'idle' },
        shippingAddressFetcher: { data: null, state: 'idle' },
        shippingOptionsFetcher: { data: null, state: 'idle' },
        paymentFetcher: { data: null, state: 'idle' },
        isSubmitting: mockIsSubmitting,
        handleCreateAccountPreferenceChange: vi.fn(),
        get shouldCreateAccount() {
            return mockShouldCreateAccount;
        },
    }),
}));

// Mock cart store
vi.mock('@/providers/cart-store', () => ({
    useCartStore: () => mockUseCartStore(),
}));

// Mock basket provider
vi.mock('@/providers/basket', () => ({
    useBasket: () => mockUseBasket(),
}));

// Mock React Router hooks
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useActionData: () => mockUseActionData(),
        useNavigation: () => mockUseNavigation(),
        useFetcher: () => ({
            data: null,
            state: 'idle',
            submit: vi.fn(),
            Form: ({ children, ...props }: MockFormProps) => <form {...props}>{children}</form>,
        }),
        Form: ({ children, ...props }: MockFormProps) => <form {...props}>{children}</form>,
    };
});

// Mock step components
vi.mock('./components/contact-info', () => ({
    default: () => <div data-testid="contact-info">Contact Info Form</div>,
}));

vi.mock('./components/shipping-address', () => ({
    default: () => <div data-testid="shipping-address">Shipping Address Form</div>,
}));

vi.mock('./components/shipping-options', () => ({
    default: () => <div data-testid="shipping-options">Shipping Options Form</div>,
}));

vi.mock('./components/payment', () => ({
    default: () => <div data-testid="payment">Payment Form</div>,
}));

vi.mock('./components/register-customer-selection', () => ({
    default: () => <div data-testid="register-customer-checkbox">Create Account Checkbox</div>,
}));

vi.mock('./checkout-progress', () => ({
    CheckoutProgress: () => <div data-testid="checkout-progress">Checkout Progress</div>,
}));

// Mock MyCart component
vi.mock('@/components/my-cart', () => ({
    default: () => <div data-testid="my-cart">My Cart</div>,
}));

vi.mock('@/config', () => ({
    useConfig: vi.fn(() => ({
        engagement: {
            adapters: {
                einstein: { enabled: true },
            },
        },
    })),
}));

describe('CheckoutFormPage', () => {
    // Default test props
    const defaultProps = {
        productMapPromise: Promise.resolve({}),
    };

    const renderCheckoutPage = async (
        props: Partial<ComponentProps<typeof CheckoutFormPage>> = {}
    ): Promise<ReturnType<typeof render>> => {
        let view: ReturnType<typeof render> | undefined;
        await act(async () => {
            view = render(<CheckoutFormPage {...defaultProps} {...props} />);
            await Promise.resolve();
        });
        if (!view) {
            throw new Error('CheckoutFormPage failed to render');
        }
        return view;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAnalytics.trackCheckoutStart.mockReset();
        mockAnalytics.trackCheckoutStep.mockReset();
        mockUseAnalytics.mockReturnValue(mockAnalytics);
        Object.defineProperty(window, 'scrollTo', {
            writable: true,
            value: vi.fn(),
        });

        mockUseActionData.mockReturnValue(undefined);
        mockUseNavigation.mockReturnValue({ state: 'idle', formAction: '' });
        mockUseBasket.mockReturnValue({
            basketId: 'test-basket',
            productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1 }],
        });
        mockUseCheckoutContext.mockReturnValue(buildCheckoutContext());
        mockUseCartStore.mockReturnValue({
            basketId: 'test-basket',
            productItems: [{ itemId: '1', productName: 'Test Product', price: 99.99, quantity: 1 }],
            productTotal: 99.99,
            orderTotal: 99.99,
        });
        mockIsStorePickup.mockReturnValue(false);
        mockShouldCreateAccount = false;

        // Setup checkout context mocks
        mockUseCustomerProfile.mockReturnValue(null); // Default to guest user
        mockUseCompletedSteps.mockReturnValue([]); // Default to no completed steps
    });

    describe('Basic Rendering', () => {
        test('renders without crashing', async () => {
            await renderCheckoutPage();
        });

        test('displays main checkout content', async () => {
            await renderCheckoutPage();

            // Should render all forms (they are all displayed)
            expect(screen.getByText('Contact Info Form')).toBeInTheDocument();
            expect(screen.getAllByTestId('order-summary').length).toBeGreaterThan(0);
        });

        test('displays all checkout forms', async () => {
            await renderCheckoutPage();

            expect(screen.getByText('Contact Info Form')).toBeInTheDocument();
            expect(screen.getByText('Shipping Address Form')).toBeInTheDocument();
            expect(screen.getByText('Shipping Options Form')).toBeInTheDocument();
            expect(screen.getByText('Payment Form')).toBeInTheDocument();
        });
    });

    describe('Analytics tracking', () => {
        test('tracks the initial checkout step when a basket is present', async () => {
            await renderCheckoutPage();

            await waitFor(() => {
                expect(mockAnalytics.trackCheckoutStep).toHaveBeenCalledWith({
                    stepName: 'CONTACT_INFO',
                    stepNumber: defaultSteps.CONTACT_INFO,
                    basket: expect.objectContaining({ basketId: 'test-basket' }),
                });
            });
        });
    });

    describe('Express payment handlers', () => {
        test('triggers alerts for each express payment CTA', async () => {
            window.alert = window.alert || (() => undefined);
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
            const user = userEvent.setup();

            await renderCheckoutPage();

            await screen.findByTestId('express-payments');

            await user.click(screen.getByRole('button', { name: /apple pay/i }));
            await user.click(screen.getByRole('button', { name: /google pay/i }));
            await user.click(screen.getByRole('button', { name: /amazon pay/i }));
            await user.click(screen.getByRole('button', { name: /venmo/i }));
            await user.click(screen.getByRole('button', { name: /paypal/i }));

            expect(alertSpy).toHaveBeenCalledWith(
                expect.stringContaining('Apple Pay express checkout would be processed here')
            );
            expect(alertSpy).toHaveBeenCalledWith(
                expect.stringContaining('Google Pay express checkout would be processed here')
            );
            expect(alertSpy).toHaveBeenCalledWith(
                expect.stringContaining('Amazon Pay express checkout would be processed here')
            );
            expect(alertSpy).toHaveBeenCalledWith(
                expect.stringContaining('Venmo express checkout would be processed here')
            );
            expect(alertSpy).toHaveBeenCalledWith(
                expect.stringContaining('PayPal express checkout would be processed here')
            );

            alertSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        test('displays form errors from server', async () => {
            mockUseActionData.mockReturnValue({
                success: false,
                formError: 'Please enter your email address',
                step: 'contactInfo',
            });

            await renderCheckoutPage();

            // Component should handle error state
            expect(screen.getByText('Contact Info Form')).toBeInTheDocument();
        });

        test('handles loading state', async () => {
            mockUseNavigation.mockReturnValue({ state: 'submitting' });

            await renderCheckoutPage();

            // Component should render in loading state
            expect(screen.getByText('Contact Info Form')).toBeInTheDocument();
        });
    });

    describe('Create Account Checkbox Visibility', () => {
        beforeEach(() => {
            // Mock sessionStorage for these tests
            const mockSessionStorage = {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn(),
            };
            Object.defineProperty(window, 'sessionStorage', {
                value: mockSessionStorage,
                writable: true,
            });
        });

        test('hides create account checkbox for registered users', async () => {
            mockUseCustomerProfile.mockReturnValue({
                customer: {
                    customerId: 'registered-customer-123',
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                },
                addresses: [],
                paymentInstruments: [],
            });

            await renderCheckoutPage();
            expect(screen.queryByTestId('register-customer-checkbox')).not.toBeInTheDocument();
        });

        test('shows create account checkbox for guest users with guest recommendation', async () => {
            mockUseCustomerProfile.mockReturnValue(null);

            const mockGetItem = vi.fn((key: string) => {
                if (key === 'customerLookupResult') {
                    return JSON.stringify({ recommendation: 'guest' });
                }
                return null;
            });
            window.sessionStorage.getItem = mockGetItem;

            await renderCheckoutPage();
            expect(screen.getByTestId('register-customer-checkbox')).toBeInTheDocument();
        });

        test('shows create account checkbox when no customer ID or lookup data', async () => {
            mockUseCustomerProfile.mockReturnValue(null);
            mockUseBasket.mockReturnValue({
                basketId: 'test-basket',
                productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1 }],
                customerInfo: null,
            });

            const mockGetItem = vi.fn(() => null);
            window.sessionStorage.getItem = mockGetItem;

            await renderCheckoutPage();
            expect(screen.getByTestId('register-customer-checkbox')).toBeInTheDocument();
        });

        test('hides create account checkbox for guest users with returning recommendation', async () => {
            mockUseCustomerProfile.mockReturnValue(null);

            const mockGetItem = vi.fn((key: string) => {
                if (key === 'customerLookupResult') {
                    return JSON.stringify({ recommendation: 'returning' });
                }
                return null;
            });
            window.sessionStorage.getItem = mockGetItem;

            mockUseBasket.mockReturnValue({
                basketId: 'test-basket',
                productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1 }],
                customerInfo: { customerId: 'customer-123' },
            });

            await renderCheckoutPage();
            expect(screen.queryByTestId('register-customer-checkbox')).not.toBeInTheDocument();
        });

        test('handles malformed customer lookup data gracefully', async () => {
            mockUseCustomerProfile.mockReturnValue(null);

            const mockGetItem = vi.fn((key: string) => {
                if (key === 'customerLookupResult') {
                    return 'invalid-json';
                }
                return null;
            });
            window.sessionStorage.getItem = mockGetItem;

            mockUseBasket.mockReturnValue({
                basketId: 'test-basket',
                productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1 }],
                customerInfo: null,
            });

            await renderCheckoutPage();
            expect(screen.getByTestId('register-customer-checkbox')).toBeInTheDocument();
        });

        test('prioritizes customer profile over session storage recommendation', async () => {
            mockUseCustomerProfile.mockReturnValue({
                customer: {
                    customerId: 'registered-customer-123',
                    email: 'test@example.com',
                },
                addresses: [],
                paymentInstruments: [],
            });

            const mockGetItem = vi.fn((key: string) => {
                if (key === 'customerLookupResult') {
                    return JSON.stringify({ recommendation: 'guest' });
                }
                return null;
            });
            window.sessionStorage.getItem = mockGetItem;

            await renderCheckoutPage();
            expect(screen.queryByTestId('register-customer-checkbox')).not.toBeInTheDocument();
        });
    });

    describe('Mobile order summary accordion', () => {
        test('renders accordion with order summary and cart content', async () => {
            await renderCheckoutPage();

            const toggle = screen.getByText('Show Order Summary');
            expect(toggle).toBeInTheDocument();

            const accordion = toggle.closest('[data-slot="accordion"]');
            expect(accordion).not.toBeNull();

            const scoped = within(accordion as HTMLElement);
            expect(scoped.getByTestId('order-summary')).toBeInTheDocument();
            expect(scoped.getByTestId('my-cart')).toBeInTheDocument();
        });
    });

    describe('Conditional rendering', () => {
        test('renders empty cart state when basket has no items', async () => {
            mockUseBasket.mockReturnValueOnce({
                basketId: 'empty-basket',
                productItems: [],
            });

            await renderCheckoutPage();

            expect(screen.getByText(i18next.t('checkout:common.emptyCart'))).toBeInTheDocument();
        });

        test('shows store pickup section and hides shipping steps when pickup order', async () => {
            mockIsStorePickup.mockReturnValueOnce(true);

            await renderCheckoutPage();

            expect(await screen.findByTestId('store-pickup')).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.queryByTestId('shipping-address')).not.toBeInTheDocument();
                expect(screen.queryByTestId('shipping-options')).not.toBeInTheDocument();
            });
        });
    });

    describe('Place order section', () => {
        test('renders place order button when step is review order', async () => {
            mockUseCheckoutContext.mockReturnValue(
                buildCheckoutContext({
                    step: defaultSteps.REVIEW_ORDER,
                })
            );

            const { container } = await renderCheckoutPage();

            expect(
                screen.getByRole('button', {
                    name: i18next.t('checkout:placeOrder.button'),
                })
            ).toBeInTheDocument();

            const hiddenInput = container.querySelector<HTMLInputElement>('input[name="shouldCreateAccount"]');
            expect(hiddenInput?.value).toBe('false');
        });

        test('sets hidden input when user chooses to create an account', async () => {
            mockShouldCreateAccount = true;
            mockUseCheckoutContext.mockReturnValue(
                buildCheckoutContext({
                    step: defaultSteps.REVIEW_ORDER,
                })
            );

            const { container } = await renderCheckoutPage();
            const hiddenInput = container.querySelector<HTMLInputElement>('input[name="shouldCreateAccount"]');
            expect(hiddenInput?.value).toBe('true');
        });

        test('disables place order button and shows processing text while submitting', async () => {
            mockUseCheckoutContext.mockReturnValue(
                buildCheckoutContext({
                    step: defaultSteps.REVIEW_ORDER,
                })
            );
            mockUseNavigation.mockReturnValue({ state: 'submitting', formAction: '/action/place-order' });

            await renderCheckoutPage();

            const button = screen.getByRole('button', { name: i18next.t('checkout:placeOrder.processing') });
            expect(button).toBeDisabled();
        });
    });
});
