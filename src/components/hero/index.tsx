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
import { cn } from '@/lib/utils';
import { type Image } from '@/types';

const OVERLAY_POSITION_VALUES = [
    'Top Left',
    'Top Center',
    'Top Right',
    'Middle Left',
    'Middle Center',
    'Middle Right',
    'Bottom Left',
    'Bottom Center',
    'Bottom Right',
] as const;

type OverlayPosition = (typeof OVERLAY_POSITION_VALUES)[number];

const OVERLAY_ALIGNMENT_VALUES = ['left', 'center', 'right'] as const;
type OverlayAlignment = (typeof OVERLAY_ALIGNMENT_VALUES)[number];

function normalizeOverlayPosition(value: string | undefined): OverlayPosition {
    if (value && (OVERLAY_POSITION_VALUES as readonly string[]).includes(value)) {
        return value as OverlayPosition;
    }
    // Legacy horizontal-only values from earlier hero metadata
    if (value === 'left') return 'Middle Left';
    if (value === 'right') return 'Middle Right';
    if (value === 'center') return 'Middle Center';
    return 'Middle Center';
}

function normalizeOverlayAlignment(value: string | undefined): OverlayAlignment {
    if (value && (OVERLAY_ALIGNMENT_VALUES as readonly string[]).includes(value)) {
        return value as OverlayAlignment;
    }
    return 'center';
}

type OverlayLayout = {
    vertical: 'start' | 'center' | 'end';
    horizontal: 'left' | 'center' | 'right';
};

function overlayPositionLayout(position: OverlayPosition): OverlayLayout {
    const map: Record<OverlayPosition, OverlayLayout> = {
        'Top Left': { vertical: 'start', horizontal: 'left' },
        'Top Center': { vertical: 'start', horizontal: 'center' },
        'Top Right': { vertical: 'start', horizontal: 'right' },
        'Middle Left': { vertical: 'center', horizontal: 'left' },
        'Middle Center': { vertical: 'center', horizontal: 'center' },
        'Middle Right': { vertical: 'center', horizontal: 'right' },
        'Bottom Left': { vertical: 'end', horizontal: 'left' },
        'Bottom Center': { vertical: 'end', horizontal: 'center' },
        'Bottom Right': { vertical: 'end', horizontal: 'right' },
    };
    return map[position];
}

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('hero', {
    name: 'Hero Banner',
    description:
        'Prominent banner with image, title, subtitle, and call-to-action. Overlay Position places the content block (top, middle, or bottom; left, center, or right). Overlay Alignment sets text alignment for the title, subtitle, and CTA.',
    group: 'Content',
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

    @AttributeDefinition({
        id: 'overlayPosition',
        name: 'Overlay Position',
        description: 'Placement of the content block within the hero',
        type: 'enum',
        values: [
            'Top Left',
            'Top Center',
            'Top Right',
            'Middle Left',
            'Middle Center',
            'Middle Right',
            'Bottom Left',
            'Bottom Center',
            'Bottom Right',
        ],
        defaultValue: 'Middle Center',
    })
    overlayPosition?: string;

    @AttributeDefinition({
        id: 'overlayAlignment',
        name: 'Overlay Alignment',
        description: 'Text alignment for title, subtitle, and call-to-action',
        type: 'enum',
        values: ['left', 'center', 'right'],
        defaultValue: 'center',
    })
    overlayAlignment?: string;
}
/* v8 ignore stop */

export default function Hero({
    title,
    subtitle,
    imageUrl,
    imageAlt,
    ctaText,
    ctaLink,
    overlayPosition,
    overlayAlignment,
}: {
    title?: string;
    subtitle?: string;
    imageUrl?: Image;
    imageAlt?: string;
    ctaText?: string;
    ctaLink?: string;
    overlayPosition?: string;
    overlayAlignment?: string;
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

    const position = normalizeOverlayPosition(overlayPosition);
    const alignment = normalizeOverlayAlignment(overlayAlignment);
    const { vertical, horizontal } = overlayPositionLayout(position);

    const overlayRowClass = cn(
        vertical === 'start' && 'items-start',
        vertical === 'center' && 'items-center',
        vertical === 'end' && 'items-end'
    );

    const overlayEdgePaddingClass = cn(
        vertical === 'start' && 'pt-6 sm:pt-8 md:pt-10',
        vertical === 'end' && 'pb-6 sm:pb-8 md:pb-10'
    );

    const contentBlockClass = cn(
        'max-w-2xl',
        horizontal === 'center' && 'mx-auto',
        horizontal === 'right' && 'ml-auto'
    );

    const textAlignClass = alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';

    const ctaJustifyClass =
        alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';

    return (
        <div className="relative w-full h-[100vh] md:h-[85vh] overflow-hidden">
            {renderImage()}

            <div className={cn('absolute inset-0 z-10 flex', overlayRowClass, overlayEdgePaddingClass)}>
                <div className="container mx-auto w-full px-4 sm:px-6 lg:px-8">
                    <div className={cn(contentBlockClass, textAlignClass)}>
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
                            <div className={cn('flex', ctaJustifyClass)}>
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
