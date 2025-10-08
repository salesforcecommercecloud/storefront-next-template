import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Payment from './payment';

const createMockBasket = (overrides = {}) => ({
    basketId: 'test-basket-123',
    currency: 'USD',
    customerInfo: { email: 'test@example.com', customerId: 'test-customer' },
    shipments: [
        {
            shipmentId: 'shipment-1',
            shippingAddress: {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                countryCode: 'US',
            },
        },
    ],
    paymentInstruments: [],
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

const testScenarios = {
    editMode: { isEditing: true, isCompleted: false },
    completedStep: { isEditing: false, isCompleted: true },
    loadingState: { isLoading: true },
    errorState: { actionData: { success: false, errors: { payment: 'Payment error' } } },
};

vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));
vi.mock('react-hook-form', () => ({
    useForm: vi.fn(() => ({
        control: {},
        formState: { isSubmitted: false, isValid: true, errors: {} },
        handleSubmit: vi.fn((fn) => (e: React.FormEvent) => {
            e?.preventDefault?.();
            fn({});
        }),
        watch: vi.fn(() => true),
        setValue: vi.fn(),
        trigger: vi.fn(),
        reset: vi.fn(),
        getValues: vi.fn(() => ({})),
    })),
}));
interface MockToggleCardProps {
    children: React.ReactNode;
    title: React.ReactNode;
    editing: boolean;
    disabled: boolean;
    onEdit: () => void;
    isLoading: boolean;
    [key: string]: unknown;
}

interface MockCardComponentProps {
    children: React.ReactNode;
    [key: string]: unknown;
}

vi.mock('@/components/toggle-card', () => ({
    ToggleCard: ({ children, title, editing, disabled, onEdit, isLoading, ...props }: MockToggleCardProps) => {
        const domProps = Object.fromEntries(Object.entries(props).filter(([key]) => key !== 'editLabel'));
        return (
            <div
                data-testid="toggle-card"
                data-editing={editing}
                data-disabled={disabled}
                data-loading={isLoading}
                {...domProps}>
                <div data-testid="toggle-card-title">{title}</div>
                <button onClick={onEdit} data-testid="edit-button">
                    Edit
                </button>
                {children}
            </div>
        );
    },
    ToggleCardEdit: ({ children, ...props }: MockCardComponentProps) => (
        <div data-testid="toggle-card-edit" {...props}>
            {children}
        </div>
    ),
    ToggleCardSummary: ({ children, ...props }: MockCardComponentProps) => (
        <div data-testid="toggle-card-summary" {...props}>
            {children}
        </div>
    ),
}));
interface MockButtonProps {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    [key: string]: unknown;
}

interface MockCheckboxProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    children?: React.ReactNode;
    [key: string]: unknown;
}

interface MockInputProps {
    [key: string]: unknown;
}

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, disabled, onClick, type, ...props }: MockButtonProps) => (
        <button disabled={disabled} onClick={onClick} type={type} data-testid="mock-button" {...props}>
            {children}
        </button>
    ),
}));
vi.mock('@/components/ui/checkbox', () => ({
    Checkbox: ({ checked, onCheckedChange, children, ...props }: MockCheckboxProps) => (
        <div data-testid="mock-checkbox" {...props}>
            <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
            {children}
        </div>
    ),
}));
vi.mock('@/components/ui/input', () => ({
    Input: (props: MockInputProps) => <input data-testid="mock-input" {...props} />,
}));
interface MockFormComponentProps {
    children: React.ReactNode;
    [key: string]: unknown;
}

vi.mock('@/components/ui/form', () => ({
    Form: ({ children, ...props }: MockFormComponentProps) => {
        const hookFormProps = [
            'control',
            'formState',
            'handleSubmit',
            'watch',
            'setValue',
            'trigger',
            'reset',
            'getValues',
        ];
        const domProps = Object.fromEntries(Object.entries(props).filter(([key]) => !hookFormProps.includes(key)));
        return (
            <div data-testid="mock-form" {...domProps}>
                {children}
            </div>
        );
    },

    FormField: ({
        children,
        render: renderProp,
        ...props
    }: MockFormComponentProps & { render?: (props: any) => React.ReactNode }) => {
        const domProps = Object.fromEntries(
            Object.entries(props).filter(([key]) => !['control', 'name'].includes(key))
        );
        return (
            <div data-testid="form-field" {...domProps}>
                {renderProp ? renderProp({ field: { value: '', onChange: vi.fn(), onBlur: vi.fn() } }) : children}
            </div>
        );
    },
    FormItem: ({ children, ...props }: MockFormComponentProps) => (
        <div data-testid="form-item" {...props}>
            {children}
        </div>
    ),
    FormLabel: ({ children, ...props }: MockFormComponentProps) => (
        <label data-testid="form-label" {...props}>
            {children}
        </label>
    ),
    FormControl: ({ children, ...props }: MockFormComponentProps) => (
        <div data-testid="form-control" {...props}>
            {children}
        </div>
    ),
    FormMessage: ({ children, ...props }: MockFormComponentProps) => (
        <div data-testid="form-error" {...props}>
            {children}
        </div>
    ),
}));
interface MockSelectProps {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
    [key: string]: unknown;
}

