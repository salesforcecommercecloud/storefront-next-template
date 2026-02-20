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
import { type JSX, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPaginationItems } from '@/lib/pagination-utils';

export default function CategoryPagination({
    limit,
    offset,
    total,
}: {
    limit: number;
    offset: number;
    total: number;
}): JSX.Element | null {
    const navigate = useNavigate();
    const location = useLocation();

    const totalPages = Math.ceil(total / limit);
    const current = Math.floor(offset / limit) + 1;
    const pageNumbers = useMemo(() => getPaginationItems(totalPages, current), [totalPages, current]);

    const navigatePage = useCallback(
        (page: number) => {
            const params = new URLSearchParams(location.search);
            params.set('offset', String((page - 1) * limit));
            return navigate({
                ...location,
                search: `?${params.toString()}`,
            });
        },
        [location, navigate, limit]
    );

    if (totalPages <= 1) {
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
                    disabled={current === totalPages}
                    aria-label="Next page">
                    <ChevronRight />
                </Button>
            </nav>
        </div>
    );
}
