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
import { useState, useEffect, useRef, type ReactElement } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DynamicImage } from '@/components/dynamic-image';
import ImageNavArrows from '@/components/image-nav-arrows';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface GalleryImage {
    src: string;
    alt?: string;
    thumbSrc?: string;
}

interface ImageGalleryProps {
    images: GalleryImage[];
    eager?: boolean;
    /** Show prev/next arrows on the main image (e.g. in modal) */
    showNavigationArrows?: boolean;
    /** Size of navigation arrows: "sm" (default) or "lg" for PDP */
    navigationArrowSize?: 'sm' | 'lg';
    /** Use horizontal scrollable thumbnail strip with arrows instead of grid */
    horizontalThumbnails?: boolean;
    productName?: string;
}

const THUMBNAIL_SCROLL_OFFSET = 200;

export default function ImageGallery({
    images,
    eager = false,
    showNavigationArrows = false,
    navigationArrowSize = 'sm',
    horizontalThumbnails = false,
    productName,
}: ImageGalleryProps): ReactElement {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const thumbStripRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // When images change (e.g., color variant changes), try to preserve the selected index
        // Only reset to 0 if the current index is out of bounds for the new images array
        // The key prop ensures each product has independent state, so this only affects the current product
        setSelectedImageIndex((currentIndex) => {
            // If current index is still valid for the new images array, keep it
            // Otherwise reset to 0
            return currentIndex < images.length ? currentIndex : 0;
        });
    }, [images]);

    const { t: tCommon } = useTranslation('common');
    const { t: tProduct } = useTranslation('product');

    // The first image is the fallback image. It's needed for when `images` are just updated, and the `selectedImageIndex` goes out of bound and is soon to be reset.
    const selectedImage = images[selectedImageIndex] ?? images[0];

    if (!images || images.length === 0) {
        return (
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">📷</div>
                    <p>{tCommon('noImageAvailable')}</p>
                </div>
            </div>
        );
    }

    const imageAltFallback = productName || tProduct('imageAlt') || 'Product Image';

    return (
        <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <DynamicImage
                    src={`${selectedImage.src}[?sw={width}]`}
                    alt={selectedImage.alt || imageAltFallback}
                    widths={['100vw', '680px']}
                    className="w-full h-full object-cover object-center [&_img]:object-contain! [&_img]:h-full! [&_img]:max-w-full! [&_img]:mx-auto!"
                    loading={eager ? 'eager' : 'lazy'}
                    priority={eager ? 'high' : undefined}
                />
                {showNavigationArrows && images.length > 1 && (
                    <ImageNavArrows
                        imageCount={images.length}
                        onIndexChange={setSelectedImageIndex}
                        size={navigationArrowSize}
                    />
                )}
            </div>

            {/* Thumbnail Navigation */}
            {images.length > 1 && !horizontalThumbnails && (
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    {images.map((image, index) => (
                        <button
                            key={image.src + (image.thumbSrc || '')}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`
                                aspect-square overflow-hidden rounded-lg bg-muted
                                border-2 transition-colors cursor-pointer
                                ${
                                    selectedImageIndex === index
                                        ? 'border-primary'
                                        : 'border-transparent hover:border-border'
                                }
                            `}>
                            <img
                                src={image.thumbSrc || image.src}
                                alt={image.alt || imageAltFallback}
                                className="w-full h-full object-cover object-center"
                                loading="lazy"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Horizontal Scrollable Thumbnail Strip */}
            {images.length > 1 && horizontalThumbnails && (
                <div className="relative flex items-center gap-1">
                    {images.length > 4 && (
                        <button
                            type="button"
                            onClick={() => {
                                thumbStripRef.current?.scrollBy({ left: -THUMBNAIL_SCROLL_OFFSET, behavior: 'smooth' });
                            }}
                            className={cn(
                                'flex-shrink-0 rounded-full p-1 cursor-pointer',
                                'text-muted-foreground hover:text-foreground transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            )}
                            aria-label={tCommon('previousImage')}>
                            <ChevronLeft className="size-4" />
                        </button>
                    )}
                    <div
                        ref={thumbStripRef}
                        className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {images.map((image, index) => (
                            <button
                                key={image.src + (image.thumbSrc || '')}
                                onClick={() => setSelectedImageIndex(index)}
                                className={cn(
                                    'flex-shrink-0 w-14 h-14 overflow-hidden rounded-md bg-muted',
                                    'border-2 transition-colors cursor-pointer',
                                    selectedImageIndex === index
                                        ? 'border-primary'
                                        : 'border-transparent hover:border-border'
                                )}>
                                <img
                                    src={image.thumbSrc || image.src}
                                    alt={image.alt}
                                    className="w-full h-full object-cover object-center"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                    {images.length > 4 && (
                        <button
                            type="button"
                            onClick={() => {
                                thumbStripRef.current?.scrollBy({ left: THUMBNAIL_SCROLL_OFFSET, behavior: 'smooth' });
                            }}
                            className={cn(
                                'flex-shrink-0 rounded-full p-1 cursor-pointer',
                                'text-muted-foreground hover:text-foreground transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            )}
                            aria-label={tCommon('nextImage')}>
                            <ChevronRight className="size-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