interface MockSelectItemProps {
    children: React.ReactNode;
    value: string;
    [key: string]: unknown;
}

interface MockSelectValueProps {
    placeholder?: string;
    [key: string]: unknown;
}

vi.mock('@/components/ui/select', () => ({
    Select: ({ children, onValueChange, defaultValue, ...props }: MockSelectProps) => (
        <select
            data-testid="mock-select"
            onChange={(e) => onValueChange?.(e.target.value)}
            defaultValue={defaultValue}
            {...props}>
            {children}
        </select>
    ),
    SelectTrigger: ({ children, ...props }: MockFormComponentProps) => (
        <div data-testid="mock-select-trigger" {...props}>
            {children}
        </div>
    ),
    SelectValue: ({ placeholder, ...props }: MockSelectValueProps) => (
        <div data-testid="mock-select-value" {...props}>
            {placeholder}
        </div>
    ),
    SelectContent: ({ children, ...props }: MockFormComponentProps) => (
        <div data-testid="mock-select-content" {...props}>
            {children}
        </div>
    ),
    SelectItem: ({ children, value, ...props }: MockSelectItemProps) => (
        <option value={value} data-testid="mock-select-item" {...props}>
            {children}
        </option>
    ),
}));
vi.mock('@/lib/checkout-schemas', () => ({
    paymentSchema: {
        parse: vi.fn((data) => data),
        safeParse: vi.fn((data) => ({ success: true, data })),
        _def: { typeName: 'ZodObject' },
    },
    getPaymentDefaultValues: vi.fn(() => ({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        billingFirstName: '',
        billingLastName: '',
        billingAddress1: '',
        billingAddress2: '',
        billingCity: '',
        billingStateCode: '',
        billingPostalCode: '',
        billingSameAsShipping: true,
    })),
}));
vi.mock('@hookform/resolvers/zod', () => ({ zodResolver: vi.fn(() => ({ resolver: vi.fn(), mode: 'onSubmit' })) }));
vi.mock('@/temp-ui-string', () => ({
    default: {
        checkout: {
            payment: { title: 'Payment' },
            common: { edit: 'Edit' },
        },
    },
}));
vi.mock('@/lib/utils', () => ({ cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')) }));

const { useBasket } = await import('@/providers/basket');
const { useCustomerProfile } = await import('@/hooks/checkout/use-customer-profile');

describe('Payment Component', () => {
    let mockOnSubmit: ReturnType<typeof vi.fn>;
    let mockOnEdit: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnSubmit = vi.fn();
        mockOnEdit = vi.fn();
        vi.mocked(useBasket).mockReturnValue(createMockBasket());
        vi.mocked(useCustomerProfile).mockReturnValue(null);
    });

    const renderPayment = (props = {}) => {
        const defaultProps = createDefaultProps({ onSubmit: mockOnSubmit, onEdit: mockOnEdit, ...props });
        return render(<Payment {...defaultProps} />);
    };

    describe('Component State', () => {
        test('renders payment form when editing', () => {
            renderPayment(testScenarios.editMode);
            expect(screen.getByTestId('toggle-card')).toBeInTheDocument();
            expect(screen.getByTestId('toggle-card-edit')).toBeInTheDocument();
        });

        test('handles loading state correctly', () => {
            renderPayment(testScenarios.loadingState);
            const toggleCard = screen.getByTestId('toggle-card');
            expect(toggleCard).toHaveAttribute('data-loading', 'true');
        });

        test('handles completed state correctly', () => {
            renderPayment(testScenarios.completedStep);
            expect(screen.getByTestId('toggle-card')).toBeInTheDocument();
        });

        test('handles error state gracefully', () => {
            expect(() => renderPayment(testScenarios.errorState)).not.toThrow();
            expect(screen.getByTestId('toggle-card')).toBeInTheDocument();
        });
    });

    describe('Form Interaction', () => {
        test('handles form submission', async () => {
            const user = userEvent.setup();
            renderPayment(testScenarios.editMode);
            const submitButton = screen.getByTestId('mock-button');
            await user.click(submitButton);
            expect(mockOnSubmit).toHaveBeenCalled();
        });

        test('handles edit button click', async () => {
            const user = userEvent.setup();
            renderPayment(testScenarios.completedStep);
            const editButton = screen.getByTestId('edit-button');
            await user.click(editButton);
            expect(mockOnEdit).toHaveBeenCalled();
        });

        test('shows billing same as shipping form field', () => {
            renderPayment();
            expect(screen.getAllByTestId('form-field')).toHaveLength(5);
        });
    });

    describe('Data Integration', () => {
        const dataScenarios = [
            { name: 'default basket', basketData: createMockBasket(), shouldRender: true },
            {
                name: 'empty payment instruments',
                basketData: createMockBasket({ paymentInstruments: [] }),
                shouldRender: true,
            },
            {
                name: 'custom shipping address',
                basketData: createMockBasket({
                    shipments: [
                        {
                            shippingAddress: {
                                firstName: 'Jane',
                                lastName: 'Smith',
                                address1: '456 Oak St',
                                city: 'Boston',
                                stateCode: 'MA',
                                postalCode: '02101',
                            },
                        },
                    ],
                }),
                shouldRender: true,
            },
            {
                name: 'missing shipping address',
                basketData: createMockBasket({ shipments: [{ shippingAddress: null }] }),
                shouldRender: true,
            },
        ];

        dataScenarios.forEach(({ name, basketData, shouldRender }) => {
            test(`handles ${name}`, () => {
                vi.mocked(useBasket).mockReturnValue(basketData);
                if (shouldRender) {
                    expect(() => renderPayment()).not.toThrow();
                    expect(screen.getByTestId('toggle-card')).toBeInTheDocument();
                } else {
                    expect(() => renderPayment()).not.toThrow();
                }
            });
        });
    });

    describe('User Types', () => {
        const userScenarios = [
            { type: 'guest', customerProfile: null, description: 'guest user' },
            {
                type: 'registered',
                customerProfile: {
                    customerId: 'customer-123',
                    email: 'customer@example.com',
                    firstName: 'Jane',
                    lastName: 'Smith',
                },
                description: 'registered customer',
            },
        ];

        userScenarios.forEach(({ customerProfile, description }) => {
            test(`handles ${description}`, () => {
                vi.mocked(useCustomerProfile).mockReturnValue(customerProfile);
                renderPayment();
                expect(screen.getByTestId('toggle-card')).toBeInTheDocument();
            });
        });
    });

    describe('Props Validation', () => {
        const propsScenarios = [
            { props: { isEditing: true, isCompleted: false }, expected: 'toggle-card-edit' },
            { props: { isEditing: false, isCompleted: true }, expected: 'toggle-card' },
            { props: { isLoading: true }, expected: 'toggle-card' },
            { props: { isEditing: false, isCompleted: false }, expected: null },
        ];

        propsScenarios.forEach(({ props, expected }) => {
            test(`renders correctly with ${JSON.stringify(props)}`, () => {
                if (expected) {
                    renderPayment(props);
                    expect(screen.getByTestId('toggle-card')).toBeInTheDocument();
                    if (expected === 'toggle-card-edit') {
                        expect(screen.getByTestId('toggle-card-edit')).toBeInTheDocument();
                    }
                } else {
                    renderPayment(props);
                    expect(screen.queryByTestId('toggle-card')).not.toBeInTheDocument();
                }
            });
        });
    });

    describe('Error Handling', () => {
        const errorScenarios = [
            {
                name: 'action data error',
                props: { actionData: { success: false, errors: { payment: 'Invalid payment' } } },
            },
            { name: 'missing onSubmit', props: { onSubmit: null } },
            { name: 'missing onEdit', props: { onEdit: null } },
            { name: 'invalid isLoading', props: { isLoading: 'invalid' } },
        ];

        errorScenarios.forEach(({ name, props }) => {
            test(`handles ${name} gracefully`, () => {
                expect(() => renderPayment(props)).not.toThrow();
            });
        });
    });
});
