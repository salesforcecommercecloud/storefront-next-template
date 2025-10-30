import { createRef } from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ContentCard } from './index';

describe('ContentCard', () => {
    const defaultProps = {
        title: 'Test Title',
        description: 'Test description content',
        imageUrl: 'https://example.com/image.jpg',
        imageAlt: 'Test image',
        buttonText: 'Click Me',
        buttonLink: '/test-link',
    };

    const renderWithRouter = (ui: React.ReactElement) => {
        return render(<MemoryRouter>{ui}</MemoryRouter>);
    };

    test('renders all content with correct attributes', () => {
        renderWithRouter(<ContentCard {...defaultProps} />);

        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test description content')).toBeInTheDocument();

        const image = screen.getByAltText('Test image');
        expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
        expect(image).toHaveAttribute('loading', 'lazy');

        const link = screen.getByRole('link', { name: 'Click Me' });
        expect(link).toHaveAttribute('href', '/test-link');
        expect(link.className).toContain('w-full');
    });

    test('handles optional props correctly', () => {
        renderWithRouter(<ContentCard {...defaultProps} imageUrl={undefined} title={undefined} />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
        expect(screen.getByText('Test description content')).toBeInTheDocument();
    });

    test('does not render button when buttonText or buttonLink is missing', () => {
        renderWithRouter(<ContentCard {...defaultProps} buttonText={undefined} />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();

        render(
            <MemoryRouter>
                <ContentCard {...defaultProps} buttonLink={undefined} />
            </MemoryRouter>
        );
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('uses title as alt text when imageAlt is not provided', () => {
        renderWithRouter(<ContentCard {...defaultProps} imageAlt={undefined} />);
        expect(screen.getByAltText('Test Title')).toBeInTheDocument();
    });

    test('does not render footer when no content is provided', () => {
        const { container } = renderWithRouter(<ContentCard imageUrl="https://example.com/image.jpg" />);
        expect(container.querySelector('[data-slot="card-footer"]')).not.toBeInTheDocument();
    });

    test('applies styling props correctly', () => {
        const { container, rerender } = renderWithRouter(<ContentCard {...defaultProps} showBackground={true} />);
        let card = container.querySelector('[data-slot="card"]');
        expect(card?.className).toContain('bg-muted/50');

        rerender(
            <MemoryRouter>
                <ContentCard {...defaultProps} showBackground={false} />
            </MemoryRouter>
        );
        card = container.querySelector('[data-slot="card"]');
        expect(card?.className).toContain('bg-transparent');

        rerender(
            <MemoryRouter>
                <ContentCard {...defaultProps} showBorder={false} />
            </MemoryRouter>
        );
        card = container.querySelector('[data-slot="card"]');
        expect(card?.className).toContain('border-0');
        expect(card?.className).toContain('shadow-none');
    });

    test('applies custom className and h-full for grid layouts', () => {
        const { container } = renderWithRouter(<ContentCard {...defaultProps} className="custom-class" />);
        const card = container.querySelector('[data-slot="card"]');
        expect(card?.className).toContain('custom-class');
        expect(card?.className).toContain('h-full');
    });

    test('forwards ref to Card component', () => {
        const ref = createRef<HTMLDivElement>();
        renderWithRouter(<ContentCard {...defaultProps} ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
        expect(ref.current?.getAttribute('data-slot')).toBe('card');
    });

    test('renders with only image (no text or button)', () => {
        renderWithRouter(<ContentCard imageUrl="https://example.com/image.jpg" imageAlt="Only image" />);
        expect(screen.getByAltText('Only image')).toBeInTheDocument();
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('renders with only text (no image or button)', () => {
        renderWithRouter(<ContentCard title="Only Title" description="Only description" />);
        expect(screen.getByText('Only Title')).toBeInTheDocument();
        expect(screen.getByText('Only description')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('applies loading attribute correctly', () => {
        const { rerender } = renderWithRouter(<ContentCard {...defaultProps} loading="eager" />);
        let image = screen.getByAltText('Test image');
        expect(image).toHaveAttribute('loading', 'eager');

        rerender(
            <MemoryRouter>
                <ContentCard {...defaultProps} loading="lazy" />
            </MemoryRouter>
        );
        image = screen.getByAltText('Test image');
        expect(image).toHaveAttribute('loading', 'lazy');

        rerender(
            <MemoryRouter>
                <ContentCard {...defaultProps} />
            </MemoryRouter>
        );
        image = screen.getByAltText('Test image');
        expect(image).toHaveAttribute('loading', 'lazy');
    });
});
