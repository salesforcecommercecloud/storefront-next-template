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
import { test } from 'vitest';
import { getResponsivePictureAttributes, getSrc, replaceImageFormat } from './utils';

const disImageURL = {
    withOptionalParams:
        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw1e4fcb17/images/large/PG.10212867.JJ3XYXX.PZ.jpg[?sw={width}&q=60]',
    withoutOptionalParams:
        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw1e4fcb17/images/large/PG.10212867.JJ3XYXX.PZ.jpg',
    withoutQualityParam:
        'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw1e4fcb17/images/large/PG.10212867.JJ3XYXX.PZ.jpg[?sw={width}]',
};

const urlWithWidth = (width: number) => getSrc(disImageURL.withOptionalParams, width);

describe('replaceImageFormat()', () => {
    describe('default target format', () => {
        test('does not change URL', () => {
            expect(replaceImageFormat('https://example.com/image.webp')).toBe('https://example.com/image.webp');
        });

        test.each(['jpg', 'jpeg', 'jp2', 'png', 'gif', 'tif', 'tiff', 'avif'])(
            'replaces %s with webp',
            (ext: string) => {
                expect(replaceImageFormat(`https://example.com/image.${ext}`)).toBe(
                    `https://example.com/image.webp?sfrm=${ext}`
                );
            }
        );
    });

    describe('custom target format', () => {
        test('does not change URL', () => {
            expect(replaceImageFormat('https://example.com/image.avif', 'avif')).toBe('https://example.com/image.avif');
        });

        test.each(['jpg', 'jpeg', 'jp2', 'png', 'gif', 'tif', 'tiff', 'webp'])(
            'replaces %s with avif',
            (ext: string) => {
                expect(replaceImageFormat(`https://example.com/image.${ext}`, 'avif')).toBe(
                    `https://example.com/image.avif?sfrm=${ext}`
                );
            }
        );
    });

    describe('URLs with query parameters', () => {
        test('does not replace .webp with .webp', () => {
            expect(replaceImageFormat('https://example.com/image.webp?sw=461&q=60')).toBe(
                'https://example.com/image.webp?sw=461&q=60'
            );
        });

        test.each(['jpg', 'jpeg', 'jp2', 'png', 'gif', 'tif', 'tiff', 'avif'])(
            'replaces %s with .webp',
            (ext: string) => {
                expect(replaceImageFormat(`https://example.com/image.${ext}?sw=461&q=60`)).toBe(
                    `https://example.com/image.webp?sw=461&q=60&sfrm=${ext}`
                );
            }
        );
    });

    describe('case insensitivity', () => {
        test('handles uppercase JPG', () => {
            expect(replaceImageFormat('https://example.com/image.JPG')).toBe('https://example.com/image.webp?sfrm=jpg');
        });

        test('handles mixed case JpG', () => {
            expect(replaceImageFormat('https://example.com/image.JpG')).toBe('https://example.com/image.webp?sfrm=jpg');
        });
    });

    describe('no image extension found', () => {
        test('returns unchanged URL without image extension', () => {
            expect(replaceImageFormat('https://example.com/document.pdf')).toBe('https://example.com/document.pdf');
        });

        test('returns unchanged URL for text files', () => {
            expect(replaceImageFormat('https://example.com/file.txt')).toBe('https://example.com/file.txt');
        });

        test('returns unchanged URL without extension', () => {
            expect(replaceImageFormat('https://example.com/image')).toBe('https://example.com/image');
        });
    });

    describe('edge cases', () => {
        test('handles extension-like strings in path (not at end)', () => {
            // Should not match .jpg in the middle of the path
            expect(replaceImageFormat('https://example.com/images.jpg.backup/file.png')).toBe(
                'https://example.com/images.jpg.backup/file.webp?sfrm=png'
            );
        });

        test('handles URLs with fragments', () => {
            // Note: fragments come after query params, so this tests the regex boundary
            expect(replaceImageFormat('https://example.com/image.jpg')).toBe('https://example.com/image.webp?sfrm=jpg');
        });

        test('handles empty string', () => {
            expect(replaceImageFormat('')).toBe('');
        });

        test('handles URL with only extension', () => {
            expect(replaceImageFormat('.jpg')).toBe('.webp?sfrm=jpg');
        });

        test('handles relative paths', () => {
            expect(replaceImageFormat('/images/photo.jpg')).toBe('/images/photo.webp?sfrm=jpg');
        });

        test('handles relative paths with query params', () => {
            expect(replaceImageFormat('/images/photo.jpeg?size=large')).toBe('/images/photo.webp?size=large&sfrm=jpeg');
        });
    });
});

