/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ProductRecommendations, { type RecommenderConfig } from './index';
import { CurrencyProvider } from '@/providers/currency';

// Mock data
const mockRecommendations = {
    recoUUID: '8e22270e-6774-467f-90c3-1234567890',
    recommenderName: 'pdp-similar-items',
    displayMessage: 'You May Also Like',
    recs: [
        {
            id: 'test-product-1',
            productId: 'test-product-1',
            productName: 'Test Product 1',
            image_url: '/test1.jpg',
            product_name: 'Test Product 1',
            product_url: '/products/test1',
            price: 29.99,
            currency: 'USD',
        },
        {
            id: 'test-product-2',
            productId: 'test-product-2',
            productName: 'Test Product 2',
            image_url: '/test2.jpg',
            product_name: 'Test Product 2',
            product_url: '/products/test2',
            price: 39.99,
            currency: 'USD',
        },
    ],
};

const mockRecommender: RecommenderConfig = {
    name: 'pdp-similar-items',
    title: 'You May Also Like',
    type: 'recommender',
};

const mockZoneRecommender: RecommenderConfig = {
    name: 'pdp-zone',
    title: 'Featured Products',
    type: 'zone',
};

// Mock useRecommenders hook
const mockGetRecommendations = vi.fn();
const mockGetZoneRecommendations = vi.fn();
let mockUseRecommenders: ReturnType<typeof vi.fn>;

vi.mock('@/hooks/recommenders/use-recommenders', () => ({
    useRecommenders: vi.fn(() => ({
        isLoading: false,
        isEnabled: true,
        recommendations: mockRecommendations,
        error: null,
        getRecommenders: vi.fn(),
        getRecommendations: mockGetRecommendations,
        getZoneRecommendations: mockGetZoneRecommendations,
    })),
}));

// Mock ProductCarousel
vi.mock('@/components/product-carousel/carousel', () => ({
    default: ({ products, title, className }: { products: any[]; title?: string; className?: string }) => (
        <div data-testid="product-carousel" className={className}>
            <h3>{title}</h3>
            <div data-testid="product-count">{products.length} products</div>
            {products.map((product: any) => (
                <div key={product.productId} data-testid={`product-${product.productId}`}>
                    {product.productName}
                </div>
            ))}
        </div>
    ),
}));

// Mock ProductRecommendationSkeleton
vi.mock('@/components/product/skeletons', () => ({
    ProductRecommendationSkeleton: ({ title }: { title?: string }) => (
        <div data-testid="product-recommendation-skeleton">
            {title && <div>{title}</div>}
            <div>Loading...</div>
        </div>
    ),
}));

// Mock RecommendersProvider
vi.mock('@/providers/recommenders', () => ({
    useRecommendersAdapter: () => ({
        getRecommenders: vi.fn(),
        getRecommendations: mockGetRecommendations,
        getZoneRecommendations: mockGetZoneRecommendations,
    }),
}));

// Helper function to render with CurrencyProvider
const renderWithCurrency = (component: React.ReactElement, currency: string = 'USD') => {
    return render(<CurrencyProvider value={currency}>{component}</CurrencyProvider>);
};

