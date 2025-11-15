/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ReactElement } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import uiStrings from '@/temp-ui-string';

interface ProductAccordionProps {
    product: ShopperProducts.schemas['Product'];
}

export default function ProductAccordion({ product }: ProductAccordionProps): ReactElement {
    return (
        <div className="max-w-4xl">
            <Accordion type="multiple" className="w-full">
                {/* Product Details */}
                <AccordionItem value="details">
                    <AccordionTrigger className="text-left font-semibold text-lg">
                        {uiStrings.product.productDetails}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-4 text-muted-foreground">
                            {product.longDescription ? (
                                <div className="prose prose-sm max-w-none">{product.longDescription}</div>
                            ) : (
                                <p>{product.shortDescription || uiStrings.product.noDetailedDescription}</p>
                            )}

                            {/* Additional product attributes */}
                            {product.brand && (
                                <div>
                                    <strong>{uiStrings.product.brand}</strong> {product.brand}
                                </div>
                            )}

                            {product.manufacturerName && (
                                <div>
                                    <strong>{uiStrings.product.manufacturer}</strong> {product.manufacturerName}
                                </div>
                            )}

                            {product.manufacturerSku && (
                                <div>
                                    <strong>{uiStrings.product.sku}</strong> {product.manufacturerSku}
                                </div>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Size & Fit */}
                <AccordionItem value="size-fit">
                    <AccordionTrigger className="text-left font-semibold text-lg">
                        {uiStrings.product.sizeAndFit}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="text-muted-foreground">
                            <p>{uiStrings.product.sizeAndFitComingSoon}</p>
                            {/* Future: Add size chart, fit guide, etc. */}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Shipping & Returns */}
                <AccordionItem value="shipping">
                    <AccordionTrigger className="text-left font-semibold text-lg">
                        {uiStrings.product.shippingAndReturns}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="text-muted-foreground space-y-2">
                            <p>
                                <strong>{uiStrings.product.freeShipping}</strong>
                            </p>
                            <p>
                                <strong>{uiStrings.product.standardShipping}</strong>
                            </p>
                            <p>
                                <strong>{uiStrings.product.expressShipping}</strong>
                            </p>
                            <p>
                                <strong>{uiStrings.product.returns}</strong>
                            </p>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Reviews */}
                <AccordionItem value="reviews">
                    <AccordionTrigger className="text-left font-semibold text-lg">
                        {uiStrings.product.reviews}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="text-muted-foreground">
                            <p>{uiStrings.product.reviewsComingSoon}</p>
                            {/* Future: Add review system integration */}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Care Instructions */}
                {product.type?.item && (
                    <AccordionItem value="care">
                        <AccordionTrigger className="text-left font-semibold text-lg">
                            {uiStrings.product.careInstructions}
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="text-muted-foreground">
                                <p>{uiStrings.product.careInstructionsComingSoon}</p>
                                {/* Future: Add care instruction details */}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}
            </Accordion>
        </div>
    );
}
