'use client';

import { useEffect, useRef, useMemo, type ReactElement } from 'react';
import { useRecommenders, type Product } from '@/hooks/recommenders/use-recommenders';
import ProductCarousel from '@/components/product-carousel/carousel';
import { ProductRecommendationSkeleton } from '@/components/product/skeletons';
import { useProduct } from '@/providers/product-context';
import { useCurrency } from '@/providers/currency';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { EINSTEIN_RECOMMENDERS } from '@/adapters/einstein';

// Get unique recommender values for enum
const EINSTEIN_RECOMMENDER_VALUES = Array.from(new Set(Object.values(EINSTEIN_RECOMMENDERS))) as string[];

/**
 * Configuration for a single recommender
 */
export interface RecommenderConfig {
    /** Unique identifier for the recommender (e.g., 'pdp-similar-items') */
    name: string;
    /** Display title for the recommendation section */
    title: string;
    /** Type of recommendation request ('recommender' or 'zone') */
    type?: 'recommender' | 'zone';
}

@Component('productRecommendations', {
    name: 'Product Recommendations',
    description:
        'Displays product recommendations. Automatically reads product from context when available on product pages.',
})
export class ProductRecommendationsMetadata {
    @AttributeDefinition({
        name: 'Recommender Name',
        description: 'Unique identifier for the Einstein recommender',
        type: 'enum',
        values: EINSTEIN_RECOMMENDER_VALUES,
        required: true,
    })
    recommenderName?: string;

    @AttributeDefinition({
        name: 'Recommender Title',
        description: 'Display title for the recommendation section',
        type: 'string',
        required: true,
    })
    recommenderTitle?: string;

    @AttributeDefinition({
        name: 'Recommender Type',
        description:
            'Type of recommendation request. Defaults to "recommender" for standard recommenders. Use "zone" only for zone-based recommendations.',
        type: 'enum',
        values: ['recommender', 'zone'],
        defaultValue: 'recommender',
    })
    recommenderType?: 'recommender' | 'zone';
}

/**
 * Props for the ProductRecommendations component
 */
export interface ProductRecommendationsProps {
    recommender?: RecommenderConfig;
    recommenderName?: string;
    recommenderTitle?: string;
    recommenderType?: 'recommender' | 'zone';
    products?: Product[];
    args?: Record<string, unknown>;
}

/**
 * ProductRecommendations component displays a single product recommendation carousel using Einstein.
 *
 * This component uses the `useRecommenders` hook to fetch Einstein recommendations
 * and renders them as a product carousel.
 *
 * The component handles loading states and only displays the carousel when products are available.
 * It can read the product from ProductViewContext when available, falling back to the products prop.
 *
 * @param props - The component props
 * @param props.recommender - Recommender configuration (name, title, type)
 * @param props.recommenderName - Optional individual prop for recommender name (alternative to recommender object, used with recommenderTitle)
 * @param props.recommenderTitle - Optional individual prop for recommender title (alternative to recommender object, used with recommenderName)
 * @param props.recommenderType - Optional individual prop for recommender type ('recommender' or 'zone', defaults to 'recommender')
 * @param props.products - Optional products to use as context (falls back to product from context if available)
 * @param props.args - Optional arguments to pass to the recommender
 *
 * @returns JSX element representing the product recommendation carousel
 */
export default function ProductRecommendations({
    recommender: recommenderProp,
    recommenderName: recommenderNameProp,
    recommenderTitle: recommenderTitleProp,
    recommenderType: recommenderTypeProp,
    products: productsProp,
    args,
}: ProductRecommendationsProps): ReactElement | null {
    const { getRecommendations, getZoneRecommendations, recommendations, isLoading, error } = useRecommenders(true);
    const currency = useCurrency();

    // Construct recommender config from props (supports both object and individual props for Page Designer)
    const recommender = useMemo(() => {
        if (recommenderProp) {
            return recommenderProp;
        }
        if (recommenderNameProp && recommenderTitleProp) {
            return {
                name: recommenderNameProp,
                title: recommenderTitleProp,
                type: recommenderTypeProp || 'recommender', // Default to 'recommender' if not specified
            };
        }
        return null;
    }, [recommenderProp, recommenderNameProp, recommenderTitleProp, recommenderTypeProp]);

    // Try to get product from context if available
    const productFromContext = useProduct();

    // Use products prop if provided, otherwise use product from context if available
    const products = useMemo(() => {
        if (productsProp && productsProp.length > 0) {
            return productsProp;
        }
        if (productFromContext) {
            return [productFromContext as Product];
        }
        return undefined;
    }, [productsProp, productFromContext]);

    // Memoize recommender name and type to prevent unnecessary re-fetches
    const recommenderName = recommender?.name;
    const recommenderType = recommender?.type;

    // Track the last fetch to prevent duplicate calls
    const lastFetchRef = useRef<{
        recommenderName: string;
        recommenderType?: string;
        productsKey?: string;
        argsKey?: string;
        currency?: string;
    } | null>(null);

    // Create a stable key for products array
    const productsKey = useMemo(() => {
        if (!products || products.length === 0) return '';
        return products.map((p) => p.id || p.productId || '').join(',');
    }, [products]);

    // Create a stable key for args
    const argsKey = useMemo(() => {
        if (!args) return '';
        return JSON.stringify(args);
    }, [args]);

    // Fetch recommendations when component mounts or dependencies change
    useEffect(() => {
        if (!recommenderName) {
            return;
        }

        // Skip if we've already fetched with these exact parameters
        const lastFetch = lastFetchRef.current;
        if (
            lastFetch &&
            lastFetch.recommenderName === recommenderName &&
            lastFetch.recommenderType === recommenderType &&
            lastFetch.productsKey === productsKey &&
            lastFetch.argsKey === argsKey &&
            lastFetch.currency === currency
        ) {
            return;
        }

        // Mark that we're fetching with these parameters
        lastFetchRef.current = {
            recommenderName,
            recommenderType,
            productsKey,
            argsKey,
            currency,
        };

        if (recommenderType === 'zone') {
            void getZoneRecommendations(recommenderName, products, args);
        } else {
            void getRecommendations(recommenderName, products, args);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recommenderName, recommenderType, productsKey, argsKey, currency]);

    // Early return if no recommender configured
    if (!recommender || !recommender.name || !recommender.title) {
        return null;
    }

    // Early return if error occurred
    if (error) {
        return null;
    }

    // Show loading state
    if (isLoading) {
        return (
            <div>
                <ProductRecommendationSkeleton title={recommender.title} />
            </div>
        );
    }

    // Only show recommendations if they match this recommender
    // This prevents showing wrong recommendations when multiple components share the same hook state
    const recommendationsMatch = recommendations?.recommenderName === recommenderName;

    // Don't render if no recommendations returned or if they don't match this recommender
    const productRecs = recommendationsMatch ? recommendations?.recs : undefined;

    if (!productRecs || productRecs.length === 0) {
        return null;
    }

    // Products are already in ProductSearchHit format from the hook enrichment
    return (
        <div>
            <ProductCarousel products={productRecs} title={recommendations.displayMessage || recommender.title} />
        </div>
    );
}
