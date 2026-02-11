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
import { forwardRef, type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { StarIcon } from './star-icon';

export interface StarRatingDistributionProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Star rating value (1-5)
     */
    rating: number;
    /**
     * Number of reviews for this rating
     */
    reviewCount: number;
    /**
     * Total number of reviews (for percentage calculation)
     */
    totalReviews: number;
}

/**
 * StarRatingDistribution component displays a single rating distribution row
 * with star label, icon, percentage bar, and review count
 */
export const StarRatingDistribution = forwardRef<HTMLDivElement, StarRatingDistributionProps>(
    ({ rating, reviewCount, totalReviews, className, ...props }, ref) => {
        const { t } = useTranslation();

        // Calculate percentage
        const percentage = totalReviews > 0 ? (reviewCount / totalReviews) * 100 : 0;

        // Generate accessible label using translation
        const ariaLabel = t('product:rating.distributionAriaLabel', {
            rating,
            percentage: percentage.toFixed(0),
        });

        return (
            <div
                ref={ref}
                className={cn('flex items-center gap-2 text-sm', className)}
                tabIndex={0}
                aria-label={ariaLabel}
                {...props}>
                {/* Star rating label */}
                <span className="w-3 text-right text-muted-foreground" aria-hidden="true">
                    {rating}
                </span>

                {/* Star icon */}
                <StarIcon opacity={1} filled={true} className="w-4 h-4" aria-hidden="true" />

                {/* Percentage bar */}
                <div className="flex-1 bg-muted-foreground/30 rounded-full overflow-hidden h-2" aria-hidden="true">
                    <div className="bg-rating h-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                </div>

                {/* Percentage label */}
                <span className="w-12 text-right text-muted-foreground tabular-nums" aria-hidden="true">
                    {percentage.toFixed(0)}%
                </span>
            </div>
        );
    }
);

StarRatingDistribution.displayName = 'StarRatingDistribution';
