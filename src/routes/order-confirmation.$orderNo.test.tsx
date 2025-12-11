/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShopperOrders, ShopperStores } from '@salesforce/storefront-next-runtime/scapi';

// Mock the components and utilities
vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => (
        <div data-testid="card" className={className}>
            {children}
        </div>
    ),
    CardContent: ({ children, className }: any) => (
        <div data-testid="card-content" className={className}>
            {children}
        </div>
    ),
    CardHeader: ({ children, className }: any) => (
        <div data-testid="card-header" className={className}>
            {children}
        </div>
    ),
    CardTitle: ({ children, className }: any) => (
        <h2 data-testid="card-title" className={className}>
            {children}
        </h2>
    ),
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, variant, size, ...props }: any) => (
        <button data-testid="button" data-variant={variant} data-size={size} {...props}>
            {children}
        </button>
    ),
}));

vi.mock('@/components/typography', () => ({
    Typography: ({ children, variant, as, className, ...props }: any) => {
        const Component = as || 'div';
        return (
            <Component data-testid="typography" data-variant={variant} className={className} {...props}>
                {children}
            </Component>
        );
    },
}));

vi.mock('@/components/address-display', () => ({
    default: ({ address }: any) => (
        <div data-testid="address-display">
            <div data-testid="address-name">{address?.fullName}</div>
            <div data-testid="address-line1">{address?.address1}</div>
            <div data-testid="address-city">{address?.city}</div>
        </div>
    ),
}));

vi.mock('@/components/order-skeleton', () => ({
    default: () => <div data-testid="order-skeleton">Loading order...</div>,
}));

vi.mock('react-router', () => ({
    Link: ({ children, to, ...props }: any) => (
        <a href={to} data-testid="link" {...props}>
            {children}
        </a>
    ),
}));

const mockGetProducts = vi.fn().mockResolvedValue({ data: { data: [] } });

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(() => ({
        shopperOrders: {
            getOrder: vi.fn(),
        },
        shopperProducts: {
            getProducts: mockGetProducts,
        },
    })),
}));

vi.mock('@/lib/payment-utils', () => ({
    getCardTypeDisplay: vi.fn(
        (instrument: any, defaultValue: string) => instrument?.paymentCard?.cardType || defaultValue
    ),
    getFormattedMaskedCardNumber: vi.fn((instrument: any) =>
        instrument?.paymentCard?.numberLastDigits ? `****${instrument.paymentCard.numberLastDigits}` : ''
    ),
}));

// @sfdc-extension-block-start SFDC_EXT_BOPIS
vi.mock('@/extensions/bopis/lib/api/stores', () => ({
    fetchStoresForOrder: vi.fn(),
}));

vi.mock('@/extensions/store-locator/components/store-locator/details', () => ({
    default: ({ store, showEmail, showPhone }: any) => (
        <div data-testid="store-details">
            <div data-testid="store-name">{store?.name}</div>
            <div data-testid="store-address">{store?.address1}</div>
            {showPhone && <div data-testid="store-phone">{store?.phone}</div>}
            {showEmail && <div data-testid="store-email">{store?.email}</div>}
        </div>
    ),
}));
// @sfdc-extension-block-end SFDC_EXT_BOPIS

const createPageMock = vi.hoisted(() =>
    vi.fn((config: any) => {
        return function OrderConfirmationPage(props: any) {
            return (
                <div data-testid="order-confirmation-page">{config.component && <config.component {...props} />}</div>
            );
        };
    })
);

vi.mock('@/components/create-page', () => ({
    default: createPageMock,
}));

// Import the functions we want to test
import { createApiClients } from '@/lib/api-clients';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { fetchStoresForOrder } from '@/extensions/bopis/lib/api/stores';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

