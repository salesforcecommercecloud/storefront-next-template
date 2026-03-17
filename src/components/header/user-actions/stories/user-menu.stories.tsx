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
import { UserMenu } from '../user-menu';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { User, LogIn } from 'lucide-react';

function UserMenuStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logNavigate = action('user-menu-navigate');
        const logClick = action('user-menu-click');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const link = target.closest('a[href]');
            if (link) {
                const href = link.getAttribute('href') || '';
                const text = link.textContent?.trim() || '';
                event.preventDefault();
                logNavigate({ href, text });
                return;
            }

            const button = target.closest('button');
            if (button) {
                const label = button.textContent?.trim() || button.getAttribute('aria-label') || '';
                event.preventDefault();
                logClick({ label });
            }
        };

        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const guestTrigger = (
    <Button variant="ghost" className="cursor-pointer" asChild>
        <Link to="/login" aria-label="Sign In">
            <LogIn className="size-6" />
        </Link>
    </Button>
);

const authenticatedTrigger = (
    <Button variant="ghost" className="cursor-pointer" asChild>
        <Link to="/account" aria-label="My Account">
            <User className="size-6" />
        </Link>
    </Button>
);

const meta: Meta<typeof UserMenu> = {
    title: 'LAYOUT/Header/User Menu',
    component: UserMenu,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
User Menu component that displays a dropdown menu with account-related actions.

### Features:
- Guest menu with Sign In option
- Authenticated menu with account links (Wishlist, Orders, Account Details, Address Book)
- Logout option for authenticated users
- Hover interactions to open/close menu
- Keyboard navigation support
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <UserMenuStoryHarness>
                <div className="p-8">
                    <Story />
                </div>
            </UserMenuStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof UserMenu>;

export const Guest: Story = {
    args: {
        isAuthenticated: false,
        trigger: guestTrigger,
    },
    parameters: {
        docs: {
            description: {
                story: `
Guest user menu that appears on hover.

### Features:
- Sign in message
- Sign In button
- Create account link
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find the trigger link
        const triggerLink = await canvas.findByRole('link', { name: /sign in/i }, { timeout: 5000 });
        await expect(triggerLink).toBeInTheDocument();

        // Hover over the trigger to open the menu
        await userEvent.hover(triggerLink);

        // PopoverContent renders in a Portal to document.body, so query there
        const documentBody = within(document.body);

        // Wait for menu content to appear - use regex matcher
        const signInMessage = await documentBody.findByText(/sign in for the best experience/i, {}, { timeout: 5000 });
        await expect(signInMessage).toBeInTheDocument();

        // Find the popover content container by finding an element with data-slot="popover-content"
        // Then scope queries to that container to avoid matching the trigger link
        const popoverContentElement = document.body.querySelector('[data-slot="popover-content"]');
        expect(popoverContentElement).toBeInTheDocument();
        const popoverCanvas = within(popoverContentElement as HTMLElement);

        const signInButton = await popoverCanvas.findByRole('link', { name: /sign in/i });
        await expect(signInButton).toBeInTheDocument();
        await expect(signInButton).toHaveAttribute('href', '/login');

        const createAccountLink = await popoverCanvas.findByRole('link', { name: /create account/i });
        await expect(createAccountLink).toBeInTheDocument();
        await expect(createAccountLink).toHaveAttribute('href', '/signup');
    },
};

export const Authenticated: Story = {
    args: {
        isAuthenticated: true,
        trigger: authenticatedTrigger,
    },
    parameters: {
        docs: {
            description: {
                story: `
Authenticated user menu that appears on hover.

### Features:
- Your Lists section (Wishlist)
- Your Account section (Overview, Orders, Account Details, Address Book)
- Logout button
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find the trigger link
        const triggerLink = await canvas.findByRole('link', { name: /my account/i }, { timeout: 5000 });
        await expect(triggerLink).toBeInTheDocument();

        // Hover over the trigger to open the menu
        await userEvent.hover(triggerLink);

        // PopoverContent renders in a Portal to document.body, so query there
        const documentBody = within(document.body);

        // Wait for menu content to appear - use regex matcher
        const yourListsHeading = await documentBody.findByText(/your lists/i, {}, { timeout: 5000 });
        await expect(yourListsHeading).toBeInTheDocument();

        const wishlistLink = await documentBody.findByRole('link', { name: /wishlist/i });
        await expect(wishlistLink).toBeInTheDocument();
        await expect(wishlistLink).toHaveAttribute('href', '/account/wishlist');

        const yourAccountHeading = await documentBody.findByText(/your account/i);
        await expect(yourAccountHeading).toBeInTheDocument();

        const overviewLink = await documentBody.findByRole('link', { name: /overview/i });
        await expect(overviewLink).toBeInTheDocument();
        await expect(overviewLink).toHaveAttribute('href', '/account/overview');

        const ordersLink = await documentBody.findByRole('link', { name: /order history/i });
        await expect(ordersLink).toBeInTheDocument();
        await expect(ordersLink).toHaveAttribute('href', '/account/orders');

        const accountDetailsLink = await documentBody.findByRole('link', { name: /account details/i });
        await expect(accountDetailsLink).toBeInTheDocument();
        await expect(accountDetailsLink).toHaveAttribute('href', '/account');

        const addressBookLink = await documentBody.findByRole('link', { name: /address book/i });
        await expect(addressBookLink).toBeInTheDocument();
        await expect(addressBookLink).toHaveAttribute('href', '/account/addresses');

        const logoutButton = await documentBody.findByRole('button', { name: /log out/i });
        await expect(logoutButton).toBeInTheDocument();
    },
};
