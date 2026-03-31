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
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import ThemeSwitcher from '../index';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logChange = action('theme-change');
        const logClick = action('interaction');

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const select = target.closest('select');
            if (select instanceof HTMLSelectElement) {
                logChange({ theme: select.value, previousTheme: select.options[select.selectedIndex - 1]?.value });
            }
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const button = target.closest('button, [role="button"]');
            if (button) {
                const label = button.textContent?.trim() || button.getAttribute('aria-label') || '';
                logClick({ type: 'click', element: 'button', label });
            }
        };

        root.addEventListener('change', handleChange, true);
        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ThemeSwitcher> = {
    title: 'Extensions/ThemeSwitcher',
    component: ThemeSwitcher,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
The ThemeSwitcher component allows users to switch between light and dark theme modes.

## Features

- **Theme Mode Selection**: Switch between light and dark modes
- **Theme Toggle**: Automatically applies theme via dark class
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Internationalization**: Supports translation keys
- **Session-only**: Theme preference lasts for the current session only (resets on page refresh)

## Usage

This component is typically used in the header or navigation area to allow users to change the application theme.
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Default theme switcher showing:
- Two native select dropdowns (theme family and theme mode)
- Market Street theme family option
- Light and dark theme mode options
- Proper accessibility labels

This is the standard theme switcher component.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify both select elements are present
        const selects = await canvas.findAllByRole('combobox', {}, { timeout: 5000 });
        await expect(selects).toHaveLength(2);

        // Verify theme family options are present
        const marketStreetOption = canvas.getByRole('option', { name: /market street/i });
        await expect(marketStreetOption).toBeInTheDocument();

        // Verify theme mode options are present
        const lightOption = canvas.getByRole('option', { name: /^light$/i });
        await expect(lightOption).toBeInTheDocument();

        const darkOption = canvas.getByRole('option', { name: /^dark$/i });
        await expect(darkOption).toBeInTheDocument();
    },
};

export const WithThemeChange: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Theme switcher with theme change interaction. Shows:
- User can select different theme modes
- Theme changes are logged
- Document classes are updated

This demonstrates the interactive behavior of the theme switcher.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Find both select elements
        const selects = await canvas.findAllByRole('combobox', {}, { timeout: 5000 });
        await expect(selects).toHaveLength(2);

        const [, modeSelect] = selects;

        // Change theme mode to dark
        await userEvent.selectOptions(modeSelect, 'dark');
        await expect(modeSelect).toHaveValue('dark');

        // Change theme mode back to light
        await userEvent.selectOptions(modeSelect, 'light');
        await expect(modeSelect).toHaveValue('light');
    },
};

export const MobileLayout: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Theme switcher optimized for mobile devices. Shows:
- Touch-friendly select dropdowns
- Mobile-optimized layout
- Proper spacing

The component automatically adapts for mobile screens.
                `,
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify both select elements are present
        const selects = await canvas.findAllByRole('combobox', {}, { timeout: 5000 });
        await expect(selects).toHaveLength(2);
    },
};

export const DesktopLayout: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Theme switcher for desktop devices. Shows:
- Proper spacing and layout
- All options clearly displayed
- Desktop-optimized interaction

The component provides a clean layout for desktop screens.
                `,
            },
        },
    },
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify both select elements are present
        const selects = await canvas.findAllByRole('combobox', {}, { timeout: 5000 });
        await expect(selects).toHaveLength(2);
    },
};
