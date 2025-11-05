import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AccountSkeleton } from './index';

describe('AccountSkeleton', () => {
    describe('Component Rendering', () => {
        test('should render without errors', () => {
            const { container } = render(<AccountSkeleton />);

            expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
        });

        test('should render grid layout', () => {
            const { container } = render(<AccountSkeleton />);

            expect(container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-4')).toBeInTheDocument();
        });
    });

    describe('Mobile Navigation', () => {
        test('should render mobile navigation skeleton', () => {
            const { container } = render(<AccountSkeleton />);

            const mobileCard = container.querySelector('.bg-muted\\/30');
            expect(mobileCard).toBeInTheDocument();
        });

        test('should render navigation item skeletons on mobile', () => {
            const { container } = render(<AccountSkeleton />);

            // Check for skeleton elements in mobile navigation
            const skeletonElements = container.querySelectorAll('.lg\\:hidden .animate-pulse');
            expect(skeletonElements.length).toBeGreaterThan(0);
        });
    });

    describe('Desktop Navigation', () => {
        test('should render desktop navigation skeleton', () => {
            const { container } = render(<AccountSkeleton />);

            const desktopNav = container.querySelector('.hidden.lg\\:block');
            expect(desktopNav).toBeInTheDocument();
        });

        test('should render 4 navigation item skeletons on desktop', () => {
            const { container } = render(<AccountSkeleton />);

            const skeletonElements = container.querySelectorAll('.hidden.lg\\:block .h-5.w-5.rounded');
            expect(skeletonElements.length).toBe(4);
        });
    });

    describe('Main Content', () => {
        test('should render main content area', () => {
            const { container } = render(<AccountSkeleton />);

            const mainContent = container.querySelector('.lg\\:col-span-3');
            expect(mainContent).toBeInTheDocument();
        });

        test('should render page title skeleton', () => {
            const { container } = render(<AccountSkeleton />);

            const titleSkeleton = container.querySelector('.h-8.w-40');
            expect(titleSkeleton).toBeInTheDocument();
        });

        test('should render profile card skeleton', () => {
            const { container } = render(<AccountSkeleton />);

            // Check for Card components
            const cards = container.querySelectorAll('[data-slot="card"], .border-border');
            expect(cards.length).toBeGreaterThanOrEqual(2);
        });

        test('should render password card skeleton', () => {
            const { container } = render(<AccountSkeleton />);

            // Check for multiple Card components (profile + password)
            const cardContents = container.querySelectorAll('[data-slot="card-content"]');
            expect(cardContents.length).toBeGreaterThanOrEqual(2);
        });

        test('should render 3 profile field skeletons', () => {
            const { container } = render(<AccountSkeleton />);

            // Each profile field has 2 skeleton elements (label + value)
            const profileSkeletons = container.querySelectorAll('.h-4.w-20, .h-4.w-32');
            expect(profileSkeletons.length).toBeGreaterThanOrEqual(6);
        });

        test('should render password field skeleton', () => {
            const { container } = render(<AccountSkeleton />);

            const passwordSkeletons = container.querySelectorAll('.h-4.w-16, .h-4.w-24');
            expect(passwordSkeletons.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Layout Structure', () => {
        test('should have correct spacing classes', () => {
            const { container } = render(<AccountSkeleton />);

            expect(container.querySelector('.space-y-6')).toBeInTheDocument();
            expect(container.querySelector('.gap-8')).toBeInTheDocument();
            expect(container.querySelector('.space-y-1')).toBeInTheDocument();
        });

        test('should have correct padding classes', () => {
            const { container } = render(<AccountSkeleton />);

            expect(container.querySelector('.px-4.sm\\:px-6.lg\\:px-8')).toBeInTheDocument();
            expect(container.querySelector('.py-8')).toBeInTheDocument();
        });

        test('should render skeleton elements with correct styling', () => {
            const { container } = render(<AccountSkeleton />);

            const skeletons = container.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Responsive Design', () => {
        test('should have responsive grid classes', () => {
            const { container } = render(<AccountSkeleton />);

            expect(container.querySelector('.grid-cols-1.lg\\:grid-cols-4')).toBeInTheDocument();
            expect(container.querySelector('.lg\\:grid-cols-3')).toBeInTheDocument();
        });

        test('should have responsive column spans', () => {
            const { container } = render(<AccountSkeleton />);

            expect(container.querySelector('.lg\\:col-span-1')).toBeInTheDocument();
            expect(container.querySelector('.lg\\:col-span-3')).toBeInTheDocument();
        });
    });

    describe('Consistent Rendering', () => {
        test('should render consistently across multiple renders', () => {
            const { container, rerender } = render(<AccountSkeleton />);

            expect(container.querySelector('.grid-cols-1.lg\\:grid-cols-4')).toBeInTheDocument();

            rerender(<AccountSkeleton />);

            expect(container.querySelector('.grid-cols-1.lg\\:grid-cols-4')).toBeInTheDocument();
        });

        test('should not change structure on re-render', () => {
            const { container, rerender } = render(<AccountSkeleton />);

            const initialSkeletons = container.querySelectorAll('.animate-pulse');

            rerender(<AccountSkeleton />);

            const newSkeletons = container.querySelectorAll('.animate-pulse');
            expect(newSkeletons.length).toBe(initialSkeletons.length);
        });
    });
});
