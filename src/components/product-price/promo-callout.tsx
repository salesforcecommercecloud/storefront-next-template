/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { useMemo } from 'react';
import { findLowestPrice } from './utils';
import type { ShopperProductsTypes, ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { cn } from '@/lib/utils';

type Product = ShopperProductsTypes.Product | ShopperSearchTypes.ProductSearchHit;

/**
 * Component that calls out the promo message for a product
 * @param product - product object
 * @returns {JSX.Element}
 */
export default function PromoCallout({ product, className }: { product: Product; className?: string }) {
    const lowestPriceResult = useMemo(() => findLowestPrice(product), [product]);

    // NOTE: API inconsistency - with getProduct call, a variant does not have productPromotions
    const promos = lowestPriceResult?.data?.productPromotions ?? product?.productPromotions ?? [];
    const promo = lowestPriceResult?.promotion ?? promos[0];

    if (!promo?.calloutMsg) {
        return null;
    }

    // Safely get the callout message as a string
    const calloutMsg = String(promo.calloutMsg || '');

    return (
        <div className={cn('items-center gap-2', className)}>
            {/* BM content is trusted, safe to render HTML. Works for both plain text and HTML strings */}
            {/* eslint-disable-next-line react/no-danger */}
            <span dangerouslySetInnerHTML={{ __html: calloutMsg }} />
        </div>
    );
}
