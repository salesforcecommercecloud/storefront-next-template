import { type ReactElement } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators';
import heroImage from '/images/hero-cube.png';

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

type Image = {
    url: string;
    meta_data?: {
        height?: string;
        width?: string;
    };
    focal_point?: {
        x?: string;
        y?: string;
    };
};

export default function Hero({
    title = 'Shop Now',
    subtitle,
    imageUrl = { url: heroImage },
    imageAlt = 'Hero image',
    ctaText = 'Shop Now',
    ctaLink = '/category/root',
}: {
    title?: string;
    subtitle?: string;
    imageUrl?: Image;
    imageAlt?: string;
    ctaText?: string;
    ctaLink?: string;
}): ReactElement {
    // Calculate focal point for object-position (defaults to center)
    const focalX = imageUrl.focal_point?.x ? `${imageUrl.focal_point.x}%` : '50%';
    const focalY = imageUrl.focal_point?.y ? `${imageUrl.focal_point.y}%` : '50%';
    const objectPosition = `${focalX} ${focalY}`;

    return (
        <div className="relative w-full overflow-hidden">
            {/* Responsive aspect ratio container */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.5/1] lg:aspect-[3/1] min-h-[400px] sm:min-h-[450px] md:min-h-[500px] lg:min-h-[600px]">
                {/* Background image with proper object-fit */}
                <img
                    src={imageUrl.url}
                    alt={imageAlt}
                    fetchPriority="high"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition }}
                />

                {/* Gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

                {/* Content overlay */}
                <div className="absolute inset-0 z-10 flex items-center">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-xl lg:max-w-2xl">
                            {/* Responsive heading */}
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-3 sm:mb-4 md:mb-6 leading-tight tracking-tight drop-shadow-lg">
                                {title}
                            </h1>

                            {/* Responsive subtitle */}
                            {subtitle && (
                                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-normal text-primary-foreground/90 mb-6 sm:mb-8 leading-relaxed tracking-wide drop-shadow-md max-w-prose">
                                    {subtitle}
                                </p>
                            )}

                            {/* Responsive CTA button */}
                            <Button
                                asChild
                                size="lg"
                                className="text-base sm:text-lg md:text-xl px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 shadow-xl hover:shadow-2xl transition-all">
                                <Link to={ctaLink}>{ctaText}</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
