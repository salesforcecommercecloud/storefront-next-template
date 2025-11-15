// React
import type { ReactElement } from 'react';

// Commerce SDK
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Typography } from '@/components/typography';

// Utils
import uiStrings from '@/temp-ui-string';

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
    // Calculate total items by summing up the quantity of each product item
    const totalItems = basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;

    const getItemCountText = (count: number): string => {
        if (count === 0) return uiStrings.cart.itemCount.zero;
        if (count === 1) return uiStrings.cart.itemCount.one;
        return uiStrings.cart.itemCount.other.replace('{count}', count.toString());
    };

    return (
        <Typography variant="h2" as="h1" className="my-6">
            {getItemCountText(totalItems)}
        </Typography>
    );
}
