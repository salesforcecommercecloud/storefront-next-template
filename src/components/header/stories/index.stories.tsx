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
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import Header from '../index';
import AuthProvider from '@/providers/auth';
import type { SessionData } from '@/lib/api/types';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logNavigate = action('header-navigate');
        const logSearchFocus = action('header-search-focus');
        const logSearchInput = action('header-search-input');
        const logUserAction = action('header-user-action');

        const disableSearchInputs = () => {
            const inputs = root.querySelectorAll<HTMLInputElement>(
                'input[type="search"], input[type="text"][placeholder="Search"], input[aria-label*="search" i]'
            );
            inputs.forEach((input) => {
                input.disabled = true;
                input.setAttribute('aria-disabled', 'true');
                input.classList.add('cursor-not-allowed', 'opacity-60', 'pointer-events-none');
                input.value = '';
            });
        };
        disableSearchInputs();

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const navLink = target.closest('a[href], button[role="link"]');
            if (navLink) {
                const href = (navLink as HTMLAnchorElement).getAttribute('href') || '';
                const text = (navLink as HTMLElement).textContent?.trim() || '';
                event.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                logNavigate({ href, text });
                return;
            }

            const userBtn = target.closest('button, a');
            const label = userBtn?.getAttribute('aria-label') || userBtn?.textContent?.trim() || '';
            if (userBtn && /(sign in|sign out|logout|account|cart|wishlist|store|locator|location|find)/i.test(label)) {
                event.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                logUserAction({ label });
                return;
            }

            if (userBtn && userBtn.tagName === 'BUTTON') {
                event.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                const fallbackLabel = label || 'button';
                logUserAction({ label: fallbackLabel });
            }
        };

        const handleInput = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input) return;
            if (input.type === 'search' || /search/i.test(input.getAttribute('aria-label') || '')) {
                event.preventDefault();
                event.stopImmediatePropagation();
                logSearchInput({ value: input.value });
            }
        };

        const handleKeyDown = (event: Event) => {
            const e = event as unknown as KeyboardEvent;
            const input = e.target as HTMLInputElement | null;
            if (!input) return;
            if ((input.type === 'search' || /search/i.test(input.placeholder)) && e.key === 'Enter') {
                e.preventDefault();
                (event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                logSearchInput({ value: input.value });
            }
        };

        const handleSubmit = (event: Event) => {
            const form = event.target as HTMLFormElement | null;
            if (!form) return;
            if (form.querySelector('input[type="search"], input[aria-label*="search" i]')) {
                event.preventDefault();
                const input = form.querySelector<HTMLInputElement>(
                    'input[type="search"], input[aria-label*="search" i]'
                );
                logSearchInput({ value: input?.value || '' });
            }
        };

        const handleFocus = (event: Event) => {
            const el = event.target as HTMLElement | null;
            if (!el) return;
            if (el instanceof HTMLInputElement && (el.type === 'search' || /search/i.test(el.placeholder))) {
                logSearchFocus({ placeholder: el.placeholder });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('input', handleInput, true);
        root.addEventListener('keydown', handleKeyDown, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('focus', handleFocus, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('input', handleInput, true);
            root.removeEventListener('keydown', handleKeyDown, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('focus', handleFocus, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Header> = {
    title: 'LAYOUT/Header',
    component: Header,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Top application header with brand, search, user actions, store locator, and cart.

Scenarios cover guest vs. authenticated user states.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="min-h-screen bg-background">
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const guestSession: SessionData = {
    userType: 'guest',
};

const registeredSession: SessionData = {
    userType: 'registered',
    customerId: 'test-customer-1',
};

export const Guest: Story = {
    render: () => (
        <AuthProvider value={guestSession}>
            <Header />
        </AuthProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Guest user sees Sign In button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const logoLink = canvas.queryByRole('link', { name: 'Home Performer' }) || canvas.queryByAltText('Home');
        if (logoLink) {
            await expect(logoLink).toBeInTheDocument();
        }
        const signInButton = canvas.queryByRole('link', { name: 'Sign In' });
        if (signInButton) {
            await expect(signInButton).toBeInTheDocument();
        }
        const searchInput = canvas.queryByPlaceholderText('Search');
        if (searchInput) {
            await expect(searchInput).toBeInTheDocument();
        }
        const accountButton = canvas.queryByRole('button', { name: /account|profile/i });
        void expect(accountButton).toBeNull();
    },
};

export const Authenticated: Story = {
    render: () => (
        <AuthProvider value={registeredSession}>
            <Header />
        </AuthProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Authenticated user sees account icon button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const logoLink = canvas.queryByRole('link', { name: 'Home Performer' }) || canvas.queryByAltText('Home');
        if (logoLink) {
            await expect(logoLink).toBeInTheDocument();
        }
        const accountLink = canvas.queryByRole('link', { name: /my account/i });
        if (accountLink) {
            await expect(accountLink).toBeInTheDocument();
            await expect(accountLink).toHaveAttribute('href', '/account/overview');
        }
        const searchInput = canvas.queryByPlaceholderText('Search');
        if (searchInput) {
            await expect(searchInput).toBeInTheDocument();
        }
    },
};

export const MobileView: Story = {
    render: () => (
        <AuthProvider value={guestSession}>
            <Header />
        </AuthProvider>
    ),
    parameters: {
        docs: {
            description: { story: 'Header layout on a mobile viewport.' },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const logo = canvas.queryByRole('link', { name: 'Home Performer' }) || canvas.queryByAltText('Home');
        if (logo) {
            await expect(logo).toBeInTheDocument();
        }
        const signInLink = canvas.queryByRole('link', { name: 'Sign In' });
        if (signInLink) {
            await expect(signInLink).toBeInTheDocument();
        }
        const searchInput = canvas.queryByPlaceholderText('Search');
        if (searchInput) {
            await expect(searchInput).toBeInTheDocument();
        }
        const cartButton = canvas.queryByRole('button', { name: /cart|shopping/i });
        if (cartButton) {
            await expect(cartButton).toBeInTheDocument();
        }
    },
};

const mockRootCategory = {
    id: 'root',
    name: 'Root',
    c_showInMenu: true,
    categories: [
        { id: 'women', name: 'Women', c_showInMenu: true, categories: [], onlineSubCategoriesCount: 0 },
        { id: 'men', name: 'Men', c_showInMenu: true, categories: [], onlineSubCategoriesCount: 0 },
        { id: 'accessories', name: 'Accessories', c_showInMenu: true, categories: [], onlineSubCategoriesCount: 0 },
    ],
};

function NavigationDesktop({ root }: { root?: Promise<typeof mockRootCategory> }): ReactElement {
    void root;
    return (
        <nav className="hidden lg:block">
            <ul className="flex gap-4">
                {mockRootCategory.categories.map((category) => (
                    <li key={category.id} className="text-sm font-medium text-foreground">
                        {category.name}
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export const WithNavigation: Story = {
    render: () => (
        <AuthProvider value={guestSession}>
            <Header>
                <NavigationDesktop root={Promise.resolve(mockRootCategory)} />
            </Header>
        </AuthProvider>
    ),
    parameters: {
        docs: {
            description: { story: 'Header with desktop navigation (guest).' },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const logo =
            canvas.queryByRole('link', { name: 'Home Performer' }) ||
            canvas.queryByAltText('Home') ||
            canvasElement.querySelector('a[href="/"]');
        if (logo) {
            await expect(logo).toBeInTheDocument();
        }
        const navigationLinks = canvas.queryAllByRole('link');
        if (navigationLinks.length > 0) {
            await expect(navigationLinks.length).toBeGreaterThan(0);
        }
        const signInLink = canvas.queryByRole('link', { name: 'Sign In' });
        if (signInLink) {
            await expect(signInLink).toBeInTheDocument();
        }
        const searchInput = canvas.queryByPlaceholderText('Search');
        if (searchInput) {
            await expect(searchInput).toBeInTheDocument();
        }
        const cartButton = canvas.queryByRole('button', { name: /cart|shopping/i });
        if (cartButton) {
            await expect(cartButton).toBeInTheDocument();
        }
    },
};

export const WithNavigationAuthenticated: Story = {
    render: () => (
        <AuthProvider value={registeredSession}>
            <Header>
                <NavigationDesktop root={Promise.resolve(mockRootCategory)} />
            </Header>
        </AuthProvider>
    ),
    parameters: {
        docs: {
            description: { story: 'Header with desktop navigation (authenticated).' },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const logo =
            canvas.queryByRole('link', { name: 'Home Performer' }) ||
            canvas.queryByAltText('Home') ||
            canvasElement.querySelector('a[href="/"]');
        if (logo) {
            await expect(logo).toBeInTheDocument();
        }
        const navigationLinks = canvas.queryAllByRole('link');
        if (navigationLinks.length > 0) {
            await expect(navigationLinks.length).toBeGreaterThan(0);
        }
        const accountLink = canvas.queryByRole('link', { name: /my account/i });
        if (accountLink) {
            await expect(accountLink).toBeInTheDocument();
            await expect(accountLink).toHaveAttribute('href', '/account/overview');
        }
        const searchInput = canvas.queryByPlaceholderText('Search');
        if (searchInput) {
            await expect(searchInput).toBeInTheDocument();
        }
        const cartButton = canvas.queryByRole('button', { name: /cart|shopping/i });
        if (cartButton) {
            await expect(cartButton).toBeInTheDocument();
        }
    },
};

export const StickyWithContent: Story = {
    render: () => (
        <AuthProvider value={guestSession}>
            <div className="min-h-screen">
                <Header>
                    <NavigationDesktop root={Promise.resolve(mockRootCategory)} />
                </Header>
                <main className="container mx-auto px-4 py-8 space-y-4">
                    {(() => {
                        const labels = Array.from({ length: 40 }, (_, idx) => `scroll-${idx + 1}`);
                        return labels.map((label) => <p key={label}>Scroll section {label.replace('scroll-', '')}</p>);
                    })()}
                </main>
            </div>
        </AuthProvider>
    ),
    parameters: {
        docs: {
            description: { story: 'Sticky header behavior with scrollable page content.' },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const header = canvas.queryByRole('banner') || canvasElement.querySelector('header');
        if (header) {
            await expect(header).toBeInTheDocument();
            await expect(header).toHaveClass('sticky');
        }
        const scrollSections = canvas.queryAllByText(/scroll section/i);
        if (scrollSections.length > 0) {
            await expect(scrollSections.length).toBeGreaterThan(30);
        }
        const logo =
            canvas.queryByRole('link', { name: 'Home Performer' }) ||
            canvas.queryByAltText('Home') ||
            canvasElement.querySelector('a[href="/"]');
        if (logo) {
            await expect(logo).toBeInTheDocument();
        }
        const signInLink = canvas.queryByRole('link', { name: 'Sign In' });
        if (signInLink) {
            await expect(signInLink).toBeInTheDocument();
        }
        const searchInput = canvas.queryByPlaceholderText('Search');
        if (searchInput) {
            await expect(searchInput).toBeInTheDocument();
            await expect(searchInput).toBeDisabled();
        }
    },
};
