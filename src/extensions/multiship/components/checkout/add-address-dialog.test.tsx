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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18next from 'i18next';
import { AddAddressDialog } from './add-address-dialog';

describe('AddAddressDialog', () => {
    const mockOnSave = vi.fn();
    const mockOnOpenChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('shows validation errors when submitting form with empty required fields', async () => {
        const user = userEvent.setup();

        render(<AddAddressDialog open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} />);

        // Verify dialog is open
        expect(screen.getByText(i18next.t('extMultiship:checkout.addressForm.addAddressTitle'))).toBeInTheDocument();

        // Try to submit without filling required fields
        const saveButton = screen.getByRole('button', {
            name: i18next.t('extMultiship:checkout.addressForm.saveButton'),
        });
        await user.click(saveButton);

        // Wait for validation errors to appear
        await waitFor(() => {
            expect(screen.getByText(i18next.t('errors:customer.firstNameRequired'))).toBeInTheDocument();
        });

        // Verify other required field errors are shown
        expect(screen.getByText(i18next.t('errors:customer.lastNameRequired'))).toBeInTheDocument();
        expect(screen.getByText(i18next.t('errors:customer.addressLine1Required'))).toBeInTheDocument();
        expect(screen.getByText(i18next.t('errors:customer.cityRequired'))).toBeInTheDocument();
        expect(screen.getByText(i18next.t('errors:customer.postalCodeRequired'))).toBeInTheDocument();
        expect(screen.getByText(i18next.t('account:addressForm.validation.stateRequired'))).toBeInTheDocument();

        // Verify onSave was not called
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('generates fallback addressId when addressId field is empty', async () => {
        const user = userEvent.setup();

        render(
            <AddAddressDialog open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} hideAddressId={true} />
        );

        // Fill out form - addressId field is hidden
        await user.type(screen.getByPlaceholderText('First name'), 'John');
        await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
        await user.type(screen.getByPlaceholderText('Address Line 1'), '123 Main St');
        await user.type(screen.getByPlaceholderText('City'), 'Seattle');
        await user.type(screen.getByPlaceholderText('Zip code'), '98101');

        // Select state
        const stateSelects = screen.getAllByRole('combobox');
        const stateSelect =
            stateSelects.find((select) => {
                const options = Array.from(select.querySelectorAll('option'));
                return options.some((opt) => opt.textContent?.includes('Select State'));
            }) || stateSelects[stateSelects.length - 1];
        await user.selectOptions(stateSelect, 'WA');

        // Fill phone field
        const phoneInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
        expect(phoneInput).toBeInTheDocument();
        await user.click(phoneInput);
        await user.clear(phoneInput);
        await user.type(phoneInput, '5551234567');

        // Wait for formatting
        await waitFor(
            () => {
                expect(phoneInput.value.length).toBeGreaterThan(0);
            },
            { timeout: 1000 }
        );

        // Submit form
        const saveButton = screen.getByRole('button', {
            name: i18next.t('extMultiship:checkout.addressForm.saveButton'),
        });
        await user.click(saveButton);

        // Wait for onSave to be called
        await waitFor(
            () => {
                expect(mockOnSave).toHaveBeenCalled();
            },
            { timeout: 3000 }
        );

        // Verify addressId was generated with fallback format
        const savedAddress = mockOnSave.mock.calls[0][0];
        expect(savedAddress.addressId).toBe('Delivery Address John Doe');
    });

    test('preserves user-entered addressId for registered shoppers', async () => {
        const user = userEvent.setup();

        render(<AddAddressDialog open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} />);

        // Fill out form with custom addressId
        await user.type(screen.getByPlaceholderText(/Address Title|e\.g\., Home, Work/i), 'Home');
        await user.type(screen.getByPlaceholderText('First name'), 'Jane');
        await user.type(screen.getByPlaceholderText('Last name'), 'Smith');
        await user.type(screen.getByPlaceholderText('Address Line 1'), '456 Oak Ave');
        await user.type(screen.getByPlaceholderText('City'), 'Portland');
        await user.type(screen.getByPlaceholderText('Zip code'), '97201');
        const phoneInput = screen.getByPlaceholderText('(555) 123-4567') || document.querySelector('input[type="tel"]');
        if (phoneInput) {
            await user.type(phoneInput, '1234567890');
        }

        // Select state
        const stateSelects = screen.getAllByRole('combobox');
        const stateSelect =
            stateSelects.find((select) => {
                const options = Array.from(select.querySelectorAll('option'));
                return options.some((opt) => opt.textContent?.includes('Select State'));
            }) || stateSelects[stateSelects.length - 1];
        await user.selectOptions(stateSelect, 'OR');

        // Submit form
        const saveButton = screen.getByRole('button', {
            name: i18next.t('extMultiship:checkout.addressForm.saveButton'),
        });
        await user.click(saveButton);

        // Wait for onSave to be called
        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
        });

        // Verify addressId was preserved
        const savedAddress = mockOnSave.mock.calls[0][0];
        expect(savedAddress.addressId).toBe('Home');
    });

    test('resets stateCode and postalCode when country changes', async () => {
        const user = userEvent.setup();

        render(
            <AddAddressDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                onSave={mockOnSave}
                defaultValues={{
                    countryCode: 'US',
                    stateCode: 'WA',
                    postalCode: '98101',
                }}
            />
        );

        // Find country select
        const countrySelects = screen.getAllByRole('combobox');
        const countrySelect = countrySelects[0]; // Country is usually first

        // Change country from US to CA
        await user.selectOptions(countrySelect, 'CA');

        // Verify stateCode and postalCode are reset (they should be empty)
        const stateSelects = screen.getAllByRole('combobox');
        const stateSelect =
            stateSelects.find((select) => {
                const options = Array.from(select.querySelectorAll('option'));
                return options.some((opt) => opt.textContent?.includes('Select State'));
            }) || stateSelects[stateSelects.length - 1];

        expect(stateSelect).toHaveValue('');

        const postalCodeInput = screen.getByPlaceholderText('Postal code');
        expect(postalCodeInput).toHaveValue('');
    });

    test('hides addressId field when hideAddressId prop is true', () => {
        render(
            <AddAddressDialog open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} hideAddressId={true} />
        );

        // Verify addressId field is not visible
        expect(screen.queryByPlaceholderText(/Address Title|e\.g\., Home, Work/i)).not.toBeInTheDocument();
    });

    test('shows addressId field when hideAddressId prop is false', () => {
        render(
            <AddAddressDialog open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} hideAddressId={false} />
        );

        // Verify addressId field is visible
        expect(screen.getByPlaceholderText(/Address Title|e\.g\., Home, Work/i)).toBeInTheDocument();
    });
});
