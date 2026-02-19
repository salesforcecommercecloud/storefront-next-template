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
import React, { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import withSuspense from '@/components/with-suspense';
import HeroCarouselSkeleton from './skeleton';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import heroImage from '/images/hero-cube.webp';
import type { ComponentType } from '@/components/region';

@Component('heroCarousel', {
    name: 'Hero Carousel',
    description:
        'Interactive carousel component with multiple hero slides, autoplay, navigation controls, and dot indicators',
})
@RegionDefinition([
    {
        id: 'slides',
        name: 'Carousel Slides',
        description:
            'Add hero components to display as carousel slides. Each hero will be shown as a full-width slide.',
        maxComponents: 10,
    },
])
export class HeroCarouselMetadata {
    @AttributeDefinition()
    autoPlay?: boolean;

    @AttributeDefinition()
    autoPlayInterval?: number;

    @AttributeDefinition()
    showDots?: boolean;

    @AttributeDefinition()
    showNavigation?: boolean;
}

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

const heroSlides: HeroSlide[] = [
    {
        id: 'slide-1',
        title: 'Adventure Awaits',
        subtitle: 'Gear up for your next outdoor expedition with premium equipment',
        imageUrl: heroImage,
        imageAlt: 'Outdoor adventure gear',
        ctaText: 'Shop Now',
        ctaLink: '/category/mens-clothing-shorts',
    },
    {
        id: 'slide-2',
        title: 'Built for the Wild',
        subtitle: 'Durable, weather-resistant gear for every terrain and season',
        imageUrl: heroImage,
        imageAlt: 'Outdoor equipment for all seasons',
        ctaText: 'Explore Collection',
        ctaLink: '/category/mens-clothing-shorts',
    },
    {
        id: 'slide-3',
        title: 'Your Journey Starts Here',
        subtitle: 'From mountain peaks to forest trails, we have everything you need',
        imageUrl: heroImage,
        imageAlt: 'Hiking and camping equipment',
        ctaText: 'Discover Gear',
        ctaLink: '/category/mens-clothing-shorts',
    },
];

export interface HeroSlide {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl: string;
    imageAlt: string;
    ctaText?: string;
    ctaLink?: string;
}

interface HeroCarouselProps {
    slides?: HeroSlide[];
    image?: Image;
    autoPlay?: boolean;
    autoPlayInterval?: number;
    showDots?: boolean;
    showNavigation?: boolean;
    /** Component data containing regions from Page Designer */
    component?: ComponentType;
}

export function HeroCarouselPlain({
    slides: propSlides = heroSlides,
    autoPlay = true,
    image,
    autoPlayInterval = 5000,
    showDots = true,
    showNavigation = true,
    component,
}: HeroCarouselProps): ReactElement {
    // Convert page designer heroes to slides format
    const slidesFromComponent = useMemo(() => {
        if (!Array.isArray(component?.regions)) {
            return [];
        }

        const slidesRegion = component.regions.find((r) => r.id === 'slides');
        if (!Array.isArray(slidesRegion?.components)) {
            return [];
        }

        return slidesRegion.components
            .filter((comp) => comp.id && comp.typeId)
            .map((comp) => {
                const data = comp.data as Record<string, unknown> | undefined;
                const imageUrl = data?.imageUrl as { url?: string } | undefined;
                return {
                    id: comp.id,
                    title: (data?.title as string) || '',
                    subtitle: data?.subtitle as string | undefined,
                    imageUrl: imageUrl?.url || heroImage,
                    imageAlt: (data?.imageAlt as string) || '',
                    ctaText: data?.ctaText as string | undefined,
                    ctaLink: data?.ctaLink as string | undefined,
                };
            });
    }, [component]);

    // Use component data slides if available, otherwise use prop slides
    const slides = slidesFromComponent.length ? slidesFromComponent : propSlides;
    const [currentSlide, setCurrentSlide] = useState(0);
    const [api, setApi] = useState<CarouselApi | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    useEffect(() => {
        if (!autoPlay || !api || isPaused) return;

        const interval = setInterval(() => {
            api.scrollNext();
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [api, autoPlay, autoPlayInterval, isPaused]);

    const onSelect = useCallback(() => {
        if (!api) return;

        const currentIndex = api.selectedScrollSnap();
        const canPrev = api.canScrollPrev();
        const canNext = api.canScrollNext();

        setCurrentSlide(currentIndex);
        setCanScrollPrev(canPrev);
        setCanScrollNext(canNext);
    }, [api]);

    useEffect(() => {
        if (!api) return;
        onSelect();
        api.on('select', onSelect);
        api.on('reInit', onSelect);

        return () => {
            api.off('select', onSelect);
            api.off('reInit', onSelect);
        };
    }, [api, onSelect]);

    const goToSlide = useCallback(
        (index: number) => {
            if (!api || index < 0 || index >= slides.length) return;

            api.scrollTo(index);
        },
        [api, slides.length]
    );

    const handleFocus = useCallback(() => setIsPaused(true), []);
    const handleBlur = useCallback(() => setIsPaused(false), []);
    const handleMouseEnter = useCallback(() => setIsPaused(true), []);
    const handleMouseLeave = useCallback(() => setIsPaused(false), []);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (!api) return;

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    api.scrollPrev();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    api.scrollNext();
                    break;
                case 'Home':
                    event.preventDefault();
                    api.scrollTo(0);
                    break;
                case 'End':
                    event.preventDefault();
                    api.scrollTo(slides.length - 1);
                    break;
            }
        },
        [api, slides.length]
    );

    const emptyState = useMemo(
        () => (
            <div className="relative w-full h-[100vh] md:h-[85vh] flex items-center justify-center bg-muted">
                <p className="text-muted-foreground text-lg">No slides available</p>
            </div>
        ),
        []
    );

    if (!slides || slides.length === 0) {
        return emptyState;
    }

    return (
        <div
            className="relative w-full h-[100vh] md:h-[85vh] overflow-hidden"
            role="region"
            aria-label={`Hero carousel with ${slides.length} slides`}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onKeyDown={handleKeyDown}
            tabIndex={0}>
            <Carousel
                setApi={setApi}
                opts={{
                    align: 'center',
                    loop: true,
                    containScroll: 'trimSnaps',
                }}
                className="w-full h-full [&_[data-slot=carousel-content]]:h-full [&_[data-slot=carousel-item]]:h-full">
                {/* Passing -ml-4 to the CarouselContent to prevent CLS issues during hydration */}
                <CarouselContent className="h-full">
                    {slides.map((slide) => (
                        <CarouselItem key={slide.id} className="h-full">
                            <HeroSlideContent slide={image ? { ...slide, imageUrl: image.url } : slide} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            {showDots && slides.length > 1 && (
                <div
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2"
                    role="tablist"
                    aria-label="Slide navigation">
                    {slides.map((slide, index) => (
                        <DotButton
                            key={`dot-${slide.id}`}
                            index={index}
                            isActive={currentSlide === index}
                            totalSlides={slides.length}
                            onClick={goToSlide}
                        />
                    ))}
                </div>
            )}

            {showNavigation && slides.length > 1 && (
                <div className="absolute bottom-6 right-6 z-30 flex gap-2">
                    <NavigationButton
                        direction="prev"
                        onClick={() => api?.scrollPrev()}
                        disabled={!canScrollPrev}
                        currentSlide={currentSlide + 1}
                        totalSlides={slides.length}
                    />
                    <NavigationButton
                        direction="next"
                        onClick={() => api?.scrollNext()}
                        disabled={!canScrollNext}
                        currentSlide={currentSlide + 1}
                        totalSlides={slides.length}
                    />
                </div>
            )}

            <div className="sr-only" aria-live="polite" aria-atomic="true">
                Slide {currentSlide + 1} of {slides.length}: {slides[currentSlide]?.title}
            </div>
        </div>
    );
}

const DotButton = React.memo(
    ({
        index,
        isActive,
        totalSlides,
        onClick,
    }: {
        index: number;
        isActive: boolean;
        totalSlides: number;
        onClick: (index: number) => void;
    }): ReactElement => (
        <button
            onClick={() => onClick(index)}
            className={`transition-all duration-300 ${
                isActive ? 'w-8 h-2 bg-foreground' : 'w-2 h-2 bg-foreground/50 hover:bg-foreground/75'
            }`}
            role="tab"
            aria-selected={isActive}
            aria-label={`Go to slide ${index + 1} of ${totalSlides}`}
            tabIndex={isActive ? 0 : -1}
        />
    )
);

DotButton.displayName = 'DotButton';

const NavigationButton = React.memo(
    ({
        direction,
        onClick,
        disabled,
        currentSlide,
        totalSlides,
    }: {
        direction: 'prev' | 'next';
        onClick: () => void;
        disabled: boolean;
        currentSlide: number;
        totalSlides: number;
    }): ReactElement => {
        const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
        const label = direction === 'prev' ? 'Previous' : 'Next';

        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className="p-3 bg-foreground/10 hover:bg-foreground/20 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`${label} slide (${currentSlide} of ${totalSlides})`}>
                <Icon className="w-6 h-6 text-foreground" strokeWidth={2} />
            </button>
        );
    }
);

NavigationButton.displayName = 'NavigationButton';

const HeroSlideContent = React.memo(
    ({ slide }: { slide: HeroSlide }): ReactElement => (
        <div className="relative w-full h-full overflow-hidden">
            <img
                src={slide.imageUrl}
                alt={slide.imageAlt}
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto text-center" data-theme="light">
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 md:mb-6 leading-none tracking-tight">
                            {slide.title}
                        </h1>

                        {slide.subtitle && (
                            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-normal text-muted-foreground mb-4 sm:mb-6 md:mb-8 leading-none tracking-wide">
                                {slide.subtitle}
                            </p>
                        )}

                        <div className="flex justify-center">
                            <Button
                                asChild
                                className="text-sm sm:text-base md:text-lg lg:text-xl p-3 sm:p-4 md:p-5 lg:p-6">
                                <Link to={slide.ctaLink || '#'}>{slide.ctaText || 'Learn More'}</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
);

HeroSlideContent.displayName = 'HeroSlideContent';

/**
 * HeroCarouselWithSuspense component provides a HeroCarousel wrapped with a Suspense boundary.
 *
 * This component automatically shows the HeroCarouselSkeleton as a fallback while the
 * HeroCarousel is loading, providing better user experience during data fetching.
 *
 * When used with a `resolve` prop, the resolved data should be an object containing
 * slides data that will be passed as props to the HeroCarousel component.
 *
 * @example
 * ```tsx
 * // Basic usage with Suspense boundary
 * <HeroCarouselWithSuspense
 *   slides={heroSlides}
 *   autoPlay={true}
 *   showDots={true}
 * />
 *
 * // Usage with promise resolution as a prop
 * <HeroCarouselWithSuspense
 *   resolve={heroDataPromise}
 *   autoPlay={true}
 * />
 *
 * // Usage in a page with streaming
 * function HomePage() {
 *   return (
 *     <div>
 *       <HeroCarouselWithSuspense resolve={heroDataPromise} />
 *       <ProductCarouselWithSuspense resolve={productsPromise} />
 *     </div>
 *   );
 * }
 * ```
 */
const HeroCarousel = withSuspense(HeroCarouselPlain, {
    fallback: (props) => <HeroCarouselSkeleton {...props} />,
});

export default HeroCarousel;

// eslint-disable-next-line react-refresh/only-export-components
export { HeroCarouselSkeleton, HeroCarouselSkeleton as fallback };
