/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

// React
import { type ReactElement } from 'react';

// Hooks
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import { useCartQuantityUpdate } from '@/hooks/use-cart-quantity-update';
import { useConfig } from '@/config';

// Components
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import QuantityPicker from '@/components/quantity-picker/quantity-picker';
import { Typography } from '@/components/typography';
import { Label } from '@/components/ui/label';

// Constants
import uiStrings from '@/temp-ui-string';

interface CartQuantityPickerProps {
    /** Current quantity value as string */
    value: string;
    /** Cart item ID for API calls */
    itemId: string;
    /** Custom className for styling */
    className?: string;
    /** Debounce delay in milliseconds */
    debounceDelay?: number;
    /** Stock level for validation */
    stockLevel?: number;
    /** Disable quantity picker (e.g., for bonus products) */
    disabled?: boolean;
}

/**
 * Cart-specific quantity picker wrapper
 *
 * This component wraps the base QuantityPicker with cart-specific logic:
 * - Automatic API integration via React Router fetcher
 * - Debounced quantity updates to prevent API spam
 * - Error handling with rollback on failure
 * - Stock level validation with warnings
 * - Optimistic updates for better UX
 */
export default function CartQuantityPicker({
    value,
    itemId,
    className,
    debounceDelay,
    stockLevel,
    disabled = false,
}: CartQuantityPickerProps): ReactElement {
    const config = useConfig();
    const effectiveDebounceDelay = debounceDelay || config.pages.cart.quantityUpdateDebounce;

    // Create a unique fetcher for this component instance
    const fetcher = useItemFetcher({
        itemId,
        componentName: 'cart-quantity-picker',
    });
    const isLoading = fetcher.state === 'submitting';
    const {
        quantity,
        stockValidationError,
        showRemoveConfirmation,
        handleQuantityChange,
        handleQuantityBlur,
        handleKeepItem,
        handleRemoveItem,
        setShowRemoveConfirmation,
    } = useCartQuantityUpdate({
        itemId,
        initialValue: parseInt(value, 10) || 0, // Convert string to number for the hook
        stockLevel,
        debounceDelay: effectiveDebounceDelay,
        fetcher,
    });

    return (
        <div className={className}>
            <Label htmlFor="quantity" className="text-foreground mb-2 block">
                {uiStrings.quantitySelector.quantity}
            </Label>
            <QuantityPicker
                value={quantity.toString()}
                onBlur={handleQuantityBlur}
                onChange={handleQuantityChange}
                disabled={isLoading || disabled}
            />
            {/* Stock validation error message */}
            {!disabled && stockValidationError && (
                <Typography variant="small" className="text-destructive mt-1" role="alert" aria-live="polite">
                    {stockValidationError}
                </Typography>
            )}

            {/* Remove item confirmation dialog */}
            <ConfirmationDialog
                open={showRemoveConfirmation}
                onOpenChange={setShowRemoveConfirmation}
                title={uiStrings.removeItem.confirmTitle}
                description={uiStrings.cart.removeItemConfirmDescription}
                cancelButtonText={uiStrings.removeItem.keepItemButton}
                confirmButtonText={uiStrings.removeItem.confirmAction}
                onCancel={handleKeepItem}
                onConfirm={handleRemoveItem}
                confirmButtonDisabled={isLoading}
                cancelButtonAriaLabel={uiStrings.removeItem.keepItemAriaLabel}
                confirmButtonAriaLabel={uiStrings.removeItem.removeItemAriaLabel}
            />
        </div>
    );
}
