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

import { type ComponentRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/spinner';

interface HeartIconProps {
    isFilled?: boolean;
    isLoading?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    onClick?: () => void;
    tabIndex?: number;
}

const HeartIcon = forwardRef<ComponentRef<'button'>, HeartIconProps>(
    ({ isFilled = false, isLoading = false, disabled = false, size = 'md', className, onClick, tabIndex }, ref) => {
        const { t } = useTranslation('product');
        const sizeClasses = {
            sm: 'w-4 h-4',
            md: 'w-5 h-5',
            lg: 'w-6 h-6',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'absolute top-2 right-2 z-10 bg-background w-9 h-9 p-2 shadow-md flex items-center justify-center',
                    'transition-all duration-200 ease-in-out border-0 cursor-pointer',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    isLoading && 'pointer-events-none',
                    isFilled && !isLoading && 'scale-105',
                    className
                )}
                disabled={disabled}
                onClick={isLoading ? undefined : onClick}
                tabIndex={tabIndex}
                aria-busy={isLoading || undefined}
                aria-label={
                    isLoading ? t('updatingWishlist') : isFilled ? t('removeFromWishlist') : t('addToWishlist')
                }>
                {isLoading ? (
                    <Spinner size="sm" className={cn(sizeClasses[size])} />
                ) : (
                    <svg
                        viewBox="0 0 24 24"
                        fill={isFilled ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={cn(
                            sizeClasses[size],
                            'transition-all duration-200 ease-in-out',
                            isFilled ? 'text-red-500 scale-110' : 'text-muted-foreground scale-100'
                        )}>
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                )}
            </button>
        );
    }
);

HeartIcon.displayName = 'HeartIcon';

export { HeartIcon };
