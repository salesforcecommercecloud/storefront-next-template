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
import { type ReactElement } from 'react';
import { Link } from '@/components/link';
import { Button } from '@/components/ui/button';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators';
import { type Image } from '@/types';

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('hero', {
    name: 'Hero Banner',
    description: 'Prominent banner section with title, subtitle, image, and call-to-action',
})
@RegionDefinition([])
export class HeroMetadata {
    @AttributeDefinition()
    title?: string;

    @AttributeDefinition({
        type: 'image',
    })
    imageUrl?: string;

    @AttributeDefinition()
    imageAlt?: string;

    @AttributeDefinition()
    subtitle?: string;

    @AttributeDefinition()
    ctaText?: string;

    @AttributeDefinition({
        id: 'ctaLink',
        name: 'CTA Link',
        type: 'url',
        required: false,
    })
    ctaLink?: string;
}
/* v8 ignore stop */

export default function Hero({
    title,
    subtitle,
    imageUrl,
    imageAlt,
    ctaText,
    ctaLink,
}: {
    title?: string;
    subtitle?: string;
    imageUrl?: Image;
    imageAlt?: string;
    ctaText?: string;
    ctaLink?: string;
}): ReactElement {
    const renderImage = () => {
        if (!imageUrl?.url) return <div className="absolute inset-0 bg-muted" />;

        const focalX = imageUrl.focal_point?.x ? `${imageUrl.focal_point.x}%` : '50%';
        const focalY = imageUrl.focal_point?.y ? `${imageUrl.focal_point.y}%` : '50%';

        return (
            <img
                src={imageUrl.url}
                alt={imageAlt || ''}
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: `${focalX} ${focalY}` }}
            />
        );
    };

    return (
        <div className="relative w-full h-[100vh] md:h-[85vh] overflow-hidden">
            {renderImage()}

            <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto text-center">
                        {title && (
                            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 md:mb-6 leading-none tracking-tight">
                                {title}
                            </h1>
                        )}

                        {subtitle && (
                            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-normal text-muted-foreground mb-4 sm:mb-6 md:mb-8 leading-none tracking-wide">
                                {subtitle}
                            </p>
                        )}

                        {ctaText && ctaLink && (
                            <div className="flex justify-center">
                                <Button
                                    asChild
                                    className="text-sm sm:text-base md:text-lg lg:text-xl p-3 sm:p-4 md:p-5 lg:p-6">
                                    <Link to={ctaLink}>{ctaText}</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