describe('ProductRecommendations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders product carousel with recommendations', async () => {
            const { useRecommenders } = await import('@/hooks/recommenders/use-recommenders');
            mockUseRecommenders = useRecommenders as any;
            mockUseRecommenders.mockReturnValue({
                isLoading: false,
                recommendations: mockRecommendations,
                error: null,
                getRecommendations: mockGetRecommendations,
                getZoneRecommendations: mockGetZoneRecommendations,
            });

            renderWithCurrency(<ProductRecommendations recommender={mockRecommender} />);

            await waitFor(() => {
                const carousel = screen.getByTestId('product-carousel');
                expect(carousel).toBeInTheDocument();
                expect(screen.getByText('You May Also Like')).toBeInTheDocument();
                expect(screen.getByTestId('product-count')).toHaveTextContent('2 products');
            });
        });

        test('renders product tiles from recommendations', async () => {
            const { useRecommenders } = await import('@/hooks/recommenders/use-recommenders');
            mockUseRecommenders = useRecommenders as any;
            mockUseRecommenders.mockReturnValue({
                isLoading: false,
                recommendations: mockRecommendations,
                error: null,
                getRecommendations: mockGetRecommendations,
                getZoneRecommendations: mockGetZoneRecommendations,
            });

            renderWithCurrency(<ProductRecommendations recommender={mockRecommender} />);

            await waitFor(() => {
                expect(screen.getByTestId('product-test-product-1')).toBeInTheDocument();
                expect(screen.getByTestId('product-test-product-2')).toBeInTheDocument();
            });
        });
    });

    describe('Loading States', () => {
        test('shows loading skeleton when isLoading is true', async () => {
            const { useRecommenders } = await import('@/hooks/recommenders/use-recommenders');
            mockUseRecommenders = useRecommenders as any;
            mockUseRecommenders.mockReturnValue({
                isLoading: true,
                recommendations: {},
                error: null,
                getRecommendations: mockGetRecommendations,
                getZoneRecommendations: mockGetZoneRecommendations,
            });

            renderWithCurrency(<ProductRecommendations recommender={mockRecommender} />);

            const skeleton = screen.getByTestId('product-recommendation-skeleton');
            expect(skeleton).toBeInTheDocument();
            expect(screen.getByText('You May Also Like')).toBeInTheDocument();
        });

        test('does not render when recommendations are empty', async () => {
            const { useRecommenders } = await import('@/hooks/recommenders/use-recommenders');
            mockUseRecommenders = useRecommenders as any;
            mockUseRecommenders.mockReturnValue({
                isLoading: false,
                recommendations: { recs: [] },
                error: null,
                getRecommendations: mockGetRecommendations,
                getZoneRecommendations: mockGetZoneRecommendations,
            });

            const { container } = renderWithCurrency(<ProductRecommendations recommender={mockRecommender} />);

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Hook Integration', () => {
        test('calls getRecommendations for recommender type', () => {
            renderWithCurrency(<ProductRecommendations recommender={mockRecommender} />);

            expect(mockGetRecommendations).toHaveBeenCalledWith('pdp-similar-items', undefined, undefined);
        });

        test('calls getZoneRecommendations for zone type', () => {
            renderWithCurrency(<ProductRecommendations recommender={mockZoneRecommender} />);

            expect(mockGetZoneRecommendations).toHaveBeenCalledWith('pdp-zone', undefined, undefined);
        });

        test('passes products to getRecommendations', () => {
            const mockProducts = [{ id: 'product-1', productId: 'product-1' }];
            renderWithCurrency(<ProductRecommendations recommender={mockRecommender} products={mockProducts} />);

            expect(mockGetRecommendations).toHaveBeenCalledWith('pdp-similar-items', mockProducts, undefined);
        });

        test('passes args to getRecommendations', () => {
            const mockArgs = { limit: 5 };
            renderWithCurrency(<ProductRecommendations recommender={mockRecommender} args={mockArgs} />);

            expect(mockGetRecommendations).toHaveBeenCalledWith('pdp-similar-items', undefined, mockArgs);
        });
    });

    describe('Error Handling', () => {
        test('does not render when error is present', async () => {
            const { useRecommenders } = await import('@/hooks/recommenders/use-recommenders');
            mockUseRecommenders = useRecommenders as any;
            mockUseRecommenders.mockReturnValue({
                isLoading: false,
                recommendations: {},
                error: new Error('Failed to fetch'),
                getRecommendations: mockGetRecommendations,
                getZoneRecommendations: mockGetZoneRecommendations,
            });

            const { container } = renderWithCurrency(<ProductRecommendations recommender={mockRecommender} />);

            expect(container.firstChild).toBeNull();
        });

        test('does not render when recommender is null', () => {
            const { container } = renderWithCurrency(<ProductRecommendations recommender={null as any} />);

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Data Transformation', () => {
        test('uses displayMessage as title if available', async () => {
            const { useRecommenders } = await import('@/hooks/recommenders/use-recommenders');
            mockUseRecommenders = useRecommenders as any;
            mockUseRecommenders.mockReturnValue({
                isLoading: false,
                recommendations: { ...mockRecommendations, displayMessage: 'Custom Display Message' },
                error: null,
                getRecommendations: mockGetRecommendations,
                getZoneRecommendations: mockGetZoneRecommendations,
            });

            renderWithCurrency(<ProductRecommendations recommender={mockRecommender} />);

            await waitFor(() => {
                expect(screen.getByText('Custom Display Message')).toBeInTheDocument();
            });
        });

        test('falls back to recommender title if no displayMessage', async () => {
            const { useRecommenders } = await import('@/hooks/recommenders/use-recommenders');
            mockUseRecommenders = useRecommenders as any;
            mockUseRecommenders.mockReturnValue({
                isLoading: false,
                recommendations: { ...mockRecommendations, displayMessage: undefined },
                error: null,
                getRecommendations: mockGetRecommendations,
                getZoneRecommendations: mockGetZoneRecommendations,
            });

            renderWithCurrency(<ProductRecommendations recommender={mockRecommender} />);

            await waitFor(() => {
                expect(screen.getByText('You May Also Like')).toBeInTheDocument();
            });
        });
    });
});
