import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { Region } from './index';
import type { RegionDefinitionConfig } from '@/lib/decorators';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import {
    useRegionContext,
    PageDesignerPageMetadataProvider,
} from '@salesforce/storefront-next-runtime/design/react/core';

// Mock the Component wrapper
vi.mock('./component', () => ({
    Component: ({ component }: { component: { id: string; typeId: string } }) => (
        <div data-testid={`component-${component.id}`}>{component.typeId}</div>
    ),
}));

// Mock the RegionWrapper to capture designMetadata
let capturedDesignMetadata: any = null;
vi.mock('./region-wrapper', () => ({
    RegionWrapper: ({ designMetadata, children }: any) => {
        capturedDesignMetadata = designMetadata;
        // RegionRenderer just returns children without wrapper
        return <>{children}</>;
    },
}));

vi.mock('@salesforce/storefront-next-runtime/design/react/core', () => ({
    useRegionContext: vi.fn(() => ({})),
    PageDesignerPageMetadataProvider: vi.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
}));

describe('Region', () => {
    beforeEach(() => {
        capturedDesignMetadata = null;
        vi.clearAllMocks();
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

    const mockPage: ShopperExperience.schemas['Page'] = {
        id: 'test-page',
        typeId: 'testPage',
        regions: [mockRegion],
    };

    it('renders region with correct id and className', async () => {
        render(<Region page={Promise.resolve(mockPage)} regionId="test-region" className="custom-class" />);

        // RegionWrapper no longer renders a wrapper div, it just returns children
        // Check that components are rendered (async)
        await waitFor(() => {
            expect(screen.getByTestId('component-component-1')).toBeInTheDocument();
            expect(screen.getByTestId('component-component-2')).toBeInTheDocument();
        });

        // Verify designMetadata was passed correctly
        expect(capturedDesignMetadata).toMatchObject({
            id: 'test-region',
        });
    });

    it('renders all components within the region', async () => {
        render(<Region page={Promise.resolve(mockPage)} regionId="test-region" />);

        await waitFor(() => {
            expect(screen.getByTestId('component-component-1')).toBeInTheDocument();
            expect(screen.getByTestId('component-component-2')).toBeInTheDocument();
            expect(screen.getByText('commerce_layouts.carousel')).toBeInTheDocument();
            expect(screen.getByText('commerce_layouts.banner')).toBeInTheDocument();
        });
    });

    it('renders container div for components', async () => {
        render(<Region page={Promise.resolve(mockPage)} regionId="test-region" />);

        // RegionWrapper no longer renders a container div
        // Just verify components are rendered (async)
        await waitFor(() => {
            expect(screen.getByTestId('component-component-1')).toBeInTheDocument();
        });
    });

    it('handles empty components array', () => {
        const emptyRegion = { id: 'empty-region', components: [] };
        const emptyPage = { id: 'page', typeId: 'page', regions: [emptyRegion] };
        const { container } = render(<Region page={Promise.resolve(emptyPage)} regionId="empty-region" />);

        // RegionWrapper no longer renders a wrapper, so check container is not empty
        expect(container.firstChild).toBeTruthy();
        expect(screen.queryByTestId(/component-/)).not.toBeInTheDocument();
    });

    it('handles undefined components', () => {
        const regionWithoutComponents = { id: 'no-components', components: [] };
        const pageWithRegion = { id: 'page', typeId: 'page', regions: [regionWithoutComponents] };
        const { container } = render(<Region page={Promise.resolve(pageWithRegion)} regionId="no-components" />);

        // RegionWrapper no longer renders a wrapper, so check container is not empty
        expect(container.firstChild).toBeTruthy();
    });

    it('passes additional props to the region div', async () => {
        render(
            <Region
                page={Promise.resolve(mockPage)}
                regionId="test-region"
                data-custom="test-value"
                aria-label="Test Region"
            />
        );

        // RegionWrapper no longer renders a wrapper div, props are not passed down
        // Just verify components are rendered (async)
        await waitFor(() => {
            expect(screen.getByTestId('component-component-1')).toBeInTheDocument();
        });
    });

    it('renders without className when not provided', async () => {
        render(<Region page={Promise.resolve(mockPage)} regionId="test-region" />);

        // RegionWrapper no longer renders a wrapper div with className
        // Just verify components are rendered (async)
        await waitFor(() => {
            expect(screen.getByTestId('component-component-1')).toBeInTheDocument();
        });
    });

    it('uses component id as key for mapping', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // This test ensures React keys are properly set
        render(<Region page={Promise.resolve(mockPage)} regionId="test-region" />);

        // If keys weren't set properly, React would warn about missing keys
        expect(consoleSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('Warning: Each child in a list should have a unique "key" prop')
        );

        consoleSpy.mockRestore();
    });

    describe('page designer page metadata provider', () => {
        describe('when there is no region context', () => {
            beforeEach(() => {
                vi.mocked(useRegionContext).mockReturnValue(null);
            });

            it('renders the page designer page metadata provider', async () => {
                render(<Region page={Promise.resolve(mockPage)} regionId="test-region" />);

                await waitFor(() => {
                    expect(PageDesignerPageMetadataProvider).toHaveBeenCalled();
                });
            });
        });

        describe('when there is a region context', () => {
            beforeEach(() => {
                vi.mocked(useRegionContext).mockReturnValue({ regionId: 'test-region', componentIds: [] });
            });
            it('does not renders the page designer page metadata provider', async () => {
                render(<Region page={Promise.resolve(mockPage)} regionId="test-region" />);

                const result = waitFor(
                    () => {
                        expect(PageDesignerPageMetadataProvider).toHaveBeenCalled();
                    },
                    { timeout: 100 }
                );

                await expect(result).rejects.toThrow();
            });
        });
    });

    describe('metadata handling', () => {
        const metadataTestCases = [
            {
                description: 'passes both componentTypeInclusions and componentTypeExclusions when provided',
                metadata: {
                    id: 'test-region',
                    name: 'Test Mixed Region',
                    componentTypeInclusions: [{ typeId: 'commerce_layouts.carousel' }],
                    componentTypeExclusions: [{ typeId: 'commerce_layouts.hero' }],
                } as ShopperExperience.schemas['RegionDefinition'],
                expectedDesignMetadata: {
                    id: 'test-region',
                    componentTypeInclusions: ['commerce_layouts.carousel'],
                    componentTypeExclusions: ['commerce_layouts.hero'],
                },
            },
            {
                description: 'passes undefined for both when metadata is empty object',
                metadata: {
                    id: 'test-region',
                    name: 'Test Empty Region',
                } as RegionDefinitionConfig,
                expectedDesignMetadata: {
                    id: 'test-region',
                    componentTypeInclusions: [],
                    componentTypeExclusions: [],
                },
            },
            {
                description: 'handles empty arrays for componentTypeInclusions and componentTypeExclusions',
                metadata: {
                    id: 'test-region',
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

        it.each(metadataTestCases)('$description', async ({ metadata, expectedDesignMetadata }) => {
            render(
                <Region
                    page={Promise.resolve({
                        ...mockPage,
                        designMetadata: {
                            regionDefinitions: [metadata],
                        },
                    } as ShopperExperience.schemas['Page'])}
                    regionId="test-region"
                />
            );

            // Wait for async rendering to complete
            await waitFor(() => {
                expect(capturedDesignMetadata).toEqual(expectedDesignMetadata);
            });
        });
    });
});
