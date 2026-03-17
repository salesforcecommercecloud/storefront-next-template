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

import CartEmptySkeleton from './cart-empty-skeleton';

describe('CartEmptySkeleton', () => {
    describe('Component Rendering', () => {
        test('should render with default props', () => {
            render(<CartEmptySkeleton />);
            expect(screen.getByTestId('sf-cart-empty-skeleton')).toBeInTheDocument();
        });
    });

    describe('User Registration States', () => {
        test('should render two button skeletons for guest users (isRegistered=false)', () => {
            const { container } = render(<CartEmptySkeleton isRegistered={false} />);

            // Find the action buttons container (space-y-3)
            const buttonContainer = container.querySelector('.space-y-3');
            expect(buttonContainer).toBeInTheDocument();

            // Should have 2 button skeletons for guest users
            const buttonSkeletons = buttonContainer?.querySelectorAll('.h-9');
            expect(buttonSkeletons).toHaveLength(2);
        });

        test('should render only one button skeleton for registered users (isRegistered=true)', () => {
            const { container } = render(<CartEmptySkeleton isRegistered={true} />);

            // Find the action buttons container (space-y-3)
            const buttonContainer = container.querySelector('.space-y-3');
            expect(buttonContainer).toBeInTheDocument();

            // Should have only 1 button skeleton for registered users
            const buttonSkeletons = buttonContainer?.querySelectorAll('.h-9');
            expect(buttonSkeletons).toHaveLength(1);
        });
    });

    describe('Skeleton Structure', () => {
        test('should render icon skeleton', () => {
            const { container } = render(<CartEmptySkeleton />);

            // Icon container with rounded-full class
            const iconContainer = container.querySelector('.w-16.h-16.rounded-full');
            expect(iconContainer).toBeInTheDocument();

            // Icon skeleton inside
            const iconSkeleton = iconContainer?.querySelector('.w-8.h-8');
            expect(iconSkeleton).toBeInTheDocument();
        });

        test('should render message skeletons', () => {
            const { container } = render(<CartEmptySkeleton />);

            // Message container
            const messageContainer = container.querySelector('.space-y-2');
            expect(messageContainer).toBeInTheDocument();

            // Title skeleton (h-7)
            const titleSkeleton = messageContainer?.querySelector('.h-7');
            expect(titleSkeleton).toBeInTheDocument();

            // Message skeletons (h-5)
            const messageSkeletons = messageContainer?.querySelectorAll('.h-5');
            expect(messageSkeletons).toHaveLength(2);
        });

        test('should render card container', () => {
            const { container } = render(<CartEmptySkeleton />);

            // Card should be present
            const card = container.querySelector('.max-w-md');
            expect(card).toBeInTheDocument();
        });
    });

    describe('Consistent State', () => {
        test('should render consistently across multiple renders', () => {
            const { rerender } = render(<CartEmptySkeleton />);

            expect(screen.getByTestId('sf-cart-empty-skeleton')).toBeInTheDocument();

            rerender(<CartEmptySkeleton />);

            expect(screen.getByTestId('sf-cart-empty-skeleton')).toBeInTheDocument();
        });

        test('should toggle button count when isRegistered changes', () => {
            const { container, rerender } = render(<CartEmptySkeleton isRegistered={false} />);

            let buttonContainer = container.querySelector('.space-y-3');
            let buttonSkeletons = buttonContainer?.querySelectorAll('.h-9');
            expect(buttonSkeletons).toHaveLength(2);

            rerender(<CartEmptySkeleton isRegistered={true} />);

            buttonContainer = container.querySelector('.space-y-3');
            buttonSkeletons = buttonContainer?.querySelectorAll('.h-9');
            expect(buttonSkeletons).toHaveLength(1);
        });
    });
});
