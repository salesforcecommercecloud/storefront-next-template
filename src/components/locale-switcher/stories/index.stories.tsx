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
import { allModes } from '../../../../.storybook/modes';
import { expect, within, userEvent, waitFor, fn } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import i18next from 'i18next';
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { NativeSelect } from '@/components/ui/native-select';

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
            <NativeSelect
                id={id}
                onChange={(e) => void handleLocaleChange(e)}
                aria-label={t('ariaLabel')}
                value={i18n.language}>
                <option value="en-GB">{t('locales.en-GB')}</option>
                <option value="it-IT">{t('locales.it-IT')}</option>
            </NativeSelect>
        </div>
    );
}

const meta: Meta<typeof LocaleSwitcherMock> = {
    title: 'Components/LocaleSwitcher',
    component: LocaleSwitcherMock,
    parameters: {
        chromatic: { modes: { desktop: allModes.desktop } },
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
        void i18next.changeLanguage('en-GB');
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
        await expect(selector).toHaveValue('en-GB');

        // Verify both language options are present
        await expect(canvas.getByRole('option', { name: /english.*uk/i })).toBeInTheDocument();
        await expect(canvas.getByRole('option', { name: /italian.*italy/i })).toBeInTheDocument();
    },
};

export const ItalianSelected: Story = {
    render: () => {
        // Set Italian as the current language
        void i18next.changeLanguage('it-IT');
        return <LocaleSwitcherMock />;
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const selector = canvas.getByRole('combobox');
        await expect(selector).toBeInTheDocument();

        // Verify Italian is selected
        await expect(selector).toHaveValue('it-IT');

        // Verify both options are available
        // When locale is Italian, translations are in Italian, so match Italian text
        await expect(canvas.getByRole('option', { name: /inglese.*regno.*unito/i })).toBeInTheDocument();
        await expect(canvas.getByRole('option', { name: /italiano.*italia/i })).toBeInTheDocument();
    },
};

export const LanguageSwitch: Story = {
    render: () => {
        // Start with English
        void i18next.changeLanguage('en-GB');
        return <LocaleSwitcherMock />;
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const selector = canvas.getByRole('combobox');
        await expect(selector).toHaveValue('en-GB');

        // Switch to Italian
        await userEvent.selectOptions(selector, 'it-IT');

        // Verify the language changed in i18next
        await waitFor(() => {
            expect(i18next.language).toBe('it-IT');
        });

        // Verify the selector shows the new value
        await expect(selector).toHaveValue('it-IT');

        // Verify fetcher.submit was called with correct parameters
        await waitFor(() => {
            expect(mockFetcherSubmit).toHaveBeenCalled();
        });

        const submitCall = mockFetcherSubmit.mock.calls[0];
        const formData = submitCall[0] as FormData;
        const options = submitCall[1];

        await expect(formData.get('locale')).toBe('it-IT');
        await expect(options).toEqual({
            method: 'POST',
            action: '/action/set-locale',
        });
    },
};

export const ItalianToEnglish: Story = {
    render: () => {
        // Start with Italian
        void i18next.changeLanguage('it-IT');
        return <LocaleSwitcherMock />;
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const selector = canvas.getByRole('combobox');
        await expect(selector).toHaveValue('it-IT');

        // Switch to English
        await userEvent.selectOptions(selector, 'en-GB');

        // Verify the language changed in i18next
        await waitFor(() => {
            expect(i18next.language).toBe('en-GB');
        });

        // Verify the selector shows the new value
        await expect(selector).toHaveValue('en-GB');

        // Verify server-side persistence was triggered
        await waitFor(() => {
            expect(mockFetcherSubmit).toHaveBeenCalled();
        });

        const submitCall = mockFetcherSubmit.mock.calls[0];
        const formData = submitCall[0] as FormData;
        const options = submitCall[1];

        await expect(formData.get('locale')).toBe('en-GB');
        await expect(options).toEqual({
            method: 'POST',
            action: '/action/set-locale',
        });
    },
};

export const KeyboardAccessible: Story = {
    render: () => {
        void i18next.changeLanguage('en-GB');
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
        await userEvent.selectOptions(selector, 'it-IT');

        // Verify the selection changed
        await waitFor(() => {
            expect(selector).toHaveValue('it-IT');
        });
    },
};
