/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export default {
    deliveryOptions: {
        title: 'Delivery:',
        pickupOrDelivery: {
            shipToAddress: 'Ship to Address',
            pickUpInStore: 'Pick Up in Store',
        },
        storeSelection: {
            pickUpIn: 'Pick up in',
            selectStore: 'Select Store',
            inStockAt: 'In stock at',
            outOfStockAt: 'Out of Stock at',
        },
    },
    storeInventoryFilter: {
        heading: 'Shop by Availability',
        label: 'In stock at {storeName}',
        inStock: 'In stock',
        checkboxAriaLabel: 'Filter Products by Store Availability at {storeName}',
        selectStore: 'Select Store',
        changeStore: 'Change Store',
        openStoreLocator: 'Open Store Locator to {action}',
        selectStoreLink: 'Select a Store',
    },
} as const;
