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
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Heart, MapPin, ShoppingBag, User } from 'lucide-react';
import { AccountNavList } from './nav-list';

const mockNavigationItems = [
    { path: '/account', icon: User, label: 'Account Details' },
    { path: '/account/wishlist', icon: Heart, label: 'Wishlist' },
    { path: '/account/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/account/addresses', icon: MapPin, label: 'Addresses' },
];

const mockDisabledNavigationItems = [
    { path: '/account', icon: User, label: 'Account Details' },
    { path: '/account/wishlist', icon: Heart, label: 'Wishlist' },
    { path: '/account/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/account/addresses', icon: MapPin, label: 'Addresses', disabled: true },
];

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

describe('<AccountNavList />', () => {
    test('displays all navigation items with correct labels', () => {
        render(createTestWrapper(<AccountNavList items={mockNavigationItems} />));

        expect(screen.getByRole('link', { name: 'Account Details' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Wishlist' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Addresses' })).toBeInTheDocument();
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(4);
    });

    test('renders each item with correct href attributes', () => {
        render(createTestWrapper(<AccountNavList items={mockNavigationItems} />));

        expect(screen.getByRole('link', { name: 'Account Details' })).toHaveAttribute('href', '/account');
        expect(screen.getByRole('link', { name: 'Wishlist' })).toHaveAttribute('href', '/account/wishlist');
        expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/account/orders');
        expect(screen.getByRole('link', { name: 'Addresses' })).toHaveAttribute('href', '/account/addresses');
    });

    test('renders nothing when items is an empty array', () => {
        render(createTestWrapper(<AccountNavList items={[]} />));

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('applies disabled state correctly', () => {
        render(createTestWrapper(<AccountNavList items={mockDisabledNavigationItems} />));
        expect(screen.getByRole('button', { name: 'Addresses' })).toBeDisabled();
    });
});
