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

import { type ReactElement, useState, useEffect, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import type { InfoModalData, WriteReviewModalData } from '@/components/info-modal/types';
import type { WriteReviewFormData } from '@/lib/adapters/product-content-data-types';
import { useProduct } from '@/providers/product-context';
import { useProductContent } from '@/hooks/product-content/use-product-content';

const InfoModal = lazy(() => import('@/components/info-modal'));

/**
 * Write a Review button that opens the write-review InfoModal.
 * Fetches form config from the product content adapter (e.g. getWriteReviewForm) and passes
 * it to the modal for labels, placeholders, and validation. Must be used within a PDP context
 * (ProductProvider + ProductContentProvider).
 */
export default function WriteReviewButton(): ReactElement {
    const [open, setOpen] = useState(false);
    const [formConfig, setFormConfig] = useState<WriteReviewFormData | null>(null);
    const product = useProduct();
    const { adapter } = useProductContent();
    const productId = product?.id;

    useEffect(() => {
        if (!adapter?.getWriteReviewForm || productId == null) return;
        let cancelled = false;
        adapter
            .getWriteReviewForm(productId)
            .then((config) => {
                if (!cancelled) setFormConfig(config);
            })
            .catch(() => {
                if (!cancelled) setFormConfig(null);
            });
        return () => {
            cancelled = true;
        };
    }, [adapter, productId]);

    const data: InfoModalData = {
        type: 'write-review',
        formConfig: formConfig ?? undefined,
    } satisfies WriteReviewModalData;

    return (
        <>
            <Button
                type="button"
                variant="default"
                className="w-full rounded-lg bg-brand-primary text-primary-foreground hover:bg-brand-primary-hover focus-visible:ring-brand-primary/50 sm:w-auto"
                onClick={() => setOpen(true)}
                data-testid="write-review-button">
                {formConfig?.title}
            </Button>
            {open && (
                <Suspense fallback={null}>
                    <InfoModal open={open} onOpenChange={setOpen} data={data} />
                </Suspense>
            )}
        </>
    );
}
