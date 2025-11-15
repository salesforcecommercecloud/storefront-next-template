// React
import { useMemo, type ReactElement } from 'react';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';

// Components
import ProductItem from '@/components/product-item';

// Hooks

/**
 * Spacing constants for different display variants
 *
 * These constants define the vertical spacing between product items
 * based on the display variant to ensure consistent visual hierarchy.
 */
/** Spacing for default variant (full product cards) */
const DEFAULT_SPACING = 'space-y-4';
/** Spacing for summary variant (compact list view) */
const SUMMARY_SPACING = 'space-y-5';

/**
 * Props for the ProductItemsList component
 *
 * @interface ProductItemsListProps
 * @property {ShopperBasketsV2.schemas['ProductItem'][] | undefined} productItems - Array of product items from the basket
 * @property {Record<string, ShopperProducts.schemas['Product']>} [productsByItemId] - Item ID to product mapping for enhanced product data
 * @property {Record<string, ShopperPromotions.schemas['Promotion']>} [promotions] - Promotions by ID for displaying promotion information
 * @property {'default' | 'summary'} [variant='default'] - Display variant: 'default' for full product cards, 'summary' for compact list view
 * @property {function} [primaryAction] - Optional render prop function to generate primary action buttons for each product
 * @property {function} [secondaryActions] - Optional render prop function to generate secondary action buttons for each product
 */
interface ProductItemsListProps {
    /** Array of product items from the basket */
    productItems: ShopperBasketsV2.schemas['ProductItem'][] | undefined;
    /** Required item ID to product mapping for enhanced product data */
    productsByItemId: Record<string, ShopperProducts.schemas['Product']>;
    /** Optional promotions by ID for displaying promotion information */
    promotions?: Record<string, ShopperPromotions.schemas['Promotion']>;
    /** Display variant: 'default' for full product cards, 'summary' for compact list view */
    variant?: 'default' | 'summary';
    /**
     * Optional render prop function to generate primary action buttons for each product
     * @param product - Combined product data (basket item + product details)
     * @returns React element for primary action or undefined
     */
    primaryAction?: (
        product: ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>
    ) => ReactElement | undefined;
    /**
     * Optional render prop function to generate secondary action buttons for each product
     * @param product - Combined product data (basket item + product details)
     * @returns React element for secondary actions or undefined
     */
    secondaryActions?: (
        product: ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>
    ) => ReactElement | undefined;
}

/**
 * ProductItemsList component that renders a list of product items
 *
 * This component handles:
 * - Rendering multiple product items with consistent spacing
 * - Combining basket item data with product details
 * - Supporting different display variants (default/summary)
 * - Applying primary and secondary actions to items via render props
 * - Handling empty or undefined product items gracefully
 * - Performance optimization with memoization
 *
 * @param props - Component props
 * @returns JSX element containing the list of product items
 *
 * @example
 * ```tsx
 * // Basic usage with default variant
 * <ProductItemsList
 *   productItems={basketItems}
 *   productsByItemId={productsByItemId}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Summary variant for compact display
 * <ProductItemsList
 *   productItems={basketItems}
 *   variant="summary"
 *   productsByItemId={productsByItemId}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With primary and secondary actions
 * <ProductItemsList
 *   productItems={basketItems}
 *   productsByItemId={productsByItemId}
 *   promotions={promotions}
 *   primaryAction={(product) => (
 *     <button onClick={() => handleUpdate(product)}>
 *       Update Item
 *     </button>
 *   )}
 *   secondaryActions={(product) => (
 *     <button onClick={() => handleRemove(product)}>
 *       Remove Item
 *     </button>
 *   )}
 * />
 * ```
 */
export default function ProductItemsList({
    productItems,
    productsByItemId,
    promotions,
    variant = 'default',
    primaryAction,
    secondaryActions,
}: ProductItemsListProps): ReactElement {
    /**
     * Memoized list of ProductItem components with combined data
     *
     * This memoization prevents unnecessary re-renders when data props haven't changed.
     * Function props (primaryAction, secondaryActions) are excluded from dependencies
     * to avoid re-computation when parent components re-render with new function references.
     * Each product item combines basket data with product details for enhanced display.
     */
    const memoizedItems = useMemo(() => {
        return (productItems || []).map((productItem, index) => {
            // Combine basket item with product data following reference logic
            const productData = productItem?.itemId ? productsByItemId?.[productItem.itemId] : undefined;

            /**
             * Basket item data enriched with product details
             * @type {ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']> & { isProductUnavailable: boolean }}
             */
            const enrichedProductItem = {
                ...productItem,
                ...(productData || {}),
                isProductUnavailable: !productData,
                price: productItem.price ?? 0,
                quantity: productItem.quantity ?? 1,
            };

            return (
                <ProductItem
                    key={productItem.itemId || `item-${index}`}
                    productItem={enrichedProductItem}
                    primaryAction={primaryAction}
                    secondaryActions={secondaryActions}
                    displayVariant={variant}
                    promotions={promotions}
                />
            );
        });
        // Intentionally exclude primaryAction and secondaryActions from dependencies
        // to prevent re-computation when parent components re-render with new function references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productItems, productsByItemId, promotions, variant]);

    return <div className={variant === 'summary' ? SUMMARY_SPACING : DEFAULT_SPACING}>{memoizedItems}</div>;
}
