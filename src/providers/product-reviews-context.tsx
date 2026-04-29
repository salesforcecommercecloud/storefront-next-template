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
/* eslint-disable react-refresh/only-export-components -- provider and hook are co-located by design */
import { createContext, useCallback, type PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { useProductContentAdapter } from '@/providers/product-content';
import { useProduct } from '@/providers/product-context';
import type { ReviewItem, ReviewsSummaryData } from '@/lib/adapters/product-content-data-types';

export type ExpandReviewsFn = (() => void) | null;

/** Callback run after the reviews accordion has finished expanding (e.g. for scroll-into-view). */
export type OnExpandedCallback = (() => void) | null;

export interface ProductReviewsContextValue {
    reviewsSummary: ReviewsSummaryData | null;
    reviewsSummaryLoading: boolean;
    reviews: ReviewItem[];
    reviewsLoading: boolean;
    loadReviewsIfNeeded: () => void;
    aiSummary: string;
    addReview: (review: ReviewItem) => void;
    /** Expand the customer reviews accordion (e.g. from PDP rating summary). No-op if not registered. */
    expandReviews: () => void;
    /** Register/unregister the expand function. Called by CustomerReviewsSection. */
    registerExpand: (fn: ExpandReviewsFn) => void;
    /** Register a callback to run after the accordion open animation completes. Called by CustomerReviewsSection. */
    registerOnExpanded: (cb: OnExpandedCallback) => void;
    /** Invoke and clear the registered onExpanded callback. Called by CustomerReviewsSection when accordion is open. */
    triggerOnExpanded: () => void;
}

const ProductReviewsContext = createContext<ProductReviewsContextValue | null>(null);

function revokeBlobUrlsInReviews(reviews: ReviewItem[]): void {
    for (const r of reviews) {
        if (r.photos) {
            for (const p of r.photos) {
                if (typeof p.url === 'string' && p.url.startsWith('blob:')) {
                    URL.revokeObjectURL(p.url);
                }
            }
        }
    }
}

/**
 * Provider that holds reviews state and calls the product content adapter.
 * Must be used inside ProductProvider and ProductContentProvider.
 * End customers swap the adapter; UI always uses the same adapter methods.
 */
export function ProductReviewsProvider({ children }: PropsWithChildren) {
    const adapter = useProductContentAdapter();
    const product = useProduct();
    const productId = product?.id;

    const [reviewsSummary, setReviewsSummary] = useState<ReviewsSummaryData | null>(null);
    const [reviewsSummaryLoading, setReviewsSummaryLoading] = useState(false);
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const reviewsListFetchedRef = useRef(false);
    const expandRef = useRef<ExpandReviewsFn>(null);
    const onExpandedRef = useRef<OnExpandedCallback>(null);
    const productIdRef = useRef(productId);
    const reviewsRef = useRef<ReviewItem[]>([]);
    productIdRef.current = productId;
    reviewsRef.current = reviews;

    useEffect(() => {
        if (!adapter?.getReviewsSummary || !productId) return;
        revokeBlobUrlsInReviews(reviewsRef.current);
        let cancelled = false;
        reviewsListFetchedRef.current = false;
        setReviews([]);
        setReviewsSummaryLoading(true);
        adapter
            .getReviewsSummary(productId)
            .then((data) => {
                if (!cancelled) {
                    setReviewsSummary(data);
                    setAiSummary(data.aiSummary ?? '');
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setReviewsSummary(null);
                    setAiSummary('');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setReviewsSummaryLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [adapter, productId]);

    useEffect(() => {
        return () => revokeBlobUrlsInReviews(reviewsRef.current);
    }, []);

    const loadReviewsIfNeeded = useCallback(() => {
        if (!adapter?.getReviews || !productId || reviewsListFetchedRef.current) return;
        const requestProductId = productId;
        reviewsListFetchedRef.current = true;
        setReviewsLoading(true);
        adapter
            .getReviews(requestProductId)
            .then((data) => {
                if (requestProductId === productIdRef.current) {
                    setReviews(data.reviews ?? []);
                    if (data.aiSummary != null) setAiSummary(data.aiSummary);
                }
            })
            .catch(() => {
                if (requestProductId === productIdRef.current) setReviews([]);
            })
            .finally(() => {
                if (requestProductId === productIdRef.current) setReviewsLoading(false);
            });
    }, [adapter, productId]);

    const addReview = useCallback(
        (review: ReviewItem) => {
            setReviews((prev) => [review, ...prev]);
            if (adapter?.addReview && productId) {
                void adapter.addReview(productId, review);
            }
        },
        [adapter, productId]
    );

    const registerExpand = useCallback((fn: ExpandReviewsFn) => {
        expandRef.current = fn;
    }, []);

    const expandReviews = useCallback(() => {
        expandRef.current?.();
    }, []);

    const registerOnExpanded = useCallback((cb: OnExpandedCallback) => {
        onExpandedRef.current = cb;
    }, []);

    const triggerOnExpanded = useCallback(() => {
        const fn = onExpandedRef.current;
        onExpandedRef.current = null;
        fn?.();
    }, []);

    const value: ProductReviewsContextValue = {
        reviewsSummary,
        reviewsSummaryLoading,
        reviews,
        reviewsLoading,
        loadReviewsIfNeeded,
        aiSummary,
        addReview,
        expandReviews,
        registerExpand,
        registerOnExpanded,
        triggerOnExpanded,
    };

    return <ProductReviewsContext.Provider value={value}>{children}</ProductReviewsContext.Provider>;
}

/**
 * Hook to access product reviews state and actions. Uses the adapter under the hood.
 * Must be used inside ProductReviewsProvider (e.g. on PDP).
 */
export function useProductReviews(): ProductReviewsContextValue {
    const ctx = useContext(ProductReviewsContext);
    if (ctx == null) {
        return {
            reviewsSummary: null,
            reviewsSummaryLoading: false,
            reviews: [],
            reviewsLoading: false,
            loadReviewsIfNeeded: () => {
                /* no-op when outside ProductReviewsProvider */
            },
            aiSummary: '',
            addReview: () => {
                /* no-op when outside ProductReviewsProvider */
            },
            expandReviews: () => {
                /* no-op when outside ProductReviewsProvider */
            },
            registerExpand: () => {
                /* no-op when outside ProductReviewsProvider */
            },
            registerOnExpanded: () => {
                /* no-op when outside ProductReviewsProvider */
            },
            triggerOnExpanded: () => {
                /* no-op when outside ProductReviewsProvider */
            },
        };
    }
    return ctx;
}
