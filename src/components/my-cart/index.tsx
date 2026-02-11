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
import { type ReactElement } from 'react';

// Third-party
import { ShoppingCart } from 'lucide-react';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ProductItemsList from '@/components/product-items-list';
import { UITarget } from '@/targets/ui-target';
import { useTranslation } from 'react-i18next';

// Utils

/**
 * Props for the MyCart component
 *
 * @interface MyCartProps
 * @property {ShopperBasketsV2.schemas['Basket']} basket
 * @property {Record<string, ShopperProducts.schemas['Product']>} [productMap]
 * @property {Record<string, ShopperPromotions.schemas['Promotion']>} [promotions]
 * @property {boolean} [itemsExpanded]
 */
interface MyCartProps {
    basket: ShopperBasketsV2.schemas['Basket'];
    productMap?: Record<string, ShopperProducts.schemas['Product']>;
    promotions?: Record<string, ShopperPromotions.schemas['Promotion']>;
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
export default function MyCart({
    basket,
    productMap = {},
    promotions,
    itemsExpanded = false,
}: MyCartProps): ReactElement {
    const { t } = useTranslation('checkout');
    const totalItems = basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;

    return (
        <>
            <Accordion
                type="single"
                collapsible
                className="w-full"
                defaultValue={itemsExpanded ? 'my-cart-items' : undefined}>
                <AccordionItem value="my-cart-items" className="border-none">
                    <UITarget targetId="myCart.header.before" />
                    <AccordionTrigger className="text-left hover:no-underline py-6">
                        <span className="flex-1 text-left text-lg font-bold text-primary">
                            <ShoppingCart className="inline mr-2 w-5 h-5" />
                            {t('myCart.title')} ({totalItems})
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-6">
                        <ProductItemsList
                            productItems={basket.productItems}
                            productsByItemId={productMap}
                            promotions={promotions}
                            variant="summary"
                            separateCards={true}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </>
    );
}
