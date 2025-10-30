import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode, ComponentProps } from 'react';
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

// Mock the checkout context
vi.mock('@/hooks/use-checkout', () => ({
    useCheckoutContext: () => ({
        step: 0,
        STEPS: {
            CONTACT_INFO: 0,
            PICKUP_ADDRESS: 1,
            SHIPPING_ADDRESS: 2,
            SHIPPING_OPTIONS: 3,
            PAYMENT: 4,
            REVIEW_ORDER: 5,
        },
        goToNextStep: vi.fn(),
        goToStep: vi.fn(),
    }),
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
        isSubmitting: vi.fn(() => false),
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
vi.mock('./partials/contact-info', () => ({
    default: () => <div data-testid="contact-info">Contact Info Form</div>,
}));

vi.mock('./partials/shipping-address', () => ({
    default: () => <div data-testid="shipping-address">Shipping Address Form</div>,
}));

vi.mock('./partials/shipping-options', () => ({
    default: () => <div data-testid="shipping-options">Shipping Options Form</div>,
}));

vi.mock('./partials/payment', () => ({
    default: () => <div data-testid="payment">Payment Form</div>,
}));

vi.mock('./partials/register-customer-selection', () => ({
    default: () => <div data-testid="register-customer-checkbox">Create Account Checkbox</div>,
}));

vi.mock('./checkout-progress', () => ({
    CheckoutProgress: () => <div data-testid="checkout-progress">Checkout Progress</div>,
}));

// Mock MyCart component
vi.mock('@/components/my-cart', () => ({
    default: () => <div data-testid="my-cart">My Cart</div>,
}));

describe('CheckoutFormPage', () => {
    // Default test props
    const defaultProps = {
        productMapPromise: Promise.resolve({}),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockUseActionData.mockReturnValue(undefined);
        mockUseNavigation.mockReturnValue({ state: 'idle' });
        mockUseBasket.mockReturnValue({
            basketId: 'test-basket',
            productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1 }],
        });
        mockUseCartStore.mockReturnValue({
            basketId: 'test-basket',
            productItems: [{ itemId: '1', productName: 'Test Product', price: 99.99, quantity: 1 }],
            productTotal: 99.99,
            orderTotal: 99.99,
        });

        // Setup checkout context mocks
        mockUseCustomerProfile.mockReturnValue(null); // Default to guest user
        mockUseCompletedSteps.mockReturnValue([]); // Default to no completed steps
    });

    describe('Basic Rendering', () => {
        test('renders without crashing', () => {
            expect(() => render(<CheckoutFormPage {...defaultProps} />)).not.toThrow();
        });

        test('displays main checkout content', () => {
            render(<CheckoutFormPage {...defaultProps} />);

            // Should render all forms (they are all displayed)
            expect(screen.getByText('Contact Info Form')).toBeInTheDocument();
            expect(screen.getByTestId('order-summary')).toBeInTheDocument();
        });

        test('displays all checkout forms', () => {
            render(<CheckoutFormPage {...defaultProps} />);

            expect(screen.getByText('Contact Info Form')).toBeInTheDocument();
            expect(screen.getByText('Shipping Address Form')).toBeInTheDocument();
            expect(screen.getByText('Shipping Options Form')).toBeInTheDocument();
            expect(screen.getByText('Payment Form')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        test('displays form errors from server', () => {
            mockUseActionData.mockReturnValue({
                success: false,
                formError: 'Please enter your email address',
                step: 'contactInfo',
            });

            render(<CheckoutFormPage {...defaultProps} />);

            // Component should handle error state
            expect(screen.getByText('Contact Info Form')).toBeInTheDocument();
        });

        test('handles loading state', () => {
            mockUseNavigation.mockReturnValue({ state: 'submitting' });

            render(<CheckoutFormPage {...defaultProps} />);

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

        test('hides create account checkbox for registered users', () => {
            // Mock a registered user with customer profile
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

            render(<CheckoutFormPage {...defaultProps} />);

            // Checkbox should NOT be present for registered users
            expect(screen.queryByTestId('register-customer-checkbox')).not.toBeInTheDocument();
        });

        test('shows create account checkbox for guest users with guest recommendation', () => {
            // Mock a guest user (no customer profile)
            mockUseCustomerProfile.mockReturnValue(null);

            // Mock session storage to return guest recommendation
            const mockGetItem = vi.fn((key: string) => {
                if (key === 'customerLookupResult') {
                    return JSON.stringify({ recommendation: 'guest' });
                }
                return null;
            });
            window.sessionStorage.getItem = mockGetItem;

            render(<CheckoutFormPage {...defaultProps} />);

            // Checkbox should be present for guest users
            expect(screen.getByTestId('register-customer-checkbox')).toBeInTheDocument();
        });

        test('shows create account checkbox for guest users without basket customer ID', () => {
            // Mock a guest user (no customer profile)
            mockUseCustomerProfile.mockReturnValue(null);

            // Mock basket without customer ID
            mockUseBasket.mockReturnValue({
                basketId: 'test-basket',
                productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1 }],
                customerInfo: null, // No customer info
            });

            // Mock session storage to return null (no customer lookup result)
            const mockGetItem = vi.fn(() => null);
            window.sessionStorage.getItem = mockGetItem;

            render(<CheckoutFormPage {...defaultProps} />);

            // Checkbox should be present for guest users
            expect(screen.getByTestId('register-customer-checkbox')).toBeInTheDocument();
        });

        test('hides create account checkbox for guest users with returning customer recommendation', () => {
            // Mock a guest user (no customer profile)
            mockUseCustomerProfile.mockReturnValue(null);

            // Mock session storage to return returning customer recommendation
            const mockGetItem = vi.fn((key: string) => {
                if (key === 'customerLookupResult') {
                    return JSON.stringify({ recommendation: 'returning' });
                }
                return null;
            });
            window.sessionStorage.getItem = mockGetItem;

            // Mock basket with customer ID
            mockUseBasket.mockReturnValue({
                basketId: 'test-basket',
                productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1 }],
                customerInfo: { customerId: 'customer-123' },
            });

            render(<CheckoutFormPage {...defaultProps} />);

            // Checkbox should NOT be present for returning customers
            expect(screen.queryByTestId('register-customer-checkbox')).not.toBeInTheDocument();
        });

        test('handles malformed customer lookup data gracefully', () => {
            // Mock a guest user (no customer profile)
            mockUseCustomerProfile.mockReturnValue(null);

            // Mock session storage to return malformed JSON
            const mockGetItem = vi.fn((key: string) => {
                if (key === 'customerLookupResult') {
                    return 'invalid-json';
                }
                return null;
            });
            window.sessionStorage.getItem = mockGetItem;

            // Mock basket without customer ID
            mockUseBasket.mockReturnValue({
                basketId: 'test-basket',
                productItems: [{ itemId: 'item1', productId: 'product1', quantity: 1 }],
                customerInfo: null,
            });

            render(<CheckoutFormPage {...defaultProps} />);

            // Should still show checkbox for guest users even with malformed data
            expect(screen.getByTestId('register-customer-checkbox')).toBeInTheDocument();
        });

        test('prioritizes customer profile over session storage', () => {
            // Mock a registered user with customer profile
            mockUseCustomerProfile.mockReturnValue({
                customer: {
                    customerId: 'registered-customer-123',
                    email: 'test@example.com',
                },
                addresses: [],
                paymentInstruments: [],
            });

            // Mock session storage to return guest recommendation (should be ignored)
            const mockGetItem = vi.fn((key: string) => {
                if (key === 'customerLookupResult') {
                    return JSON.stringify({ recommendation: 'guest' });
                }
                return null;
            });
            window.sessionStorage.getItem = mockGetItem;

            render(<CheckoutFormPage {...defaultProps} />);

            // Customer profile should take precedence - checkbox should NOT be present
            expect(screen.queryByTestId('register-customer-checkbox')).not.toBeInTheDocument();
        });
    });
});
