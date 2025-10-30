import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductImage from './product-image';

// Mock the DynamicImage component
vi.mock('@/components/dynamic-image', () => ({
    DynamicImage: ({ src, alt, imageProps, ...props }: any) => (
        <img src={src} alt={alt} onError={imageProps?.onError} {...props} />
    ),
}));

describe('ProductImage', () => {
    it('renders image when src is valid', () => {
        render(<ProductImage src="https://valid-image.jpg" alt="Valid image" className="test-class" />);

        const img = screen.getByAltText('Valid image');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://valid-image.jpg');
        expect(img).toHaveClass('test-class');
    });

    it('shows fallback when image fails to load', () => {
        render(<ProductImage src="https://invalid-image.jpg" alt="Invalid image" />);

        // Simulate image error
        const img = screen.getByAltText('Invalid image');
        fireEvent.error(img);

        // Should show fallback content
        expect(screen.getByText('No image available')).toBeInTheDocument();
        expect(screen.getByText('📷')).toBeInTheDocument();
    });

    it('passes through DynamicImage props', () => {
        render(
            <ProductImage src="https://valid-image.jpg" alt="Valid image" loading="lazy" widths={['50vw', '100vw']} />
        );

        const img = screen.getByAltText('Valid image');
        expect(img).toHaveAttribute('loading', 'lazy');
    });
});
