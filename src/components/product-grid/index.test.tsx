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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { useDeferredRender } from '@/hooks/use-deferred-render';
import { ConfigWrapper } from '@/test-utils/config';
import ProductGrid from './index';

// Mock the deferred render hook
vi.mock('@/hooks/use-deferred-render', () => ({
    useDeferredRender: vi.fn((enabled: boolean) => !enabled),
}));

// Render ProductTile as a minimal element that exposes all props under test as data attributes.
// This isolates the grid's own behaviour from ProductTile internals.
vi.mock('@/components/product-tile', () => ({
    ProductTile: ({
        product,
        topCategoryName,
        showPickupAvailable,
        handleProductClick,
    }: {
        product: ShopperSearch.schemas['ProductSearchHit'];
        topCategoryName?: string;
        showPickupAvailable?: boolean;
        handleProductClick?: (p: ShopperSearch.schemas['ProductSearchHit']) => void;
    }) => (
        <div
            data-testid={`product-tile-${product.productId}`}
            data-top-category={topCategoryName ?? ''}
            data-pickup={String(showPickupAvailable ?? false)}>
            <button onClick={() => handleProductClick?.(product)}>{product.productName}</button>
        </div>
    ),
    ProductTileProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const dynamicImageValueSpy = vi.fn();

vi.mock('@/providers/dynamic-image', () => ({
    default: ({ children, value }: { children: React.ReactNode; value?: { widths?: string[] } }) => {
        dynamicImageValueSpy(value);
        return <>{children}</>;
    },
}));

vi.mock('@/components/category-skeleton', () => ({
    ProductTileSkeleton: () => <div data-testid="product-tile-skeleton" />,
}));

type ProductHit = ShopperSearch.schemas['ProductSearchHit'];

const makeProduct = (id: string, name: string): ProductHit => ({
    productId: id,
    productName: name,
    price: 99.99,
});

const p1 = makeProduct('p1', 'Product One');
const p2 = makeProduct('p2', 'Product Two');
const p3 = makeProduct('p3', 'Product Three');

interface RenderOptions {
    critical?: ProductHit[];
    nonCritical?: Promise<ProductHit[]>;
    nonCriticalCount?: number;
    hasRefinementsPanel?: boolean;
    handleProductClick?: (p: ProductHit) => void;
    topCategoryName?: string;
    isLoading?: boolean;
    // @sfdc-extension-line SFDC_EXT_BOPIS
    showPickupAvailable?: boolean;
}

const renderGrid = ({
    critical,
    nonCritical,
    nonCriticalCount,
    hasRefinementsPanel,
    handleProductClick,
    topCategoryName,
    isLoading,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    showPickupAvailable,
}: RenderOptions = {}) => {
    const router = createMemoryRouter(
        [
            {
                path: '/test',
                element: (
                    <ConfigWrapper>
                        <ProductGrid
                            critical={critical}
                            nonCritical={nonCritical}
                            nonCriticalCount={nonCriticalCount}
                            hasRefinementsPanel={hasRefinementsPanel}
                            handleProductClick={handleProductClick}
                            topCategoryName={topCategoryName}
                            isLoading={isLoading}
                            // @sfdc-extension-line SFDC_EXT_BOPIS
                            showPickupAvailable={showPickupAvailable}
                        />
                    </ConfigWrapper>
                ),
            },
        ],
        { initialEntries: ['/test'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('ProductGrid — critical products', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('renders all critical products', () => {
        renderGrid({ critical: [p1, p2, p3] });

        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p2')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p3')).toBeInTheDocument();
    });

    test('renders no tiles when critical is an empty array', () => {
        renderGrid({ critical: [] });

        expect(screen.queryByTestId(/^product-tile-p/)).not.toBeInTheDocument();
    });

    test('renders no tiles when critical is undefined', () => {
        renderGrid({ critical: undefined });

        expect(screen.queryByTestId(/^product-tile-p/)).not.toBeInTheDocument();
    });

    test('calls handleProductClick when a critical tile is clicked', async () => {
        const user = userEvent.setup();
        const handleProductClick = vi.fn();
        renderGrid({ critical: [p1, p2], handleProductClick });

        await user.click(screen.getByText('Product One'));

        expect(handleProductClick).toHaveBeenCalledOnce();
        expect(handleProductClick).toHaveBeenCalledWith(p1);
    });

    test('threads topCategoryName to every critical tile', () => {
        renderGrid({ critical: [p1, p2], topCategoryName: 'Women' });

        expect(screen.getByTestId('product-tile-p1')).toHaveAttribute('data-top-category', 'Women');
        expect(screen.getByTestId('product-tile-p2')).toHaveAttribute('data-top-category', 'Women');
    });

    test('passes empty topCategoryName when prop is omitted', () => {
        renderGrid({ critical: [p1] });

        expect(screen.getByTestId('product-tile-p1')).toHaveAttribute('data-top-category', '');
    });
});

describe('ProductGrid — non-critical products', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('shows skeleton tiles while nonCritical is pending', () => {
        renderGrid({
            critical: [],
            nonCritical: new Promise(() => {}),
            nonCriticalCount: 3,
        });

        expect(screen.getAllByTestId('product-tile-skeleton')).toHaveLength(3);
    });

    test('shows no skeletons when nonCriticalCount defaults to 0', () => {
        renderGrid({
            critical: [],
            nonCritical: new Promise(() => {}),
            // nonCriticalCount intentionally omitted — defaults to 0
        });

        expect(screen.queryByTestId('product-tile-skeleton')).not.toBeInTheDocument();
    });

    test('renders products after nonCritical resolves', async () => {
        await act(() => renderGrid({ critical: [], nonCritical: Promise.resolve([p1, p2]) }));

        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p2')).toBeInTheDocument();
        expect(screen.queryByTestId('product-tile-skeleton')).not.toBeInTheDocument();
    });

    test('calls handleProductClick when a non-critical tile is clicked', async () => {
        const user = userEvent.setup();
        const handleProductClick = vi.fn();
        await act(() => renderGrid({ critical: [], nonCritical: Promise.resolve([p2, p3]), handleProductClick }));

        await user.click(screen.getByText('Product Two'));

        expect(handleProductClick).toHaveBeenCalledOnce();
        expect(handleProductClick).toHaveBeenCalledWith(p2);
    });

    test('threads topCategoryName to non-critical tiles', async () => {
        await act(() => renderGrid({ critical: [], nonCritical: Promise.resolve([p1]), topCategoryName: 'Men' }));

        expect(screen.getByTestId('product-tile-p1')).toHaveAttribute('data-top-category', 'Men');
    });
});

describe('ProductGrid — mixed critical and non-critical', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('renders critical products immediately and non-critical products after resolve', async () => {
        await act(() => renderGrid({ critical: [p1, p2], nonCritical: Promise.resolve([p3]) }));

        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p2')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p3')).toBeInTheDocument();
    });

    test('does not show empty message when both critical and non-critical have products', async () => {
        await act(() => renderGrid({ critical: [p1], nonCritical: Promise.resolve([p2]) }));

        expect(screen.queryByText('No products found')).not.toBeInTheDocument();
    });

    test('shows loading overlay while a refinement navigation is pending', () => {
        renderGrid({ critical: [p1, p2], nonCriticalCount: 2, isLoading: true });

        expect(screen.getByTestId('product-grid-loading-state')).toBeInTheDocument();
    });
});

