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

import type { ShopperOrders, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

/** Map of product id to product for order details */
export type MockProductDataById = Record<string, ShopperProducts.schemas['Product'] | undefined>;

/**
 * Mock order and products for order details UI development.
 * Matches structure of Shopper Orders API getOrder response.
 * Replace with real API data when integrating.
 */
export const mockOrderDetailsOrder = {
    adjustedMerchandizeTotalTax: 3.1,
    adjustedShippingTotalTax: 0.3,
    billingAddress: {
        address1: '2030 Market street 8th st',
        city: 'Seattle',
        countryCode: 'US',
        firstName: 'John',
        fullName: 'John Snow',
        id: '7adb4a731966b44a895c9b74b7',
        lastName: 'Snow',
        phone: '(987) 654-3210',
        postalCode: '98121',
        stateCode: 'WA',
    },
    channelType: 'storefront',
    confirmationStatus: 'not_confirmed',
    createdBy: 'Customer',
    creationDate: '2026-01-28T05:56:57.000Z',
    currency: 'USD',
    customerInfo: {
        customerId: 'abmrdIlbkVkHcRkHpFmaYYl0oZ',
        customerName: 'John Snow',
        customerNo: '00001001',
        email: 'john.snow@salesforce.com',
    },
    customerName: 'John Snow',
    exportStatus: 'not_exported',
    groupedTaxItems: [
        {
            taxRate: 0.05,
            taxValue: 3.4,
        },
    ],
    guest: false,
    lastModified: '2026-01-28T05:58:00.000Z',
    merchandizeTotalTax: 3.1,
    notes: {},
    orderNo: 'INO001',
    orderToken: 'TLZx7veyzb9pSitaoxlDtVWP4_dvy0xEaHpFUdWy-98',
    orderTotal: 71.38,
    orderViewCode: 'jfBOQLdmJztxkAUmjK93toPDyqfl3nhW2SLnqEoPHmU',
    paymentInstruments: [
        {
            amount: 71.38,
            paymentCard: {
                cardType: 'Visa',
                creditCardExpired: false,
                expirationMonth: 12,
                expirationYear: 2026,
                holder: 'Testing',
                maskedNumber: '************1111',
                numberLastDigits: '1111',
            },
            paymentInstrumentId: '3970af23167100c72a70d7e808',
            paymentMethodId: 'CREDIT_CARD',
        },
    ],
    paymentStatus: 'not_paid',
    productItems: [
        {
            adjustedTax: 3.1,
            basePrice: 61.99,
            bonusProductLineItem: false,
            gift: false,
            itemId: '0066d7441cdaf6f93a64ca7a74',
            itemText: 'First Product',
            price: 61.99,
            priceAfterItemDiscount: 61.99,
            priceAfterOrderDiscount: 61.99,
            productId: '701643108633M',
            productName: 'First Product',
            quantity: 1,
            shipmentId: 'me',
            tax: 3.1,
            taxBasis: 61.99,
            taxClassId: 'standard',
            taxRate: 0.05,
        },
    ],
    productSubTotal: 61.99,
    productTotal: 61.99,
    shipments: [
        {
            adjustedMerchandizeTotalTax: 3.1,
            adjustedShippingTotalTax: 0.3,
            gift: false,
            merchandizeTotalTax: 3.1,
            productSubTotal: 61.99,
            productTotal: 61.99,
            shipmentId: 'me',
            shipmentNo: '00002503',
            shipmentTotal: 71.38,
            shippingAddress: {
                address1: '2030 Market street 8th st',
                city: 'Seattle',
                countryCode: 'US',
                firstName: 'John',
                fullName: 'John Snow',
                id: '9f3e831228c0f0657f3c29eea7',
                lastName: 'Snow',
                phone: '(987) 654-3210',
                postalCode: '98121',
                stateCode: 'WA',
            },
            shippingMethod: {
                description: 'Order received within 7-10 business days',
                id: '001',
                name: 'Ground',
                price: 5.99,
                c_estimatedArrivalTime: '7-10 Business Days',
            },
            shippingStatus: 'not_shipped',
            shippingTotal: 5.99,
            shippingTotalTax: 0.3,
            taxTotal: 3.4,
        },
    ],
    shippingItems: [
        {
            adjustedTax: 0.3,
            basePrice: 5.99,
            itemId: '3fc53658ab067164cb60d67542',
            itemText: 'Shipping',
            price: 5.99,
            priceAfterItemDiscount: 5.99,
            shipmentId: 'me',
            tax: 0.3,
            taxBasis: 5.99,
            taxClassId: 'standard',
            taxRate: 0.05,
        },
    ],
    shippingStatus: 'not_shipped',
    shippingTotal: 5.99,
    shippingTotalTax: 0.3,
    siteId: 'RefArch',
    status: 'new',
    taxation: 'net',
    taxRoundedAtGroup: false,
    taxTotal: 3.4,
} as ShopperOrders.schemas['Order'];

export const mockOrderDetailsProductsById: MockProductDataById = {
    '701643108633M': {
        id: '701643108633M',
        name: 'First Product',
        image: {
            link: 'https://zzrf-001.dx.commercecloud.salesforce.com/on/demandware.static/-/Sites-apparel-m-catalog/default/dw97734cd6/images/large/PG.33330DAN84Q.CHARCWL.PZ.jpg',
            alt: 'First Product',
        },
        variationAttributes: [
            {
                id: 'size',
                name: 'Size',
                values: [
                    { value: 'S', name: 'S' },
                    { value: 'M', name: 'M' },
                    { value: 'L', name: 'L' },
                ],
            },
            {
                id: 'color',
                name: 'Color',
                values: [
                    { value: 'NAVY', name: 'Navy' },
                    { value: 'BLACK', name: 'Black' },
                    { value: 'WHITE', name: 'White' },
                ],
            },
        ],
        variationValues: { size: 'M', color: 'NAVY' },
    } as ShopperProducts.schemas['Product'],
};
