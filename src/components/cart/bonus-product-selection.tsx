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

import { type ReactElement, useMemo, useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useToast } from '@/components/toast';
import { getBonusProductCountsForPromotion } from '@/lib/bonus-product-utils';
import { requiresVariantSelection, getPrimaryProductImageUrl, isRuleBasedPromotion } from '@/lib/product-utils';
import { useRuleBasedBonusProducts } from '@/hooks/use-rule-based-bonus-products';
import { useConfig } from '@/config/get-config';
import { toImageUrl } from '@/lib/dynamic-image';

interface BonusProductSelectionProps {
    bonusDiscountLineItem: ShopperBasketsV2.schemas['BonusDiscountLineItem'];
    bonusProductsById: Record<string, ShopperProducts.schemas['Product']>;
    basket: ShopperBasketsV2.schemas['Basket'];
    promotionName?: string;
    onProductSelect: (productId: string, productName: string, requiresModal: boolean) => void;
}

const BADGE_TEXT = 'Free';

export default function BonusProductSelection({
    bonusDiscountLineItem,
    bonusProductsById,
    basket,
    promotionName,
    onProductSelect,
}: BonusProductSelectionProps): ReactElement {
    const addToCartFetcher = useFetcher();
    const { addToast } = useToast();
    const { t } = useTranslation();
    const config = useConfig();

    // Track processed fetcher data to prevent duplicate toasts
    const processedDataRef = useRef<typeof addToCartFetcher.data>(null);

    // Check if this is a rule-based promotion
    const isRuleBased = isRuleBasedPromotion(bonusDiscountLineItem);

    // Fetch rule-based products if needed
    const { products: ruleBasedProducts } = useRuleBasedBonusProducts(
        isRuleBased && bonusDiscountLineItem.promotionId ? [bonusDiscountLineItem.promotionId] : [],
        {
            enabled: isRuleBased,
            limit: config.pages.cart.ruleBasedProductLimit,
        }
    );

    // Calculate selection counts
    const { selectedBonusItems, maxBonusItems } = getBonusProductCountsForPromotion(
        basket,
        bonusDiscountLineItem.promotionId || ''
    );

    // Build title
    const titleText = promotionName || 'Bonus Products Available';
    const titleSuffix = ` (${selectedBonusItems} of ${maxBonusItems} added to cart)`;

    // Determine if accordion should be expanded by default
    // Expand if there are still bonus products the shopper can select
    const shouldExpandByDefault = selectedBonusItems < maxBonusItems;

    // Get bonus products with full data
    const bonusProducts = useMemo(() => {
        //list-based products
        const listBasedProducts =
            bonusDiscountLineItem.bonusProducts
                ?.map((productLink) => {
                    const product = bonusProductsById[productLink.productId];
                    if (!product) return null;

                    return {
                        productId: productLink.productId,
                        productName: productLink.productName || product.name || 'Product',
                        imageUrl: getPrimaryProductImageUrl(product, 'large', product.variationValues),
                        product,
                    };
                })
                .filter((item): item is NonNullable<typeof item> => item !== null) || [];

        //rule-based products
        const ruleBasedProductsList =
            isRuleBased && ruleBasedProducts
                ? ruleBasedProducts
                      .filter((product) => product.productId || product.id)
                      .map((product) => {
                          const productId = (product.productId || product.id || '') as string;
                          return {
                              productId,
                              productName: product.productName || 'Product',
                              imageUrl: product.image?.disBaseLink ?? product.image?.link ?? '',
                              product: product as unknown as ShopperProducts.schemas['Product'],
                          };
                      })
                : [];

        // Merge list-based and rule-based products
        const allProducts = [...listBasedProducts, ...ruleBasedProductsList];

        // Deduplicate by productId
        return allProducts.filter(
            (product, index, self) => index === self.findIndex((p) => p.productId === product.productId)
        );
    }, [isRuleBased, ruleBasedProducts, bonusDiscountLineItem.bonusProducts, bonusProductsById]);

    // Handle direct add-to-cart result
    // Only process new responses to prevent duplicate toasts on re-renders
    useEffect(() => {
        if (addToCartFetcher.state === 'idle' && addToCartFetcher.data) {
            // Only process if this is new data we haven't seen before
            if (processedDataRef.current !== addToCartFetcher.data) {
                processedDataRef.current = addToCartFetcher.data;

                if (addToCartFetcher.data.success) {
                    addToast(t('product:bonusProducts.addedToCart'), 'success');
                } else {
                    addToast(
                        t('product:bonusProducts.failedToAdd', {
                            error: addToCartFetcher.data.error || t('product:unknownError'),
                        }),
                        'error'
                    );
                }
            }
        }
    }, [addToCartFetcher.state, addToCartFetcher.data, addToast, t]);

    const handleSelectProduct = (
        productId: string,
        productName: string,
        product: ShopperProducts.schemas['Product']
    ) => {
        const needsModal = requiresVariantSelection(product);

        if (needsModal) {
            // Open modal for variant selection
            onProductSelect(productId, productName, true);
        } else {
            // Validate required IDs before submission
            if (!bonusDiscountLineItem.id || !bonusDiscountLineItem.promotionId) {
                addToast(
                    t('product:bonusProducts.failedToAdd', {
                        error: t('product:bonusProducts.missingRequiredInfo'),
                    }),
                    'error'
                );
                return;
            }

            // Direct add to cart for standard products
            const bonusItems = [
                {
                    productId,
                    quantity: 1,
                    bonusDiscountLineItemId: bonusDiscountLineItem.id,
                    promotionId: bonusDiscountLineItem.promotionId,
                },
            ];

            const formData = new FormData();
            formData.append('bonusItems', JSON.stringify(bonusItems));

            void addToCartFetcher.submit(formData, {
                method: 'POST',
                action: '/action/bonus-product-add',
            });
        }
    };

    return (
        <section aria-label="Bonus Product Bundle" className="w-full" data-node-id="16247:74507">
            <Accordion
                type="single"
                collapsible
                defaultValue={shouldExpandByDefault ? 'bonus-selection' : undefined}
                className="w-full">
                <AccordionItem value="bonus-selection" className="border-none">
                    <AccordionTrigger className="text-left hover:no-underline py-4 justify-start items-center gap-1.5">
                        <span className="text-base leading-tight text-foreground">
                            <span className="font-bold">{titleText}</span>
                            <span className="font-normal">{titleSuffix}</span>
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pt-4">
                        <Carousel className="w-full">
                            <CarouselContent className="-ml-2 justify-start">
                                {bonusProducts.map((item) => (
                                    <CarouselItem key={item.productId} className="basis-52 pl-2">
                                        <article
                                            className="bg-[var(--bg-input-30)] border border-border rounded-lg w-full shadow-sm h-full flex flex-col"
                                            aria-label="Bonus bundle product card">
                                            {/* Image */}
                                            <div className="px-6 py-4">
                                                <div className="bg-background border border-border rounded-xl overflow-hidden">
                                                    <div className="h-36 w-full relative">
                                                        {item.imageUrl ? (
                                                            <img
                                                                src={
                                                                    toImageUrl({ src: item.imageUrl, config }) ??
                                                                    item.imageUrl
                                                                }
                                                                alt=""
                                                                role="presentation"
                                                                loading="lazy"
                                                                className="absolute inset-0 h-full w-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                                                <span className="text-muted-foreground text-sm">
                                                                    No image
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Header with product name and badge - fixed height with line clamp */}
                                            <div className="px-6 pt-0 pb-4 flex items-start justify-between gap-1.5 min-h-[4rem]">
                                                <p className="text-lg font-semibold leading-tight text-card-foreground line-clamp-2">
                                                    {item.productName}
                                                </p>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <Badge className="bg-primary text-primary-foreground font-semibold">
                                                        {BADGE_TEXT}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Footer with select button - pushed to bottom */}
                                            <div className="px-6 pb-4 mt-auto">
                                                <Button
                                                    className="w-full h-9 shadow-sm"
                                                    onClick={() =>
                                                        handleSelectProduct(
                                                            item.productId,
                                                            item.productName,
                                                            item.product
                                                        )
                                                    }
                                                    disabled={
                                                        addToCartFetcher.state === 'submitting' ||
                                                        selectedBonusItems >= maxBonusItems
                                                    }>
                                                    {addToCartFetcher.state === 'submitting' ? 'Adding...' : 'Select'}
                                                </Button>
                                            </div>
                                        </article>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="left-0" />
                            <CarouselNext className="right-0" />
                        </Carousel>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </section>
    );
}
