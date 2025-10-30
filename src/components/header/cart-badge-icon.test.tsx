import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CartBadgeIcon from './cart-badge-icon';

describe('CartBadgeIcon', () => {
    describe('rendering', () => {
        test('renders shopping cart icon', () => {
            const { container } = render(<CartBadgeIcon numberOfItems={5} />);

            // ShoppingCart icon from lucide-react should be present
            const icon = container.querySelector('svg');
            expect(icon).toBeInTheDocument();
            expect(icon).toHaveClass('size-6');
        });

        test('renders badge with number of items', () => {
            render(<CartBadgeIcon numberOfItems={5} />);

            const badge = screen.getByTestId('shopping-cart-badge');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveTextContent('5');
        });

        test('displays correct number for single item', () => {
            render(<CartBadgeIcon numberOfItems={1} />);

            const badge = screen.getByTestId('shopping-cart-badge');
            expect(badge).toHaveTextContent('1');
        });

        test('displays correct number for multiple items', () => {
            render(<CartBadgeIcon numberOfItems={42} />);

            const badge = screen.getByTestId('shopping-cart-badge');
            expect(badge).toHaveTextContent('42');
        });

        test('displays zero items', () => {
            render(<CartBadgeIcon numberOfItems={0} />);

            const badge = screen.getByTestId('shopping-cart-badge');
            expect(badge).toHaveTextContent('0');
        });
    });

    describe('component structure', () => {
        test('renders fragment with icon and badge', () => {
            const { container } = render(<CartBadgeIcon numberOfItems={5} />);

            const icon = container.querySelector('svg');
            const badge = screen.getByTestId('shopping-cart-badge');

            expect(icon).toBeInTheDocument();
            expect(badge).toBeInTheDocument();
        });
    });

    describe('snapshot consistency', () => {
        test('renders consistently with same props', () => {
            const { container: container1 } = render(<CartBadgeIcon numberOfItems={5} />);
            const { container: container2 } = render(<CartBadgeIcon numberOfItems={5} />);

            expect(container1.innerHTML).toBe(container2.innerHTML);
        });
    });
});
