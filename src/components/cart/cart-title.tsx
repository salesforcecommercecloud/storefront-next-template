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
import type { ReactElement } from 'react';

// Commerce SDK
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Typography } from '@/components/typography';
import { useTranslation } from 'react-i18next';

/**
 * Props for the CartTitle component
 *
 * @interface CartTitleProps
 * @property {ShopperBasketsV2.schemas['Basket']} basket - The shopping basket containing product items
 */
interface CartTitleProps {
    basket: ShopperBasketsV2.schemas['Basket'];
}

/**
 * CartTitle component that displays the cart item count with proper pluralization
 *
 * This component calculates the total number of items in the cart and displays
 * the appropriate text based on the count:
 * - Zero items: Shows "Your cart is empty" or similar
 * - One item: Shows "1 item in cart"
 * - Multiple items: Shows "X items in cart"
 *
 * The component handles edge cases like:
 * - Missing or undefined productItems array
 * - Items with undefined or null quantities
 * - Empty basket scenarios
 *
 * Used by CartContent component (see cart-content.tsx for usage example)
 *
 * @param props - Component props
 * @returns JSX element representing the cart title with item count
 */
export default function CartTitle({ basket }: CartTitleProps): ReactElement {
    const { t } = useTranslation('cart');

    // Calculate total items by summing up the quantity of each product item
    const totalItems = basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;

    const getItemCountText = (count: number): string => {
        if (count === 0) return t('itemCount.zero');
        if (count === 1) return t('itemCount.one');
        return t('itemCount.other', { count });
    };

    return (
        <Typography variant="h2" as="h1" className="my-6 !text-lg !tracking-normal truncate">
            {getItemCountText(totalItems)}
        </Typography>
    );
}