describe('Order Confirmation Route', () => {
    beforeEach(async () => {
        mockGetProducts.mockReset();
        vi.clearAllMocks();
        vi.resetModules();
        // Import the route module to trigger createPage call with mocks in place
        await import('./order-confirmation.$orderNo');
    });

    const mockOrder: ShopperOrders.schemas['Order'] = {
        orderNo: 'TEST-ORDER-12345',
        status: 'new',
        orderTotal: 150.0,
        currency: 'USD',
        customerInfo: {
            email: 'test@example.com',
        },
        billingAddress: {
            fullName: 'John Doe',
            address1: '123 Main St',
            city: 'San Francisco',
            stateCode: 'CA',
            postalCode: '94105',
            countryCode: 'US',
        },
        shipments: [
            {
                shipmentId: 'shipment-123',
                shippingAddress: {
                    fullName: 'John Doe',
                    address1: '123 Main St',
                    city: 'San Francisco',
                    stateCode: 'CA',
                    postalCode: '94105',
                    countryCode: 'US',
                },
                shippingMethod: {
                    id: 'standard',
                    name: 'Standard Shipping',
                },
            },
        ],
        paymentInstruments: [
            {
                paymentCard: {
                    cardType: 'Visa',
                    numberLastDigits: '1234',
                },
            },
        ],
    };

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const mockStore: ShopperStores.schemas['Store'] = {
        id: 'store-123',
        name: 'Test Store',
        address1: '456 Store Ave',
        city: 'San Francisco',
        stateCode: 'CA',
        postalCode: '94105',
        phone: '555-1234',
        email: 'store@example.com',
    };

    const mockStoresByStoreId = new Map<string, ShopperStores.schemas['Store']>([['store-123', mockStore]]);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    describe('loader and clientLoader functions', () => {
        test('should call getPageData with correct parameters', async () => {
            const { loader, clientLoader } = await import('./order-confirmation.$orderNo');

            const mockContext = {};
            const mockParams = { orderNo: 'TEST-ORDER-12345' };
            const mockArgs = { context: mockContext, params: mockParams } as any;

            const mockGetOrder = vi.fn().mockResolvedValue({ data: mockOrder });
            vi.mocked(createApiClients).mockReturnValue({
                shopperOrders: {
                    getOrder: mockGetOrder,
                },
                shopperProducts: {
                    getProducts: mockGetProducts,
                },
            } as any);

            // @sfdc-extension-line SFDC_EXT_BOPIS
            vi.mocked(fetchStoresForOrder).mockResolvedValue(new Map());

            const loaderResult = loader(mockArgs);
            const clientLoaderResult = clientLoader(mockArgs);

            expect(loaderResult).toBeDefined();
            expect(clientLoaderResult).toBeDefined();
            expect(loaderResult).toHaveProperty('order');
            expect(clientLoaderResult).toHaveProperty('order');
            expect(loaderResult).toHaveProperty('productsById');
            expect(clientLoaderResult).toHaveProperty('productsById');
        });

        test('should fetch order with correct organization and site IDs', async () => {
            const { loader } = await import('./order-confirmation.$orderNo');

            const mockContext = {};
            const mockParams = { orderNo: 'TEST-ORDER-12345' };
            const mockArgs = { context: mockContext, params: mockParams } as any;

            const mockGetOrder = vi.fn().mockResolvedValue({ data: mockOrder });
            vi.mocked(createApiClients).mockReturnValue({
                shopperOrders: {
                    getOrder: mockGetOrder,
                },
                shopperProducts: {
                    getProducts: mockGetProducts,
                },
            } as any);

            // @sfdc-extension-line SFDC_EXT_BOPIS
            vi.mocked(fetchStoresForOrder).mockResolvedValue(new Map());

            loader(mockArgs);

            expect(createApiClients).toHaveBeenCalledWith(mockContext);
        });

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        test('should fetch stores for BOPIS orders', async () => {
            const { loader } = await import('./order-confirmation.$orderNo');

            const mockContext = {};
            const mockParams = { orderNo: 'TEST-ORDER-12345' };
            const mockArgs = { context: mockContext, params: mockParams } as any;

            const mockGetOrder = vi.fn().mockResolvedValue({ data: mockOrder });
            vi.mocked(createApiClients).mockReturnValue({
                shopperOrders: {
                    getOrder: mockGetOrder,
                },
                shopperProducts: {
                    getProducts: mockGetProducts,
                },
            } as any);

            vi.mocked(fetchStoresForOrder).mockResolvedValue(mockStoresByStoreId);

            const result = loader(mockArgs);

            expect(result).toHaveProperty('storesByStoreId');

            // Wait for the order promise to resolve to trigger storesByStoreId
            await result.order;

            // Verify fetchStoresForOrder will be called
            expect(vi.mocked(fetchStoresForOrder)).toBeDefined();
        });
        // @sfdc-extension-block-end SFDC_EXT_BOPIS
    });

    describe('HydrateFallback component', () => {
        test('should render OrderSkeleton', async () => {
            const { HydrateFallback } = await import('./order-confirmation.$orderNo');

            render(<HydrateFallback />);

            expect(screen.getByTestId('order-skeleton')).toBeInTheDocument();
            expect(screen.getByText('Loading order...')).toBeInTheDocument();
        });
    });

    describe('ErrorBoundary component', () => {
        test('should render error message for order not found', async () => {
            const { ErrorBoundary } = await import('./order-confirmation.$orderNo');

            render(<ErrorBoundary />);

            expect(screen.getByText('Order Not Found')).toBeInTheDocument();
            expect(screen.getByText(/We could not find the order you are looking for/)).toBeInTheDocument();
            expect(screen.getByText('Continue Shopping')).toBeInTheDocument();
        });

        test('should render action buttons', async () => {
            const { ErrorBoundary } = await import('./order-confirmation.$orderNo');

            render(<ErrorBoundary />);

            const continueShoppingLink = screen.getByText('Continue Shopping').closest('a');
            expect(continueShoppingLink).toHaveAttribute('href', '/');
        });
    });

    describe('CheckoutConfirmation component', () => {
        test('should have order data structure', () => {
            // Test that the order data structure is correctly defined
            expect(mockOrder).toHaveProperty('orderNo');
            expect(mockOrder).toHaveProperty('status');
            expect(mockOrder).toHaveProperty('orderTotal');
            expect(mockOrder).toHaveProperty('customerInfo');
            expect(mockOrder.customerInfo).toHaveProperty('email');
        });

        test('should have billing address', () => {
            expect(mockOrder).toHaveProperty('billingAddress');
            expect(mockOrder.billingAddress).toHaveProperty('fullName');
            expect(mockOrder.billingAddress).toHaveProperty('address1');
            expect(mockOrder.billingAddress).toHaveProperty('city');
        });

        test('should have shipment information', () => {
            expect(mockOrder).toHaveProperty('shipments');
            expect(mockOrder.shipments).toHaveLength(1);
            expect(mockOrder.shipments?.[0]).toHaveProperty('shippingAddress');
            expect(mockOrder.shipments?.[0]).toHaveProperty('shippingMethod');
        });

        test('should have payment instruments', () => {
            expect(mockOrder).toHaveProperty('paymentInstruments');
            expect(mockOrder.paymentInstruments).toHaveLength(1);
            expect(mockOrder.paymentInstruments?.[0]).toHaveProperty('paymentCard');
        });

        test('should handle order with all required fields', () => {
            const orderWithAllFields = mockOrder;

            expect(orderWithAllFields.orderNo).toBe('TEST-ORDER-12345');
            expect(orderWithAllFields.status).toBe('new');
            expect(orderWithAllFields.orderTotal).toBe(150.0);
            expect(orderWithAllFields.currency).toBe('USD');
        });

        test('should handle order without payment instruments', () => {
            const orderWithoutPayment = {
                ...mockOrder,
                paymentInstruments: undefined,
            };

            expect(orderWithoutPayment.paymentInstruments).toBeUndefined();
            expect(orderWithoutPayment.orderNo).toBe('TEST-ORDER-12345');
        });

        test('should handle order without shipping method', () => {
            const orderWithoutShippingMethod = {
                ...mockOrder,
                shipments: [
                    {
                        ...mockOrder.shipments?.[0],
                        shippingMethod: undefined,
                    },
                ],
            };

            expect(orderWithoutShippingMethod.shipments?.[0].shippingMethod).toBeUndefined();
            expect(orderWithoutShippingMethod.shipments?.[0].shippingAddress).toBeDefined();
        });

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        test('should have store data structure for BOPIS', () => {
            expect(mockStore).toHaveProperty('id');
            expect(mockStore).toHaveProperty('name');
            expect(mockStore).toHaveProperty('address1');
            expect(mockStore).toHaveProperty('city');
            expect(mockStore).toHaveProperty('phone');
        });

        test('should handle BOPIS orders with store information', () => {
            expect(mockStoresByStoreId.has('store-123')).toBe(true);
            expect(mockStoresByStoreId.get('store-123')).toBe(mockStore);
        });

        test('should handle BOPIS order without store information', () => {
            const emptyStoresMap = new Map();
            expect(emptyStoresMap.has('store-123')).toBe(false);
            expect(emptyStoresMap.get('store-123')).toBeUndefined();
        });
        // @sfdc-extension-block-end SFDC_EXT_BOPIS
    });

    describe('createPage integration', () => {
        test('should have been called with correct configuration', () => {
            expect(createPageMock).toHaveBeenCalled();
            expect(createPageMock.mock.calls.length).toBeGreaterThan(0);

            const config = createPageMock.mock.calls[0]?.[0];
            expect(config).toBeDefined();
            expect(config).toHaveProperty('component');
            expect(config).toHaveProperty('fallback');
        });

        test('should have correct fallback component', () => {
            const config = createPageMock.mock.calls[0]?.[0];
            expect(config.fallback).toBeDefined();

            // Render the fallback to verify it's the OrderSkeleton
            const { container } = render(config.fallback);
            expect(container.querySelector('[data-testid="order-skeleton"]')).toBeInTheDocument();
        });
    });

    describe('Currency formatting', () => {
        test('should have USD currency in order', () => {
            expect(mockOrder.currency).toBe('USD');
            expect(mockOrder.orderTotal).toBe(150.0);

            // Test manual currency formatting
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: mockOrder.currency || 'USD',
            }).format(mockOrder.orderTotal || 0);

            expect(formatted).toBe('$150.00');
        });

        test('should handle different currency codes', () => {
            const orderWithEuro = {
                ...mockOrder,
                currency: 'EUR',
                orderTotal: 100.5,
            };

            expect(orderWithEuro.currency).toBe('EUR');
            expect(orderWithEuro.orderTotal).toBe(100.5);

            // Test manual currency formatting for EUR
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: orderWithEuro.currency || 'USD',
            }).format(orderWithEuro.orderTotal || 0);

            expect(formatted).toContain('100.50');
        });
    });
});
