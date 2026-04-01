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

'use client';

import { useState } from 'react';
import { useNavigate } from '@/hooks/use-navigate';
import { useTranslation } from 'react-i18next';
import { CartItemModal } from '@/components/cart-item-modal';
import { Button } from '@/components/ui/button';
import { createProductUrl } from '@/lib/product-utils';

interface QuickAddButtonProps {
    productId: string;
    productName: string;
    /** Currently selected color value — pre-seeds the PDP URL when "Buy it Now" is clicked */
    selectedColorValue?: string | null;
    /** Custom button label. Defaults to the `product.quickAdd` locale key */
    label?: string;
}

/**
 * Client component that renders the "Quick Add" hover button on a product tile and manages
 * the add-mode CartItemModal lifecycle.
 *
 * Clicking the button opens the modal; the modal fetches the full product internally.
 * "Buy it Now" closes the modal and navigates to the PDP with the selected color pre-seeded.
 */
export function QuickAddButton({ productId, productName, selectedColorValue, label }: QuickAddButtonProps) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation('product');

    const resolvedLabel = label ?? t('quickAdd');

    const handleBuyItNow = () => {
        setOpen(false);
        void navigate(createProductUrl(productId, selectedColorValue ?? null, 'color'));
    };

    return (
        <>
            <Button
                variant="outline"
                size="default"
                className="w-full shadow-sm cursor-pointer"
                tabIndex={-1}
                aria-label={`${resolvedLabel} ${productName}`}
                onClick={(e) => {
                    e.preventDefault();
                    setOpen(true);
                }}>
                {resolvedLabel}
            </Button>

            <CartItemModal
                productId={productId}
                open={open}
                onOpenChange={setOpen}
                onBuyNow={handleBuyItNow}
                initialVariantSelections={selectedColorValue ? { color: selectedColorValue } : undefined}
            />
        </>
    );
}
