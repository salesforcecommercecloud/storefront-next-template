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
import { beforeEach, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mockConfig } from '@/test-utils/config';
import { isServer } from '@/lib/utils';
import { useDynamicImageContext } from '@/providers/dynamic-image';

// Mock decorators (minimal mocking to avoid testing them)
vi.mock('@/lib/decorators/component', () => ({
    Component: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/region-definition', () => ({
    RegionDefinition: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/attribute-definition', () => ({
    AttributeDefinition: () => () => {},
}));

import { DynamicImage } from './index';

const src =
    'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.jpg';

let mockConfigImages = {
    ...mockConfig.images,
};

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@salesforce/storefront-next-runtime/config')>();
    return {
        ...actual,
        useConfig: () => ({
            ...mockConfig,
            images: mockConfigImages,
        }),
    };
});

vi.mock('@/lib/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/utils')>();
    return {
        ...actual,
        isServer: vi.fn().mockReturnValue(false),
    };
});

const preloadMock = vi.fn();
vi.mock('react-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-dom')>();
    return {
        ...actual,
        preload: (...args: unknown[]) => preloadMock(...args),
    };
});

vi.mock('@/providers/dynamic-image', () => ({
    useDynamicImageContext: vi.fn().mockReturnValue(null),
}));

describe('Dynamic Image Component', () => {
    beforeEach(() => {
        mockConfigImages = {
            ...mockConfig.images,
        };
    });

    afterEach(() => {
        preloadMock.mockClear();
    });

    test('renders an image with default props', () => {
        render(<DynamicImage src={src} alt="Test image" />);

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', src);
        expect(img).toHaveAttribute('alt', 'Test image');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('fetchpriority', 'auto');
    });

    test('renders an image with custom className', () => {
        render(<DynamicImage src={src} alt="Test image" className="custom-class" />);

        const wrapper = screen.getByRole('img').parentElement;
        expect(wrapper).toHaveClass('custom-class');
    });

    test('renders with custom as prop', () => {
        const { container } = render(<DynamicImage src={src} alt="Test image" as="div" />);

        const element = container.querySelector('div[alt="Test image"]');
        expect(element).toBeInTheDocument();
        expect(element?.tagName).toBe('DIV');
        expect(element).toHaveAttribute('alt', 'Test image');
    });

    test('renders with low priority', () => {
        render(<DynamicImage src={src} alt="Test image" priority="low" />);

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('fetchpriority', 'low');
    });

    test('renders with high priority', () => {
        render(<DynamicImage src={src} alt="Test image" priority="high" />);

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('loading', 'eager');
        expect(img).toHaveAttribute('fetchpriority', 'high');
    });

    test('renders lazy with high priority', () => {
        render(<DynamicImage src={src} alt="Test image" loading="lazy" priority="high" />);

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('fetchpriority', 'high');
    });

    test('renders with custom imageProps', () => {
        render(
            <DynamicImage
                src={src}
                alt="Test image"
                imageProps={
                    {
                        title: 'Custom title',
                        'data-testid': 'custom-img',
                    } as any
                }
            />
        );

        const img = screen.getByTestId('custom-img');
        expect(img).toHaveAttribute('title', 'Custom title');
    });

    describe('responsive images', () => {
        test('renders responsive image with widths array', () => {
            render(<DynamicImage src={src} alt="Test image" widths={[100, 200, 400]} />);

            const picture = screen.getByRole('img').closest('picture');
            expect(picture).toBeInTheDocument();

            const sources = picture?.querySelectorAll('source');
            expect(sources).toHaveLength(3);

            // Check that sources have proper attributes
            sources?.forEach((source: any, index: number) => {
                expect(source).toHaveAttribute('srcset');
                expect(source).toHaveAttribute('sizes');
                if (index < sources.length - 1) {
                    expect(source).toHaveAttribute('media');
                }
            });
        });

        test('renders responsive image with vw widths', () => {
            render(<DynamicImage src={src} alt="Test image" widths={['50vw', '100vw', '25vw']} />);

            const picture = screen.getByRole('img').closest('picture');
            expect(picture).toBeInTheDocument();

            const sources = picture?.querySelectorAll('source');
            expect(sources).toHaveLength(5);
        });

        test('renders responsive image with breakpoint object', () => {
            render(<DynamicImage src={src} alt="Test image" widths={{ base: 100, sm: 200, md: 400 }} />);

            const picture = screen.getByRole('img').closest('picture');
            expect(picture).toBeInTheDocument();

            const sources = picture?.querySelectorAll('source');
            expect(sources).toHaveLength(3);
        });

        test('renders simple image without widths', () => {
            render(<DynamicImage src={src} alt="Test image" />);

            const img = screen.getByRole('img');
            expect(img).toBeInTheDocument();
            expect(img.closest('picture')).not.toBeInTheDocument();
        });

        test('renders image with SFCC URL and sw parameter', () => {
            const sfccSrc = 'https://example.com/image.jpg?sw=300&q=60';
            render(<DynamicImage src={sfccSrc} alt="Test image" widths={[468]} />);

            const picture = screen.getByRole('img').closest('picture');
            expect(picture).toBeInTheDocument();

            const sources = picture?.querySelectorAll('source');
            expect(sources).toHaveLength(1);

            const srcset = sources?.[0]?.getAttribute('srcset');
            expect(srcset).toContain('sw=468');
        });
    });

    describe('edge cases', () => {
        test('handles empty widths array', () => {
            render(<DynamicImage src={src} alt="Test image" widths={[]} />);

            const img = screen.getByRole('img');
            expect(img).toBeInTheDocument();
            expect(img.closest('picture')).not.toBeInTheDocument();
        });

        test('handles undefined alt', () => {
            // eslint-disable-next-line jsx-a11y/alt-text
            render(<DynamicImage src={src} />);

            const img = screen.getByRole('presentation');
            expect(img).toHaveAttribute('alt', '');
        });

        test('handles custom loading values', () => {
            render(<DynamicImage src={src} alt="Test image" loading="eager" />);

            const img = screen.getByRole('img');
            expect(img).toHaveAttribute('loading', 'eager');
        });

        test('handles mixed width types', () => {
            render(<DynamicImage src={src} alt="Test image" widths={[100, '50vw', 300]} />);

            const picture = screen.getByRole('img').closest('picture');
            expect(picture).toBeInTheDocument();

            const sources = picture?.querySelectorAll('source');
            expect(sources).toHaveLength(3);
        });
    });

    describe('Page Designer image object src', () => {
        test('resolves src from absURL property', () => {
            render(<DynamicImage src={{ absURL: src, url: 'ignored' } as unknown as string} alt="Test image" />);
            const img = screen.getByRole('img');
            expect(img.getAttribute('src')).toContain('absURL' in { absURL: src } ? src.split('/').pop() : '');
            expect(img).toBeInTheDocument();
        });

        test('resolves src from url property when absURL is absent', () => {
            render(<DynamicImage src={{ url: src } as unknown as string} alt="Test image" />);
            const img = screen.getByRole('img');
            expect(img).toBeInTheDocument();
            expect(img.getAttribute('src')).toBeTruthy();
        });

        test('resolves src from disBaseLink property when absURL and url are absent', () => {
            render(<DynamicImage src={{ disBaseLink: src } as unknown as string} alt="Test image" />);
            const img = screen.getByRole('img');
            expect(img).toBeInTheDocument();
            expect(img.getAttribute('src')).toBeTruthy();
        });

        test('resolves src from link property as last resort', () => {
            render(<DynamicImage src={{ link: src } as unknown as string} alt="Test image" />);
            const img = screen.getByRole('img');
            expect(img).toBeInTheDocument();
            expect(img.getAttribute('src')).toBeTruthy();
        });

        test('renders without crashing when image object has no recognized URL property', () => {
            render(<DynamicImage src={{ _type: 'image' } as unknown as string} alt="Test image" />);
            const img = screen.getByRole('img');
            expect(img).toBeInTheDocument();
            // No recognized URL property resolves to empty string — React omits the src attribute
            expect(img.getAttribute('src')).toBeNull();
        });

        test('does not throw when src is a plain string', () => {
            expect(() => render(<DynamicImage src={src} alt="Test image" />)).not.toThrow();
            expect(screen.getByRole('img')).toBeInTheDocument();
        });

        test('does not throw when src is undefined', () => {
            expect(() => render(<DynamicImage src={undefined as unknown as string} alt="Test image" />)).not.toThrow();
            expect(screen.getByRole('img')).toBeInTheDocument();
        });
    });

    describe('image format conversion', () => {
        test('converts non-jpg image to picture with webp sources and jpg fallback', () => {
            const pngSrc = 'https://example.com/image.png?sw=300&q=60';
            render(<DynamicImage src={pngSrc} alt="Test image" widths={[200, 400]} />);

            const picture = screen.getByRole('img').closest('picture');
            expect(picture).toBeInTheDocument();

            // All sources should have webp format with sfrm=png parameter
            const sources = picture?.querySelectorAll('source');
            sources?.forEach((source) => {
                const srcset = source.getAttribute('srcset');
                expect(srcset).toContain('.webp');
                expect(srcset).toContain('sfrm=png');
            });

            // Fallback img should be jpg format with sfrm=png parameter
            const img = screen.getByRole('img');
            const imgSrc = img.getAttribute('src');
            expect(imgSrc).toContain('.jpg');
            expect(imgSrc).toContain('sfrm=png');
            expect(imgSrc).not.toContain('.png');
        });

        test('converts webp image to picture with webp sources and jpg fallback', () => {
            const webpSrc = 'https://example.com/image.webp?sw=300&q=60';
            render(<DynamicImage src={webpSrc} alt="Test image" widths={[200]} />);

            const picture = screen.getByRole('img').closest('picture');
            expect(picture).toBeInTheDocument();

            // Sources should remain webp (no change needed)
            const sources = picture?.querySelectorAll('source');
            sources?.forEach((source) => {
                const srcset = source.getAttribute('srcset');
                expect(srcset).toContain('.webp');
                // No sfrm parameter when source is already webp
                expect(srcset).not.toContain('sfrm=');
            });

            // Fallback img should be converted to jpg with sfrm=webp
            const img = screen.getByRole('img');
            const imgSrc = img.getAttribute('src');
            expect(imgSrc).toContain('.jpg');
            expect(imgSrc).toContain('sfrm=webp');
        });

        test('converts jpg image to picture with webp sources and jpg fallback', () => {
            const jpgSrc = 'https://example.com/image.jpg?sw=300&q=60';
            render(<DynamicImage src={jpgSrc} alt="Test image" widths={[200]} />);

            const picture = screen.getByRole('img').closest('picture');
            expect(picture).toBeInTheDocument();

            // Sources should be webp with sfrm=jpg
            const sources = picture?.querySelectorAll('source');
            sources?.forEach((source) => {
                const srcset = source.getAttribute('srcset');
                expect(srcset).toContain('.webp');
                expect(srcset).toContain('sfrm=jpg');
            });

            // Fallback img should remain jpg (no change needed)
            const img = screen.getByRole('img');
            const imgSrc = img.getAttribute('src');
            expect(imgSrc).toContain('.jpg');
            // No sfrm parameter when target is already jpg
            expect(imgSrc).not.toContain('sfrm=');
        });
    });

    describe('quality parameter', () => {
        beforeEach(() => {
            mockConfigImages = {
                ...mockConfig.images,
            };
        });

        test('applies default quality from config to srcSet URLs', () => {
            // Default quality in mockConfig.images is 70
            const srcWithoutQuality = 'https://example.com/image.jpg';
            render(<DynamicImage src={srcWithoutQuality} alt="Test image" widths={[200]} />);

            const picture = screen.getByRole('img').closest('picture');
            const sources = picture?.querySelectorAll('source');

            sources?.forEach((source) => {
                const srcset = source.getAttribute('srcset');
                expect(srcset).toContain('q=70');
            });
        });

        test('applies custom quality from config override to srcSet URLs', () => {
            mockConfigImages = { ...mockConfig.images, quality: 85 };

            const srcWithoutQuality = 'https://example.com/image.jpg';
            render(<DynamicImage src={srcWithoutQuality} alt="Test image" widths={[200]} />);

            const picture = screen.getByRole('img').closest('picture');
            const sources = picture?.querySelectorAll('source');

            sources?.forEach((source) => {
                const srcset = source.getAttribute('srcset');
                expect(srcset).toContain('q=85');
            });
        });

        test('existing q parameter in URL takes priority over config quality', () => {
            mockConfigImages = { ...mockConfig.images, quality: 85 };

            const srcWithQuality = 'https://example.com/image.jpg?q=60';
            render(<DynamicImage src={srcWithQuality} alt="Test image" widths={[200]} />);

            const picture = screen.getByRole('img').closest('picture');
            const sources = picture?.querySelectorAll('source');

            sources?.forEach((source) => {
                const srcset = source.getAttribute('srcset');
                // URL's q=60 should be preserved, not overwritten by config's 85
                expect(srcset).toContain('q=60');
                expect(srcset).not.toContain('q=85');
            });
        });
    });

    describe('formats parameter', () => {
        beforeEach(() => {
            mockConfigImages = {
                ...mockConfig.images,
            };
        });

        test('applies default formats from config to source types', () => {
            // Default formats in mockConfig.images is ['webp']
            const srcWithoutFormat = 'https://example.com/image.jpg';
            render(<DynamicImage src={srcWithoutFormat} alt="Test image" widths={[200]} />);

            const picture = screen.getByRole('img').closest('picture');
            const sources = picture?.querySelectorAll('source');

            // Should have 1 source per breakpoint (only webp format)
            expect(sources?.length).toBe(1);
            sources?.forEach((source) => {
                expect(source).toHaveAttribute('type', 'image/webp');
            });
        });

        test('applies custom formats from config override to source types', () => {
            mockConfigImages = { ...mockConfig.images, formats: ['avif', 'webp'] };

            const srcWithoutFormat = 'https://example.com/image.jpg';
            render(<DynamicImage src={srcWithoutFormat} alt="Test image" widths={[200]} />);

            const picture = screen.getByRole('img').closest('picture');
            const sources = picture?.querySelectorAll('source');

            // Should have 2 sources (avif and webp) for the single breakpoint
            expect(sources?.length).toBe(2);

            const types = Array.from(sources || []).map((s) => s.getAttribute('type'));
            expect(types).toContain('image/avif');
            expect(types).toContain('image/webp');
        });
    });

    describe('fallbackFormat parameter', () => {
        test('applies default fallbackFormat from config to img src', () => {
            // Default fallbackFormat in mockConfig.images is 'jpg'
            const pngSrc = 'https://example.com/image.png';
            render(<DynamicImage src={pngSrc} alt="Test image" widths={[200]} />);

            const img = screen.getByRole('img');
            const imgSrc = img.getAttribute('src');

            // Fallback should be converted to jpg
            expect(imgSrc).toContain('.jpg');
            expect(imgSrc).toContain('sfrm=png');
        });

        test('applies custom fallbackFormat from config override to img src', () => {
            mockConfigImages = { ...mockConfig.images, fallbackFormat: 'png' };

            const jpgSrc = 'https://example.com/image.jpg';
            render(<DynamicImage src={jpgSrc} alt="Test image" widths={[200]} />);

            const img = screen.getByRole('img');
            const imgSrc = img.getAttribute('src');

            // Fallback should be converted to png
            expect(imgSrc).toContain('.png');
            expect(imgSrc).toContain('sfrm=jpg');
        });
    });

    describe('preload links', () => {
        describe('client-side', () => {
            test('does not call preload when priority is low (default)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} />);
                expect(preloadMock).not.toHaveBeenCalled();
            });

            test('does not call preload when priority is low (explicit)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} priority="low" />);
                expect(preloadMock).not.toHaveBeenCalled();
            });

            test('does not call preload (even though priority is high)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} priority="high" />);
                expect(preloadMock).not.toHaveBeenCalled();
            });
        });

        describe('server-side', () => {
            beforeEach(() => {
                (isServer as Mock).mockReturnValue(true);
            });

            afterEach(() => {
                (isServer as Mock).mockReturnValue(false);
            });

            test('does not call preload when priority is low (default)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} />);
                expect(preloadMock).not.toHaveBeenCalled();
            });

            test('does not call preload when priority is low (explicit)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} priority="low" />);
                expect(preloadMock).not.toHaveBeenCalled();
            });

            test('calls preload for each link when priority is high', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} priority="high" />);
                expect(preloadMock).toHaveBeenCalledTimes(2);
                expect(preloadMock).toHaveBeenNthCalledWith(
                    1,
                    expect.any(String),
                    expect.objectContaining({
                        as: 'image',
                        fetchPriority: 'high',
                        imageSizes: '200px',
                        imageSrcSet:
                            'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.webp?sw=200&q=70&sfrm=jpg 200w, https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.webp?sw=400&q=70&sfrm=jpg 400w',
                        media: '(max-width: 639px)',
                        type: 'image/webp',
                    })
                );
                expect(preloadMock).toHaveBeenNthCalledWith(
                    2,
                    expect.any(String),
                    expect.objectContaining({
                        as: 'image',
                        fetchPriority: 'high',
                        imageSizes: '400px',
                        imageSrcSet:
                            'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.webp?sw=400&q=70&sfrm=jpg 400w, https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.webp?sw=800&q=70&sfrm=jpg 800w',
                        media: '(min-width: 640px)',
                        type: 'image/webp',
                    })
                );
            });
        });
    });

    describe('DynamicImageContext integration', () => {
        beforeEach(() => {
            (useDynamicImageContext as Mock).mockReturnValue(null);
        });

        test('renders with default priority when no context is available', () => {
            render(<DynamicImage src={src} alt="Test image" />);

            const img = screen.getByRole('img');
            expect(img).toHaveAttribute('fetchpriority', 'auto');
            expect(img).toHaveAttribute('loading', 'lazy');
        });

        test('renders with high priority when context.hasSource returns true', () => {
            const mockHasSource = vi.fn().mockReturnValue(true);
            (useDynamicImageContext as Mock).mockReturnValue({
                hasSource: mockHasSource,
                addSource: vi.fn(),
            });

            render(<DynamicImage src={src} alt="Test image" />);

            const img = screen.getByRole('img');
            expect(mockHasSource).toHaveBeenCalledWith(src);
            expect(img).toHaveAttribute('fetchpriority', 'high');
            expect(img).toHaveAttribute('loading', 'eager');
        });

        test('renders with default priority when context.hasSource returns false', () => {
            const mockHasSource = vi.fn().mockReturnValue(false);
            (useDynamicImageContext as Mock).mockReturnValue({
                hasSource: mockHasSource,
                addSource: vi.fn(),
            });

            render(<DynamicImage src={src} alt="Test image" />);

            const img = screen.getByRole('img');
            expect(mockHasSource).toHaveBeenCalledWith(src);
            expect(img).toHaveAttribute('fetchpriority', 'auto');
            expect(img).toHaveAttribute('loading', 'lazy');
        });

        test('explicit priority prop overrides context-based priority', () => {
            const mockHasSource = vi.fn().mockReturnValue(true);
            (useDynamicImageContext as Mock).mockReturnValue({
                hasSource: mockHasSource,
                addSource: vi.fn(),
            });

            render(<DynamicImage src={src} alt="Test image" priority="low" />);

            const img = screen.getByRole('img');
            // hasSource should not be called when priority is explicitly set
            expect(img).toHaveAttribute('fetchpriority', 'low');
            expect(img).toHaveAttribute('loading', 'lazy');
        });

        test('calls preload on server when context.hasSource returns true', () => {
            (isServer as Mock).mockReturnValue(true);
            const mockHasSource = vi.fn().mockReturnValue(true);
            (useDynamicImageContext as Mock).mockReturnValue({
                hasSource: mockHasSource,
                addSource: vi.fn(),
            });

            render(<DynamicImage src={src} alt="Test image" widths={[200]} />);

            expect(preloadMock).toHaveBeenCalledTimes(1);
            expect(preloadMock).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    as: 'image',
                    fetchPriority: 'high',
                })
            );
        });

        test('does not call preload on server when context.hasSource returns false', () => {
            (isServer as Mock).mockReturnValue(true);
            const mockHasSource = vi.fn().mockReturnValue(false);
            (useDynamicImageContext as Mock).mockReturnValue({
                hasSource: mockHasSource,
                addSource: vi.fn(),
            });

            render(<DynamicImage src={src} alt="Test image" widths={[200]} />);

            expect(preloadMock).not.toHaveBeenCalled();
        });
    });

    describe('Page Designer Styling Props', () => {
        test('applies objectFit class to image', () => {
            render(<DynamicImage src={src} alt="Test" objectFit="contain" />);
            const img = screen.getByRole('img');
            expect(img.className).toContain('object-contain');
        });

        test('applies borderRadius class to wrapper', () => {
            render(<DynamicImage src={src} alt="Test" borderRadius="lg" />);
            const wrapper = screen.getByRole('img').parentElement;
            expect(wrapper?.className).toContain('rounded-lg');
        });

        test('applies boxShadow class to wrapper', () => {
            render(<DynamicImage src={src} alt="Test" boxShadow="xl" />);
            const wrapper = screen.getByRole('img').parentElement;
            expect(wrapper?.className).toContain('shadow-xl');
        });

        test('applies padding class to wrapper', () => {
            render(<DynamicImage src={src} alt="Test" padding="4" />);
            const wrapper = screen.getByRole('img').parentElement;
            expect(wrapper?.className).toContain('p-4');
        });

        test('applies margin class to wrapper', () => {
            render(<DynamicImage src={src} alt="Test" margin="2" />);
            const wrapper = screen.getByRole('img').parentElement;
            expect(wrapper?.className).toContain('m-2');
        });

        test('applies hoverEffect class to wrapper', () => {
            render(<DynamicImage src={src} alt="Test" hoverEffect="scale" />);
            const wrapper = screen.getByRole('img').parentElement;
            expect(wrapper?.className).toContain('hover:scale-105');
        });

        test('includes overflow-hidden only when borderRadius is applied', () => {
            // Without borderRadius, should not have overflow-hidden
            const { rerender } = render(<DynamicImage src={src} alt="Test" />);
            let wrapper = screen.getByRole('img').parentElement;
            expect(wrapper?.className).not.toContain('overflow-hidden');

            // With borderRadius, should have overflow-hidden
            rerender(<DynamicImage src={src} alt="Test" borderRadius="lg" />);
            wrapper = screen.getByRole('img').parentElement;
            expect(wrapper?.className).toContain('overflow-hidden');
        });

        test('applies multiple styling props correctly', () => {
            render(
                <DynamicImage
                    src={src}
                    alt="Test"
                    objectFit="contain"
                    borderRadius="xl"
                    boxShadow="lg"
                    padding="4"
                    margin="2"
                    hoverEffect="scale"
                />
            );

            const wrapper = screen.getByRole('img').parentElement;
            const img = screen.getByRole('img');

            // Wrapper styles
            expect(wrapper?.className).toContain('rounded-xl');
            expect(wrapper?.className).toContain('shadow-lg');
            expect(wrapper?.className).toContain('p-4');
            expect(wrapper?.className).toContain('m-2');
            expect(wrapper?.className).toContain('hover:scale-105');
            expect(wrapper?.className).toContain('overflow-hidden');

            // Image styles
            expect(img.className).toContain('object-contain');
        });

        test('parses widths string from Page Designer', () => {
            render(<DynamicImage src={src} alt="Test" widths="400,800,1200" />);
            // The component should render without errors
            const img = screen.getByRole('img');
            expect(img).toBeInTheDocument();
        });

        test('does not pass Page Designer props to DOM', () => {
            render(
                <DynamicImage
                    src={src}
                    alt="Test"
                    regionId="test-region"
                    component={{} as any}
                    componentData={{}}
                    designMetadata={{} as any}
                    data={{}}
                />
            );

            const wrapper = screen.getByRole('img').parentElement;
            expect(wrapper).not.toHaveAttribute('regionId');
            expect(wrapper).not.toHaveAttribute('component');
            expect(wrapper).not.toHaveAttribute('componentData');
            expect(wrapper).not.toHaveAttribute('designMetadata');
            expect(wrapper).not.toHaveAttribute('data');
        });
    });
});
