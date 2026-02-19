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

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import type {
    ShopperBasketsV2,
    ShopperOrders,
    ShopperProducts,
    ShopperSearch,
} from '@salesforce/storefront-next-runtime/scapi';
import CurrentPrice from './current-price';
import ListPrice from './list-price';
import PromoCallout from './promo-callout';
import { getPriceData } from './utils';

type Product =
    | ShopperProducts.schemas['Product']
    | (ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>)
    | (ShopperOrders.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>)
    | ShopperSearch.schemas['ProductSearchHit'];

interface ProductPriceProps {
    labelForA11y?: string;
    product: Product;
    currency: string;
    quantity?: number;
    currentPriceProps?: Omit<ComponentProps<typeof CurrentPrice>, 'price' | 'currency' | 'labelForA11y'>;
    listPriceProps?: Omit<ComponentProps<typeof ListPrice>, 'price' | 'currency' | 'labelForA11y'>;
    promoCalloutProps?: Omit<ComponentProps<typeof PromoCallout>, 'product'>;
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
 * @param promoCalloutProps - extra props to be passing to PromoCallout component (className overrides default)
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
    promoCalloutProps = {},
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
                <PromoCallout
                    product={product}
                    {...promoCalloutProps}
                    className={cn(className, promoCalloutProps?.className)}
                />
            </>
        );
    }

    if (isMaster) {
        return (
            <>
                <div className={cn('items-center gap-2', className)}>{renderPriceSet(isRange ?? false)}</div>
                <PromoCallout
                    product={product}
                    {...promoCalloutProps}
                    className={cn(className, promoCalloutProps?.className)}
                />
            </>
        );
    }

    return (
        <>
            <div className={cn('items-center gap-2', className)}>{renderPriceSet(isRange ?? false)}</div>
            <PromoCallout
                product={product}
                {...promoCalloutProps}
                className={cn(className, promoCalloutProps?.className)}
            />
        </>
    );
}
