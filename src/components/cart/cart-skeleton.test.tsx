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
import { describe, expect, test } from 'vitest';

import CartSkeleton from './cart-skeleton';

describe('CartSkeleton', () => {
    describe('Component Rendering', () => {
        test('should render with default props', () => {
            render(<CartSkeleton />);
            expect(screen.getByTestId('sf-cart-empty-skeleton')).toBeInTheDocument();
        });
    });

    describe('Empty Skeleton Structure', () => {
        test('should render empty cart skeleton when item count is undefined', () => {
            const { container } = render(<CartSkeleton />);
            // Mirrors cart-empty.tsx: full-width panel inside section-container
            const panel = container.querySelector('.bg-background.p-8');
            expect(panel).toBeInTheDocument();
            // Real svg is w-24 h-24
            const iconSkeleton = container.querySelector('.w-24.h-24');
            expect(iconSkeleton).toBeInTheDocument();
        });

        test('should render empty cart skeleton when item count is 0', () => {
            const { container } = render(<CartSkeleton productItemCount={0} />);
            expect(screen.getByTestId('sf-cart-empty-skeleton')).toBeInTheDocument();
            // Real EmptyCart only ever renders one button
            const buttonSkeleton = container.querySelector('.h-9.rounded-md');
            expect(buttonSkeleton).toBeInTheDocument();
        });

        test('should render a single CTA button', () => {
            const { container } = render(<CartSkeleton productItemCount={0} />);
            // Real cart-empty.tsx renders one "Continue Shopping" button for guests and registered alike.
            const buttons = container.querySelectorAll('.h-9.rounded-md');
            expect(buttons).toHaveLength(1);
        });
    });

    describe('Itemized Skeleton Structure', () => {
        test('should render itemized skeletons when item count is greater than 0', () => {
            const { container } = render(<CartSkeleton productItemCount={1} />);
            expect(screen.getByTestId('sf-cart-skeleton')).toBeInTheDocument();
            // Page heading h1 placeholder (h-10)
            const titleSkeleton = container.querySelector('.h-10.w-48');
            expect(titleSkeleton).toBeInTheDocument();
            // Product image placeholder
            const imageSkeleton = container.querySelector('.aspect-square');
            expect(imageSkeleton).toBeInTheDocument();
            // Price block placeholder
            const priceSkeleton = container.querySelector('[class*="w-[8.5rem]"]');
            expect(priceSkeleton).toBeInTheDocument();
            // Order summary heading placeholder
            const summaryTitle = container.querySelector('.h-7.w-28');
            expect(summaryTitle).toBeInTheDocument();
        });

        test('should render the correct number of product item skeletons', () => {
            const { container } = render(<CartSkeleton productItemCount={3} />);
            const productImages = container.querySelectorAll('.aspect-square');
            expect(productImages).toHaveLength(3);
        });

        test('should reserve space for the fixed mobile checkout bar', () => {
            const { container } = render(<CartSkeleton productItemCount={1} />);
            // Real CartContent uses `pb-32 md:pb-0` to leave room for the fixed bottom CTA.
            const root = container.querySelector('[data-testid="sf-cart-skeleton"]');
            expect(root?.className).toContain('pb-32');
            expect(root?.className).toContain('md:pb-0');
        });
    });

    describe('Consistent State', () => {
        test('should render consistently across multiple renders', () => {
            const { rerender } = render(<CartSkeleton productItemCount={1} />);

            expect(screen.getByTestId('sf-cart-skeleton')).toBeInTheDocument();

            rerender(<CartSkeleton productItemCount={1} />);

            expect(screen.getByTestId('sf-cart-skeleton')).toBeInTheDocument();
        });
    });
});
