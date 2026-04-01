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

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady, SITE_PREFIX } from '@storybook/test-utils';
import { AccountNavList, type AccountNavItemData } from '../index';
import { User, Heart, ShoppingBag, MapPin, Settings, LogOut } from 'lucide-react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logNavigate = action('nav-list-navigate');
        const logHover = action('nav-list-hover');
        const logDisabledClick = action('nav-list-disabled-click');
        const logFormSubmit = action('nav-list-form-submit');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const navLink = target.closest('a[href]');
            const navButton = target.closest('button[disabled]');
            const formButton = target.closest('form button[type="submit"]');
            const form = target.closest('form');

            if (navLink) {
                const href = navLink.getAttribute('href') || '';
                const text = navLink.textContent?.trim() || '';
                event.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                logNavigate({ href, label: text });
                return;
            }

            if (formButton && form) {
                const formAction = form.getAttribute('action') || '';
                const method = form.getAttribute('method') || 'get';
                const label = formButton.textContent?.trim() || '';
                event.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                logFormSubmit({ action: formAction, method, label });
                return;
            }

            if (navButton) {
                const label = navButton.textContent?.trim() || '';
                event.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                logDisabledClick({ label });
            }
        };

        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const navLink = target.closest('a[href], button');
            if (navLink) {
                const label = navLink.textContent?.trim() || '';
                const href = (navLink as HTMLAnchorElement).getAttribute('href') || '';
                logHover({ label, href });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('mouseover', handleMouseOver, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const mockNavigationItems: AccountNavItemData[] = [
    { path: '/account', icon: User, label: 'Account Details' },
    { path: '/account/wishlist', icon: Heart, label: 'Wishlist' },
    { path: '/account/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/account/addresses', icon: MapPin, label: 'Addresses' },
];

const meta: Meta<typeof AccountNavList> = {
    title: 'ACCOUNT/Account Navigation/Nav List',
    component: AccountNavList,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Navigation list component that renders multiple account navigation items. Used in the account page sidebar to display navigation options.

**Features:**
- Renders multiple navigation items
- Supports mobile and desktop variants
- Handles disabled items
- React Router integration for navigation
- Supports form actions (e.g., logout)
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <ActionLogger>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </ActionLogger>
                );

                if (inRouter) {
                    return content;
                }

                const router = createMemoryRouter(
                    [
                        {
                            path: '/account',
                            element: content,
                        },
                        {
                            path: '/account/wishlist',
                            element: <div>Wishlist Page</div>,
                        },
                        {
                            path: '/account/orders',
                            element: <div>Orders Page</div>,
                        },
                        {
                            path: '/account/addresses',
                            element: <div>Addresses Page</div>,
                        },
                        {
                            path: '/account/settings',
                            element: <div>Settings Page</div>,
                        },
                    ],
                    { initialEntries: ['/account'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
    argTypes: {
        items: {
            description: 'Array of navigation items to display',
            control: 'object',
        },
        isMobile: {
            table: {
                disable: true,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof AccountNavList>;

export const Default: Story = {
    args: {
        items: mockNavigationItems,
    },
    parameters: {
        docs: {
            description: {
                story: 'Default desktop navigation list with multiple items.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify all navigation items are present
        await expect(canvas.getByRole('link', { name: 'Account Details' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Wishlist' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Orders' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Addresses' })).toBeInTheDocument();

        // Verify correct hrefs
        await expect(canvas.getByRole('link', { name: 'Account Details' })).toHaveAttribute(
            'href',
            `${SITE_PREFIX}/account`
        );
        await expect(canvas.getByRole('link', { name: 'Wishlist' })).toHaveAttribute(
            'href',
            `${SITE_PREFIX}/account/wishlist`
        );
        await expect(canvas.getByRole('link', { name: 'Orders' })).toHaveAttribute(
            'href',
            `${SITE_PREFIX}/account/orders`
        );
        await expect(canvas.getByRole('link', { name: 'Addresses' })).toHaveAttribute(
            'href',
            `${SITE_PREFIX}/account/addresses`
        );

        // Verify all links are present
        const links = canvas.getAllByRole('link');
        await expect(links).toHaveLength(4);
    },
};
export const WithDisabledItem: Story = {
    args: {
        items: [
            { path: '/account', icon: User, label: 'Account Details' },
            { path: '/account/wishlist', icon: Heart, label: 'Wishlist' },
            { path: '/account/orders', icon: ShoppingBag, label: 'Orders' },
            { path: '/account/addresses', icon: MapPin, label: 'Addresses', disabled: true },
        ],
    },
    parameters: {
        docs: {
            description: {
                story: 'Navigation list with one disabled item.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify enabled items are links
        await expect(canvas.getByRole('link', { name: 'Account Details' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Wishlist' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Orders' })).toBeInTheDocument();

        // Verify disabled item is a button
        const disabledButton = canvas.getByRole('button', { name: 'Addresses' });
        await expect(disabledButton).toBeInTheDocument();
        await expect(disabledButton).toBeDisabled();
    },
};

export const Empty: Story = {
    args: {
        items: [],
    },
    parameters: {
        docs: {
            description: {
                story: 'Empty navigation list with no items.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify no links are present
        const links = canvas.queryAllByRole('link');
        await expect(links).toHaveLength(0);
    },
};

export const SingleItem: Story = {
    args: {
        items: [{ path: '/account', icon: User, label: 'Account Details' }],
    },
    parameters: {
        docs: {
            description: {
                story: 'Navigation list with a single item.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        const link = canvas.getByRole('link', { name: 'Account Details' });
        await expect(link).toBeInTheDocument();

        const links = canvas.getAllByRole('link');
        await expect(links).toHaveLength(1);
    },
};

export const Interactive: Story = {
    args: {
        items: mockNavigationItems,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive navigation list where items can be clicked.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        const wishlistLink = canvas.getByRole('link', { name: 'Wishlist' });
        await expect(wishlistLink).toBeInTheDocument();

        await userEvent.hover(wishlistLink);
        await userEvent.click(wishlistLink);

        const ordersLink = canvas.getByRole('link', { name: 'Orders' });
        await expect(ordersLink).toBeInTheDocument();

        await userEvent.hover(ordersLink);
        await userEvent.click(ordersLink);
    },
};

export const WithManyItems: Story = {
    args: {
        items: [
            { path: '/account', icon: User, label: 'Account Details' },
            { path: '/account/wishlist', icon: Heart, label: 'Wishlist' },
            { path: '/account/orders', icon: ShoppingBag, label: 'Orders' },
            { path: '/account/addresses', icon: MapPin, label: 'Addresses' },
            { path: '/account/settings', icon: Settings, label: 'Settings' },
        ],
    },
    parameters: {
        docs: {
            description: {
                story: 'Navigation list with many items.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        const links = canvas.getAllByRole('link');
        await expect(links.length).toBeGreaterThanOrEqual(5);
    },
};

export const WithLogout: Story = {
    args: {
        items: [
            ...mockNavigationItems,
            {
                path: '',
                icon: LogOut,
                label: 'Log Out',
                action: '/logout',
                method: 'post',
            },
        ],
    },
    parameters: {
        docs: {
            description: {
                story: 'Navigation list with logout item at the end.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify navigation links are present
        await expect(canvas.getByRole('link', { name: 'Account Details' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Wishlist' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Orders' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Addresses' })).toBeInTheDocument();

        // Verify logout button is present
        const logoutButton = canvas.getByRole('button', { name: 'Log Out' });
        await expect(logoutButton).toBeInTheDocument();
        await expect(logoutButton).toHaveAttribute('type', 'submit');

        // Verify logout form
        const form = logoutButton.closest('form');
        await expect(form).toBeInTheDocument();
        await expect(form).toHaveAttribute('action', `${SITE_PREFIX}/logout`);
        await expect(form).toHaveAttribute('method', 'post');

        // Verify logout icon
        const logoutIcon = canvas.getByTestId('Log Out-icon');
        await expect(logoutIcon).toBeInTheDocument();
    },
};
