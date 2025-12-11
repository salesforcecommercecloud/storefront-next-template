/**
 * Product Carousel Components
 *
 * This module exports the main ProductCarousel component, its associated skeleton component,
 * and a Suspense-wrapped version for better loading state management.
 *
 * @fileoverview Exports for product carousel functionality including loading states and Suspense boundaries
 */
import { AttributeDefinition, Component } from '@/lib/decorators';
import { fetchSearchProducts } from '@/lib/api/search';
import type { LoaderFunctionArgs } from 'react-router';

// Skeleton component for loading states
export { default as ProductCarouselSkeleton } from './skeleton';
export { default as Carousel } from './carousel';

// ProductCarousel wrapped with Suspense boundary
import { ProductCarouselWithSuspense } from './carousel';
export { ProductCarouselWithSuspense };

// Default export that conforms to ComponentModule interface
export default ProductCarouselWithSuspense;

@Component('productCarousel', {
    name: 'Product Carousel',
    description:
        'A responsive, interactive carousel that displays a collection of product cards in a horizontally scrollable layout.',
})
export class ProductCarouselWithSuspenseMetadata {
    @AttributeDefinition()
    title?: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: { componentData: { [key: string]: unknown }; context: LoaderFunctionArgs['context'] }) {
    const { componentData, context: routeContext } = args;

    // Extract configuration from component data
    // ToDo: The fallback should be removed and put in the component default data instead
    const categoryId = (componentData?.categoryId as string) || 'mens-clothing-shorts';
    const limit = (componentData?.limit as number) || 12;

    return fetchSearchProducts(routeContext, {
        categoryId,
        limit,
    });
}

// eslint-disable-next-line react-refresh/only-export-components
export { default as fallback } from './skeleton';
