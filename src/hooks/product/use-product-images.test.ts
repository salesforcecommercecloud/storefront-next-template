/**
 * useProductImages Hook Tests
 *
 * Tests the useProductImages hook functionality including image filtering,
 * attribute-based selection, and gallery image transformation.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProductImages } from './use-product-images';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

const createMockProduct = (
    imageGroups?: ShopperProducts.schemas['ImageGroup'][]
): ShopperProducts.schemas['Product'] => {
    return {
        id: 'test-product-id',
        name: 'Test Product',
        imageGroups,
    } as ShopperProducts.schemas['Product'];
};

const createMockImageGroup = (
    viewType: string,
    images: ShopperProducts.schemas['Image'][],
    variationAttributes?: Record<string, string>
): ShopperProducts.schemas['ImageGroup'] => {
    // Convert variationAttributes object to array format expected by findImageGroupBy
    // The structure should be: [{ id: 'color', values: [{ value: 'red' }] }]
    const variationAttributesArray = variationAttributes
        ? Object.entries(variationAttributes).map(([id, value]) => ({
              id,
              values: [{ value }],
          }))
        : [];

    return {
        viewType,
        images,
        variationAttributes: variationAttributesArray,
    } as ShopperProducts.schemas['ImageGroup'];
};

const createMockImage = (link: string, alt?: string): ShopperProducts.schemas['Image'] => {
    return {
        link,
        disBaseLink: link,
        alt: alt || 'Test Image',
    } as ShopperProducts.schemas['Image'];
};

describe('useProductImages', () => {
    describe('default images', () => {
        it('should return default images when no attributes are selected', () => {
            const defaultImages = [
                createMockImage('https://example.com/image1.jpg'),
                createMockImage('https://example.com/image2.jpg'),
            ];
            const product = createMockProduct([createMockImageGroup('large', defaultImages)]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                    selectedAttributes: undefined,
                })
            );

            expect(result.current.galleryImages).toHaveLength(2);
            expect(result.current.galleryImages[0].src).toBe('https://example.com/image1.jpg');
            expect(result.current.galleryImages[1].src).toBe('https://example.com/image2.jpg');
        });

        it('should return empty array when no image groups exist', () => {
            const product = createMockProduct();

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                })
            );

            expect(result.current.galleryImages).toEqual([]);
        });

        it('should return empty array when no images in default group', () => {
            const product = createMockProduct([createMockImageGroup('large', [])]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                })
            );

            expect(result.current.galleryImages).toEqual([]);
        });
    });

    describe('attribute-based filtering', () => {
        it('should return images matching selected attributes', () => {
            const colorRedImages = [
                createMockImage('https://example.com/red1.jpg'),
                createMockImage('https://example.com/red2.jpg'),
            ];
            const defaultImages = [createMockImage('https://example.com/default.jpg')];

            const product = createMockProduct([
                createMockImageGroup('large', defaultImages),
                createMockImageGroup('large', colorRedImages, { color: 'red' }),
            ]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                    selectedAttributes: { color: 'red' },
                })
            );

            expect(result.current.galleryImages).toHaveLength(2);
            expect(result.current.galleryImages[0].src).toBe('https://example.com/red1.jpg');
        });

        it('should fallback to default images when no matching group found', () => {
            const defaultImages = [createMockImage('https://example.com/default.jpg')];

            const product = createMockProduct([
                createMockImageGroup('large', defaultImages),
                createMockImageGroup('large', [], { color: 'blue' }),
            ]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                    selectedAttributes: { color: 'red' },
                })
            );

            expect(result.current.galleryImages).toHaveLength(1);
            expect(result.current.galleryImages[0].src).toBe('https://example.com/default.jpg');
        });
    });

    describe('view type filtering', () => {
        it('should return images for specified view type', () => {
            const largeImages = [createMockImage('https://example.com/large.jpg')];
            const mediumImages = [createMockImage('https://example.com/medium.jpg')];

            const product = createMockProduct([
                createMockImageGroup('large', largeImages),
                createMockImageGroup('medium', mediumImages),
            ]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                    viewType: 'medium',
                })
            );

            expect(result.current.galleryImages).toHaveLength(1);
            expect(result.current.galleryImages[0].src).toBe('https://example.com/medium.jpg');
        });

        it('should default to large view type', () => {
            const largeImages = [createMockImage('https://example.com/large.jpg')];
            const mediumImages = [createMockImage('https://example.com/medium.jpg')];

            const product = createMockProduct([
                createMockImageGroup('large', largeImages),
                createMockImageGroup('medium', mediumImages),
            ]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                })
            );

            expect(result.current.galleryImages).toHaveLength(1);
            expect(result.current.galleryImages[0].src).toBe('https://example.com/large.jpg');
        });
    });

    describe('image transformation', () => {
        it('should transform images to gallery format', () => {
            const images = [
                createMockImage('https://example.com/image1.jpg', 'Image 1'),
                createMockImage('https://example.com/image2.jpg', 'Image 2'),
            ];

            const product = createMockProduct([createMockImageGroup('large', images)]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                })
            );

            expect(result.current.galleryImages[0]).toEqual({
                src: 'https://example.com/image1.jpg',
                alt: 'Image 1',
                thumbSrc: 'https://example.com/image1.jpg',
            });
        });

        it('should use product name as alt text fallback', () => {
            // Create image without alt text to test fallback
            const image = {
                link: 'https://example.com/image1.jpg',
                disBaseLink: 'https://example.com/image1.jpg',
                alt: undefined,
            } as ShopperProducts.schemas['Image'];

            const images = [image];

            const product = createMockProduct([createMockImageGroup('large', images)]);
            product.name = 'Test Product Name';

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                })
            );

            expect(result.current.galleryImages[0].alt).toBe('Test Product Name');
        });

        it('should use disBaseLink over link when available', () => {
            const image = {
                link: 'https://example.com/link.jpg',
                disBaseLink: 'https://example.com/disBaseLink.jpg',
                alt: 'Test',
            } as ShopperProducts.schemas['Image'];

            const product = createMockProduct([createMockImageGroup('large', [image])]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                })
            );

            expect(result.current.galleryImages[0].src).toBe('https://example.com/disBaseLink.jpg');
        });

        it('should handle empty link with fallback', () => {
            const image = {
                link: '',
                disBaseLink: '',
                alt: 'Test',
            } as ShopperProducts.schemas['Image'];

            const product = createMockProduct([createMockImageGroup('large', [image])]);

            const { result } = renderHook(() =>
                useProductImages({
                    product,
                })
            );

            expect(result.current.galleryImages[0].src).toBe('');
        });
    });
});
