'use client';

/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// React
import { type ReactElement, useState } from 'react';

// Types
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Button } from '@/components/ui/button';
import { CartItemEditModal } from '@/components/cart-item-edit-modal';

// Constants
import uiStrings from '@/temp-ui-string';

interface CartItemEditButtonProps {
    product: ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>;
    className?: string;
}

/**
 * CartItemEditButton component that renders an edit button with product modal
 *
 * This component provides:
 * - Edit item functionality with product modal
 * - Same styling as RemoveItemButtonWithConfirmation for consistency
 * - Modal for editing cart item with product variants
 *
 * Used by cart-content components for consistent edit item behavior.
 *
 * @param props - Component props
 * @returns JSX element with edit button and product modal
 */
export function CartItemEditButton({ product, className = '' }: CartItemEditButtonProps): ReactElement {
    // Modal state management
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant="link"
                size="sm"
                className={className}
                title={uiStrings.actionCard.edit}
                data-testid={`edit-item-${product.itemId}`}
                onClick={() => setIsOpen(true)}>
                {uiStrings.actionCard.edit}
            </Button>

            {product.itemId && (
                <CartItemEditModal
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    product={product as ShopperProducts.schemas['Product']}
                    initialQuantity={product.quantity || 1}
                    itemId={product.itemId}
                />
            )}
        </>
    );
}
