import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router';
import SearchSuggestionsPopup from './suggestions-grid';

// Mock DynamicImage component
vi.mock('@/components/dynamic-image', () => ({
    DynamicImage: ({ src, alt, imageProps, loading }: any) => (
        <img src={src} alt={alt} loading={loading} {...imageProps} />
    ),
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SearchSuggestionsPopup Component', () => {
    const mockSuggestions = [
        {
            name: 'iPhone 15 Pro',
            link: '/product/iphone-15-pro',
            image: 'https://example.com/iphone15.jpg',
            price: 1099,
        },
        {
            name: 'Samsung Galaxy S24',
            link: '/product/samsung-galaxy-s24',
            image: 'https://example.com/galaxy-s24.jpg',
            price: 899,
        },
        { name: 'Product Without Image', link: '/product/no-image', price: 299 },
        { name: 'Product Without Price', link: '/product/no-price', image: 'https://example.com/no-price.jpg' },
    ];

    it('should render nothing when suggestions are empty, null, or undefined', () => {
        const { container: emptyContainer } = renderWithRouter(<SearchSuggestionsPopup suggestions={[]} />);
        expect(emptyContainer.firstChild).toBeNull();

        const { container: nullContainer } = renderWithRouter(<SearchSuggestionsPopup suggestions={null as any} />);
        expect(nullContainer.firstChild).toBeNull();

        const { container: undefinedContainer } = renderWithRouter(<SearchSuggestionsPopup suggestions={undefined} />);
        expect(undefinedContainer.firstChild).toBeNull();
    });

    it('should render suggestions with correct structure and content', () => {
        renderWithRouter(<SearchSuggestionsPopup suggestions={mockSuggestions} />);

        expect(screen.getByTestId('sf-horizontal-product-suggestions')).toBeInTheDocument();
        expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
        expect(screen.getByText('Samsung Galaxy S24')).toBeInTheDocument();

        const productTiles = screen.getAllByTestId('product-tile');
        expect(productTiles).toHaveLength(4);
        expect(productTiles[0]).toHaveAttribute('href', '/product/iphone-15-pro');
    });

    it('should render images when provided and fallback when missing', () => {
        renderWithRouter(<SearchSuggestionsPopup suggestions={mockSuggestions} />);

        const images = screen.getAllByRole('img');
        expect(images).toHaveLength(3); // Only 3 products have images

        expect(images[0]).toHaveAttribute('src', 'https://example.com/iphone15.jpg[?sw={width}&q=60]');
        expect(images[0]).toHaveAttribute('alt', 'iPhone 15 Pro');
        expect(images[0]).toHaveAttribute('loading', 'eager');

        // Check fallback for missing image
        expect(screen.getByText('No image available')).toBeInTheDocument();
        expect(screen.getByText('📷')).toBeInTheDocument();
    });

    it('should render prices when provided and not render when missing or zero', () => {
        renderWithRouter(<SearchSuggestionsPopup suggestions={mockSuggestions} />);

        expect(screen.getByText('£1099')).toBeInTheDocument();
        expect(screen.getByText('£899')).toBeInTheDocument();
        expect(screen.getByText('£299')).toBeInTheDocument();

        // Product without price should not show price
        const productWithoutPrice = screen.getByText('Product Without Price');
        const parentDiv = productWithoutPrice.closest('.w-full');
        expect(parentDiv?.textContent).not.toMatch(/£\d+/);

        // Test zero price
        const { container } = renderWithRouter(
            <SearchSuggestionsPopup suggestions={[{ name: 'Free Product', link: '/product/free', price: 0 }]} />
        );
        expect(container.textContent).not.toMatch(/£0/);
    });

    it('should handle click with and without closeAndNavigate callback', () => {
        const mockCallback = vi.fn();
        const { rerender } = renderWithRouter(
            <SearchSuggestionsPopup suggestions={mockSuggestions} closeAndNavigate={mockCallback} />
        );

        fireEvent.mouseDown(screen.getByText('iPhone 15 Pro'));
        expect(mockCallback).toHaveBeenCalledWith('/product/iphone-15-pro');

        // Should not crash without callback
        rerender(
            <BrowserRouter>
                <SearchSuggestionsPopup suggestions={mockSuggestions} closeAndNavigate={undefined} />
            </BrowserRouter>
        );
        expect(() => fireEvent.click(screen.getByText('Samsung Galaxy S24'))).not.toThrow();
    });

    it('should handle edge cases with empty strings and mixed data', () => {
        const edgeCaseSuggestions = [
            { name: '', link: '/product/empty-name', price: 0 },
            { name: 'Valid Product', link: '', image: '', price: null as any },
        ];

        renderWithRouter(<SearchSuggestionsPopup suggestions={edgeCaseSuggestions} />);

        expect(screen.getByTestId('sf-horizontal-product-suggestions')).toBeInTheDocument();
        expect(screen.getByText('Valid Product')).toBeInTheDocument();
        expect(screen.queryByText('£0')).not.toBeInTheDocument();
    });
});