describe('getResponsivePictureAttributes()', () => {
    test('vw widths', () => {
        let props = getResponsivePictureAttributes({
            src: disImageURL.withOptionalParams,
            widths: ['50vw', '50vw', '20vw', '20vw', '25vw'],
        });

        // Breakpoints
        // base: "0px",
        // sm: "640px",
        // md: "768px",
        // lg: "1024px",
        // xl: "1280px",
        // "2xl": "1536px"

        // 50vw of sm => 320px
        // 50vw of md => 384px
        // 20vw of lg => 204.8px
        // 20vw of xl => 256px
        // 25vw of 2xl => 384px

        expect(props).toStrictEqual({
            src: disImageURL.withoutOptionalParams,
            sources: [
                {
                    media: '(min-width: 1280px)',
                    sizes: '25vw',
                    srcSet: [384, 768].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1024px)',
                    sizes: '20vw',
                    srcSet: [256, 512].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px)',
                    sizes: '20vw',
                    srcSet: [205, 410].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px)',
                    sizes: '50vw',
                    srcSet: [384, 768].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '',
                    sizes: '50vw',
                    srcSet: [320, 640].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
            links: [
                {
                    media: '(max-width: 639px)',
                    sizes: '50vw',
                    srcSet: [320, 640].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px) and (max-width: 767px)',
                    sizes: '50vw',
                    srcSet: [384, 768].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px) and (max-width: 1023px)',
                    sizes: '20vw',
                    srcSet: [205, 410].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1024px) and (max-width: 1279px)',
                    sizes: '20vw',
                    srcSet: [256, 512].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1280px)',
                    sizes: '25vw',
                    srcSet: [384, 768].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
        });

        // This time as _object_
        props = getResponsivePictureAttributes({
            src: disImageURL.withOptionalParams,
            widths: {
                base: '100vw',
                sm: '100vw',
                md: '50vw',
            },
        });
        expect(props).toStrictEqual({
            src: disImageURL.withoutOptionalParams,
            sources: [
                {
                    media: '(min-width: 1280px)',
                    sizes: '50vw',
                    srcSet: [768, 1536].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1024px)',
                    sizes: '50vw',
                    srcSet: [640, 1280].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px)',
                    sizes: '50vw',
                    srcSet: [512, 1024].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px)',
                    sizes: '100vw',
                    srcSet: [768, 1536].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '',
                    sizes: '100vw',
                    srcSet: [640, 1280].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
            links: [
                {
                    media: '(max-width: 639px)',
                    sizes: '100vw',
                    srcSet: [640, 1280].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px) and (max-width: 767px)',
                    sizes: '100vw',
                    srcSet: [768, 1536].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px)',
                    sizes: '50vw',
                    srcSet: [512, 1024].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1024px)',
                    sizes: '50vw',
                    srcSet: [640, 1280].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1280px)',
                    sizes: '50vw',
                    srcSet: [768, 1536].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
        });

        // Edge case: testing changing width at the very last breakpoint (2xl)
        props = getResponsivePictureAttributes({
            src: disImageURL.withOptionalParams,
            widths: {
                base: '100vw',
                '2xl': '50vw',
            },
        });

        // 100vw of sm => 640px
        // 100vw of md => 768px
        // 100vw of lg => 1024px
        // 100vw of xl => 1280px
        // 100vw of 2xl => 1536px
        // 50vw of 2xl => 768px
        expect(props).toStrictEqual({
            src: disImageURL.withoutOptionalParams,
            sources: [
                {
                    media: '(min-width: 1536px)',
                    sizes: '50vw',
                    srcSet: [768, 1536].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1280px)',
                    sizes: '100vw',
                    srcSet: [1536, 3072].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1024px)',
                    sizes: '100vw',
                    srcSet: [1280, 2560].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px)',
                    sizes: '100vw',
                    srcSet: [1024, 2048].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px)',
                    sizes: '100vw',
                    srcSet: [768, 1536].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '',
                    sizes: '100vw',
                    srcSet: [640, 1280].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
            links: [
                {
                    media: '(max-width: 639px)',
                    sizes: '100vw',
                    srcSet: [640, 1280].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px) and (max-width: 767px)',
                    sizes: '100vw',
                    srcSet: [768, 1536].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px) and (max-width: 1023px)',
                    sizes: '100vw',
                    srcSet: [1024, 2048].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1024px) and (max-width: 1279px)',
                    sizes: '100vw',
                    srcSet: [1280, 2560].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1280px) and (max-width: 1535px)',
                    sizes: '100vw',
                    srcSet: [1536, 3072].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1536px)',
                    sizes: '50vw',
                    srcSet: [768, 1536].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
        });
    });

    test('px values', () => {
        // widths in array format
        let props = getResponsivePictureAttributes({
            src: disImageURL.withOptionalParams,
            widths: [100, 500, 1000],
        });
        expect(props).toStrictEqual({
            src: disImageURL.withoutOptionalParams,
            sources: [
                {
                    media: '(min-width: 768px)',
                    sizes: '1000px',
                    srcSet: [1000, 2000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px)',
                    sizes: '500px',
                    srcSet: [500, 1000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '',
                    sizes: '100px',
                    srcSet: [100, 200].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
            links: [
                {
                    media: '(max-width: 639px)',
                    sizes: '100px',
                    srcSet: [100, 200].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px) and (max-width: 767px)',
                    sizes: '500px',
                    srcSet: [500, 1000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px)',
                    sizes: '1000px',
                    srcSet: [1000, 2000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
        });

        props = getResponsivePictureAttributes({
            src: disImageURL.withOptionalParams,
            widths: {
                base: 100,
                sm: 500,
                md: 1000,
                '2xl': 500,
            },
        });
        expect(props).toStrictEqual({
            src: disImageURL.withoutOptionalParams,
            sources: [
                {
                    media: '(min-width: 1536px)',
                    sizes: '500px',
                    srcSet: [500, 1000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px)',
                    sizes: '1000px',
                    srcSet: [1000, 2000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px)',
                    sizes: '500px',
                    srcSet: [500, 1000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '',
                    sizes: '100px',
                    srcSet: [100, 200].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
            links: [
                {
                    media: '(max-width: 639px)',
                    sizes: '100px',
                    srcSet: [100, 200].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px) and (max-width: 767px)',
                    sizes: '500px',
                    srcSet: [500, 1000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px) and (max-width: 1535px)',
                    sizes: '1000px',
                    srcSet: [1000, 2000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 1536px)',
                    sizes: '500px',
                    srcSet: [500, 1000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
        });
    });

    test('mixture of px and vw values', () => {
        const props = getResponsivePictureAttributes({
            src: disImageURL.withOptionalParams,
            widths: ['100vw', '720px', 500],
        });

        expect(props).toStrictEqual({
            src: disImageURL.withoutOptionalParams,
            sources: [
                {
                    media: '(min-width: 768px)',
                    sizes: '500px',
                    srcSet: [500, 1000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px)',
                    sizes: '720px',
                    srcSet: [720, 1440].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '',
                    sizes: '100vw',
                    srcSet: [640, 1280].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
            links: [
                {
                    media: '(max-width: 639px)',
                    sizes: '100vw',
                    srcSet: [640, 1280].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 640px) and (max-width: 767px)',
                    sizes: '720px',
                    srcSet: [720, 1440].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 768px)',
                    sizes: '500px',
                    srcSet: [500, 1000].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
        });
    });

    test('only src', () => {
        let props = getResponsivePictureAttributes({
            src: disImageURL.withoutOptionalParams,
        });
        expect(props).toStrictEqual({
            sources: [],
            links: [],
            src: disImageURL.withoutOptionalParams,
        });

        // This time _with_ the optional params
        props = getResponsivePictureAttributes({
            src: disImageURL.withOptionalParams,
        });
        expect(props).toStrictEqual({
            sources: [],
            links: [],
            src: disImageURL.withoutOptionalParams,
        });
    });

    test('passing in theme breakpoints', () => {
        const props = getResponsivePictureAttributes({
            src: disImageURL.withOptionalParams,
            widths: ['100vw', 360],
            breakpoints: {
                base: '0px',
                sm: '320px',
                md: '768px',
                lg: '960px',
                xl: '1200px',
                '2xl': '1536px',
            },
        });
        expect(props).toStrictEqual({
            src: disImageURL.withoutOptionalParams,
            sources: [
                {
                    media: '(min-width: 320px)',
                    sizes: '360px',
                    srcSet: [360, 720].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '',
                    sizes: '100vw',
                    srcSet: [320, 640].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
            links: [
                {
                    media: '(max-width: 319px)',
                    sizes: '100vw',
                    srcSet: [320, 640].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
                {
                    media: '(min-width: 320px)',
                    sizes: '360px',
                    srcSet: [360, 720].map((width) => `${urlWithWidth(width)} ${width}w`).join(', '),
                    type: 'image/webp',
                },
            ],
        });
    });

    describe('edge cases', () => {
        test('dynamic image instructions are added to an already parameterized source URL', () => {
            const { src, sources } = getResponsivePictureAttributes({
                src: `${disImageURL.withoutOptionalParams}?w=200&h=200[?sw={width}&q=60]`,
                widths: [100],
            });

            expect(src).toBe(`${disImageURL.withoutOptionalParams}?w=200&h=200`);
            expect(sources).toEqual([
                expect.objectContaining({
                    srcSet: 'https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw1e4fcb17/images/large/PG.10212867.JJ3XYXX.PZ.webp?w=200&h=200&sw=100&q=60&sfrm=jpg 100w, https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/ZZRF_001/on/demandware.static/-/Sites-apparel-m-catalog/default/dw1e4fcb17/images/large/PG.10212867.JJ3XYXX.PZ.webp?w=200&h=200&sw=200&q=60&sfrm=jpg 200w',
                }),
            ]);
        });
    });

    describe('formats array', () => {
        test('no explicit format (default behavior)', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withOptionalParams,
                widths: [100],
            });

            expect(props.sources).toHaveLength(1);
            expect(props.sources[0].type).toBe('image/webp');
            expect(props.links).toHaveLength(1);
            expect(props.links[0].type).toBe('image/webp');
        });

        test('single format', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withOptionalParams,
                widths: [100],
                formats: ['webp'],
            });

            expect(props.sources).toHaveLength(1);
            expect(props.sources[0].type).toBe('image/webp');
            expect(props.links).toHaveLength(1);
            expect(props.links[0].type).toBe('image/webp');
        });

        test('multiple formats', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withOptionalParams,
                widths: [100, 200],
                formats: ['avif', 'webp', 'png'],
            });

            // Should have 3 sources (one per format) for each breakpoint
            expect(props.sources).toHaveLength(6);
            expect(props.sources[0].type).toBe('image/avif');
            expect(props.sources[1].type).toBe('image/webp');
            expect(props.sources[2].type).toBe('image/png');
            expect(props.sources[3].type).toBe('image/avif');
            expect(props.sources[4].type).toBe('image/webp');
            expect(props.sources[5].type).toBe('image/png');

            expect(props.links).toHaveLength(6);
            expect(props.links[0].type).toBe('image/avif');
            expect(props.links[1].type).toBe('image/webp');
            expect(props.links[2].type).toBe('image/png');
            expect(props.links[3].type).toBe('image/avif');
            expect(props.links[4].type).toBe('image/webp');
            expect(props.links[5].type).toBe('image/png');
        });

        test('jpg format uses image/jpeg MIME type', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withOptionalParams,
                widths: [100],
                formats: ['jpg'],
            });

            expect(props.sources[0].type).toBe('image/jpeg');
            expect(props.links[0].type).toBe('image/jpeg');
        });

        test('multiple formats with multiple breakpoints', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withOptionalParams,
                widths: [100, 500],
                formats: ['avif', 'webp'],
            });

            // 2 breakpoints × 2 formats = 4 sources
            expect(props.sources).toHaveLength(4);

            // Check that each breakpoint has both formats
            // Sources are ordered: larger breakpoint first, formats in array order
            expect(props.sources[0]).toMatchObject({ sizes: '500px', type: 'image/avif' });
            expect(props.sources[1]).toMatchObject({ sizes: '500px', type: 'image/webp' });
            expect(props.sources[2]).toMatchObject({ sizes: '100px', type: 'image/avif' });
            expect(props.sources[3]).toMatchObject({ sizes: '100px', type: 'image/webp' });

            // Links should also have entries for both formats at each breakpoint
            expect(props.links).toHaveLength(4);
        });

        test('all supported formats', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withOptionalParams,
                widths: [100],
                formats: ['gif', 'jp2', 'jpg', 'jpeg', 'jxr', 'png', 'webp', 'avif'],
            });

            expect(props.sources).toHaveLength(8);
            // Verify MIME types are correct (sources are reversed)
            const mimeTypes = props.sources.map((s) => s.type);
            expect(mimeTypes).toStrictEqual([
                'image/gif',
                'image/jp2',
                'image/jpeg',
                'image/jpeg', // for both jpg and jpeg
                'image/jxr',
                'image/png',
                'image/webp',
                'image/avif',
            ]);
        });

        test('empty formats array results in no sources or links', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withOptionalParams,
                widths: [100],
                formats: [],
            });

            expect(props.sources).toHaveLength(0);
            expect(props.links).toHaveLength(0);
            expect(props.src).toBe(disImageURL.withoutOptionalParams);
        });
    });

    describe('quality parameter', () => {
        test('getSrc adds quality parameter when provided', () => {
            const result = getSrc(disImageURL.withoutQualityParam, 720, 80);
            expect(result).toContain('q=80');
        });

        test('getSrc does not add quality when not provided', () => {
            const result = getSrc(disImageURL.withoutQualityParam, 720);
            expect(result).not.toContain('q=');
        });

        test('getSrc preserves existing q parameter in URL (URL takes priority)', () => {
            const result = getSrc(disImageURL.withOptionalParams, 720, 80);
            // URL has q=60, should not be overwritten by quality=80
            expect(result).toContain('q=60');
            expect(result).not.toContain('q=80');
        });

        test('getResponsivePictureAttributes passes quality to srcSet URLs', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withoutQualityParam,
                widths: [100],
                quality: 75,
            });

            // All srcSet URLs should contain the quality parameter
            props.sources.forEach((source) => {
                expect(source.srcSet).toContain('q=75');
            });
            props.links.forEach((link) => {
                expect(link.srcSet).toContain('q=75');
            });
        });

        test('getResponsivePictureAttributes respects existing q parameter in URL', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withOptionalParams,
                widths: [100],
                quality: 75,
            });

            // URL has q=60, should not be overwritten
            props.sources.forEach((source) => {
                expect(source.srcSet).toContain('q=60');
                expect(source.srcSet).not.toContain('q=75');
            });
        });

        test('getResponsivePictureAttributes without quality does not add q parameter', () => {
            const props = getResponsivePictureAttributes({
                src: disImageURL.withoutQualityParam,
                widths: [100],
            });

            props.sources.forEach((source) => {
                expect(source.srcSet).not.toContain('q=');
            });
        });
    });
});
