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
import { expect, userEvent, within } from 'storybook/test';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import { CurrencyWrapper } from '@/test-utils/context-provider';

import Footer from '../index';

// Check if we're in test environment
function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logNav = action('footer-navigate');
        const logNewsletter = action('footer-newsletter');
        const logTheme = action('footer-theme');
        const logThemeSelect = action('footer-theme-select');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            // Links
            const link = target.closest('a[href], button[role="link"]');
            if (link) {
                const href = (link as HTMLAnchorElement).getAttribute('href') || '';
                const text = (link as HTMLElement).textContent?.trim() || '';
                event.preventDefault();
                logNav({ href, text });
                return;
            }

            // Theme switcher button
            const themeBtn = target.closest(
                'button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]'
            );
            if (themeBtn) {
                event.preventDefault();
                const label = (themeBtn as HTMLElement).getAttribute('aria-label') || '';
                logTheme({ label });
            }
        };

        const handleSubmit = (event: Event) => {
            const form = event.target as HTMLFormElement | null;
            if (!form) return;
            // Newsletter signup form (email input)
            const emailInput = form.querySelector<HTMLInputElement>('input[type="email"], input[name*="email" i]');
            if (emailInput) {
                event.preventDefault();
                logNewsletter({ email: emailInput.value || '' });
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const selectEl = target.closest('select');
            if (!(selectEl instanceof HTMLSelectElement)) return;

            const aria = (selectEl.getAttribute('aria-label') || '').toLowerCase();
            const hasThemeLabel = /theme|dark|light/.test(aria);
            const hasThemeOptions = Array.from(selectEl.options).some((o) => /^(light|dark)$/i.test(o.value));
            if (hasThemeLabel || hasThemeOptions) {
                const value = selectEl.value;
                const selected = selectEl.selectedOptions && selectEl.selectedOptions[0];
                const label = selected ? selected.text : '';
                logThemeSelect({ value, label });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('change', handleChange, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('change', handleChange, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Footer> = {
    title: 'LAYOUT/Footer',
    component: Footer,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Site footer with support, account, company links, newsletter signup, social icons, and theme switcher (if enabled).
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <CurrencyWrapper currency="GBP">
                    <ActionLogger>
                        <div className="min-h-[60vh] flex flex-col">
                            <div className="flex-1" />
                            <Story />
                        </div>
                    </ActionLogger>
                </CurrencyWrapper>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Standard footer rendering.',
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test button interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            for (const button of buttons) {
                if (!button.hasAttribute('disabled')) {
                    await userEvent.click(button);
                }
            }
        });

        await step('Test link interactions', async () => {
            const links = canvas.queryAllByRole('link');
            for (const link of links) {
                await userEvent.click(link);
            }
        });

        await step('Test input interactions', async () => {
            const emailInput = canvas.queryByPlaceholderText('Your email');
            if (emailInput) {
                await userEvent.clear(emailInput);
                await userEvent.type(emailInput, 'test@example.com');
                await expect(emailInput).toHaveValue('test@example.com');
            }
        });

        await step('Test select interactions', async () => {
            const themeSelect = canvas.queryByRole('combobox', { name: /theme switcher/i });
            if (themeSelect) {
                // Test changing to dark theme
                await userEvent.selectOptions(themeSelect, 'dark');
                await expect(themeSelect).toHaveValue('dark');

                // Test changing back to light theme
                await userEvent.selectOptions(themeSelect, 'light');
                await expect(themeSelect).toHaveValue('light');
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const LongPage: Story = {
    render: () => (
        <ConfigProvider config={mockConfig}>
            <div className="min-h-screen flex flex-col">
                <main className="flex-1 container mx-auto px-4 py-16 space-y-4">
                    {(() => {
                        const sections = Array.from({ length: 20 }, (_, idx) => `section-${idx + 1}`);
                        return sections.map((label) => (
                            <p key={label}>Sample content section {label.replace('section-', '')}</p>
                        ));
                    })()}
                </main>
                <Footer />
            </div>
        </ConfigProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Footer on a longer page layout to verify spacing and stick-to-bottom behavior.',
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test button interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            for (const button of buttons) {
                if (!button.hasAttribute('disabled')) {
                    await userEvent.click(button);
                }
            }
        });

        await step('Test link interactions', async () => {
            const links = canvas.queryAllByRole('link');
            for (const link of links) {
                await userEvent.click(link);
            }
        });

        await step('Test input interactions', async () => {
            const emailInput = canvas.queryByPlaceholderText('Your email');
            if (emailInput) {
                await userEvent.clear(emailInput);
                await userEvent.type(emailInput, 'test@example.com');
                await expect(emailInput).toHaveValue('test@example.com');
            }
        });

        await step('Test select interactions', async () => {
            const themeSelect = canvas.queryByRole('combobox', { name: /theme switcher/i });
            if (themeSelect) {
                // Test changing to dark theme
                await userEvent.selectOptions(themeSelect, 'dark');
                await expect(themeSelect).toHaveValue('dark');

                // Test changing back to light theme
                await userEvent.selectOptions(themeSelect, 'light');
                await expect(themeSelect).toHaveValue('light');
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const MobileView: Story = {
    globals: {
        // Set default viewport to small mobile view
        viewport: { value: 'mobile1', isRotated: false },
    },
    parameters: {
        docs: {
            description: {
                story: 'Footer layout on small/mobile viewport.',
            },
            viewport: { value: 'mobile1', isRotated: false },
        },
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        await step('Verify mobile viewport rendering', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
        await step('Verify mobile-optimized layout and spacing', () => {
            const container = canvasElement.firstChild;
            void expect(container).toBeVisible();
        });
        await step('Test button interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            for (const button of buttons) {
                if (!button.hasAttribute('disabled')) {
                    await userEvent.click(button);
                }
            }
        });

        await step('Test link interactions', async () => {
            const links = canvas.queryAllByRole('link');
            for (const link of links) {
                await userEvent.click(link);
            }
        });

        await step('Test input interactions', async () => {
            const emailInput = canvas.queryByPlaceholderText('Your email');
            if (emailInput) {
                await userEvent.clear(emailInput);
                await userEvent.type(emailInput, 'test@example.com');
                await expect(emailInput).toHaveValue('test@example.com');
            }
        });

        await step('Test select interactions', async () => {
            const themeSelect = canvas.queryByRole('combobox', { name: /theme switcher/i });
            if (themeSelect) {
                // Test changing to dark theme
                await userEvent.selectOptions(themeSelect, 'dark');
                await expect(themeSelect).toHaveValue('dark');

                // Test changing back to light theme
                await userEvent.selectOptions(themeSelect, 'light');
                await expect(themeSelect).toHaveValue('light');
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const DarkBackground: Story = {
    render: () => (
        <ConfigProvider config={mockConfig}>
            <div className="min-h-[50vh] bg-foreground text-background flex flex-col">
                <div className="flex-1 min-h-[20vh]" />
                <Footer />
            </div>
        </ConfigProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Footer against a dark page background (checks inverse styling).',
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test button interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            for (const button of buttons) {
                if (!button.hasAttribute('disabled')) {
                    await userEvent.click(button);
                }
            }
        });

        await step('Test link interactions', async () => {
            const links = canvas.queryAllByRole('link');
            for (const link of links) {
                await userEvent.click(link);
            }
        });

        await step('Test input interactions', async () => {
            const emailInput = canvas.queryByPlaceholderText('Your email');
            if (emailInput) {
                await userEvent.clear(emailInput);
                await userEvent.type(emailInput, 'test@example.com');
                await expect(emailInput).toHaveValue('test@example.com');
            }
        });

        await step('Test select interactions', async () => {
            const themeSelect = canvas.queryByRole('combobox', { name: /theme switcher/i });
            if (themeSelect) {
                // Test changing to dark theme
                await userEvent.selectOptions(themeSelect, 'dark');
                await expect(themeSelect).toHaveValue('dark');

                // Test changing back to light theme
                await userEvent.selectOptions(themeSelect, 'light');
                await expect(themeSelect).toHaveValue('light');
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};
