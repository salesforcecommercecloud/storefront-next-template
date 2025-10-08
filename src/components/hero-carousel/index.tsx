import React, { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    slides: HeroSlide[];
    autoPlay?: boolean;
    autoPlayInterval?: number;
    showDots?: boolean;
    showNavigation?: boolean;
}

export default function HeroCarousel({
    slides,
    autoPlay = true,
    autoPlayInterval = 5000,
    showDots = true,
    showNavigation = true,
}: HeroCarouselProps): ReactElement {
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
            <div className="relative w-full max-h-[70vh] flex items-center justify-center bg-muted">
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
            className="relative w-full max-h-[70vh]"
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
                    align: 'start',
                    loop: true,
                }}
                className="w-full h-full">
                <CarouselContent className="-ml-0 h-full">
                    {slides.map((slide) => (
                        <CarouselItem key={slide.id} className="pl-0 h-full">
                            <HeroSlideContent slide={slide} />
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
                <div className="absolute bottom-6 right-6 z-20 hidden md:flex items-center space-x-2">
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
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isActive
                    ? 'bg-white dark:bg-black scale-125'
                    : 'bg-white/50 dark:bg-black/50 hover:bg-white/75 dark:hover:bg-black/75'
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
                className="w-10 h-10 rounded-full bg-background border border-border hover:bg-accent flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`${label} slide (${currentSlide} of ${totalSlides})`}>
                <Icon className="h-4 w-4 text-foreground" />
            </button>
        );
    }
);

NavigationButton.displayName = 'NavigationButton';

const HeroSlideContent = React.memo(
    ({ slide }: { slide: HeroSlide }): ReactElement => (
        <div className="relative w-full h-full min-h-[300px] max-h-[70vh] overflow-hidden">
            <img
                src={slide.imageUrl}
                alt={slide.imageAlt}
                fetchPriority="high"
                className="w-full h-full min-h-[300px] object-cover"
            />

            <div className="absolute inset-0 z-10 flex items-center">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl">
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 md:mb-6 leading-none tracking-tight">
                            {slide.title}
                        </h1>

                        {slide.subtitle && (
                            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-normal text-muted-foreground mb-4 sm:mb-6 md:mb-8 leading-none tracking-wide">
                                {slide.subtitle}
                            </p>
                        )}

                        <Button asChild className="text-sm sm:text-base md:text-lg lg:text-xl p-3 sm:p-4 md:p-5 lg:p-6">
                            <Link to={slide.ctaLink || '#'}>{slide.ctaText || 'Learn More'}</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
);

HeroSlideContent.displayName = 'HeroSlideContent';
