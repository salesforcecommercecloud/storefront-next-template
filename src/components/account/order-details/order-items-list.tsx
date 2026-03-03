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
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import {
    ProductItemVariantImage,
    ProductItemVariantName,
    ProductItemVariantAttributes,
} from '@/components/product-item';
import ProductPrice from '@/components/product-price';
import { useCurrency } from '@/providers/currency';
import { useTranslation } from 'react-i18next';
import type { EnrichedProductItem } from '@/lib/product-utils';
import type { ShopperOrders, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

type OrderItem = ShopperOrders.schemas['ProductItem'];

export type ProductDataById = Record<string, ShopperProducts.schemas['Product'] | undefined>;

export type OrderItemsListProps = {
    items: OrderItem[];
    productsById: ProductDataById;
};

/**
 * Renders a list of order line items with image, name, variant, quantity, price, and Buy Again link.
 * Matches PWA-Kit order details line-item pattern (product row with image, details, price, reorder).
 */
export function OrderItemsList({ items, productsById }: OrderItemsListProps): ReactElement {
    const { t } = useTranslation('account');
    const currency = useCurrency();

    if (items.length === 0) {
        return (
            <Typography variant="p" className="text-muted-foreground">
                {t('orders.emptyItemsFallback')}
            </Typography>
        );
    }

    return (
        <ul className="space-y-4">
            {items.map((item, index) => {
                const productData = item.productId ? productsById[item.productId] : undefined;
                const productKey = item.itemId ?? `${item.productId}-${index}`;
                const productName = item.productName;
                const enrichedItem: EnrichedProductItem = { ...productData, ...item } as EnrichedProductItem;
                return (
                    <li key={productKey} data-testid="order-item">
                        <div className="flex flex-col gap-4 rounded-none border border-muted-foreground/20 bg-card p-4 sm:flex-row sm:items-center">
                            <ProductItemVariantImage productItem={enrichedItem} className="h-24 w-24 rounded-none" />
                            <div className="min-w-0 flex-1 space-y-1">
                                <ProductItemVariantName productItem={enrichedItem} />
                                <ProductItemVariantAttributes productItem={enrichedItem} />
                                <p className="text-xs text-muted-foreground">
                                    {t('orders.quantityLabel', { count: item.quantity ?? 1 })}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1 sm:self-start">
                                {currency ? (
                                    <ProductPrice
                                        product={item}
                                        currency={currency}
                                        quantity={item.quantity ?? 1}
                                        labelForA11y={productName}
                                    />
                                ) : null}
                                {item.productId && (
                                    <Button
                                        asChild
                                        variant="default"
                                        size="sm"
                                        className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs">
                                        <Link to={`/product/${item.productId}`}>{t('orders.buyAgain')}</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export default OrderItemsList;
