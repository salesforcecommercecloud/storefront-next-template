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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady, SITE_PREFIX } from '@storybook/test-utils';
import { AccountNavItem } from '../index';
import { User, Heart, ShoppingBag, LogOut } from 'lucide-react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logNavigate = action('nav-item-navigate');
        const logHover = action('nav-item-hover');
        const logDisabledClick = action('nav-item-disabled-click');
        const logFormSubmit = action('nav-item-form-submit');

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

const mockNavItem = {
    path: '/account',
    icon: User,
    label: 'Account Details',
    disabled: false,
};

const meta: Meta<typeof AccountNavItem> = {
    title: 'ACCOUNT/Account Navigation/Nav Item',
    component: AccountNavItem,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Navigation item component for the account navigation menu. Displays a single navigation link with an icon and label.

**Features:**
- Active state highlighting
- Disabled state support
- Mobile and desktop variants
- Icon support via Lucide icons
- React Router integration for navigation
- Form action support (e.g., logout)
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
                    ],
                    { initialEntries: [(context.args?.item as typeof mockNavItem)?.path || '/account'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
    argTypes: {
        item: {
            description: 'Navigation item configuration with path, icon, label, and optional disabled state',
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
type Story = StoryObj<typeof AccountNavItem>;

const navItems = [
    { path: '/account', icon: User, label: 'Account Details' },
    { path: '/account/wishlist', icon: Heart, label: 'Wishlist' },
    { path: '/account/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/account/addresses', icon: User, label: 'Addresses' },
];

function NavComposite(): ReactElement {
    return (
        <nav className="flex flex-col gap-1 w-64">
            <AccountNavItem item={{ ...navItems[0] }} />
            <AccountNavItem item={{ ...navItems[1] }} />
            <AccountNavItem item={{ ...navItems[2] }} />
            <AccountNavItem item={{ ...navItems[3] }} />
            <AccountNavItem item={{ ...navItems[0], disabled: true, label: 'Disabled Item' }} />
            <AccountNavItem
                item={{
                    path: '',
                    icon: LogOut,
                    label: 'Log Out',
                    action: '/logout',
                    method: 'post',
                }}
            />
        </nav>
    );
}

/**
 * All nav item states in one composite: Default, Active, Disabled, Different Icons, Logout
 * Uses meta decorator's RouterWrapper (no nested Router - preview already provides RouterProvider)
 */
export const AllStates: Story = {
    render: () => (
        <ActionLogger>
            <NavComposite />
        </ActionLogger>
    ),
    parameters: {
        docs: {
            description: {
                story: 'All nav item states: default link, active (Account Details), different icons (Wishlist, Orders), disabled, and logout form button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('link', { name: 'Account Details' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Wishlist' })).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Orders' })).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Disabled Item' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Log Out' })).toBeInTheDocument();
    },
};

/**
 * Focus behavior play test - verifies nav item can receive focus
 */
export const FocusBehavior: Story = {
    args: { item: mockNavItem },
    parameters: {
        docs: {
            description: {
                story: 'Focus behavior test - verifies the nav item is focusable.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const link = canvas.getByRole('link', { name: 'Account Details' });
        link.focus();
        await expect(link).toHaveFocus();
    },
};

export const Logout: Story = {
    args: {
        item: {
            path: '',
            icon: LogOut,
            label: 'Log Out',
            action: '/logout',
            method: 'post',
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Logout navigation item rendered as a form button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        const button = canvas.getByRole('button', { name: 'Log Out' });
        await expect(button).toBeInTheDocument();
        await expect(button).toHaveAttribute('type', 'submit');

        const form = button.closest('form');
        await expect(form).toBeInTheDocument();
        await expect(form).toHaveAttribute('action', `${SITE_PREFIX}/logout`);
        await expect(form).toHaveAttribute('method', 'post');

        const icon = canvas.getByTestId('Log Out-icon');
        await expect(icon).toBeInTheDocument();

        // Should not be a link
        const link = canvas.queryByRole('link');
        await expect(link).not.toBeInTheDocument();
    },
};
