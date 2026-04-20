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
import { type ReactElement, useState, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InfoModalData, WriteReviewModalData } from '@/components/info-modal/types';
import type { WriteReviewFormData } from '@/lib/adapters/product-content-data-types';
import type { ProductContentAdapter } from '@/lib/adapters/product-content-types';
import { ProductProvider, useProduct } from '@/providers/product-context';
import { ProductReviewsProvider } from '@/providers/product-reviews-context';
import { useProductContent } from '@/hooks/product-content/use-product-content';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

const InfoModal = lazy(() => import('@/components/info-modal'));

/** Dedupe getWriteReviewForm across order lines that share the same productId. */
const writeReviewFormRequestByProductId = new Map<string, Promise<WriteReviewFormData | null>>();

type GetWriteReviewFormFn = NonNullable<ProductContentAdapter['getWriteReviewForm']>;

function fetchWriteReviewFormCached(
    getWriteReviewForm: GetWriteReviewFormFn,
    productId: string
): Promise<WriteReviewFormData | null> {
    const existing = writeReviewFormRequestByProductId.get(productId);
    if (existing) return existing;

    const request = getWriteReviewForm(productId)
        .then((config) => config)
        .catch(() => null)
        .then((config) => {
            if (config == null) {
                writeReviewFormRequestByProductId.delete(productId);
            }
            return config;
        });

    writeReviewFormRequestByProductId.set(productId, request);
    return request;
}

type OrderLineRateReviewInnerProps = {
    lineKey: string;
    reviewSubmitted: boolean;
    onLineReviewSubmitted: (lineKey: string) => void;
};

/**
 * Opens the PDP-parity write-review modal for one product. Must render inside
 * ProductProvider + ProductReviewsProvider + ProductContentProvider (ancestor).
 * Form config loads on first open only; requests for the same productId are deduped across lines.
 */
function OrderLineRateReviewInner({
    lineKey,
    reviewSubmitted,
    onLineReviewSubmitted,
}: OrderLineRateReviewInnerProps): ReactElement {
    const { t } = useTranslation('account');
    const [open, setOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formConfig, setFormConfig] = useState<WriteReviewFormData | null>(null);
    const product = useProduct();
    const { adapter } = useProductContent();
    const productId = product?.id;

    const handleOpenClick = async () => {
        if (adapter == null || adapter.getWriteReviewForm == null || productId == null) return;
        if (formConfig != null) {
            setOpen(true);
            return;
        }
        setFormLoading(true);
        try {
            const getForm = adapter.getWriteReviewForm.bind(adapter);
            const config = await fetchWriteReviewFormCached(getForm, productId);
            if (config != null) {
                setFormConfig(config);
                setOpen(true);
            }
        } finally {
            setFormLoading(false);
        }
    };

    const data: InfoModalData = {
        type: 'write-review',
        formConfig: formConfig ?? undefined,
        onAfterSubmit: () => {
            onLineReviewSubmitted(lineKey);
        },
    } satisfies WriteReviewModalData;

    if (reviewSubmitted) {
        return (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-positive">
                <Check className="size-4 shrink-0" aria-hidden />
                {t('orders.reviewSubmitted')}
            </span>
        );
    }

    return (
        <>
            <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm font-medium"
                disabled={formLoading}
                aria-busy={formLoading}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => void handleOpenClick()}
                data-testid="order-line-rate-review">
                {t('orders.rateAndReview')}
            </Button>
            {open && (
                <Suspense fallback={null}>
                    <InfoModal open={open} onOpenChange={setOpen} data={data} />
                </Suspense>
            )}
        </>
    );
}

export type OrderLineRateReviewProps = {
    product: ShopperProducts.schemas['Product'];
    lineKey: string;
    reviewSubmitted: boolean;
    onLineReviewSubmitted: (lineKey: string) => void;
};

export function OrderLineRateReview({
    product,
    lineKey,
    reviewSubmitted,
    onLineReviewSubmitted,
}: OrderLineRateReviewProps): ReactElement {
    return (
        <ProductProvider product={product}>
            <ProductReviewsProvider>
                <OrderLineRateReviewInner
                    lineKey={lineKey}
                    reviewSubmitted={reviewSubmitted}
                    onLineReviewSubmitted={onLineReviewSubmitted}
                />
            </ProductReviewsProvider>
        </ProductProvider>
    );
}
