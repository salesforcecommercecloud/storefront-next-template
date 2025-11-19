/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

// React
import { type ReactElement, useCallback } from 'react';

// Hooks
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';
import { useRevalidator } from 'react-router';

// Components
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { useToast } from '@/components/toast';

// Constants
import uiStrings from '@/temp-ui-string';

export interface RemoveAddressConfirmationDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** The address ID to remove */
    addressId: string;
    /** Customer ID for the remove operation */
    customerId: string;
    /** Callback when remove succeeds */
    onSuccess?: () => void;
}

/**
 * RemoveAddressConfirmationDialog component that provides a confirmation dialog
 * for removing customer addresses with integrated SCAPI fetcher.
 *
 * This component:
 * - Creates its own fetcher for the specific address removal operation
 * - Handles success and error states with toast notifications
 * - Automatically closes on successful removal
 * - Revalidates data after successful removal
 *
 * @param props - Component props
 * @returns JSX element with confirmation dialog
 */
export function RemoveAddressConfirmationDialog({
    open,
    onOpenChange,
    addressId,
    customerId,
    onSuccess,
}: RemoveAddressConfirmationDialogProps): ReactElement {
    const { addToast } = useToast();
    const revalidator = useRevalidator();

    // Create fetcher for removing this specific address
    // The fetcher is stable because addressId doesn't change while modal is open
    const removeFetcher = useScapiFetcher('ShopperCustomers', 'removeCustomerAddress', {
        parameters: {
            customerId,
            addressName: addressId,
        },
    });

    const isLoading = removeFetcher.state === 'submitting';

    // Handle fetcher effects
    useScapiFetcherEffect(removeFetcher, {
        onSuccess: () => {
            addToast(uiStrings.account.addresses.removeSuccess, 'success');
            onOpenChange(false); // Close modal on success
            onSuccess?.();
            void revalidator.revalidate();
        },
        onError: (errors) => {
            const errorMessage = errors?.length > 0 ? errors.join(', ') : uiStrings.account.addresses.removeError;
            addToast(errorMessage, 'error');
        },
    });

    // Handle confirm action
    const handleConfirm = useCallback(() => {
        if (!addressId || !customerId) {
            addToast(uiStrings.account.addresses.removeError, 'error');
            return;
        }

        if (removeFetcher.state === 'idle') {
            void removeFetcher.submit({});
        }
    }, [addressId, customerId, removeFetcher, addToast]);

    // Handle cancel action
    const handleCancel = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={uiStrings.account.addresses.removeConfirmTitle}
            description={uiStrings.account.addresses.removeConfirmDescription.replace('{addressName}', addressId)}
            cancelButtonText={uiStrings.account.addresses.removeCancelButton}
            confirmButtonText={uiStrings.account.addresses.removeConfirmButton}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            confirmButtonDisabled={isLoading}
        />
    );
}
