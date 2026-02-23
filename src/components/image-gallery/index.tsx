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

import { useState, useEffect, type ReactElement } from 'react';
import { DynamicImage } from '@/components/dynamic-image';
import { useTranslation } from 'react-i18next';

export interface GalleryImage {
    src: string;
    alt?: string;
    thumbSrc?: string;
}

interface ImageGalleryProps {
    images: GalleryImage[];
    eager?: boolean;
    productName?: string;
}

export default function ImageGallery({ images, eager = false, productName }: ImageGalleryProps): ReactElement {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                <DynamicImage
                    src={`${selectedImage.src}[?sw={width}]`}
                    alt={selectedImage.alt || imageAltFallback}
                    widths={['100vw', '680px']}
                    className="w-full h-full object-cover object-center [&_img]:object-contain! [&_img]:h-full! [&_img]:max-w-full! [&_img]:mx-auto!"
                    loading={eager ? 'eager' : 'lazy'}
                    priority={eager ? 'high' : undefined}
                />
            </div>

            {/* Thumbnail Navigation */}
            {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    {images.map((image, index) => (
                        <button
                            key={image.src + (image.thumbSrc || '')}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`
                                aspect-square overflow-hidden rounded-lg bg-muted
                                border-2 transition-colors
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
        </div>
    );
}
