/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PromoCallout from './promo-callout';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

describe('PromoCallout', () => {
    const baseMockProduct: ShopperProducts.schemas['Product'] = {
        id: 'test-product',
        name: 'Test Product',
        price: 29.99,
        type: {},
    };

    test('renders nothing when promotion has no calloutMsg', () => {
        const productWithEmptyPromo: ShopperProducts.schemas['Product'] = {
            ...baseMockProduct,
            productPromotions: [
                {
                    promotionId: 'test-promo',
                    promotionalPrice: 25.99,
                    calloutMsg: '',
                },
            ],
        };

        render(<PromoCallout product={productWithEmptyPromo} />);
        // Should not render any visible text when calloutMsg is empty
        expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
    });

    test('renders plain text callout message', () => {
        const productWithTextPromo: ShopperProducts.schemas['Product'] = {
            ...baseMockProduct,
            productPromotions: [
                {
                    promotionId: '10offRollSleeveBlouse',
                    promotionalPrice: 25.99,
                    calloutMsg: '10$ Off roll sleeve blouse',
                },
            ],
        };

        render(<PromoCallout product={productWithTextPromo} />);
        expect(screen.getByText('10$ Off roll sleeve blouse')).toBeInTheDocument();
    });

    test('renders callout message with HTML formatting', () => {
        const productWithHtmlPromo: ShopperProducts.schemas['Product'] = {
            ...baseMockProduct,
            productPromotions: [
                {
                    promotionId: '10offRollSleeveBlouse',
                    promotionalPrice: 25.99,
                    calloutMsg: '<p>10$ Off roll <strong>sleeve</strong> blouse</p>',
                },
            ],
        };

        render(<PromoCallout product={productWithHtmlPromo} />);

        expect(
            screen.getByText((_, element) => {
                return element?.textContent === '10$ Off roll sleeve blouse' && element?.tagName.toLowerCase() === 'p';
            })
        ).toBeInTheDocument();
        expect(screen.getByText('sleeve')).toBeInTheDocument();
    });

    test('renders first promotion when multiple promotions exist', () => {
        const productWithMultiplePromos: ShopperProducts.schemas['Product'] = {
            ...baseMockProduct,
            productPromotions: [
                {
                    promotionId: 'first-promo',
                    promotionalPrice: 20.99,
                    calloutMsg: 'First promotion message',
                },
                {
                    promotionId: 'second-promo',
                    promotionalPrice: 25.99,
                    calloutMsg: 'Second promotion message',
                },
            ],
        };

        render(<PromoCallout product={productWithMultiplePromos} />);
        expect(screen.getByText('First promotion message')).toBeInTheDocument();
        expect(screen.queryByText('Second promotion message')).not.toBeInTheDocument();
    });

    test('handles script tags safely (scripts do not execute via innerHTML)', () => {
        const productWithScriptTag: ShopperProducts.schemas['Product'] = {
            ...baseMockProduct,
            productPromotions: [
                {
                    promotionId: 'script-promo',
                    promotionalPrice: 25.99,
                    calloutMsg: '<script>alert("test")</script>Safe content <strong>here</strong>',
                },
            ],
        };

        render(<PromoCallout product={productWithScriptTag} />);

        // Should render the safe text content parts
        expect(screen.getByText('Safe content')).toBeInTheDocument();
        expect(screen.getByText('here')).toBeInTheDocument();
        // Script content should not be rendered as text
        expect(screen.queryByText('alert("test")')).not.toBeInTheDocument();
    });

    test('handles variant products with promotions from findLowestPrice', () => {
        const masterProductWithVariants: ShopperProducts.schemas['Product'] = {
            ...baseMockProduct,
            hitType: 'master' as const,
            type: { master: true },
            variants: [
                {
                    productId: 'variant-1',
                    price: 20.99,
                    productPromotions: [
                        {
                            promotionId: 'variant-promo',
                            promotionalPrice: 18.99,
                            calloutMsg: 'Variant promotion message',
                        },
                    ],
                },
            ],
        };

        render(<PromoCallout product={masterProductWithVariants} />);
        expect(screen.getByText('Variant promotion message')).toBeInTheDocument();
    });
});
