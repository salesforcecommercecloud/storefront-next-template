import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customerLookup, getCustomerProfileForCheckout } from './customer';
import { getAuth } from '@/middlewares/auth.client';
import { createApiClients } from '@/lib/api-clients';
import type { ActionFunctionArgs } from 'react-router';

// Define proper types for the mock client
interface MockShopperCustomersClient {
    getCustomer: ReturnType<typeof vi.fn>;
}

interface MockCreateClientsReturn {
    shopperCustomers: MockShopperCustomersClient;
}

// Mock the Commerce Cloud client
const mockClient: MockShopperCustomersClient = {
    getCustomer: vi.fn(),
};

// Mock the dependencies
vi.mock('@/middlewares/auth.client');
vi.mock('@/lib/api-clients');
vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({
        commerce: {
            api: {
                organizationId: 'test-org-id',
                siteId: 'test-site-id',
            },
        },
    })),
}));

const mockContext = {
    env: {
        COMMERCE_CLIENT_ID: 'test-client-id',
        COMMERCE_ORGANIZATION_ID: 'test-org-id',
        COMMERCE_SHORT_CODE: 'test-short-code',
        COMMERCE_SITE_ID: 'test-site-id',
    },
    session: {
        get: vi.fn(),
        set: vi.fn(),
        flash: vi.fn(),
    },
} as unknown as ActionFunctionArgs['context'];

