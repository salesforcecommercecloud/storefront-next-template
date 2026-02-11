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

import { type ReactElement, useState, useEffect, lazy, Suspense } from 'react';
import type { InfoModalData } from '@/components/info-modal/types';
import { useProductContent } from '@/hooks/product-content/use-product-content';
import type { BuyNowPayLaterMessageData, BuyNowPayLaterLearnMoreData } from '@/lib/adapters/product-content-data-types';

const InfoModal = lazy(() => import('@/components/info-modal'));

/**
 * Maps adapter learn-more data to InfoModalData for payment-schedule modal type.
 */
function mapLearnMoreToInfoModalData(learnMore: BuyNowPayLaterLearnMoreData): InfoModalData {
    const { paymentSchedule: schedule } = learnMore;
    const totalAmount = schedule.totalAmount ?? schedule.amountPerPayment * schedule.schedule.length;
    return {
        type: 'payment-schedule',
        title: learnMore.title,
        description: learnMore.summary,
        paymentSchedule: {
            totalAmount,
            numberOfPayments: schedule.schedule.length,
            payments: schedule.schedule.map((dueDate) => ({
                amount: schedule.amountPerPayment,
                dueDate,
            })),
        },
        steps: learnMore.howItWorks.map((text, i) => ({ number: i + 1, text })),
        disclaimer: learnMore.disclosures,
    };
}

export interface BuyNowPayLaterProps {
    /** Optional product ID for adapter lookups (e.g. from PDP) */
    productId?: string;
}

/**
 * BuyNowPayLater component displays buy now pay later installment information.
 *
 * Message and "Learn more" modal content are loaded from the product content adapter.
 * Modal type is payment-schedule, which renders PaymentScheduleModalContent (no provider logo).
 *
 * This is the default fallback component that displays when no custom extension
 * is registered for the target. Customers can override this by registering
 * their own component via the target system.
 *
 * @returns ReactElement
 */
export default function BuyNowPayLater({ productId }: BuyNowPayLaterProps = {}): ReactElement {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [messageData, setMessageData] = useState<BuyNowPayLaterMessageData | null>(null);
    const [modalData, setModalData] = useState<InfoModalData | undefined>(undefined);

    const { adapter, isEnabled } = useProductContent();

    useEffect(() => {
        if (!isEnabled || !adapter) return;
        if (!adapter.getBuyNowPayLaterMessageContent || !adapter.getBuyNowPayLaterLearnMoreContent) return;
        const msgPromise = adapter.getBuyNowPayLaterMessageContent(productId);
        const learnPromise = adapter.getBuyNowPayLaterLearnMoreContent(productId);
        let cancelled = false;
        void (async () => {
            try {
                const [msg, learnMore] = await Promise.all([msgPromise, learnPromise]);
                if (cancelled || msg == null || learnMore == null) return;
                setMessageData(msg);
                setModalData(mapLearnMoreToInfoModalData(learnMore));
            } catch {
                if (!cancelled) {
                    setMessageData(null);
                    setModalData(undefined);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [adapter, isEnabled, productId]);

    const handleLearnMoreClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsModalOpen(true);
    };

    const paymentCount = messageData?.paymentCount ?? 4;
    const amountPerPayment = messageData?.amountPerPayment ?? 12.25;
    const learnMoreLabel = messageData?.learnMoreLabel ?? 'Learn more';

    return (
        <>
            <div className="text-sm text-muted-foreground">
                <span>
                    Pay in {paymentCount} interest-free payments of{' '}
                    <span className="font-bold text-foreground">${amountPerPayment.toFixed(2)}</span>.{' '}
                </span>
                <button
                    type="button"
                    onClick={handleLearnMoreClick}
                    className="cursor-pointer font-normal text-primary hover:underline">
                    {learnMoreLabel}
                </button>
            </div>
            {isModalOpen && (
                <Suspense fallback={null}>
                    <InfoModal open={isModalOpen} onOpenChange={setIsModalOpen} data={modalData} />
                </Suspense>
            )}
        </>
    );
}
