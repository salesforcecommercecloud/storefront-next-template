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
import ProductImage from '@/components/product-image/product-image';
import { formatCurrency } from '@/lib/currency';
import { getDisplayVariationValues } from '@/lib/product-utils';
import { useTranslation } from 'react-i18next';
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
    const { t, i18n } = useTranslation('account');

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
                const img = productData?.image as { disBaseLink?: string; link?: string } | undefined;
                const imageSrc = img?.disBaseLink ?? img?.link;
                const variationValues =
                    productData && productData.variationAttributes
                        ? Object.entries(
                              getDisplayVariationValues(
                                  productData.variationAttributes,
                                  (productData.variationValues ?? {}) as Record<string, string>
                              )
                          )
                        : [];
                const productUrl = item.productId ? `/product/${item.productId}` : undefined;

                return (
                    <li key={productKey}>
                        <div className="flex flex-col gap-4 rounded-none border border-muted-foreground/20 bg-card p-4 sm:flex-row sm:items-center">
                            {/* was border-gray-200 bg-white */}
                            {/* TODO: Use ProductItemVariantImage from @/components/product-item */}
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-none bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                                {imageSrc ? (
                                    <ProductImage
                                        src={imageSrc}
                                        alt={productName ?? ''}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    (productName?.[0] ?? t('orders.productPlaceholderInitial'))
                                )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                {/* TODO: Use ProductItemVariantName from @/components/product-item */}
                                <p className="text-sm font-semibold">{productName}</p>
                                {/* TODO: Use ProductItemVariantAttributes from @/components/product-item */}
                                {variationValues.map(([label, value]) => (
                                    <p key={`${productKey}-${label}`} className="text-xs text-muted-foreground">
                                        {label}: {value}
                                    </p>
                                ))}
                                <p className="text-xs text-muted-foreground">
                                    {t('orders.quantityLabel', { count: item.quantity ?? 1 })}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1 sm:self-start">
                                {/* TODO: Replace with a common ProductPrice component */}
                                {formatCurrency(Number(item.priceAfterItemDiscount ?? 0), i18n.language, 'USD')}
                                {productUrl && (
                                    <Button
                                        asChild
                                        variant="default"
                                        size="sm"
                                        className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs">
                                        <Link to={productUrl}>{t('orders.buyAgain')}</Link>
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
