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
import { type ReactElement, useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import type { InfoModalData } from '@/components/info-modal/types';
import type { EstimatedDeliveryData } from '@/lib/adapters/product-content-data-types';
import { useProductContent } from '@/hooks/product-content/use-product-content';
import ProductInfoCard from '@/components/product-info-card';

const InfoModal = lazy(() => import('@/components/info-modal'));

/**
 * Maps adapter data to InfoModalData for estimated-delivery modal type.
 */
function mapToInfoModalData(data: EstimatedDeliveryData): InfoModalData {
    return {
        type: 'estimated-delivery',
        title: data.title,
        deliveryData: data,
    };
}

export interface EstimatedDeliveryProps {
    /** Optional product ID for adapter lookups */
    productId?: string;
}

/**
 * EstimatedDelivery component displays an estimated delivery info card on PDP.
 *
 * Card content and "Learn More" modal content are loaded from the product content adapter
 * via `getEstimatedDelivery`. Clicking "Learn More" opens the InfoModal with
 * fulfillment & shipping details.
 *
 * @returns ReactElement
 */
export default function EstimatedDelivery({ productId }: EstimatedDeliveryProps): ReactElement | null {
    const { t } = useTranslation('estimatedDelivery');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deliveryData, setDeliveryData] = useState<EstimatedDeliveryData | null>(null);
    const modalData = deliveryData ? mapToInfoModalData(deliveryData) : undefined;

    const { adapter, isEnabled } = useProductContent();

    useEffect(() => {
        if (!isEnabled || !adapter) return;
        if (!adapter.getEstimatedDelivery) return;
        const getEstimatedDelivery = adapter.getEstimatedDelivery.bind(adapter);
        let cancelled = false;
        void (async () => {
            try {
                const data = await getEstimatedDelivery(productId);
                if (cancelled || data == null) return;
                setDeliveryData(data);
            } catch {
                if (!cancelled) {
                    setDeliveryData(null);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [adapter, isEnabled, productId]);

    if (!deliveryData) {
        return null;
    }

    const firstOption = deliveryData.estimatedDelivery.options[0];
    const cardDescription = firstOption
        ? `${firstOption.deliveryTime} \u00B7 ${t('cardDescription')}`
        : t('cardDescription');

    return (
        <>
            <div className="mt-4">
                <ProductInfoCard
                    icon={<CalendarDays className="h-5 w-5" />}
                    title={t('cardTitle')}
                    description={cardDescription}
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
