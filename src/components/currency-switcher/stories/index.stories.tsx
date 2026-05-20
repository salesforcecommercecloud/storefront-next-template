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
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { mockLocale, mockSiteObject } from '@/test-utils/config';
import CurrencySwitcher from '../index';

const meta: Meta<typeof CurrencySwitcher> = {
    title: 'INPUTS/Currency Switcher',
    component: CurrencySwitcher,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
The CurrencySwitcher component allows users to manually select a currency from the supported currencies list.

## Features

- **Currency Selection**: Native select dropdown populated from \`useSite().site.supportedCurrencies\`
- **Persistence**: Selection is submitted to \`/action/set-site-context\` and stored in a cookie
- **Locale Override**: Manual selection takes precedence over locale-based currency
- **Validation**: Shows an error toast for currencies not in \`supportedCurrencies\`
- **Accessibility**: Native \`<select>\` with translated aria-label
- **Internationalization**: Currency labels come from the \`currencySwitcher.currencies.*\` namespace

## Usage

This component is typically used in the header or footer area to allow users to change their preferred currency.
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const select = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await expect(select).toBeInTheDocument();
        await expect(select).toHaveValue('GBP');

        const options = canvas.getAllByRole('option');
        await expect(options.length).toBe(2);
        await expect(canvas.getByRole('option', { name: /british pound/i })).toBeInTheDocument();
        await expect(canvas.getByRole('option', { name: /euro/i })).toBeInTheDocument();
    },
};

export const WithCurrencyChange: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const select = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await expect(select).toBeInTheDocument();

        // The real `<select>` is controlled by `useSite().currency`, which only updates after the
        // server action sets the cookie and the page reloads — neither happens in Storybook. So
        // selecting EUR cannot change the displayed value, and `toHaveValue('GBP')` below is only
        // a steady-state check; it does NOT prove `handleCurrencyChange` actually fired.
        await userEvent.selectOptions(select, 'EUR');
        await expect(select).toHaveValue('GBP');
    },
};

export const WithEuroCurrency: Story = {
    decorators: [
        (Story) => (
            // Shadow the global StorybookSiteProvider so `useSite().currency` returns 'EUR'.
            // The inner SiteProvider wins because both providers use the same React context.
            <SiteProvider
                site={mockSiteObject}
                locale={mockLocale}
                language={mockSiteObject.defaultLocale}
                currency="EUR">
                <Story />
            </SiteProvider>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const select = await canvas.findByRole('combobox', {}, { timeout: 5000 });
        await expect(select).toBeInTheDocument();
        await expect(select).toHaveValue('EUR');
    },
};