describe('ProductGrid — empty state', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('shows empty message when critical is empty and nonCritical is not provided', () => {
        renderGrid({ critical: [] });

        expect(screen.getByText('No products found')).toBeInTheDocument();
    });

    test('shows empty message when both critical and non-critical resolve empty', async () => {
        await act(() => renderGrid({ critical: [], nonCritical: Promise.resolve([]) }));

        expect(screen.getByText('No products found')).toBeInTheDocument();
    });

    test('hides empty message when critical has products', () => {
        renderGrid({ critical: [p1] });

        expect(screen.queryByText('No products found')).not.toBeInTheDocument();
    });

    test('hides empty message when non-critical resolves with products and critical is empty', async () => {
        await act(() => renderGrid({ critical: [], nonCritical: Promise.resolve([p1]) }));

        expect(screen.queryByText('No products found')).not.toBeInTheDocument();
    });

    test('hides empty message when critical has products even if non-critical resolves empty', async () => {
        await act(() => renderGrid({ critical: [p1], nonCritical: Promise.resolve([]) }));

        expect(screen.queryByText('No products found')).not.toBeInTheDocument();
    });

    test('uses refinement-aware image widths when hasRefinementsPanel is true', () => {
        dynamicImageValueSpy.mockClear();
        renderGrid({ critical: [p1], hasRefinementsPanel: true });

        expect(dynamicImageValueSpy).toHaveBeenCalledWith(
            expect.objectContaining({ widths: ['40vw', '25vw', '18vw', '14vw', '16vw', '16vw'] })
        );
    });

    test('uses full-width image widths when hasRefinementsPanel is false', () => {
        dynamicImageValueSpy.mockClear();
        renderGrid({ critical: [p1], hasRefinementsPanel: false });

        expect(dynamicImageValueSpy).toHaveBeenCalledWith(
            expect.objectContaining({ widths: ['40vw', '25vw', '18vw', '18vw', '20vw', '20vw'] })
        );
    });
});

