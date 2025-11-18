/**
 * Product Carousel Components
 *
 * This module exports the main ProductCarousel component, its associated skeleton component,
 * and a Suspense-wrapped version for better loading state management.
 *
 * @fileoverview Exports for product carousel functionality including loading states and Suspense boundaries
 */
import { AttributeDefinition, Component, Loader } from '@/lib/decorators';

// Skeleton component for loading states
export { default as ProductCarouselSkeleton } from './skeleton';
export { default as Carousel } from './carousel';

// ProductCarousel wrapped with Suspense boundary
export { ProductCarouselWithSuspense } from './carousel';
export { ProductCarouselWithSuspense as default } from './carousel';

import { loader } from './loaders';

@Component('productCarousel', {
    name: 'Product Carousel',
    description:
        'A responsive, interactive carousel that displays a collection of product cards in a horizontally scrollable layout.',
})
@Loader(loader)
export class ProductCarouselWithSuspenseMetadata {
    @AttributeDefinition()
    title?: string;
}
