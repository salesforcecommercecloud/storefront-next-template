/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Typography } from '@/components/typography';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/currency';

interface ListPriceProps {
    labelForA11y?: string;
    price: number;
    as?: 'span' | 'div' | 'p';
    isRange?: boolean;
    currency: string;
    className?: string;
}

/**
 * Component that displays list price of a product with a11y
 * @param currency - currency
 * @param price - price of the product
 * @param as - an HTML tag or component to be rendered as
 * @param isRange - show price as range or not
 * @param labelForA11y - label to be used for a11y
 * @param className - additional CSS classes
 * @returns {JSX.Element}
 */
export default function ListPrice({
    labelForA11y,
    price,
    isRange = false,
    as = 'span',
    currency,
    className,
}: ListPriceProps) {
    const { t, i18n } = useTranslation('product');

    // Format currency using i18next's current language
    const listPriceText = formatCurrency(price, i18n.language, currency);

    const ariaLabel = isRange
        ? t('price.listPriceFrom', { price: listPriceText })
        : t('price.listPrice', { price: listPriceText });

    return (
        <>
            <Typography
                as={as}
                className={`text-muted-foreground line-through ${className || ''}`}
                aria-label={ariaLabel}>
                {listPriceText}
            </Typography>
            {/*For screen reader, we want to make sure the product name is announced before the price to avoid confusion*/}
            <span className="sr-only" aria-live="polite" aria-atomic={true}>
                {labelForA11y}
                {t('price.listPrice', { price: listPriceText })}
            </span>
        </>
    );
}
