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
});
