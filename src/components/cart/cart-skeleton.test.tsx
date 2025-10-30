/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

// Components
import CartSkeleton from './cart-skeleton';

describe('CartSkeleton', () => {
    describe('Component Rendering', () => {
        test('should render without errors', () => {
            render(<CartSkeleton />);

            expect(screen.getByTestId('sf-cart-container')).toBeInTheDocument();
        });

        test('should display cart title skeleton', () => {
            render(<CartSkeleton />);

            expect(screen.getByTestId('cart-title-skeleton')).toBeInTheDocument();
        });
    });

    describe('Cart Structure', () => {
        test('should display product item skeleton', () => {
            render(<CartSkeleton />);

            expect(screen.getByTestId('cart-product-item')).toBeInTheDocument();
        });

        test('should display order summary skeleton', () => {
            render(<CartSkeleton />);

            expect(screen.getByTestId('cart-order-summary')).toBeInTheDocument();
        });
    });

    describe('Checkout Actions', () => {
        test('should display desktop CTA skeleton', () => {
            render(<CartSkeleton />);

            expect(screen.getByTestId('cart-cta-desktop')).toBeInTheDocument();
        });

        test('should display mobile CTA skeleton', () => {
            render(<CartSkeleton />);

            expect(screen.getByTestId('cart-cta-mobile')).toBeInTheDocument();
        });
    });

    describe('Consistent State', () => {
        test('should render consistently across multiple renders', () => {
            const { rerender } = render(<CartSkeleton />);

            expect(screen.getByTestId('sf-cart-container')).toBeInTheDocument();
            expect(screen.getByTestId('cart-title-skeleton')).toBeInTheDocument();
            expect(screen.getByTestId('cart-product-item')).toBeInTheDocument();
            expect(screen.getByTestId('cart-order-summary')).toBeInTheDocument();

            rerender(<CartSkeleton />);

            expect(screen.getByTestId('sf-cart-container')).toBeInTheDocument();
            expect(screen.getByTestId('cart-title-skeleton')).toBeInTheDocument();
            expect(screen.getByTestId('cart-product-item')).toBeInTheDocument();
            expect(screen.getByTestId('cart-order-summary')).toBeInTheDocument();
        });
    });
});
