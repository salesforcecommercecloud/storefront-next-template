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

    describe('Skeleton Structure', () => {
        test('should render empty cart skeleton when item count is undefined', () => {
            const { container } = render(<CartSkeleton />);
            const card = container.querySelector('.max-w-md.mx-auto');
            const iconSkeleton = container.querySelector('.h-8.w-8');
            expect(card).toBeInTheDocument();
            expect(iconSkeleton).toBeInTheDocument();
        });

        test('should render empty cart skeleton when item count is 0', () => {
            const { container } = render(<CartSkeleton productItemCount={0} />);
            expect(screen.getByTestId('sf-cart-empty-skeleton')).toBeInTheDocument();
            const buttonSkeletons = container.querySelectorAll('.h-9.w-full');
            expect(buttonSkeletons.length).toBeGreaterThanOrEqual(2);
        });

        test('should render itemized skeletons when item count is greater than 0', () => {
            const { container } = render(<CartSkeleton productItemCount={1} />);
            const titleSkeleton = container.querySelector('.h-8.w-48');
            expect(titleSkeleton).toBeInTheDocument();
            const imageSkeleton = container.querySelector('.aspect-square');
            expect(imageSkeleton).toBeInTheDocument();
            const priceSkeleton = container.querySelector('[class*="w-[8.5rem]"]');
            expect(priceSkeleton).toBeInTheDocument();
            const summaryTitle = container.querySelector('.h-7.w-28');
            expect(summaryTitle).toBeInTheDocument();
        });

        test('should render the correct number of product item skeletons', () => {
            const { container } = render(<CartSkeleton productItemCount={3} />);
            const productCards = container.querySelectorAll('.aspect-square');
            expect(productCards).toHaveLength(3);
        });
    });

    describe('isRegistered Prop', () => {
        test('should render two button skeletons when not registered', () => {
            const { container } = render(<CartSkeleton isRegistered={false} />);
            const buttonSkeletons = container.querySelectorAll('.h-9.w-full');
            expect(buttonSkeletons).toHaveLength(2);
        });

        test('should render one button skeleton when registered', () => {
            const { container } = render(<CartSkeleton isRegistered={true} />);
            const buttonSkeletons = container.querySelectorAll('.h-9.w-full');
            expect(buttonSkeletons).toHaveLength(1);
        });

        test('should render one button skeleton when registered with productItemCount 0', () => {
            const { container } = render(<CartSkeleton isRegistered={true} productItemCount={0} />);
            const buttonSkeletons = container.querySelectorAll('.h-9.w-full');
            expect(buttonSkeletons).toHaveLength(1);
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
