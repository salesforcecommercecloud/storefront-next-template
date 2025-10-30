// Testing libraries
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { User } from 'lucide-react';
import { AccountNavItem } from './nav-item';

const mockNavItem = {
    path: '/account',
    icon: User,
    label: 'Account Details',
    disabled: false,
};

const createTestWrapper = (component: React.ReactElement, initialPath = '/account') => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/account',
                element: component,
            },
        ],
        { initialEntries: [initialPath] }
    );
    return <RouterProvider router={router} />;
};

describe('<AccountNavItem />', () => {
    describe('Rendering with disabled false', () => {
        test('displays navigation item with correct label, link, and icon', () => {
            render(createTestWrapper(<AccountNavItem item={mockNavItem} />));
            const link = screen.getByRole('link', { name: 'Account Details' });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/account');
            expect(screen.getByTestId('Account Details-icon')).toBeInTheDocument();
            expect(screen.getAllByRole('link')).toHaveLength(1);
        });
    });

    describe('Rendering with disabled true', () => {
        test('renders as disabled div when disabled is true', () => {
            const disabledItem = { ...mockNavItem, disabled: true };
            render(createTestWrapper(<AccountNavItem item={disabledItem} />));

            const disabledElement = screen.getByRole('button', { name: 'Account Details' });
            expect(disabledElement).toBeInTheDocument();
            expect(disabledElement).toBeDisabled();
        });

        test('does not render as link when disabled', () => {
            const disabledItem = { ...mockNavItem, disabled: true };
            render(createTestWrapper(<AccountNavItem item={disabledItem} />));

            expect(screen.queryByRole('link')).not.toBeInTheDocument();
            expect(screen.getByRole('button')).toBeInTheDocument();
        });
    });

    describe('Mobile mode rendering', () => {
        test('renders with mobile classes when isMobile is true', () => {
            render(createTestWrapper(<AccountNavItem item={mockNavItem} isMobile={true} />));

            const link = screen.getByRole('link', { name: 'Account Details' });
            expect(link).toBeInTheDocument();
            expect(link).toHaveClass('border');
        });

        test('renders disabled state with mobile classes', () => {
            const disabledItem = { ...mockNavItem, disabled: true };
            render(createTestWrapper(<AccountNavItem item={disabledItem} isMobile={true} />));

            const disabledElement = screen.getByRole('button', { name: 'Account Details' });
            expect(disabledElement).toBeInTheDocument();
            expect(disabledElement).toHaveClass('border');
        });
    });
});
