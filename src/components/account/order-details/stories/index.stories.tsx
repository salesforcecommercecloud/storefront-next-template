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
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import type { ShopperOrders, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { OrderDetails } from '../index';
import { ConfigWrapper } from '@/test-utils/config';
import { CurrencyWrapper } from '@/test-utils/context-provider';

function productFixture(
    id: string,
    name: string,
    imageGroups: ShopperProducts.schemas['Product']['imageGroups'] = []
): ShopperProducts.schemas['Product'] {
    return {
        id,
        name,
        imageGroups,
        variationAttributes: [],
        variationValues: {},
    } as ShopperProducts.schemas['Product'];
}

const order: ShopperOrders.schemas['Order'] = {
    orderNo: 'INO001',
    status: 'new',
    orderTotal: 71.38,
    productSubTotal: 61.99,
    productTotal: 61.99,
    productItems: [
        {
            itemId: '0066d7441cdaf6f93a64ca7a74',
            productId: '701643108633M',
            productName: 'First Product',
            quantity: 1,
            basePrice: 61.99,
            price: 61.99,
            priceAfterItemDiscount: 61.99,
            shipmentId: 'me',
        },
    ],
    shipments: [
        {
            shipmentId: 'me',
            shipmentNo: '00002503',
            trackingNumber: '1234567890',
            shippingAddress: {
                address1: '2030 Market street 8th st',
                city: 'Seattle',
                countryCode: 'US',
                firstName: 'John',
                fullName: 'John Snow',
                lastName: 'Snow',
                postalCode: '98121',
                stateCode: 'WA',
            },
            shippingMethod: { id: '001', name: 'Ground', price: 5.99 },
        },
    ],
};

const productsById: Record<string, ShopperProducts.schemas['Product'] | undefined> = {
    '701643108633M': productFixture('701643108633M', 'First Product', [
        { viewType: 'small', images: [{ link: 'https://example.com/product.jpg', alt: 'First Product' }] },
    ]),
};

const meta: Meta<typeof OrderDetails> = {
    title: 'ACCOUNT/Order Details',
    component: OrderDetails,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Order details page showing order info, shipments, line items, and order summary. In the app, data is loaded via `fetchOrderWithProducts` (SCAPI getOrder + getProducts); this story uses inline mock data with the same shape.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <ConfigWrapper>
                        <CurrencyWrapper>
                            <Story />
                        </CurrencyWrapper>
                    </ConfigWrapper>
                );
                if (inRouter) return content;
                const router = createMemoryRouter([{ path: '*', element: content }], { initialEntries: ['/'] });
                return <RouterProvider router={router} />;
            };
            return <RouterWrapper />;
        },
    ],
    argTypes: {
        order: { control: false },
        productsById: { control: false },
    },
};

export default meta;
type Story = StoryObj<typeof OrderDetails>;

export const Default: Story = {
    args: {
        order,
        productsById,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { level: 1 })).toBeInTheDocument();
        await expect(canvas.getByText('First Product')).toBeInTheDocument();
    },
};

const orderMultipleShipments: ShopperOrders.schemas['Order'] = {
    orderNo: 'INV002',
    status: 'new',
    orderTotal: 30,
    productSubTotal: 30,
    productTotal: 30,
    productItems: [
        {
            itemId: 'item-a1',
            productId: 'prod-a',
            productName: 'Product for Alice',
            quantity: 1,
            priceAfterItemDiscount: 10,
            shipmentId: 'ship-a',
        },
        {
            itemId: 'item-b1',
            productId: 'prod-b',
            productName: 'Product for Bob',
            quantity: 1,
            priceAfterItemDiscount: 20,
            shipmentId: 'ship-b',
        },
    ],
    shipments: [
        {
            shipmentId: 'ship-a',
            shipmentNo: '00002501',
            shippingAddress: { firstName: 'Alice', lastName: 'Smith', fullName: 'Alice Smith' },
        },
        {
            shipmentId: 'ship-b',
            shipmentNo: '00002502',
            shippingAddress: { firstName: 'Bob', lastName: 'Jones', fullName: 'Bob Jones' },
        },
    ],
};

const productsByIdMultiple: Record<string, ShopperProducts.schemas['Product'] | undefined> = {
    'prod-a': productFixture('prod-a', 'Product for Alice'),
    'prod-b': productFixture('prod-b', 'Product for Bob'),
};

export const MultipleShipments: Story = {
    args: {
        order: orderMultipleShipments,
        productsById: productsByIdMultiple,
    },
    parameters: {
        docs: {
            description: {
                story: 'Order with two shipments and different recipients (Alice Smith, Bob Jones).',
            },
        },
    },
};

export const ShippedStatus: Story = {
    args: {
        order: { ...order, status: 'shipped' as ShopperOrders.schemas['Order']['status'] },
        productsById,
    },
    parameters: {
        docs: {
            description: {
                story: 'Order with status "shipped" (displays in-transit label).',
            },
        },
    },
};
