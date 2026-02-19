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

import { type ReactElement, useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReviewItem } from '@/lib/adapters/product-content-data-types';
import { useProduct } from '@/providers/product-context';
import { useProductContent } from '@/hooks/product-content/use-product-content';
import { getPaginationItems } from '@/lib/pagination-utils';
import { ReviewCard } from './review-card';

const REVIEWS_PER_PAGE = 5;
/** When there are more than this many pages, show truncated pagination (e.g. 1 ... 4 [5] 6 ... 20) */
const MAX_VISIBLE_PAGE_BUTTONS = 5;

export default function ReviewCardsSection(): ReactElement {
    const { t } = useTranslation('product');
    const product = useProduct();
    const { adapter } = useProductContent();
    const productId = product?.id;

    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!adapter?.getReviews || productId == null) return;
        let cancelled = false;
        adapter
            .getReviews(productId)
            .then((data) => {
                if (!cancelled) {
                    setReviews(data.reviews ?? []);
                    setCurrentPage(1);
                }
            })
            .catch(() => {
                if (!cancelled) setReviews([]);
            });
        return () => {
            cancelled = true;
        };
    }, [adapter, productId]);

    // Scroll to top of reviews section when page changes so we don't end up at the bottom
    useEffect(() => {
        const el = sectionRef.current;
        if (currentPage > 1 && el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [currentPage]);

    const totalReviews = reviews.length;
    const totalPages = Math.max(1, Math.ceil(totalReviews / REVIEWS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * REVIEWS_PER_PAGE;
    const pageReviews = useMemo(() => reviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE), [reviews, startIndex]);

    const from = totalReviews === 0 ? 0 : startIndex + 1;
    const to = Math.min(startIndex + REVIEWS_PER_PAGE, totalReviews);

    return (
        <div ref={sectionRef} className="space-y-6" data-testid="review-cards-section">
            {reviews.length === 0 ? (
                <p className="text-muted-foreground">{t('reviewsComingSoon')}</p>
            ) : (
                <>
                    <ul className="space-y-6 list-none p-0 m-0">
                        {pageReviews.map((review) => (
                            <li key={review.id}>
                                <ReviewCard review={review} />
                            </li>
                        ))}
                    </ul>

                    {/* Pagination */}
                    <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            {t('showingReviews', { from, to, total: totalReviews })}
                        </p>
                        <nav className="flex items-center gap-1" aria-label={t('reviews')}>
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-9 cursor-pointer"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                                aria-label="Previous page">
                                <ChevronLeft className="size-4" />
                            </Button>
                            {getPaginationItems(totalPages, safePage, MAX_VISIBLE_PAGE_BUTTONS).map((item) => {
                                if (typeof item === 'object' && item.type === 'ellipsis') {
                                    return (
                                        <span
                                            key={item.key}
                                            className="flex size-9 items-center justify-center px-1 text-muted-foreground"
                                            aria-hidden>
                                            …
                                        </span>
                                    );
                                }
                                const page = item as number;
                                return (
                                    <Button
                                        key={page}
                                        variant={page === safePage ? 'default' : 'outline'}
                                        size="icon"
                                        className="size-9 cursor-pointer"
                                        onClick={() => setCurrentPage(page)}
                                        aria-label={`Page ${String(page)}`}
                                        aria-current={page === safePage ? 'page' : undefined}>
                                        {page}
                                    </Button>
                                );
                            })}
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-9 cursor-pointer"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage >= totalPages}
                                aria-label="Next page">
                                <ChevronRight className="size-4" />
                            </Button>
                        </nav>
                    </div>
                </>
            )}
        </div>
    );
}
