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
import { ConfigWrapper } from '@/test-utils/config';
import { CurrencyProvider } from '@/providers/currency';
import ProductGrid from './index';

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
                        <CurrencyProvider value="USD">
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
                        </CurrencyProvider>
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
    afterEach(() => vi.restoreAllMocks());

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
    afterEach(() => vi.restoreAllMocks());

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
    afterEach(() => vi.restoreAllMocks());

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
    afterEach(() => vi.restoreAllMocks());

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

// @sfdc-extension-block-start SFDC_EXT_BOPIS
describe('ProductGrid — BOPIS showPickupAvailable', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

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
