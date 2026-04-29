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

// React
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

// Hooks
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import { useCartQuantityUpdate } from '@/hooks/use-cart-quantity-update';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';

// Components
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import QuantityPicker from '@/components/quantity-picker/quantity-picker';
import { Typography } from '@/components/typography';
import { Label } from '@/components/ui/label';

// Constants

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
    /** Maximum quantity allowed (for bonus products, etc.) */
    max?: number;
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
    max,
    disabled = false,
}: CartQuantityPickerProps): ReactElement {
    const config = useConfig<AppConfig>();
    const { t: tQuantity } = useTranslation('quantitySelector');
    const { t: tRemove } = useTranslation('removeItem');
    const { t: tCart } = useTranslation('cart');
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
        stockMax,
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
        <div className={`${className ?? ''} relative`}>
            <Label
                htmlFor="quantity"
                className="text-sm text-muted-foreground md:mb-2 md:block inline mr-2 md:mr-0 md:text-right">
                {tQuantity('quantity')}
            </Label>
            <QuantityPicker
                value={quantity.toString()}
                onBlur={handleQuantityBlur}
                onChange={handleQuantityChange}
                disabled={isLoading || disabled}
                max={max ?? stockMax}
            />
            {/* Stock validation message */}
            {!disabled && stockValidationError && (
                <Typography
                    variant="small"
                    className="absolute top-full mt-1 text-destructive w-max max-md:left-0 md:right-0"
                    role="alert"
                    aria-live="polite">
                    {stockValidationError}
                </Typography>
            )}

            {/* Remove item confirmation dialog */}
            <ConfirmationDialog
                open={showRemoveConfirmation}
                onOpenChange={setShowRemoveConfirmation}
                title={tRemove('confirmTitle')}
                description={tCart('removeItemConfirmDescription')}
                cancelButtonText={tRemove('keepItemButton')}
                confirmButtonText={tRemove('confirmAction')}
                onCancel={handleKeepItem}
                onConfirm={handleRemoveItem}
                confirmButtonDisabled={isLoading}
                cancelButtonAriaLabel={tRemove('keepItemAriaLabel')}
                confirmButtonAriaLabel={tRemove('removeItemAriaLabel')}
            />
        </div>
    );
}
