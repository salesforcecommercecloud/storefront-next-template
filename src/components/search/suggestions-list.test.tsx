import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Suggestions from './suggestions-list';

// Mock DynamicImage component
vi.mock('@/components/dynamic-image', () => ({
    DynamicImage: ({ src, alt, imageProps }: any) => <img src={src} alt={alt} {...imageProps} />,
}));

describe('Suggestions Component', () => {
    const mockSuggestions = [
        { name: 'Electronics', link: '/category/electronics' },
        { name: 'Clothing', link: '/category/clothing' },
    ];

    it('should render nothing when suggestions are empty, null, or undefined', () => {
        const { container: emptyContainer } = render(<Suggestions suggestions={[]} />);
        expect(emptyContainer.firstChild).toBeNull();

        const { container: nullContainer } = render(<Suggestions suggestions={null as any} />);
        expect(nullContainer.firstChild).toBeNull();

        const { container: undefinedContainer } = render(<Suggestions suggestions={undefined} />);
        expect(undefinedContainer.firstChild).toBeNull();
    });

    it('should render suggestions with correct content and structure', () => {
        render(<Suggestions suggestions={mockSuggestions} />);

        expect(screen.getByTestId('sf-suggestion')).toBeInTheDocument();
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('Clothing')).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('should render images when provided and not render when missing', () => {
        const mixedSuggestions = [
            { name: 'Product with image', link: '/product/1', image: 'https://example.com/img.jpg' },
            { name: 'Category without image', link: '/category/1' },
        ];

        render(<Suggestions suggestions={mixedSuggestions} />);

        const images = screen.getAllByRole('img');
        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute('alt', 'Product with image');
    });

    it('should call closeAndNavigate when clicked, or handle gracefully if undefined', () => {
        const mockCallback = vi.fn();
        const { rerender } = render(<Suggestions suggestions={mockSuggestions} closeAndNavigate={mockCallback} />);

        fireEvent.mouseDown(screen.getByText('Electronics'));
        expect(mockCallback).toHaveBeenCalledWith('/category/electronics');

        // Should not crash without callback
        rerender(<Suggestions suggestions={mockSuggestions} closeAndNavigate={undefined} />);
        expect(() => fireEvent.mouseDown(screen.getByText('Clothing'))).not.toThrow();
    });

    it('should apply custom className', () => {
        render(<Suggestions suggestions={mockSuggestions} className="custom-class" />);
        expect(screen.getByTestId('sf-suggestion')).toHaveClass('custom-class');
    });
});
