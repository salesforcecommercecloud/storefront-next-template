import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AccountDetailSkeleton } from './index';

describe('AccountDetailSkeleton', () => {
    describe('Component Rendering', () => {
        test('should render without errors', () => {
            const { container } = render(<AccountDetailSkeleton />);

            expect(container.firstChild).toBeInTheDocument();
        });

        test('should have correct container classes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const mainContainer = container.querySelector('.space-y-6');
            expect(mainContainer).toBeInTheDocument();
        });

        test('should render page header skeleton', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const titleSkeleton = container.querySelector('.h-8.w-40');
            expect(titleSkeleton).toBeInTheDocument();
        });
    });

    describe('Profile Card', () => {
        test('should render profile card', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cards = container.querySelectorAll('[data-slot="card"]');
            expect(cards.length).toBeGreaterThanOrEqual(1);
        });

        test('should have correct card styling', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const card = container.querySelector('.border-border');
            expect(card).toBeInTheDocument();
        });

        test('should render card content', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cardContents = container.querySelectorAll('[data-slot="card-content"]');
            expect(cardContents.length).toBeGreaterThanOrEqual(1);
        });

        test('should render card header skeleton', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const headerSkeleton = container.querySelector('.h-6.w-24');
            expect(headerSkeleton).toBeInTheDocument();
        });

        test('should render 3 profile field skeletons', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Each profile field has 2 skeletons (label + value)
            const labelSkeletons = container.querySelectorAll('.h-4.w-20');
            const valueSkeletons = container.querySelectorAll('.h-4.w-32');

            expect(labelSkeletons.length).toBeGreaterThanOrEqual(3);
            expect(valueSkeletons.length).toBeGreaterThanOrEqual(3);
        });

        test('should have correct grid layout for profile fields', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const gridContainer = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3');
            expect(gridContainer).toBeInTheDocument();
        });
    });

    describe('Password Card', () => {
        test('should render password card', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cards = container.querySelectorAll('[data-slot="card"]');
            // Should have at least profile and password cards
            expect(cards.length).toBeGreaterThanOrEqual(2);
        });

        test('should render password card header skeleton', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const passwordHeader = container.querySelectorAll('.h-6.w-20');
            expect(passwordHeader.length).toBeGreaterThanOrEqual(1);
        });

        test('should render password field skeletons', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const passwordFieldSkeletons = container.querySelectorAll('.h-4.w-16, .h-4.w-24');
            expect(passwordFieldSkeletons.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Layout Structure', () => {
        test('should have correct spacing', () => {
            const { container } = render(<AccountDetailSkeleton />);

            expect(container.querySelector('.space-y-6')).toBeInTheDocument();
            expect(container.querySelector('.gap-4')).toBeInTheDocument();
        });

        test('should have correct padding', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const paddedElements = container.querySelectorAll('.p-6');
            expect(paddedElements.length).toBeGreaterThanOrEqual(2);
        });

        test('should render skeleton elements', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const skeletons = container.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        test('should have correct margin classes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const mbElements = container.querySelectorAll('.mb-2, .mb-6');
            expect(mbElements.length).toBeGreaterThan(0);
        });
    });

    describe('Responsive Design', () => {
        test('should have responsive grid classes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            expect(container.querySelector('.grid-cols-1.lg\\:grid-cols-3')).toBeInTheDocument();
        });

        test('should adapt to different screen sizes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Check that responsive classes exist
            const responsiveGrid = container.querySelector('.lg\\:grid-cols-3');
            expect(responsiveGrid).toBeInTheDocument();
        });
    });

    describe('Card Structure', () => {
        test('should render multiple cards', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cards = container.querySelectorAll('[data-slot="card"]');
            expect(cards.length).toBeGreaterThanOrEqual(2);
        });

        test('should have cards with border styling', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const borderedCards = container.querySelectorAll('.border-border');
            expect(borderedCards.length).toBeGreaterThanOrEqual(2);
        });

        test('should have card content with padding', () => {
            const { container } = render(<AccountDetailSkeleton />);

            const cardContents = container.querySelectorAll('[data-slot="card-content"]');
            // Should have at least 2 card contents (profile + password)
            expect(cardContents.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Consistent Rendering', () => {
        test('should render consistently across multiple renders', () => {
            const { container, rerender } = render(<AccountDetailSkeleton />);

            const initialSkeletons = container.querySelectorAll('.animate-pulse');

            rerender(<AccountDetailSkeleton />);

            const newSkeletons = container.querySelectorAll('.animate-pulse');
            expect(newSkeletons.length).toBe(initialSkeletons.length);
        });

        test('should not change card count on re-render', () => {
            const { container, rerender } = render(<AccountDetailSkeleton />);

            const initialCards = container.querySelectorAll('[data-slot="card"]');

            rerender(<AccountDetailSkeleton />);

            const newCards = container.querySelectorAll('[data-slot="card"]');
            expect(newCards.length).toBe(initialCards.length);
        });
    });

    describe('Skeleton Sizes', () => {
        test('should render various skeleton sizes', () => {
            const { container } = render(<AccountDetailSkeleton />);

            // Page title skeleton (larger)
            expect(container.querySelector('.h-8.w-40')).toBeInTheDocument();

            // Card header skeletons
            expect(container.querySelector('.h-6.w-24')).toBeInTheDocument();
            expect(container.querySelector('.h-6.w-20')).toBeInTheDocument();

            // Field label skeletons
            expect(container.querySelector('.h-4.w-20')).toBeInTheDocument();
            expect(container.querySelector('.h-4.w-16')).toBeInTheDocument();

            // Field value skeletons
            expect(container.querySelector('.h-4.w-32')).toBeInTheDocument();
            expect(container.querySelector('.h-4.w-24')).toBeInTheDocument();
        });
    });
});
