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
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { OrderSummaryMobileAccordion } from './mobile-heading';
import {
    getOrderSummaryItemCount,
    getOrderSummaryMobileHeading,
    type OrderSummaryBasket,
} from './mobile-heading-utils';

describe('OrderSummary mobile heading helpers', () => {
    const { t } = getTranslation();
    const basket = {
        basketId: 'basket-1',
        productItems: [
            { itemId: 'item-1', productId: 'p1', quantity: 2 },
            { itemId: 'item-2', productId: 'p2', quantity: 1 },
        ],
    } as ShopperBasketsV2.schemas['Basket'];

    test('getOrderSummaryItemCount sums product item quantities', () => {
        expect(getOrderSummaryItemCount(basket)).toBe(3);
        expect(
            getOrderSummaryItemCount({
                ...basket,
                productItems: [{ itemId: 'item-3', productId: 'p3', quantity: undefined }],
            })
        ).toBe(0);
    });

    test('getOrderSummaryMobileHeading delegates translation with count', () => {
        const translate = vi.fn((key: string, options?: { count?: number }) => `${key}:${options?.count ?? 0}`);

        const heading = getOrderSummaryMobileHeading(translate as any, basket);

        expect(heading).toBe('summary.mobileHeading:3');
        expect(translate).toHaveBeenCalledWith('summary.mobileHeading', { count: 3 });
    });

    test('OrderSummaryMobileAccordion renders heading and children content', () => {
        render(
            <OrderSummaryMobileAccordion basket={basket}>
                <div data-testid="mobile-content">Mobile summary content</div>
            </OrderSummaryMobileAccordion>
        );

        const trigger = screen.getByRole('button', { name: t('cart:summary.mobileHeading', { count: 3 }) });
        expect(trigger).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-content')).not.toBeInTheDocument();
    });

    test('OrderSummaryMobileAccordion respects defaultExpanded', () => {
        render(
            <OrderSummaryMobileAccordion basket={basket as OrderSummaryBasket} defaultExpanded={true}>
                <div data-testid="mobile-content">Mobile summary content</div>
            </OrderSummaryMobileAccordion>
        );

        expect(screen.getByRole('button', { name: t('cart:summary.mobileHeading', { count: 3 }) })).toHaveAttribute(
            'aria-expanded',
            'true'
        );
        expect(screen.getByTestId('mobile-content')).toBeInTheDocument();
    });
});
