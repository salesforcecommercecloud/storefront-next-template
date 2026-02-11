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

export interface StarRatingProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * The rating value (0-5)
     */
    rating: number;
    /**
     * The number of reviews
     */
    reviewCount: number;
    /**
     * Whether to show the rating label (e.g., "4.8 out of 5")
     * @default false
     */
    showRatingLabel?: boolean;
    /**
     * Position of the rating label
     * @default 'top'
     */
    ratingLabelPosition?: 'top' | 'right';
    /**
     * Format of the rating label
     * 'full': "4.8 out of 5"
     * 'short': "4.8"
     * @default 'full'
     */
    ratingLabelFormat?: 'full' | 'short';
    /**
     * Template for the rating label. Use {rating} as placeholder.
     * @default "{rating} out of 5" for 'full', "{rating}" for 'short'
     */
    ratingLabelTemplate?: string;
    /**
     * Whether to show the rating link (e.g., "4.8 (123)")
     * @default false
     */
    showRatingLink?: boolean;
    /**
     * Template for the rating link. Use {rating} and {count} as placeholders.
     * @default "{rating} ({count})"
     */
    ratingLinkTemplate?: string;
    /**
     * Callback when the rating link is clicked
     */
    onRatingLinkClick?: () => void;
    /**
     * Whether to show the review count label (e.g., "Based on 123 reviews")
     * @default false
     */
    showReviewCountLabel?: boolean;
    /**
     * Template for the review count label. Use {count} as placeholder.
     * @default "Based on {count} reviews"
     */
    reviewCountLabelTemplate?: string;
    /**
     * Size of the stars
     * @default 'sm'
     */
    starSize?: 'sm' | 'default' | 'lg';
    /**
     * Additional class name for the rating label
     * @default 'text-lg font-semibold text-black'
     */
    ratingLabelClassName?: string;
    /**
     * Additional class name for the review count label
     * @default 'text-xs text-gray-500 mt-2 mb-4'
     */
    reviewCountLabelClassName?: string;
    /**
     * Additional class name for the container
     */
    className?: string;
    /**
     * Template for star container aria-label (for screen readers).
     * Use {rating}, {total}, and {count} as placeholders.
     * If not provided, uses localized string from translations.json
     * @localization Key: product.rating.starContainerAriaLabel
     */
    starContainerAriaLabelTemplate?: string;
    /**
     * Template for rating link button aria-label (for screen readers).
     * If not provided, uses localized string from translations.json
     * @localization Key: product.rating.viewAllReviews
     */
    ratingLinkAriaLabelTemplate?: string;
    /**
     * Total number of stars (for aria-label localization)
     * @default 5
     */
    totalStars?: number;
}

/**
 * Formats a rating number, removing trailing zeros for whole numbers
 * @param rating - The rating value to format
 * @returns Formatted rating string (e.g., "5" instead of "5.0", "4.8" stays "4.8")
 */
function formatRating(rating: number): string {
    return Number(rating.toFixed(1)).toString();
}

/**
 * Formats a template string by replacing placeholders with values
 * @param template - Template string with {key} placeholders
 * @param values - Object with key-value pairs to replace
 */
function formatString(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
}

/**
 * StarRating component displays a customizable star rating with optional labels and links
 */
export const StarRating = forwardRef<HTMLDivElement, StarRatingProps>(
    (
        {
            rating,
            reviewCount,
            showRatingLabel = false,
            ratingLabelPosition = 'top',
            ratingLabelFormat = 'full',
            ratingLabelTemplate,
            showRatingLink = false,
            ratingLinkTemplate = '{rating} ({count})',
            onRatingLinkClick,
            showReviewCountLabel = false,
            reviewCountLabelTemplate = 'Based on {count} reviews',
            starSize = 'sm',
            ratingLabelClassName = 'text-lg font-semibold text-black',
            reviewCountLabelClassName = 'text-xs text-gray-500 mt-2 mb-4',
            starContainerAriaLabelTemplate,
            ratingLinkAriaLabelTemplate,
            totalStars = 5,
            className,
            ...props
        },
        ref
    ) => {
        const { t } = useTranslation();

        // Clamp rating between 0 and 5
        const clampedRating = Math.min(Math.max(rating, 0), 5);

        // Star size classes
        const starSizeClasses = {
            sm: 'w-3 h-3',
            default: 'w-4 h-4',
            lg: 'w-6 h-6',
        };

        // Generate rating label
        const defaultRatingLabelTemplate = ratingLabelFormat === 'full' ? '{rating} out of 5' : '{rating}';
        const ratingLabel = formatString(ratingLabelTemplate || defaultRatingLabelTemplate, {
            rating: formatRating(clampedRating),
        });

        // Generate rating link text
        const ratingLinkText = formatString(ratingLinkTemplate, {
            rating: formatRating(clampedRating),
            count: reviewCount,
        });

        // Generate review count label
        const reviewCountLabel = formatString(reviewCountLabelTemplate, {
            count: reviewCount,
        });

        // Generate aria-labels for accessibility using i18next translations
        const starContainerAriaLabel = starContainerAriaLabelTemplate
            ? formatString(starContainerAriaLabelTemplate, {
                  rating: formatRating(clampedRating),
                  total: totalStars,
                  count: reviewCount,
              })
            : t('product:rating.starContainerAriaLabel', {
                  rating: formatRating(clampedRating),
                  total: totalStars,
                  count: reviewCount,
              });

        // For rating link aria-label: use explicit template, fall back to visual text if customized, then i18n default
        const defaultRatingLinkTemplate = '{rating} ({count})';
        const isCustomRatingLinkTemplate = ratingLinkTemplate !== defaultRatingLinkTemplate;
        const ratingLinkAriaLabel = ratingLinkAriaLabelTemplate
            ? ratingLinkAriaLabelTemplate
            : isCustomRatingLinkTemplate
              ? ratingLinkText
              : t('product:rating.viewAllReviews');

        return (
            <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props}>
                {/* Top Rating Label */}
                {showRatingLabel && ratingLabelPosition === 'top' && (
                    <div className={ratingLabelClassName}>{ratingLabel}</div>
                )}

                {/* Stars Row */}
                <div className="flex items-center gap-2">
                    {/* Stars */}
                    <div role="group" aria-label={starContainerAriaLabel} className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((position) => {
                            const fillValue = clampedRating - (position - 1);
                            const isUnfilled = fillValue <= 0;
                            const opacity = isUnfilled ? 1 : Math.min(Math.max(fillValue, 0), 1);

                            return (
                                <StarIcon
                                    key={position}
                                    opacity={opacity}
                                    filled={!isUnfilled}
                                    className={starSizeClasses[starSize]}
                                    aria-hidden="true"
                                />
                            );
                        })}
                    </div>

                    {/* Right Rating Label */}
                    {showRatingLabel && ratingLabelPosition === 'right' && (
                        <div className={ratingLabelClassName}>{ratingLabel}</div>
                    )}

                    {/* Rating Link */}
                    {showRatingLink && (
                        <button
                            type="button"
                            onClick={onRatingLinkClick}
                            onMouseEnter={onRatingLinkClick}
                            aria-label={ratingLinkAriaLabel}
                            className="text-sm text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded">
                            {ratingLinkText}
                        </button>
                    )}
                </div>

                {/* Review Count Label */}
                {showReviewCountLabel && <div className={reviewCountLabelClassName}>{reviewCountLabel}</div>}
            </div>
        );
    }
);

StarRating.displayName = 'StarRating';
