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
import { DynamicImage } from './index';

const src =
    'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.jpg';

let mockConfigImages = {
    ...mockConfig.images,
};

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        useConfig: () => ({
            ...mockConfig,
            images: mockConfigImages,
        }),
    };
});

vi.mock('@/lib/utils', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        isServer: vi.fn().mockReturnValue(false),
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
            test('does not render preload links when priority is low (default)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} />);
                expect(document.querySelectorAll('link[rel="preload"]')).toHaveLength(0);
            });

            test('does not render preload links when priority is low (explicit)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} priority="low" />);
                expect(document.querySelectorAll('link[rel="preload"]')).toHaveLength(0);
            });

            test('does not render preload links (even though priority is high)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200]} priority="high" />);
                expect(document.querySelectorAll('link[rel="preload"]')).toHaveLength(0);
            });
        });

        describe('server-side', () => {
            beforeEach(() => {
                (isServer as Mock).mockReturnValue(true);
            });

            afterEach(() => {
                (isServer as Mock).mockReturnValue(false);
            });

            test('does not render preload links when priority is low (default)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} />);
                expect(document.querySelectorAll('link[rel="preload"]')).toHaveLength(0);
            });

            test('does not render preload links when priority is low (explicit)', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} priority="low" />);
                expect(document.querySelectorAll('link[rel="preload"]')).toHaveLength(0);
            });

            test('renders preload links when priority is high', () => {
                render(<DynamicImage src={src} alt="Test image" widths={[200, 400]} priority="high" />);
                const preloadLinks = document.querySelectorAll('link[rel="preload"]');
                expect(preloadLinks).toHaveLength(2);
                expect(preloadLinks.item(0)).toBeInstanceOf(HTMLLinkElement);
                expect(preloadLinks.item(1)).toBeInstanceOf(HTMLLinkElement);
                expect(
                    Object.fromEntries(Array.from(preloadLinks.item(0).attributes, (attr) => [attr.name, attr.value]))
                ).toEqual({
                    as: 'image',
                    fetchpriority: 'high',
                    imagesizes: '200px',
                    imagesrcset:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.webp?sw=200&q=70&sfrm=jpg 200w, https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.webp?sw=400&q=70&sfrm=jpg 400w',
                    media: '(max-width: 639px)',
                    rel: 'preload',
                    type: 'image/webp',
                });
                expect(
                    Object.fromEntries(Array.from(preloadLinks.item(1).attributes, (attr) => [attr.name, attr.value]))
                ).toEqual({
                    as: 'image',
                    fetchpriority: 'high',
                    imagesizes: '400px',
                    imagesrcset:
                        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.webp?sw=400&q=70&sfrm=jpg 400w, https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw4cd0a798/images/large/PG.10216885.JJ169XX.PZ.webp?sw=800&q=70&sfrm=jpg 800w',
                    media: '(min-width: 640px)',
                    rel: 'preload',
                    type: 'image/webp',
                });
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

        test('renders preload links on server when context.hasSource returns true', () => {
            (isServer as Mock).mockReturnValue(true);
            const mockHasSource = vi.fn().mockReturnValue(true);
            (useDynamicImageContext as Mock).mockReturnValue({
                hasSource: mockHasSource,
                addSource: vi.fn(),
            });

            render(<DynamicImage src={src} alt="Test image" widths={[200]} />);

            const preloadLinks = document.querySelectorAll('link[rel="preload"]');
            expect(preloadLinks).toHaveLength(1);
            expect(preloadLinks.item(0)).toHaveAttribute('fetchpriority', 'high');
        });

        test('does not render preload links on server when context.hasSource returns false', () => {
            (isServer as Mock).mockReturnValue(true);
            const mockHasSource = vi.fn().mockReturnValue(false);
            (useDynamicImageContext as Mock).mockReturnValue({
                hasSource: mockHasSource,
                addSource: vi.fn(),
            });

            render(<DynamicImage src={src} alt="Test image" widths={[200]} />);

            const preloadLinks = document.querySelectorAll('link[rel="preload"]');
            expect(preloadLinks).toHaveLength(0);
        });
    });
});
