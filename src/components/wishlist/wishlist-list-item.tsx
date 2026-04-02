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

import { type ReactElement, useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
import { Link } from '@/components/link';
import type { ShopperCustomers, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { useCurrency } from '@/providers/currency';
import { findImageGroupBy } from '@/lib/image-groups-utils';
import { toImageUrl } from '@/lib/dynamic-image';
import { createProductUrl, getDisplayVariationValues, requiresVariantSelection } from '@/lib/product-utils';
import { useToast } from '@/components/toast';
import InventoryMessage from '@/components/inventory-message';
import ProductPrice from '@/components/product-price';
import { Button } from '@/components/ui/button';
import { useProductActions } from '@/hooks/product/use-product-actions';

type Product = ShopperProducts.schemas['Product'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];

interface WishlistListItemProps {
    product: Product;
    wishlistItem: CustomerProductListItem;
    onRemove: (itemId: string) => void;
}

/**
 * WishlistListItem — horizontal card row for a single wishlist product.
 *
 * Layout: [Image | Name + Variants + Stock + Remove | Price]
 */
export function WishlistListItem({ product, wishlistItem, onRemove }: WishlistListItemProps): ReactElement {
    const { t } = useTranslation('product');
    const config = useConfig<AppConfig>();
    const currency = useCurrency();
    const { addToast } = useToast();
    const removeFetcher = useFetcher<{ success: boolean; error?: string }>();
    const hasHandledRemoveResponse = useRef(false);

    // When SCAPI returns the product by its variant ID, the product itself has type.variant = true
    // and carries variationValues — the user explicitly chose this variant before saving.
    // For master products, we search the variants array to find the specific variant that was saved.
    // Resolved variant attributes are shown when either:
    //   a) the product IS a variant (type.variant = true), or
    //   b) the stored productId matches a specific variant inside the master's variants array.
    const isProductVariant = Boolean(product.type?.variant);
    const matchedVariant = !isProductVariant
        ? product.variants?.find((v) => v.productId === wishlistItem.productId)
        : undefined;

    // Determine the current variant to pass to useProductActions:
    // - If product IS a variant, use the product itself (cast to Variant type)
    // - If product is a master, use the matched variant (or undefined if not found)
    const currentVariant = isProductVariant ? (product as ShopperProducts.schemas['Variant']) : matchedVariant;

    // Use the product actions hook for cart operations
    // Skip inventory validation for wishlist - users should be able to attempt adding
    // out-of-stock items (the cart action will handle the error)
    const { handleAddToCart, isAddingToOrUpdatingCart, canAddToCart } = useProductActions({
        product,
        currentVariant,
        initialQuantity: 1,
        skipInventoryValidation: true,
    });
    const isSpecificVariant = isProductVariant || Boolean(matchedVariant);
    const needsVariantSelection = !isSpecificVariant && requiresVariantSelection(product);

    // Variation values used for image group selection:
    // – for variant products returned directly by SCAPI, use the product's own variationValues
    // – for master products, use the matched variant's variationValues (or empty if not found)
    const variationValues = isProductVariant
        ? ((product.variationValues as Record<string, string> | undefined) ?? {})
        : ((matchedVariant?.variationValues as Record<string, string> | undefined) ?? {});

    // Display-friendly attribute name→value pairs (e.g. { Color: 'Blue', Size: 'M' })
    const displayVariationValues = isSpecificVariant
        ? getDisplayVariationValues(product.variationAttributes, variationValues)
        : {};

    // Resolve the correct product image for this variant
    const imageGroup = findImageGroupBy(product.imageGroups ?? [], {
        viewType: 'small',
        selectedVariationAttributes: variationValues,
    });
    const image = imageGroup?.images?.[0];
    const optimizedImageUrl = toImageUrl({ image, config });

    // PDP link — navigates to the master product; includes variation params when a specific
    // variant is known (either a variant product or a matched variant) so the PDP pre-selects
    // the right attributes on arrival. variationValues is already resolved for both cases above.
    const masterId = product.master?.masterId ?? (product.id as string | undefined);
    let pdpUrl = createProductUrl(masterId);
    if (isSpecificVariant && Object.keys(variationValues).length > 0) {
        const params = new URLSearchParams(variationValues);
        pdpUrl = `${pdpUrl}?${params.toString()}`;
    }

    // Handle remove action response
    useEffect(() => {
        if (removeFetcher.state === 'idle' && removeFetcher.data && !hasHandledRemoveResponse.current) {
            const result = removeFetcher.data;
            if (result?.success) {
                hasHandledRemoveResponse.current = true;
                addToast(t('removedFromWishlist'), 'success');
                if (wishlistItem.id) {
                    onRemove(wishlistItem.id);
                }
            } else if (result?.success === false || result?.error) {
                hasHandledRemoveResponse.current = true;
                addToast(result.error ?? t('failedToRemoveFromWishlist'), 'error');
            }
        }
        if (removeFetcher.state === 'submitting') {
            hasHandledRemoveResponse.current = false;
        }
    }, [removeFetcher.state, removeFetcher.data, addToast, onRemove, wishlistItem.id, t]);

    const handleRemove = () => {
        if (removeFetcher.state !== 'idle' || !wishlistItem.id) return;
        void removeFetcher.submit({ itemId: wishlistItem.id }, { method: 'POST', action: '/action/wishlist-remove' });
    };

    const isRemoving = removeFetcher.state !== 'idle';

    return (
        <div data-testid={`wishlist-item-${wishlistItem.id}`}>
            <div className="flex gap-4 p-4 border border-border rounded-lg bg-card">
                {/* Product Image */}
                <Link to={pdpUrl} className="flex-shrink-0 self-start" aria-label={product.name}>
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded overflow-hidden bg-muted flex items-center justify-center">
                        {optimizedImageUrl ? (
                            <img
                                src={optimizedImageUrl}
                                alt={image?.alt ?? product.name ?? ''}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="w-full h-full bg-muted" />
                        )}
                    </div>
                </Link>

                {/* Product Details */}
                <div className="flex flex-1 flex-col md:flex-row gap-4 min-w-0">
                    {/* Name + Variants + Stock + Remove */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <Link
                            to={pdpUrl}
                            className="text-base font-medium text-foreground hover:text-primary line-clamp-2 block">
                            {product.name}
                        </Link>

                        {/* Variant Attributes */}
                        {isSpecificVariant && Object.keys(displayVariationValues).length > 0 && (
                            <div className="text-sm text-muted-foreground space-y-0.5">
                                {Object.entries(displayVariationValues).map(([name, value]) => (
                                    <div key={name}>
                                        {name}: {value}
                                    </div>
                                ))}
                            </div>
                        )}
                        {needsVariantSelection && product.variationAttributes && (
                            <div className="text-sm space-y-0.5">
                                {product.variationAttributes.map((attr) => (
                                    <div key={attr.id} className="text-warning">
                                        {attr.name}: {t('selectVariantPlaceholder')}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Stock Status */}
                        <InventoryMessage
                            product={product}
                            currentVariant={matchedVariant ?? null}
                            className="text-xs px-2 py-0.5"
                        />

                        {/* Remove button */}
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={isRemoving}
                            className="block text-sm text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2 cursor-pointer"
                            aria-label={t('removeFromWishlist')}>
                            {t('remove')}
                        </button>
                    </div>

                    {/* Price */}
                    <div className="flex flex-col gap-2 flex-shrink-0 md:items-end md:text-right">
                        <ProductPrice type="unit" product={product} currency={currency} />
                        {canAddToCart ? (
                            <Button
                                onClick={() => void handleAddToCart()}
                                disabled={isAddingToOrUpdatingCart}
                                size="sm"
                                variant="default"
                                className="w-full md:w-auto md:min-w-28">
                                {isAddingToOrUpdatingCart ? t('addingToCart') : t('addToCart')}
                            </Button>
                        ) : needsVariantSelection ? (
                            <Button asChild size="sm" variant="outline" className="w-full md:w-auto md:min-w-28">
                                <Link to={pdpUrl}>{t('selectOptions')}</Link>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WishlistListItem;
