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
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import type { InfoModalData } from '@/components/info-modal/types';
import type { ReturnsAndWarrantyData } from '@/lib/adapters/product-content-data-types';
import { useProductContent } from '@/hooks/product-content/use-product-content';
import ProductInfoCard from '@/components/product-info-card';

const InfoModal = lazy(() => import('@/components/info-modal'));

/**
 * Maps adapter data to InfoModalData for returns-and-warranty modal type.
 */
function mapToInfoModalData(data: ReturnsAndWarrantyData): InfoModalData {
    return {
        type: 'returns-and-warranty',
        title: data.title,
        returnsAndWarrantyData: data,
    };
}

export interface ReturnsAndWarrantyProps {
    /** Optional product ID for adapter lookups */
    productId?: string;
}

/**
 * ReturnsAndWarranty component displays a returns & warranty info card on PDP.
 *
 * Card content and "Learn More" modal content are loaded from the product content adapter
 * via `getReturnsAndWarranty`. Clicking "Learn More" opens the InfoModal with
 * returns policy, warranty, and exchanges details.
 *
 * @returns ReactElement
 */
export default function ReturnsAndWarranty({ productId }: ReturnsAndWarrantyProps): ReactElement {
    const { t } = useTranslation('returnsAndWarranty');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [returnsData, setReturnsData] = useState<ReturnsAndWarrantyData | null>(null);
    const modalData = returnsData ? mapToInfoModalData(returnsData) : undefined;

    const { adapter, isEnabled } = useProductContent();

    useEffect(() => {
        if (!isEnabled || !adapter) return;
        if (!adapter.getReturnsAndWarranty) return;
        const getReturnsAndWarranty = adapter.getReturnsAndWarranty.bind(adapter);
        let cancelled = false;
        void (async () => {
            try {
                const data = await getReturnsAndWarranty(productId);
                if (cancelled || data == null) return;
                setReturnsData(data);
            } catch {
                if (!cancelled) {
                    setReturnsData(null);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [adapter, isEnabled, productId]);

    if (!returnsData) {
        return <></>;
    }

    return (
        <>
            <div className="mt-4">
                <ProductInfoCard
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title={returnsData.title}
                    description={returnsData.description}
                    action={{
                        label: t('learnMore'),
                        onClick: () => setIsModalOpen(true),
                    }}
                />
            </div>
            {isModalOpen && (
                <Suspense fallback={null}>
                    <InfoModal open={isModalOpen} onOpenChange={setIsModalOpen} data={modalData} />
                </Suspense>
            )}
        </>
    );
}
