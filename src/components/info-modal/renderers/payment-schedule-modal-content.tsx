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
import { Link } from 'react-router';
import { formatCurrency } from '@/lib/currency';
import { Typography } from '@/components/typography';
import type { PaymentSchedule, StepInfo, ModalLink } from '../types';

/**
 * Renders payment schedule modal content (e.g., "Pay in 4")
 */
export function PaymentScheduleModalContent({
    paymentSchedule,
    steps,
    disclaimer,
    links,
    currency,
}: {
    paymentSchedule?: PaymentSchedule;
    steps?: StepInfo[];
    disclaimer?: string;
    links?: ModalLink[];
    currency: string;
}): ReactElement {
    return (
        <>
            {paymentSchedule && (
                <div className="my-6">
                    <div className="flex items-center justify-between mb-4">
                        {paymentSchedule.payments.map((payment, index) => (
                            <div
                                key={`payment-${payment.amount}-${payment.dueDate}`}
                                className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-3 h-3 rounded-full mb-2 ${index === 0 ? 'bg-primary' : 'bg-muted'}`}
                                />
                                <div className="text-sm font-semibold">
                                    {formatCurrency(payment.amount, 'en-US', currency)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{payment.dueDate}</div>
                            </div>
                        ))}
                    </div>
                    {/* Connecting line */}
                    <div className="flex items-center -mt-6 mb-4">
                        {paymentSchedule.payments.map((payment, index) => (
                            <div
                                key={`connector-${payment.amount}-${payment.dueDate}`}
                                className="flex-1 flex items-center">
                                {index < paymentSchedule.payments.length - 1 && (
                                    <div className="flex-1 border-t-2 border-dashed border-border" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {steps && (
                <div className="my-6">
                    <Typography variant="h3" className="mb-4">
                        How it works
                    </Typography>
                    <ol className="space-y-3">
                        {steps.map((step) => (
                            <li key={step.number} className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                                    {step.number}
                                </span>
                                <span className="text-sm">{step.text}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {disclaimer && <div className="my-6 text-xs text-muted-foreground">{disclaimer}</div>}

            {links && links.length > 0 && (
                <div className="my-6 space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.url}
                            to={link.url}
                            target={link.openInNewTab ? '_blank' : undefined}
                            rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                            className="text-primary hover:underline text-sm block">
                            {link.text}
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}
