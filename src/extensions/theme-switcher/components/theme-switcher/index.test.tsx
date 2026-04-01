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
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from 'storybook/test';
import ThemeSwitcher from './index';

describe('ThemeSwitcher', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-theme');
    });

    it('should render theme selects', () => {
        render(<ThemeSwitcher />);

        const selects = screen.getAllByRole('combobox');
        expect(selects).toHaveLength(2);

        // Verify theme family options
        expect(screen.getByRole('option', { name: /market street/i })).toBeInTheDocument();

        // Verify theme mode options
        expect(screen.getByRole('option', { name: /^light$/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /^dark$/i })).toBeInTheDocument();
    });

    it('should initialize with default theme (market-street, light)', () => {
        render(<ThemeSwitcher />);

        const selects = screen.getAllByRole('combobox');
        const [familySelect, modeSelect] = selects;

        expect(familySelect).toHaveValue('market-street');
        expect(modeSelect).toHaveValue('light');
    });

    it('should apply dark mode class when dark theme is selected', async () => {
        render(<ThemeSwitcher />);

        const selects = screen.getAllByRole('combobox');
        const [, modeSelect] = selects;

        await userEvent.selectOptions(modeSelect, 'dark');

        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });
    });

    it('should remove dark mode class when light theme is selected', async () => {
        document.documentElement.classList.add('dark');

        render(<ThemeSwitcher />);

        const selects = screen.getAllByRole('combobox');
        const [, modeSelect] = selects;

        await userEvent.selectOptions(modeSelect, 'light');

        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });
    });

    it('should not set data-theme attribute for market-street theme', async () => {
        document.documentElement.setAttribute('data-theme', 'some-old-theme');

        render(<ThemeSwitcher />);

        await waitFor(() => {
            expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        });
    });

    it('should reset to default theme on page refresh', () => {
        // This test documents expected behavior: theme does not persist across refreshes
        // User must reselect theme after refresh (intentional for demo purposes)
        render(<ThemeSwitcher />);

        const selects = screen.getAllByRole('combobox');
        const [familySelect, modeSelect] = selects;

        // Always starts with defaults
        expect(familySelect).toHaveValue('market-street');
        expect(modeSelect).toHaveValue('light');
    });
});
