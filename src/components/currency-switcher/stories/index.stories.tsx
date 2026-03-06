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
import { expect, within, userEvent, fn } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, useState, useId, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@/config/context';
import { CurrencyProvider } from '@/providers/currency';
import { mockConfig } from '@/test-utils/config';
import { NativeSelect } from '@/components/ui/native-select';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@/config';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logChange = action('currency-change');
        const logClick = action('interaction');

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const select = target.closest('select');
            if (select instanceof HTMLSelectElement) {
                logChange({ currency: select.value });
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

// Create a mock version of CurrencySwitcher for Storybook
// This avoids needing to mock react-router at the module level and allows state updates
const mockFetcherSubmit = fn();

function CurrencySwitcherMock({ initialCurrency = 'GBP' }: { initialCurrency?: string }): ReactElement {
    const id = useId();
    const { t } = useTranslation('currencySwitcher');
    const config = useConfig();
    // this will change when multi site support is implemented. Use first site for now
    const currentSite = config.commerce.sites[0];
    const [currentCurrency, setCurrentCurrency] = useState(initialCurrency);

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;

        // Validate: Check if currency is in supportedCurrencies
        if (!currentSite.supportedCurrencies.includes(newCurrency)) {
            return;
        }

        // Update currency state immediately for UX
        setCurrentCurrency(newCurrency);

        const formData = new FormData();
        formData.append('currency', newCurrency);

        // Mock the server-side submission
        mockFetcherSubmit(formData, {
            method: 'POST',
            action: '/action/set-currency',
        });
    };

    return (
        <div>
            <NativeSelect id={id} onChange={handleCurrencyChange} aria-label={t('ariaLabel')} value={currentCurrency}>
                {currentSite.supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                        {t(`currencies.${currency}`, { defaultValue: currency })}
                    </option>
                ))}
            </NativeSelect>
        </div>
    );
}

const meta: Meta<typeof CurrencySwitcherMock> = {
    title: 'INPUTS/Currency Switcher',
    component: CurrencySwitcherMock,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
The CurrencySwitcher component allows users to manually select a currency from the supported currencies list.

## Features

- **Currency Selection**: Native select dropdown with supported currencies
- **Persistence**: Selected currency is stored in a cookie and persists across sessions
- **Locale Override**: Manual selection takes precedence over locale-based currency
- **Validation**: Only supported currencies are allowed
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Internationalization**: Supports translation keys for currency names

## Usage

This component is typically used in the header or footer area to allow users to change their preferred currency.
                `,
            },
        },
    },
    decorators: [
        (_Story: React.ComponentType, context) => {
            // Reset mock before each story
            mockFetcherSubmit.mockClear();
            const initialCurrency = (context.args as { initialCurrency?: string }).initialCurrency ?? 'GBP';

            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <ConfigProvider config={mockConfig}>
                        <CurrencyProvider value={initialCurrency}>
                            <ActionLogger>
                                <CurrencySwitcherMock initialCurrency={initialCurrency} />
                            </ActionLogger>
                        </CurrencyProvider>
                    </ConfigProvider>
                );

                if (inRouter) {
                    return content;
                }

                const router = createMemoryRouter(
                    [
                        {
                            path: '/',
                            element: content,
                        },
                    ],
                    { initialEntries: ['/'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof CurrencySwitcherMock>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Default currency switcher showing:
- Native select dropdown with supported currencies
- Current currency selected (GBP)
- Proper accessibility labels

This is the standard currency switcher component.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify select element is present
        const select = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await expect(select).toBeInTheDocument();

        // Verify options are present (EUR and GBP from mockConfig.commerce.sites[siteId].supportedCurrencies)
        const options = canvas.getAllByRole('option');
        await expect(options.length).toBeGreaterThanOrEqual(2);
    },
};

export const WithCurrencyChange: Story = {
    parameters: {
        docs: {
            description: {
                story: `
Currency switcher with currency change interaction. Shows:
- User can select different currencies
- Currency change is logged
- Form submission triggers to persist the selection

This demonstrates the interactive behavior of the currency switcher.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Find and interact with the select
        const select = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await expect(select).toBeInTheDocument();

        // Change currency to EUR
        await userEvent.selectOptions(select, 'EUR');

        // Verify the value changed
        await expect(select).toHaveValue('EUR');

        // Change currency back to GBP
        await userEvent.selectOptions(select, 'GBP');

        // Verify the value changed back
        await expect(select).toHaveValue('GBP');
    },
};

export const WithEuroCurrency: Story = {
    args: {
        initialCurrency: 'EUR',
    },
    parameters: {
        docs: {
            description: {
                story: `
Currency switcher with EUR as the initial currency. Shows:
- EUR is pre-selected
- Other currencies still available
- Demonstrates different initial states
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const canvas = within(canvasElement);

        // Verify select element is present with EUR selected
        const select = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await expect(select).toBeInTheDocument();
        await expect(select).toHaveValue('EUR');
    },
};
