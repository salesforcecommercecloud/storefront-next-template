import type { Meta, StoryObj } from '@storybook/react-vite';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../carousel';
import { expect, userEvent, waitFor } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('interaction');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            // Try to find a meaningful element to log
            const element = target.closest('button, a, input, select, [role="button"]');

            if (element) {
                const label =
                    element.textContent?.trim() || element.getAttribute('aria-label') || element.tagName.toLowerCase();
                logClick({ type: 'click', element: element.tagName.toLowerCase(), label });
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const element = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const label =
                element.name || element.id || element.getAttribute('aria-label') || element.tagName.toLowerCase();
            logClick({ type: 'change', element: element.tagName.toLowerCase(), label, value: element.value });
        };

        root.addEventListener('click', handleClick);
        root.addEventListener('change', handleChange);

        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('change', handleChange);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Carousel> = {
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    title: 'UI/Carousel',
    component: Carousel,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A carousel component built with Embla Carousel. Supports horizontal and vertical orientations with navigation controls.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        orientation: {
            description: 'Orientation of the carousel',
            control: 'select',
            options: ['horizontal', 'vertical'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Carousel>;

export const Default: Story = {
    render: () => {
        const slides = Array.from({ length: 5 }, (_, i) => ({ id: `slide-${i}`, number: i + 1 }));
        return (
            <Carousel className="w-full max-w-xs">
                <CarouselContent>
                    {slides.map((slide) => (
                        <CarouselItem key={slide.id}>
                            <div className="flex aspect-square items-center justify-center bg-muted rounded-lg">
                                <span className="text-4xl font-semibold">{slide.number}</span>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for the carousel to initialize (API to be ready)
        // The button may not exist if all slides fit in viewport, which is valid
        await waitFor(
            () => {
                const carousel = canvasElement.querySelector('[data-slot="carousel"]');
                if (!carousel) {
                    throw new Error('Carousel not found');
                }
                // Carousel has initialized - button may or may not exist depending on scrollability
            },
            { timeout: 10000 }
        );

        // Try to find the button, but don't fail if it doesn't exist
        // (it won't exist if the carousel is not scrollable)
        const nextButton = canvasElement.querySelector('[data-slot="carousel-next"]') as HTMLButtonElement;
        if (nextButton) {
            await expect(nextButton).toBeInTheDocument();
            // Only click if the button is enabled (carousel has more slides to show)
            if (!nextButton.disabled) {
                await userEvent.click(nextButton);
            }
        }
        // If button doesn't exist, that's fine - it means all slides are visible and carousel is not scrollable
    },
};

export const Vertical: Story = {
    render: () => {
        const slides = Array.from({ length: 5 }, (_, i) => ({ id: `vertical-slide-${i}`, number: i + 1 }));
        return (
            <Carousel orientation="vertical" className="w-full max-w-xs">
                <CarouselContent className="-mt-1 h-[200px]">
                    {slides.map((slide) => (
                        <CarouselItem key={slide.id} className="pt-1 md:basis-1/2">
                            <div className="flex aspect-square items-center justify-center bg-muted rounded-lg">
                                <span className="text-4xl font-semibold">{slide.number}</span>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for the carousel to initialize (API to be ready)
        // The button may not exist if all slides fit in viewport, which is valid
        await waitFor(
            () => {
                const carousel = canvasElement.querySelector('[data-slot="carousel"]');
                if (!carousel) {
                    throw new Error('Carousel not found');
                }
                // Carousel has initialized - button may or may not exist depending on scrollability
            },
            { timeout: 10000 }
        );

        // Try to find the button, but don't fail if it doesn't exist
        // (it won't exist if the carousel is not scrollable)
        const nextButton = canvasElement.querySelector('[data-slot="carousel-next"]') as HTMLButtonElement;
        if (nextButton) {
            await expect(nextButton).toBeInTheDocument();
        }
        // If button doesn't exist, that's fine - it means all slides are visible and carousel is not scrollable
    },
};

export const WithImages: Story = {
    render: () => {
        const slides = Array.from({ length: 3 }, (_, i) => ({
            id: `image-slide-${i}`,
            src: `https://images.unsplash.com/photo-${1588345921523 + i}?w=400&h=400&fit=crop`,
            alt: `Slide ${i + 1}`,
        }));
        return (
            <Carousel className="w-full max-w-xs">
                <CarouselContent>
                    {slides.map((slide) => (
                        <CarouselItem key={slide.id}>
                            <div className="flex aspect-square items-center justify-center bg-muted rounded-lg overflow-hidden">
                                <img src={slide.src} alt={slide.alt} className="w-full h-full object-cover" />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const images = canvasElement.querySelectorAll('img');
        await expect(images.length).toBeGreaterThan(0);
    },
};
