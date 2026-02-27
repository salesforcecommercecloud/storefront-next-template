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

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from '@/components/typography';
import type { ReturnsAndWarrantyData } from '@/lib/adapters/product-content-data-types';

/**
 * Renders returns & warranty modal content.
 * Receives the adapter data directly from ProductContentAdapter.getReturnsAndWarranty().
 * Layout: Returns Policy, Warranty, Exchanges, Need Help.
 */
export function ReturnsAndWarrantyModalContent({
    returnsAndWarrantyData,
}: {
    returnsAndWarrantyData: ReturnsAndWarrantyData;
}): ReactElement {
    const { t } = useTranslation('returnsAndWarranty');
    const { returnsPolicy, warranty, exchanges, needHelp } = returnsAndWarrantyData;

    return (
        <>
            {/* Returns Policy */}
            <div>
                <Typography variant="h5" as="h3" className="mb-3 font-medium">
                    {returnsPolicy.heading}
                </Typography>
                <div className="space-y-3 text-sm text-foreground">
                    <Typography as="p" className="text-sm leading-relaxed">
                        {returnsPolicy.intro}
                    </Typography>
                    {returnsPolicy.conditions.length > 0 && (
                        <div className="rounded-lg bg-muted p-4 space-y-2">
                            <Typography as="p" className="font-medium text-foreground">
                                {t('returnConditions')}
                            </Typography>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {returnsPolicy.conditions.map((condition) => (
                                    <li key={condition}>
                                        <Typography as="span" className="text-sm">
                                            {condition}
                                        </Typography>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {returnsPolicy.howToReturn.length > 0 && (
                        <div>
                            <Typography as="p" className="mb-2 font-medium text-foreground">
                                {t('howToReturn')}
                            </Typography>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                {returnsPolicy.howToReturn.map((step) => (
                                    <li key={step}>
                                        <Typography as="span" className="text-sm">
                                            {step}
                                        </Typography>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {returnsPolicy.note && (
                        <Typography as="p" variant="muted" className="text-xs">
                            <span className="font-medium">{t('note')}</span> {returnsPolicy.note}
                        </Typography>
                    )}
                </div>
            </div>

            {/* Warranty */}
            <div>
                <Typography variant="h5" as="h3" className="mb-3 font-medium">
                    {warranty.heading}
                </Typography>
                <div className="space-y-3 text-sm text-foreground">
                    <Typography as="p" className="text-sm leading-relaxed">
                        {warranty.intro}
                    </Typography>
                    {warranty.whatsCovered.length > 0 && (
                        <div className="rounded-lg bg-muted p-4 space-y-2">
                            <Typography as="p" className="font-medium text-foreground">
                                {t('whatsCovered')}
                            </Typography>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {warranty.whatsCovered.map((item) => (
                                    <li key={item}>
                                        <Typography as="span" className="text-sm">
                                            {item}
                                        </Typography>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {warranty.whatsNotCovered.length > 0 && (
                        <div>
                            <Typography as="p" className="mb-2 font-medium text-foreground">
                                {t('whatsNotCovered')}
                            </Typography>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {warranty.whatsNotCovered.map((item) => (
                                    <li key={item}>
                                        <Typography as="span" className="text-sm">
                                            {item}
                                        </Typography>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div>
                        <Typography as="p" className="mb-2 font-medium text-foreground">
                            {t('warrantyClaims')}
                        </Typography>
                        <Typography as="p" className="text-sm leading-relaxed">
                            {warranty.claimsProcess}
                        </Typography>
                    </div>
                </div>
            </div>

            {/* Exchanges */}
            <div>
                <Typography variant="h5" as="h3" className="mb-3 font-medium">
                    {exchanges.heading}
                </Typography>
                <div className="space-y-2 text-sm text-foreground">
                    <Typography as="p" className="text-sm leading-relaxed">
                        {exchanges.intro}
                    </Typography>
                    <Typography as="p" className="text-sm leading-relaxed">
                        <span className="font-medium text-foreground">{t('exchangeProcess')}</span> {exchanges.process}
                    </Typography>
                </div>
            </div>

            {/* Need Help */}
            {needHelp && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <Typography as="p" className="mb-2 text-sm font-medium text-foreground">
                        {t('needHelp')}
                    </Typography>
                    <Typography as="p" className="text-sm text-foreground">
                        {needHelp.intro} {t('contactAt')}{' '}
                        <a href={`mailto:${needHelp.email}`} className="text-primary hover:underline">
                            {needHelp.email}
                        </a>{' '}
                        {t('orCall')}{' '}
                        <a
                            href={`tel:${needHelp.phone.replace(/[^+\d]/g, '')}`}
                            className="text-primary hover:underline">
                            {needHelp.phone}
                        </a>
                        .
                    </Typography>
                </div>
            )}
        </>
    );
}
