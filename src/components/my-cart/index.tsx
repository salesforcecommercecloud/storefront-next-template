// React
import { type ReactElement } from 'react';

// Third-party
import { ShoppingCart } from 'lucide-react';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ProductItemsList from '@/components/product-items-list';

// Utils
import uiStrings from '@/temp-ui-string';

/**
 * Props for the MyCart component
 *
 * @interface MyCartProps
 * @property {ShopperBasketsV2.schemas['Basket']} basket - The shopping basket containing product items
 * @property {Record<string, ShopperProducts.schemas['Product']>} [productMap] - Optional product details mapping
 * @property {boolean} [itemsExpanded] - Whether the accordion should be expanded by default
 */
interface MyCartProps {
    basket: ShopperBasketsV2.schemas['Basket'];
    productMap?: Record<string, ShopperProducts.schemas['Product']>;
    itemsExpanded?: boolean;
}

/**
 * MyCart component that displays cart items in a collapsible accordion
 *
 * This component renders:
 * - A card wrapper for consistent styling
 * - A collapsible accordion showing item count with shopping cart icon
 * - Product items list in summary variant
 *
 * Used on checkout page to display cart items separately from order summary
 *
 * @param props - Component props
 * @returns JSX element representing the my cart component
 */
export default function MyCart({ basket, productMap = {}, itemsExpanded = false }: MyCartProps): ReactElement {
    const totalItems = basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;

    return (
        <Card>
            <CardContent>
                <Accordion
                    type="single"
                    collapsible
                    className="w-full"
                    defaultValue={itemsExpanded ? 'my-cart-items' : undefined}>
                    <AccordionItem value="my-cart-items" className="border-none">
                        <AccordionTrigger className="text-left hover:no-underline py-6">
                            <span className="flex-1 text-left text-lg font-bold text-primary">
                                <ShoppingCart className="inline mr-2 w-5 h-5" />
                                {uiStrings.checkout.myCart.title} ({totalItems})
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-6">
                            <ProductItemsList
                                productItems={basket.productItems}
                                productsByItemId={productMap}
                                variant="summary"
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
