/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import CurrentPrice from './current-price';
import ListPrice from './list-price';
import PromoCallout from './promo-callout';
import { getPriceData } from './utils';

type Product = ShopperProducts.schemas['Product'] | ShopperSearch.schemas['ProductSearchHit'];

interface ProductPriceProps {
    labelForA11y?: string;
    product: Product;
    currency: string;
    quantity?: number;
    currentPriceProps?: Omit<ComponentProps<typeof CurrentPrice>, 'price' | 'currency' | 'labelForA11y'>;
    listPriceProps?: Omit<ComponentProps<typeof ListPrice>, 'price' | 'currency' | 'labelForA11y'>;
    type?: 'unit' | 'total';
    className?: string;
}

/**
 * @param product - product object containing price information
 * // If a product is a set,
 *      on PDP, Show From X where X is the lowest of its children and
 *          the set children will have it own price as From X (cross) Y
 * // if a product is a master
 *      on PDP, show From X (cross) Y , the X and Y are
 *          current and list price of variant that has the lowest price (including promotionalPrice)
 * // if a standard/bundle
 *      show price on PDP as X (cross) Y
 * @param currency - currency
 * @param quantity - quantity to take into the account for price display
 * @param currentPriceProps - extra props to be passing to CurrentPrice component
 * @param listPriceProps - extra props to be passing to ListPrice component
 * @param type - type of price to display. 'unit' for unit price, 'total' for total price (unit price * quantity).
 * @param labelForA11y - label to be used for a11y
 */
export default function ProductPrice({
    labelForA11y,
    product,
    currency,
    quantity = 1,
    type = 'total',
    currentPriceProps = {},
    listPriceProps = {},
    className,
}: ProductPriceProps) {
    const priceData = getPriceData(product, { quantity });
    const { listPrice, currentPrice, isASet, isMaster, isOnSale, isRange } = priceData;

    const renderCurrentPrice = (flag: boolean) => (
        <CurrentPrice
            labelForA11y={labelForA11y}
            price={type === 'unit' ? currentPrice : currentPrice * quantity}
            as="span"
            currency={currency}
            isRange={flag}
            {...currentPriceProps}
        />
    );

    const renderListPrice = (flag: boolean) =>
        listPrice && (
            <ListPrice
                labelForA11y={labelForA11y}
                currency={currency}
                price={type === 'unit' ? listPrice : listPrice * quantity}
                isRange={flag}
                {...listPriceProps}
            />
        );

    const renderPriceSet = (flag: boolean) => (
        <>
            {renderCurrentPrice(flag)} {isOnSale && renderListPrice(flag)}
        </>
    );

    if (isASet) {
        return (
            <>
                <div className={cn('items-center gap-2', className)}>{renderCurrentPrice(true)}</div>
                <PromoCallout product={product} className={className} />
            </>
        );
    }

    if (isMaster) {
        return (
            <>
                <div className={cn('items-center gap-2', className)}>{renderPriceSet(isRange ?? false)}</div>
                <PromoCallout product={product} className={className} />
            </>
        );
    }

    return (
        <>
            <div className={cn('items-center gap-2', className)}>{renderPriceSet(isRange ?? false)}</div>
            <PromoCallout product={product} className={className} />
        </>
    );
}
