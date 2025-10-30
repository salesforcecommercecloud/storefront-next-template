'use client';

/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// React
import { type ReactElement, useCallback, useEffect, useState } from 'react';

// Hooks
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import { useConfig } from '@/config';

// Components
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';

// Constants
import uiStrings from '@/temp-ui-string';

export interface RemoveItemConfig {
    action: string;
    confirmDescription: string;
}

interface RemoveItemButtonWithConfirmationProps {
    itemId: string;
    config?: RemoveItemConfig;
    className?: string;
}

/**
 * RemoveItemButtonWithConfirmation component that renders a remove button with confirmation dialog
 *
 * This component provides:
 * - Remove item functionality with confirmation dialog
 * - Configurable messages and actions through config prop
 * - Default configuration from cart constants
 * - Loading states and error handling
 *
 * Used by cart-content components for consistent remove item behavior.
 */
export function RemoveItemButtonWithConfirmation({
    itemId,
    config,
    className = '',
}: RemoveItemButtonWithConfirmationProps): ReactElement {
    const appConfig = useConfig();
    const removeAction = config?.action || appConfig.pages.cart.removeAction;
    const confirmDescription = config?.confirmDescription || appConfig.pages.cart.confirmDescription;

    // Create a unique fetcher for this component instance
    const fetcher = useItemFetcher({
        itemId,
        componentName: 'remove-item-button',
    });
    const isLoading = fetcher.state === 'submitting';
    const [showConfirmation, setShowConfirmation] = useState(false);
    const { addToast } = useToast();

    // Handle UI effects (toast notifications)
    useEffect(() => {
        if (fetcher.state === 'idle' && fetcher.data) {
            if (fetcher.data.success) {
                addToast(uiStrings.removeItem.success, 'success');
            } else {
                addToast(uiStrings.removeItem.failed, 'error');
            }
        }
        //As addToast is unlikely to change, we don't need to include it in the dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetcher.state, fetcher.data]);

    // Remove item function
    const removeItem = useCallback(() => {
        if (!itemId) return;

        const formData = new FormData();
        formData.append('itemId', itemId);
        void fetcher.submit(formData, {
            method: 'POST',
            action: removeAction,
        });
    }, [itemId, removeAction, fetcher]);

    // Handle confirmation dialog actions
    const handleCancel = useCallback(() => {
        setShowConfirmation(false);
    }, []); // No dependencies needed - only calls setShowConfirmation with static value

    const handleConfirm = useCallback(() => {
        setShowConfirmation(false);
        removeItem();
        // removeItem: stable function from useRemoveItem hook, no need to recreate callback
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Button
                variant="link"
                size="sm"
                disabled={isLoading}
                className={className}
                title={uiStrings.removeItem.title}
                data-testid={`remove-item-${itemId}`}
                aria-busy={isLoading}
                onClick={() => setShowConfirmation(true)}>
                {isLoading ? uiStrings.removeItem.removing : uiStrings.removeItem.button}
            </Button>

            <ConfirmationDialog
                open={showConfirmation}
                onOpenChange={setShowConfirmation}
                title={uiStrings.removeItem.confirmTitle}
                description={confirmDescription}
                cancelButtonText={uiStrings.removeItem.cancelButton}
                confirmButtonText={uiStrings.removeItem.confirmAction}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                confirmButtonDisabled={isLoading}
            />
        </>
    );
}
