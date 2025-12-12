/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent, waitFor, fn } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import i18next from 'i18next';
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectNative } from '@/components/ui/select-native';

// Create a mock version of LocaleSwitcher for Storybook
// This avoids needing to mock react-router at the module level
const mockFetcherSubmit = fn();

function LocaleSwitcherMock(): ReactElement {
    const id = useId();
    const { t, i18n } = useTranslation('localeSwitcher');

    const handleLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLocale = e.target.value;
        const formData = new FormData();
        formData.append('locale', newLocale);

        // Change the language in i18next client-side for immediate UX
        await i18n.changeLanguage(newLocale);

        // Mock the server-side submission
        mockFetcherSubmit(formData, {
            method: 'POST',
            action: '/action/set-locale',
        });
    };

    return (
        <div className="*:not-first:mt-2">
            <SelectNative
                id={id}
                onChange={(e) => void handleLocaleChange(e)}
                aria-label={t('ariaLabel')}
                value={i18n.language}>
                <option value="en-US">{t('locales.en-US')}</option>
                <option value="es-MX">{t('locales.es-MX')}</option>
            </SelectNative>
        </div>
    );
}

const meta: Meta<typeof LocaleSwitcherMock> = {
    title: 'Components/LocaleSwitcher',
    component: LocaleSwitcherMock,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A language selector component that allows users to switch between supported locales. Changes are applied immediately on the client-side and persisted to the server via cookie.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => {
            // Reset mock before each story
            mockFetcherSubmit.mockClear();
            return <Story />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => {
        // Set English as the default language
        void i18next.changeLanguage('en-US');
        return <LocaleSwitcherMock />;
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify the selector is rendered with correct accessibility label
        const selector = canvas.getByRole('combobox');
        await expect(selector).toBeInTheDocument();
        await expect(selector).toHaveAttribute('aria-label');

        // Verify English is selected by default
        await expect(selector).toHaveValue('en-US');

        // Verify both language options are present
        await expect(canvas.getByRole('option', { name: /english.*us/i })).toBeInTheDocument();
        await expect(canvas.getByRole('option', { name: /spanish.*mexico/i })).toBeInTheDocument();
    },
};

export const SpanishSelected: Story = {
    render: () => {
        // Set Spanish as the current language
        void i18next.changeLanguage('es-MX');
        return <LocaleSwitcherMock />;
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const selector = canvas.getByRole('combobox');
        await expect(selector).toBeInTheDocument();

        // Verify Spanish is selected
        await expect(selector).toHaveValue('es-MX');

        // Verify both options are available
        await expect(canvas.getByRole('option', { name: /inglés.*ee.*uu/i })).toBeInTheDocument();
        await expect(canvas.getByRole('option', { name: /español.*méxico/i })).toBeInTheDocument();
    },
};

export const LanguageSwitch: Story = {
    render: () => {
        // Start with English
        void i18next.changeLanguage('en-US');
        return <LocaleSwitcherMock />;
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const selector = canvas.getByRole('combobox');
        await expect(selector).toHaveValue('en-US');

        // Switch to Spanish
        await userEvent.selectOptions(selector, 'es-MX');

        // Verify the language changed in i18next
        await waitFor(() => {
            expect(i18next.language).toBe('es-MX');
        });

        // Verify the selector shows the new value
        await expect(selector).toHaveValue('es-MX');

        // Verify fetcher.submit was called with correct parameters
        await waitFor(() => {
            expect(mockFetcherSubmit).toHaveBeenCalled();
        });

        const submitCall = mockFetcherSubmit.mock.calls[0];
        const formData = submitCall[0] as FormData;
        const options = submitCall[1];

        await expect(formData.get('locale')).toBe('es-MX');
        await expect(options).toEqual({
            method: 'POST',
            action: '/action/set-locale',
        });
    },
};

export const SpanishToEnglish: Story = {
    render: () => {
        // Start with Spanish
        void i18next.changeLanguage('es-MX');
        return <LocaleSwitcherMock />;
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const selector = canvas.getByRole('combobox');
        await expect(selector).toHaveValue('es-MX');

        // Switch to English
        await userEvent.selectOptions(selector, 'en-US');

        // Verify the language changed in i18next
        await waitFor(() => {
            expect(i18next.language).toBe('en-US');
        });

        // Verify the selector shows the new value
        await expect(selector).toHaveValue('en-US');

        // Verify server-side persistence was triggered
        await waitFor(() => {
            expect(mockFetcherSubmit).toHaveBeenCalled();
        });

        const submitCall = mockFetcherSubmit.mock.calls[0];
        const formData = submitCall[0] as FormData;
        const options = submitCall[1];

        await expect(formData.get('locale')).toBe('en-US');
        await expect(options).toEqual({
            method: 'POST',
            action: '/action/set-locale',
        });
    },
};

export const KeyboardAccessible: Story = {
    render: () => {
        void i18next.changeLanguage('en-US');
        return <LocaleSwitcherMock />;
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const selector = canvas.getByRole('combobox');

        // Tab to the selector
        await userEvent.tab();
        await expect(selector).toHaveFocus();

        // Change language using keyboard
        await userEvent.selectOptions(selector, 'es-MX');

        // Verify the selection changed
        await waitFor(() => {
            expect(selector).toHaveValue('es-MX');
        });
    },
};
