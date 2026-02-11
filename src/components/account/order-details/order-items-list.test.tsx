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
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { MemoryRouter } from 'react-router';
import { OrderItemsList } from './order-items-list';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();

describe('OrderItemsList', () => {
    const renderOrderItemsList = (items: any[], productsById: Record<string, any> = {}) =>
        render(
            <MemoryRouter>
                <OrderItemsList items={items} productsById={productsById} />
            </MemoryRouter>
        );

    test('renders empty fallback when no items', () => {
        renderOrderItemsList([]);
        expect(screen.getByText(t('account:orders.emptyItemsFallback'))).toBeInTheDocument();
    });

    test('renders item with all product properties (name, quantity, price, Buy Again link, variation attributes)', () => {
        const items = [
            {
                itemId: 'item-1',
                productId: '701643108633M',
                productName: 'Sweater',
                quantity: 3,
                priceAfterItemDiscount: 61.99,
                shipmentId: 'me',
            },
        ];
        const productsById = {
            '701643108633M': {
                id: '701643108633M',
                name: 'Sweater',
                variationAttributes: [
                    { id: 'size', name: 'Size', values: [{ value: 'M', name: 'M' }] },
                    { id: 'color', name: 'Color', values: [{ value: 'NAVY', name: 'Navy' }] },
                ],
                variationValues: { size: 'M', color: 'NAVY' },
            },
        };
        renderOrderItemsList(items, productsById);

        expect(screen.getByText('Sweater')).toBeInTheDocument();
        expect(screen.getByText(t('account:orders.quantityLabel', { count: 3 }))).toBeInTheDocument();
        expect(screen.getByText('$61.99')).toBeInTheDocument();

        const buyAgainLink = screen.getByRole('link', { name: t('account:orders.buyAgain') });
        expect(buyAgainLink).toHaveAttribute('href', '/product/701643108633M');

        expect(screen.getByText(/Size: M/)).toBeInTheDocument();
        expect(screen.getByText(/Color: Navy/)).toBeInTheDocument();
    });

    test('renders multiple items as list', () => {
        const items = [
            {
                itemId: 'item-1',
                productId: 'prod-1',
                productName: 'Product One',
                quantity: 1,
                priceAfterItemDiscount: 10,
                shipmentId: 'me',
            },
            {
                itemId: 'item-2',
                productId: 'prod-2',
                productName: 'Product Two',
                quantity: 1,
                priceAfterItemDiscount: 20,
                shipmentId: 'me',
            },
        ];
        renderOrderItemsList(items, {});
        expect(screen.getByText('Product One')).toBeInTheDocument();
        expect(screen.getByText('Product Two')).toBeInTheDocument();
        expect(screen.getByText('$10.00')).toBeInTheDocument();
        expect(screen.getByText('$20.00')).toBeInTheDocument();
    });
});
