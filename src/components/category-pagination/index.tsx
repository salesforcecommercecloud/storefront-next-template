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

import { type JSX, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaginationItems } from '@/lib/pagination-utils';

export default function CategoryPagination({
    limit,
    result,
}: {
    limit: number;
    result: ShopperSearch.schemas['ProductSearchResult'];
}): JSX.Element | null {
    const navigate = useNavigate();
    const location = useLocation();

    const total = useMemo(() => {
        return Math.ceil(result.total / limit);
    }, [limit, result.total]);

    const current = useMemo(() => {
        return Math.floor(result.offset / limit) + 1;
    }, [limit, result.offset]);

    const pageNumbers = useMemo(() => getPaginationItems(total, current), [total, current]);

    const navigatePage = useCallback(
        (page: number) => {
            const params = new URLSearchParams(location.search);
            const offset = (page - 1) * limit;
            params.set('offset', String(offset));
            return navigate({
                ...location,
                search: `?${params.toString()}`,
            });
        },
        [location, navigate, limit]
    );

    if (total <= 1) {
        return null;
    }

    return (
        <div className="flex justify-center">
            <nav className="flex items-center space-x-1" aria-label="Pagination">
                {/* Previous button */}
                <Button
                    variant="outline"
                    className="size-9 cursor-pointer"
                    onClick={() => void navigatePage(current - 1)}
                    disabled={current <= 1}
                    aria-label="Previous page">
                    <ChevronLeft />
                </Button>

                {/* Page numbers */}
                {pageNumbers.map((item) =>
                    typeof item === 'object' && item.type === 'ellipsis' ? (
                        <span key={`ellipsis-${item.key}`} className="px-4 py-2 text-foreground/80">
                            ...
                        </span>
                    ) : (
                        <Button
                            key={item}
                            onClick={() => void navigatePage(item)}
                            disabled={current === item}
                            variant="outline"
                            className="size-9 cursor-pointer"
                            aria-label={`Page ${String(item)}`}
                            aria-current={current === item ? 'page' : undefined}>
                            {item}
                        </Button>
                    )
                )}

                {/* Next button */}
                <Button
                    variant="outline"
                    className="size-9 cursor-pointer"
                    onClick={() => void navigatePage(current + 1)}
                    disabled={current === total}
                    aria-label="Next page">
                    <ChevronRight />
                </Button>
            </nav>
        </div>
    );
}
