'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DynamicImage } from '@/components/dynamic-image';
import uiStrings from '@/temp-ui-string';

interface ProductImageProps {
    src: string;
    alt: string;
    className?: string;
    // Pass through all DynamicImage props
    widths?: (number | string)[] | Record<string, number> | Record<string, string> | Record<string, number | string>;
    imageProps?: React.ImgHTMLAttributes<HTMLImageElement>;
    as?: React.ElementType;
    loading?: 'lazy' | 'eager';
    priority?: 'high' | 'low';
}

/**
 * ProductImage component that shows a broken image icon when image fails to load.
 */
export function ProductImage({ src, alt, className, ...dynamicImageProps }: ProductImageProps) {
    const [hasError, setHasError] = useState(false);

    const handleError = useCallback(() => {
        setHasError(true);
    }, []);

    // If there's an error, show simple fallback (centered vertically in expanded header)
    if (hasError) {
        return (
            <div
                className={cn('rounded-lg flex items-center justify-center w-full h-full min-h-0 flex-1', className)}
                style={{
                    display: 'flex !important',
                    alignItems: 'center !important',
                    justifyContent: 'center !important',
                }}>
                <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">📷</div>
                    <p>{uiStrings.common.noImageAvailable}</p>
                </div>
            </div>
        );
    }

    // Render the actual image with error handling
    return (
        <DynamicImage
            src={src}
            alt={alt}
            className={className}
            imageProps={{
                onError: handleError,
                ...dynamicImageProps.imageProps,
            }}
            {...dynamicImageProps}
        />
    );
}

export default ProductImage;
