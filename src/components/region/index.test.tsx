import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Region } from './index';
import type { RegionDefinitionConfig } from '@/lib/decorators';

// Mock the Component wrapper
vi.mock('./component', () => ({
    Component: ({ component }: { component: { id: string; typeId: string } }) => (
        <div data-testid={`component-${component.id}`}>{component.typeId}</div>
    ),
}));

// Mock the RegionWrapper to capture designMetadata
let capturedDesignMetadata: any = null;
vi.mock('./region-wrapper', () => ({
    RegionWrapper: ({ region, designMetadata, children, className, ...props }: any) => {
        capturedDesignMetadata = designMetadata;
        return (
            <div
                id={region.id}
                className={`region ${className || ''}`.trim()}
                data-testid="region"
                data-region-id={region.id}
                {...props}>
                {children}
            </div>
        );
    },
}));

describe('Region', () => {
    beforeEach(() => {
        capturedDesignMetadata = null;
    });

    const mockRegion = {
        id: 'test-region',
        components: [
            {
                id: 'component-1',
                typeId: 'commerce_layouts.carousel',
                data: { images: ['image1.jpg'] },
            },
            {
                id: 'component-2',
                typeId: 'commerce_layouts.banner',
                data: { text: 'Test Banner' },
            },
        ],
    };

    it('renders region with correct id and className', () => {
        render(<Region region={mockRegion} className="custom-class" />);

        const regionElement = screen.getByTestId('region');
        expect(regionElement).toHaveAttribute('id', 'test-region');
        expect(regionElement).toHaveClass('region', 'custom-class');
    });

    it('renders all components within the region', () => {
        render(<Region region={mockRegion} />);

        expect(screen.getByTestId('component-component-1')).toBeInTheDocument();
        expect(screen.getByTestId('component-component-2')).toBeInTheDocument();
        expect(screen.getByText('commerce_layouts.carousel')).toBeInTheDocument();
        expect(screen.getByText('commerce_layouts.banner')).toBeInTheDocument();
    });

    it('renders container div for components', () => {
        const { container } = render(<Region region={mockRegion} />);

        const containerDiv = container.querySelector('.container');
        expect(containerDiv).toBeInTheDocument();
    });

    it('handles empty components array', () => {
        const emptyRegion = { id: 'empty-region', components: [] };
        render(<Region region={emptyRegion} />);

        expect(screen.getByTestId('region')).toBeInTheDocument();
        expect(screen.queryByTestId(/component-/)).not.toBeInTheDocument();
    });

    it('handles undefined components', () => {
        const regionWithoutComponents = { id: 'no-components', components: [] };
        render(<Region region={regionWithoutComponents} />);

        expect(screen.getByTestId('region')).toBeInTheDocument();
    });

    it('passes additional props to the region div', () => {
        render(<Region region={mockRegion} data-custom="test-value" aria-label="Test Region" />);

        const regionElement = screen.getByTestId('region');
        expect(regionElement).toHaveAttribute('data-custom', 'test-value');
        expect(regionElement).toHaveAttribute('aria-label', 'Test Region');
    });

    it('renders without className when not provided', () => {
        render(<Region region={mockRegion} />);

        const regionElement = screen.getByTestId('region');
        expect(regionElement).toHaveClass('region');
        expect(regionElement).not.toHaveClass('custom-class');
    });

    it('uses component id as key for mapping', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // This test ensures React keys are properly set
        render(<Region region={mockRegion} />);

        // If keys weren't set properly, React would warn about missing keys
        expect(consoleSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('Warning: Each child in a list should have a unique "key" prop')
        );

        consoleSpy.mockRestore();
    });

    describe('metadata handling', () => {
        const metadataTestCases = [
            {
                description: 'passes both componentTypeInclusions and componentTypeExclusions when provided',
                metadata: {
                    id: 'test-mixed-region',
                    name: 'Test Mixed Region',
                    componentTypeInclusions: ['commerce_layouts.carousel'],
                    componentTypeExclusions: ['commerce_layouts.hero'],
                } as RegionDefinitionConfig,
                expectedDesignMetadata: {
                    id: 'test-region',
                    componentTypeInclusions: ['commerce_layouts.carousel'],
                    componentTypeExclusions: ['commerce_layouts.hero'],
                },
            },
            {
                description: 'passes undefined for both when metadata is not provided',
                metadata: undefined,
                expectedDesignMetadata: {
                    id: 'test-region',
                    componentTypeInclusions: undefined,
                    componentTypeExclusions: undefined,
                },
            },
            {
                description: 'passes undefined for both when metadata is empty object',
                metadata: {
                    id: 'test-empty-region',
                    name: 'Test Empty Region',
                } as RegionDefinitionConfig,
                expectedDesignMetadata: {
                    id: 'test-region',
                    componentTypeInclusions: undefined,
                    componentTypeExclusions: undefined,
                },
            },
            {
                description: 'handles empty arrays for componentTypeInclusions and componentTypeExclusions',
                metadata: {
                    id: 'test-empty-arrays-region',
                    name: 'Test Empty Arrays Region',
                    componentTypeInclusions: [],
                    componentTypeExclusions: [],
                } as RegionDefinitionConfig,
                expectedDesignMetadata: {
                    id: 'test-region',
                    componentTypeInclusions: [],
                    componentTypeExclusions: [],
                },
            },
        ];

        it.each(metadataTestCases)('$description', ({ metadata, expectedDesignMetadata }) => {
            render(<Region region={mockRegion} metadata={metadata} />);

            expect(capturedDesignMetadata).toEqual(expectedDesignMetadata);
        });
    });
});