describe('ProductGrid — deferred rendering', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('calls useDeferredRender with enabled=true when nonCriticalCount > 0', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() =>
            renderGrid({
                critical: [p1],
                nonCritical: Promise.resolve([p2]),
                nonCriticalCount: 6,
            })
        );

        expect(useDeferredRender).toHaveBeenCalledWith(true);
    });

    test('calls useDeferredRender with enabled=false when nonCriticalCount is 0', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() =>
            renderGrid({
                critical: [p1],
                nonCritical: Promise.resolve([p2]),
                nonCriticalCount: 0,
            })
        );

        expect(useDeferredRender).toHaveBeenCalledWith(false);
    });

    test('shows pre-idle skeletons when shouldRenderNonCritical is false', () => {
        vi.mocked(useDeferredRender).mockReturnValue(false); // Pre-idle state

        renderGrid({
            critical: [p1],
            nonCritical: Promise.resolve([p2, p3]),
            nonCriticalCount: 6,
        });

        // Should show 6 pre-idle skeletons
        expect(screen.getAllByTestId('product-tile-skeleton')).toHaveLength(6);

        // Non-critical products should NOT be rendered yet
        expect(screen.queryByTestId('product-tile-p2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('product-tile-p3')).not.toBeInTheDocument();
    });

    test('renders non-critical products after shouldRenderNonCritical becomes true', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true); // Post-idle state

        await act(() =>
            renderGrid({
                critical: [p1],
                nonCritical: Promise.resolve([p2, p3]),
                nonCriticalCount: 6,
            })
        );

        // Critical product should be visible
        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();

        // Non-critical products should now be rendered
        expect(screen.getByTestId('product-tile-p2')).toBeInTheDocument();
        expect(screen.getByTestId('product-tile-p3')).toBeInTheDocument();
    });

    test('shows exact number of skeletons based on nonCriticalCount in pre-idle state', () => {
        vi.mocked(useDeferredRender).mockReturnValue(false);

        renderGrid({
            critical: [p1, p2],
            nonCritical: Promise.resolve([p3]),
            nonCriticalCount: 4,
        });

        // Should show exactly 4 skeletons
        const skeletons = screen.getAllByTestId('product-tile-skeleton');
        expect(skeletons).toHaveLength(4);
    });

    test('transitions from pre-idle skeletons to Suspense boundary after idle', () => {
        // Start in pre-idle state
        vi.mocked(useDeferredRender).mockReturnValue(false);

        const { rerender } = renderGrid({
            critical: [p1],
            nonCritical: new Promise(() => {}), // Never resolves to keep Suspense in fallback
            nonCriticalCount: 3,
        });

        // Pre-idle: should show 3 skeletons
        expect(screen.getAllByTestId('product-tile-skeleton')).toHaveLength(3);

        // Simulate idle callback completing
        vi.mocked(useDeferredRender).mockReturnValue(true);

        const router = createMemoryRouter(
            [
                {
                    path: '/test',
                    element: (
                        <ConfigWrapper>
                            <ProductGrid critical={[p1]} nonCritical={new Promise(() => {})} nonCriticalCount={3} />
                        </ConfigWrapper>
                    ),
                },
            ],
            { initialEntries: ['/test'] }
        );
        rerender(<RouterProvider router={router} />);

        // Post-idle: Suspense boundary is mounted, still showing 3 skeletons (in fallback)
        expect(screen.getAllByTestId('product-tile-skeleton')).toHaveLength(3);
    });

    test('does not render non-critical tiles when promise exists but shouldRenderNonCritical is false', () => {
        vi.mocked(useDeferredRender).mockReturnValue(false);

        // Even though the promise resolves immediately, tiles should not render
        renderGrid({
            critical: [p1],
            nonCritical: Promise.resolve([p2, p3]),
            nonCriticalCount: 6,
        });

        // Critical tile should be visible
        expect(screen.getByTestId('product-tile-p1')).toBeInTheDocument();

        // Non-critical tiles should NOT be visible (pre-idle)
        expect(screen.queryByTestId('product-tile-p2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('product-tile-p3')).not.toBeInTheDocument();

        // Skeletons should be shown instead
        expect(screen.getAllByTestId('product-tile-skeleton')).toHaveLength(6);
    });
});

// @sfdc-extension-block-start SFDC_EXT_BOPIS
describe('ProductGrid — BOPIS showPickupAvailable', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.clearAllMocks());

    test('passes showPickupAvailable=false to tiles by default', () => {
        renderGrid({ critical: [p1, p2], showPickupAvailable: false });

        expect(screen.getByTestId('product-tile-p1')).toHaveAttribute('data-pickup', 'false');
        expect(screen.getByTestId('product-tile-p2')).toHaveAttribute('data-pickup', 'false');
    });

    test('passes showPickupAvailable=true to critical tiles', () => {
        renderGrid({ critical: [p1, p2], showPickupAvailable: true });

        expect(screen.getByTestId('product-tile-p1')).toHaveAttribute('data-pickup', 'true');
        expect(screen.getByTestId('product-tile-p2')).toHaveAttribute('data-pickup', 'true');
    });

    test('passes showPickupAvailable=true to non-critical tiles', async () => {
        vi.mocked(useDeferredRender).mockReturnValue(true);

        await act(() =>
            renderGrid({
                critical: [],
                nonCritical: Promise.resolve([p1, p2]),
                showPickupAvailable: true,
            })
        );

        expect(screen.getByTestId('product-tile-p1')).toHaveAttribute('data-pickup', 'true');
        expect(screen.getByTestId('product-tile-p2')).toHaveAttribute('data-pickup', 'true');
    });
});
// @sfdc-extension-block-end SFDC_EXT_BOPIS
