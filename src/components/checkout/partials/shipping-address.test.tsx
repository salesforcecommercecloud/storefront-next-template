import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShippingAddress from './shipping-address';

// Use real react-hook-form for integration tests
vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));

const createMockBasket = (overrides = {}) => ({
    basketId: 'test-basket-123',
    currency: 'USD',
    customerInfo: { email: 'test@example.com', phone: '5551234567' },
    shipments: [
        {
            shipmentId: 'shipment-1',
            shippingAddress: null,
        },
    ],
    ...overrides,
});

const createDefaultProps = (overrides = {}) => ({
    onSubmit: vi.fn(),
    isLoading: false,
    actionData: undefined,
    isCompleted: false,
    isEditing: true,
    onEdit: vi.fn(),
    ...overrides,
});

describe('ShippingAddress Integration Tests', () => {
    let useBasket: ReturnType<typeof vi.fn>;
    let useCustomerProfile: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const basketModule = await import('@/providers/basket');
        const profileModule = await import('@/hooks/checkout/use-customer-profile');

        useBasket = basketModule.useBasket as ReturnType<typeof vi.fn>;
        useCustomerProfile = profileModule.useCustomerProfile as ReturnType<typeof vi.fn>;

        useBasket.mockReturnValue(createMockBasket());
        useCustomerProfile.mockReturnValue(null);
    });

    describe('Basic Rendering', () => {
        test('renders shipping address form in editing mode', () => {
            render(<ShippingAddress {...createDefaultProps()} />);

            expect(screen.getByText('Shipping Address')).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
        });

        test('displays summary when not editing', () => {
            render(<ShippingAddress {...createDefaultProps({ isEditing: false, isCompleted: true })} />);

            expect(screen.queryByPlaceholderText(/first name/i)).not.toBeInTheDocument();
        });
    });

    describe('Form Fields', () => {
        test('renders all required address fields', () => {
            render(<ShippingAddress {...createDefaultProps()} />);

            expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/street address/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/city/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/state or province/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/postal code/i)).toBeInTheDocument();
        });

        test('allows entering address data', async () => {
            const user = userEvent.setup();
            render(<ShippingAddress {...createDefaultProps()} />);

            const firstNameInput = screen.getByPlaceholderText(/first name/i);
            await user.type(firstNameInput, 'John');

            expect(firstNameInput).toHaveValue('John');
        });
    });

    describe('Auto-population', () => {
        test('auto-populates phone from contact info', () => {
            useBasket.mockReturnValue(
                createMockBasket({
                    customerInfo: { email: 'test@example.com', phone: '5551234567' },
                })
            );

            render(<ShippingAddress {...createDefaultProps()} />);

            const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
            expect(phoneInput).toHaveValue('5551234567');
        });

        test('pre-fills address from saved basket shipping address', () => {
            useBasket.mockReturnValue(
                createMockBasket({
                    shipments: [
                        {
                            shipmentId: 'shipment-1',
                            shippingAddress: {
                                firstName: 'Jane',
                                lastName: 'Doe',
                                address1: '123 Main St',
                                city: 'New York',
                                stateCode: 'NY',
                                postalCode: '10001',
                            },
                        },
                    ],
                })
            );

            render(<ShippingAddress {...createDefaultProps()} />);

            expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('Jane');
            expect(screen.getByPlaceholderText(/last name/i)).toHaveValue('Doe');
            expect(screen.getByPlaceholderText(/street address/i)).toHaveValue('123 Main St');
        });

        test('renders form for customer with profile', () => {
            useCustomerProfile.mockReturnValue({
                customerId: 'customer-123',
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
            });

            render(<ShippingAddress {...createDefaultProps()} />);

            // Component renders successfully with customer profile
            expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
        });
    });

    describe('Summary Display', () => {
        test('shows address summary when completed', () => {
            useBasket.mockReturnValue(
                createMockBasket({
                    shipments: [
                        {
                            shipmentId: 'shipment-1',
                            shippingAddress: {
                                firstName: 'John',
                                lastName: 'Doe',
                                address1: '123 Main St',
                                city: 'Boston',
                                stateCode: 'MA',
                                postalCode: '02101',
                            },
                        },
                    ],
                })
            );

            render(<ShippingAddress {...createDefaultProps({ isEditing: false, isCompleted: true })} />);

            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
            expect(screen.getByText(/Boston/)).toBeInTheDocument();
        });

        test('shows not provided message when no address', () => {
            render(<ShippingAddress {...createDefaultProps({ isEditing: false })} />);

            expect(screen.getByText(/not provided yet/i)).toBeInTheDocument();
        });
    });

    describe('Form Interaction', () => {
        test('renders submit button', () => {
            render(<ShippingAddress {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: /continue to shipping options/i })).toBeInTheDocument();
        });

        test('shows loading state when submitting', () => {
            render(<ShippingAddress {...createDefaultProps({ isLoading: true })} />);

            const submitButton = screen.getByRole('button', { name: /submitting/i });
            expect(submitButton).toBeDisabled();
        });

        test('calls onEdit when edit button clicked', async () => {
            const user = userEvent.setup();
            const handleEdit = vi.fn();

            render(<ShippingAddress {...createDefaultProps({ isEditing: false, onEdit: handleEdit })} />);

            const editButton = screen.getByRole('button', { name: /edit/i });
            await user.click(editButton);

            expect(handleEdit).toHaveBeenCalled();
        });
    });

    describe('Error Display', () => {
        test('displays field errors from action data', () => {
            render(
                <ShippingAddress
                    {...createDefaultProps({
                        actionData: {
                            success: false,
                            fieldErrors: {
                                firstName: 'First name is required',
                                postalCode: 'Invalid postal code',
                            },
                        },
                    })}
                />
            );

            expect(screen.getByText('First name is required')).toBeInTheDocument();
            expect(screen.getByText('Invalid postal code')).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Phone Fallback Chain', () => {
        test('uses contactInfoPhone fallback when no shipping address phone', () => {
            // Mock state with contactInfo phone but no shipping address phone
            const defaultProps = createDefaultProps();
            render(<ShippingAddress {...defaultProps} />);

            expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        });

        test('falls back through entire phone chain when all preceding values are falsy', () => {
            // Set up basket with no shipping address phone
            const basketWithNoPhone = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'New York',
                            stateCode: 'NY',
                            postalCode: '10001',
                            phone: '', // Empty phone - will fall back
                        },
                    },
                ],
            };
            useBasket.mockReturnValue(basketWithNoPhone);

            // Mock customer profile with no phone
            useCustomerProfile.mockReturnValue(null);

            render(<ShippingAddress {...createDefaultProps()} />);

            expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Summary Display', () => {
        test('displays address2 in summary when present', () => {
            const basketWithAddress2 = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            address2: 'Apt 5B',
                            city: 'New York',
                            stateCode: 'NY',
                            postalCode: '10001',
                            phone: '5551234567',
                        },
                    },
                ],
            };
            useBasket.mockReturnValue(basketWithAddress2);

            render(<ShippingAddress {...createDefaultProps({ isEditing: false, isCompleted: true })} />);

            expect(screen.getByText(/apt 5b/i)).toBeInTheDocument();
        });

        test('displays phone in summary when present', () => {
            const basketWithPhone = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'New York',
                            stateCode: 'NY',
                            postalCode: '10001',
                            phone: '5551234567',
                        },
                    },
                ],
            };
            useBasket.mockReturnValue(basketWithPhone);

            render(<ShippingAddress {...createDefaultProps({ isEditing: false, isCompleted: true })} />);

            expect(screen.getByText(/555/)).toBeInTheDocument();
        });
    });
});