describe('Customer Lookup Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('customerLookup', () => {
        beforeEach(() => {
            // Set up mocks for each test
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as MockCreateClientsReturn);
        });

        it('should return guest for unregistered email', async () => {
            vi.mocked(getAuth).mockReturnValue({ userType: 'guest' });
            mockClient.getCustomer.mockRejectedValue(new Error('Customer not found'));

            const result = await customerLookup(mockContext, 'newuser@example.com');

            expect(result).toEqual({
                isRegistered: false,
                recommendation: 'guest',
                message: 'Continuing as guest. You can login later if you have an account.',
                error: undefined,
                requiresLogin: false,
            });
        });

        it('should return current_user for matching registered customer', async () => {
            const mockCustomer = {
                customerId: 'customer123',
                login: 'existing@example.com',
                firstName: 'John',
                lastName: 'Doe',
            };
            vi.mocked(getAuth).mockReturnValue({
                userType: 'registered',
                customer_id: 'customer123',
                access_token: 'token123',
                access_token_expiry: Date.now() + 3600000,
            });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await customerLookup(mockContext, 'existing@example.com');

            expect(result).toEqual({
                isRegistered: true,
                customer: mockCustomer,
                requiresLogin: false,
                recommendation: 'current_user',
                message: 'Using your account information',
            });
        });

        it('should handle API errors gracefully', async () => {
            vi.mocked(getAuth).mockReturnValue({ userType: 'guest' });
            mockClient.getCustomer.mockRejectedValue(new Error('Network error'));

            const result = await customerLookup(mockContext, 'test@example.com');

            expect(result).toEqual({
                isRegistered: false,
                recommendation: 'guest',
                message: 'Continuing as guest. You can login later if you have an account.',
                error: undefined,
                requiresLogin: false,
            });
        });

        it('should handle invalid email format', async () => {
            const result = await customerLookup(mockContext, 'invalid-email');

            expect(result).toEqual({
                isRegistered: false,
                error: 'Invalid email format',
                recommendation: 'guest',
                message: 'Continuing as guest. You can login later if you have an account.',
            });
        });

        it('should handle registered user with non-matching email', async () => {
            const mockCustomer = {
                customerId: 'customer123',
                login: 'different@example.com',
            };
            vi.mocked(getAuth).mockReturnValue({
                userType: 'registered',
                customer_id: 'customer123',
                access_token: 'token123',
                access_token_expiry: Date.now() + 3600000,
            });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await customerLookup(mockContext, 'test@example.com');

            expect(result).toEqual({
                isRegistered: false,
                requiresLogin: false,
                recommendation: 'guest',
                message: 'Continuing as guest. You can login later if you have an account.',
            });
        });
    });

    describe('getCustomerProfileForCheckout', () => {
        beforeEach(() => {
            // Set up mocks for each test
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as MockCreateClientsReturn);
        });

        it('should return customer profile with addresses and payment instruments', async () => {
            const mockCustomer = {
                customerId: 'customer123',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phoneHome: '555-1234',
                addresses: [
                    {
                        addressId: 'billing_addr_1',
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '123 Main St',
                        city: 'Anytown',
                        stateCode: 'CA',
                        postalCode: '12345',
                        countryCode: 'US',
                        phone: '555-1234',
                        preferred: true,
                    },
                ],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_123',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            expirationMonth: 12,
                            expirationYear: 2025,
                            maskedNumber: '************1234',
                        },
                    },
                ],
            };

            vi.mocked(getAuth).mockReturnValue({ customer_id: 'customer123', access_token: 'token123' });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await getCustomerProfileForCheckout(mockContext, 'customer123');

            // The function now returns a structured object with customer data
            expect(result).toEqual({
                customer: mockCustomer,
                addresses: mockCustomer.addresses,
                paymentInstruments: mockCustomer.paymentInstruments,
                preferredBillingAddress: mockCustomer.addresses[0], // First address as preferred
                preferredShippingAddress: mockCustomer.addresses[0], // First address as preferred
            });
            expect(mockClient.getCustomer).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org-id',
                        customerId: 'customer123',
                    },
                    query: {
                        siteId: 'test-site-id',
                    },
                },
            });
        });

        it('should throw error when customer not found', async () => {
            vi.mocked(getAuth).mockReturnValue({ customer_id: 'invalid_id', access_token: 'token123' });
            mockClient.getCustomer.mockRejectedValue(new Error('Customer not found'));

            await expect(getCustomerProfileForCheckout(mockContext)).rejects.toThrow('Customer not found');
        });

        it('should throw error when no customer_id in session', async () => {
            vi.mocked(getAuth).mockReturnValue({ access_token: 'token123' }); // No customer_id

            await expect(getCustomerProfileForCheckout(mockContext)).rejects.toThrow();
        });

        it('should throw error when no session', async () => {
            vi.mocked(getAuth).mockReturnValue(null);

            await expect(getCustomerProfileForCheckout(mockContext)).rejects.toThrow();
        });

        it('should handle customer with empty addresses and payment instruments', async () => {
            const mockCustomer = {
                customerId: 'customer456',
                email: 'simple@example.com',
                addresses: [],
                paymentInstruments: [],
            };

            vi.mocked(getAuth).mockReturnValue({ customer_id: 'customer456', access_token: 'token456' });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await getCustomerProfileForCheckout(mockContext, 'customer456');

            expect(result).toEqual({
                customer: mockCustomer,
                addresses: mockCustomer.addresses,
                paymentInstruments: mockCustomer.paymentInstruments,
                preferredBillingAddress: undefined,
                preferredShippingAddress: undefined,
            });
            expect(result.addresses).toEqual([]);
            expect(result.paymentInstruments).toEqual([]);
        });

        it('should handle customer with only addresses', async () => {
            const mockCustomer = {
                customerId: 'customer789',
                email: 'address-only@example.com',
                addresses: [
                    {
                        addressId: 'addr_1',
                        firstName: 'Jane',
                        lastName: 'Smith',
                        address1: '456 Oak St',
                        city: 'Springfield',
                        stateCode: 'IL',
                        postalCode: '62701',
                        countryCode: 'US',
                    },
                ],
                paymentInstruments: [],
            };

            vi.mocked(getAuth).mockReturnValue({ customer_id: 'customer789', access_token: 'token789' });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await getCustomerProfileForCheckout(mockContext, 'customer789');

            expect(result).toEqual({
                customer: mockCustomer,
                addresses: mockCustomer.addresses,
                paymentInstruments: mockCustomer.paymentInstruments,
                preferredBillingAddress: mockCustomer.addresses[0], // First address as preferred
                preferredShippingAddress: mockCustomer.addresses[0], // First address as preferred
            });
            expect(result.addresses).toHaveLength(1);
            expect(result.paymentInstruments).toEqual([]);
        });

        it('should handle customer with only payment instruments', async () => {
            const mockCustomer = {
                customerId: 'customer999',
                email: 'payment-only@example.com',
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_999',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            expirationMonth: 6,
                            expirationYear: 2026,
                        },
                    },
                ],
            };

            vi.mocked(getAuth).mockReturnValue({ customer_id: 'customer999', access_token: 'token999' });
            mockClient.getCustomer.mockResolvedValue({ data: mockCustomer });

            const result = await getCustomerProfileForCheckout(mockContext, 'customer999');

            expect(result).toEqual({
                customer: mockCustomer,
                addresses: mockCustomer.addresses,
                paymentInstruments: mockCustomer.paymentInstruments,
                preferredBillingAddress: undefined,
                preferredShippingAddress: undefined,
            });
            expect(result.addresses).toEqual([]);
            expect(result.paymentInstruments).toHaveLength(1);
        });
    });
});
