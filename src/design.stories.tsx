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
import type { StoryObj } from '@storybook/react-vite';
import React from 'react';
import {
    PageDesignerProvider,
    PageDesignerPageMetadataProvider,
} from '@salesforce/storefront-next-runtime/design/react/core';
import {
    createReactComponentDesignDecorator,
    type ComponentDesignMetadata,
} from '@salesforce/storefront-next-runtime/design/react';
import { PageDesignerInit } from '@/page-designer-init';
import { PageDesignerHostProvider } from '@/test-utils/page-designer-host-provider';
import { RegionWrapper } from '@/components/region/region-wrapper';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Simple placeholder component for demonstration purposes
 */
function PlaceholderComponent({ title, description, typeId }: { title: string; description?: string; typeId: string }) {
    return (
        <div
            style={{
                padding: '1rem',
                border: '2px dashed #ccc',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9',
                marginBottom: '1rem',
            }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600' }}>{title}</h3>
            {description && <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>{description}</p>}
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#999' }}>Type: {typeId}</div>
        </div>
    );
}

/**
 * Decorated version of PlaceholderComponent for design layer integration
 */
const DecoratedPlaceholderComponent = createReactComponentDesignDecorator(PlaceholderComponent);

/**
 * Page data factory functions for different story scenarios
 */
const pageFactories = {
    default: (localized: boolean = true): ShopperExperience.schemas['Page'] =>
        ({
            id: 'storybook-page',
            typeId: 'homepage',
            regions: [
                {
                    id: 'header',
                    components: [
                        {
                            id: 'header-1',
                            typeId: 'banner',
                            data: { title: 'Welcome Banner' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'header-2',
                            typeId: 'navigation',
                            data: { title: 'Main Navigation' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
                {
                    id: 'main',
                    components: [
                        {
                            id: 'main-1',
                            typeId: 'hero',
                            data: { title: 'Hero Section' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'main-2',
                            typeId: 'content',
                            data: { title: 'Content Block' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'main-3',
                            typeId: 'product-grid',
                            data: { title: 'Product Grid' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
                {
                    id: 'sidebar',
                    components: [
                        {
                            id: 'sidebar-1',
                            typeId: 'filter',
                            data: { title: 'Filters' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'sidebar-2',
                            typeId: 'promo',
                            data: { title: 'Promotional Banner' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
                {
                    id: 'footer',
                    components: [
                        {
                            id: 'footer-1',
                            typeId: 'links',
                            data: { title: 'Footer Links' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
            ],
        }) as unknown as ShopperExperience.schemas['Page'],

    empty: (_localized: boolean = true): ShopperExperience.schemas['Page'] =>
        ({
            id: 'empty-page',
            typeId: 'homepage',
            regions: [
                {
                    id: 'empty-region-1',
                    components: [],
                },
                {
                    id: 'empty-region-2',
                    components: [],
                },
            ],
        }) as ShopperExperience.schemas['Page'],

    singleRegion: (localized: boolean = true): ShopperExperience.schemas['Page'] =>
        ({
            id: 'single-region-page',
            typeId: 'homepage',
            regions: [
                {
                    id: 'main-content',
                    components: [
                        {
                            id: 'comp-1',
                            typeId: 'hero',
                            data: { title: 'Hero Component' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'comp-2',
                            typeId: 'content',
                            data: { title: 'Content Component' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'comp-3',
                            typeId: 'cta',
                            data: { title: 'Call to Action' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
            ],
        }) as unknown as ShopperExperience.schemas['Page'],

    multipleRegions: (localized: boolean = true): ShopperExperience.schemas['Page'] =>
        ({
            id: 'multi-region-multi-component-page',
            typeId: 'homepage',
            regions: [
                {
                    id: 'top-banner',
                    components: [
                        {
                            id: 'banner-1',
                            typeId: 'promo-banner',
                            data: { title: 'Summer Sale Banner' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'banner-2',
                            typeId: 'announcement',
                            data: { title: 'Free Shipping Announcement' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'banner-3',
                            typeId: 'newsletter',
                            data: { title: 'Newsletter Signup' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
                {
                    id: 'hero-section',
                    components: [
                        {
                            id: 'hero-1',
                            typeId: 'hero-carousel',
                            data: { title: 'Hero Carousel Slide 1' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'hero-2',
                            typeId: 'hero-carousel',
                            data: { title: 'Hero Carousel Slide 2' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'hero-3',
                            typeId: 'hero-carousel',
                            data: { title: 'Hero Carousel Slide 3' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'hero-cta',
                            typeId: 'cta-button',
                            data: { title: 'Shop Now CTA' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
                {
                    id: 'featured-products',
                    components: [
                        {
                            id: 'product-1',
                            typeId: 'product-card',
                            data: { title: 'Featured Product 1' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'product-2',
                            typeId: 'product-card',
                            data: { title: 'Featured Product 2' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'product-3',
                            typeId: 'product-card',
                            data: { title: 'Featured Product 3' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'product-4',
                            typeId: 'product-card',
                            data: { title: 'Featured Product 4' } as unknown as Record<string, never>,
                            visible: true,
                        },
                        {
                            id: 'product-5',
                            typeId: 'product-card',
                            data: { title: 'Featured Product 5' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
                {
                    id: 'content-blocks',
                    components: [
                        {
                            id: 'content-1',
                            typeId: 'text-block',
                            data: { title: 'About Us Section' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'content-2',
                            typeId: 'image-block',
                            data: { title: 'Brand Image' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'content-3',
                            typeId: 'video-block',
                            data: { title: 'Brand Video' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'content-4',
                            typeId: 'testimonial',
                            data: { title: 'Customer Testimonial' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
                {
                    id: 'sidebar',
                    components: [
                        {
                            id: 'sidebar-filter',
                            typeId: 'filter-panel',
                            data: { title: 'Product Filters' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'sidebar-promo',
                            typeId: 'promo-card',
                            data: { title: 'Special Offer' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'sidebar-recommendations',
                            typeId: 'recommendations',
                            data: { title: 'Recommended Products' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'sidebar-newsletter',
                            typeId: 'newsletter-signup',
                            data: { title: 'Newsletter Sidebar' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
                {
                    id: 'footer',
                    components: [
                        {
                            id: 'footer-links',
                            typeId: 'link-list',
                            data: { title: 'Footer Navigation Links' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'footer-social',
                            typeId: 'social-media',
                            data: { title: 'Social Media Icons' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'footer-legal',
                            typeId: 'legal-links',
                            data: { title: 'Legal & Privacy Links' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                        {
                            id: 'footer-copyright',
                            typeId: 'copyright',
                            data: { title: 'Copyright Notice' } as unknown as Record<string, never>,
                            visible: true,
                            localized,
                        },
                    ],
                },
            ],
        }) as unknown as ShopperExperience.schemas['Page'],
};

type PageFactoryKey = keyof typeof pageFactories;

/**
 * Single render function that parameterizes all story variations
 */
function DesignLayerStory({
    pageData,
    title,
    description,
}: {
    pageData: ShopperExperience.schemas['Page'];
    title: string;
    description?: string;
}) {
    return (
        <PageDesignerPageMetadataProvider page={pageData}>
            <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>{title}</h1>
                {description && <p style={{ marginBottom: '2rem', color: '#666' }}>{description}</p>}

                {pageData.regions?.map((region) => (
                    <div key={region.id} style={{ marginBottom: '2rem' }}>
                        <h2
                            style={{
                                marginBottom: '1rem',
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#333',
                                paddingBottom: '0.5rem',
                                borderBottom: '2px solid #e0e0e0',
                            }}>
                            Region: {region.id}
                            {region.components?.length !== undefined && ` (${region.components.length} components)`}
                        </h2>
                        <RegionWrapper region={region}>
                            {region.components && region.components.length > 0 ? (
                                region.components.map((component) => {
                                    const designMetadata: ComponentDesignMetadata = {
                                        id: component.id,
                                        name: component.typeId,
                                        isFragment: false,
                                        isVisible: Boolean(component.visible),
                                        isLocalized: Boolean(component.localized),
                                    };
                                    return (
                                        <DecoratedPlaceholderComponent
                                            key={component.id}
                                            designMetadata={designMetadata}
                                            title={
                                                (component.data?.title as string | undefined) ||
                                                `Component ${component.id}`
                                            }
                                            description={`Component ID: ${component.id} | Type: ${component.typeId}`}
                                            typeId={component.typeId}
                                        />
                                    );
                                })
                            ) : (
                                <div
                                    style={{
                                        padding: '2rem',
                                        border: '2px dashed #ccc',
                                        borderRadius: '8px',
                                        backgroundColor: '#f9f9f9',
                                        textAlign: 'center',
                                        color: '#999',
                                    }}>
                                    No components in this region
                                </div>
                            )}
                        </RegionWrapper>
                    </div>
                ))}
            </div>
        </PageDesignerPageMetadataProvider>
    );
}

type DesignMode = 'design' | 'preview' | 'none';

/**
 * Decorator component that sets URL search param for mode detection
 */
function ModeDecorator({ Story, mode }: { Story: React.ComponentType; mode: DesignMode }) {
    const [currentMode, setCurrentMode] = React.useState<string | null>(null);

    if (currentMode !== mode) {
        const url = new URL(window.location.href);

        // Set the mode based on the parameter
        if (mode === 'design') {
            url.searchParams.set('mode', 'EDIT');
        } else if (mode === 'preview') {
            url.searchParams.set('mode', 'PREVIEW');
        } else {
            // Remove mode param for 'none'
            url.searchParams.delete('mode');
        }

        window.history.replaceState({}, '', url.toString());
        setCurrentMode(mode);
    }

    const clientLogger = (message: unknown, source: 'host' | 'client') => {
        if (source === 'host') {
            /* eslint-disable-next-line no-console */
            console.log(`PageDesignerClient event: `, message);
        }
    };

    return (
        <PageDesignerProvider clientId="storybook-client" targetOrigin="*" clientLogger={clientLogger}>
            <PageDesignerInit />
            <PageDesignerHostProvider expose={true} logEvents={true} />
            <Story />
        </PageDesignerProvider>
    );
}

const meta = {
    title: 'Design Layer/Page Designer',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
This story demonstrates the Page Designer integration with a mock page structure.

**Features:**
- Uses PageDesignerProvider to enable design mode
- Includes PageDesignerStyles for design layer styling
- Uses PageDesignerHostProvider for testing without a real host
- Renders a mock page with multiple regions and components
- Components are wrapped in RegionWrapper for design layer interaction

**Usage:**
This story is useful for testing and developing the design layer functionality in isolation.

**Mode Configuration:**
Use the \`designMode\` parameter to control the mode:
- \`design\` - Enables design mode (adds \`?mode=EDIT\` to URL)
- \`preview\` - Enables preview mode (adds \`?mode=PREVIEW\` to URL)
- \`none\` - Disables both modes (removes mode param from URL)
                `,
            },
        },
    },
    argTypes: {
        designMode: {
            control: 'select',
            options: ['design', 'preview', 'none'],
            description: 'Controls the Page Designer mode via URL search param',
            table: {
                category: 'Page Designer',
                defaultValue: { summary: 'design' },
            },
        },
        pageFactory: {
            control: 'select',
            options: ['default', 'empty', 'singleRegion', 'multipleRegions'],
            description: 'Selects which page data factory to use for generating the page structure',
            table: {
                category: 'Page Data',
                defaultValue: { summary: 'default' },
            },
        },
        title: {
            control: 'text',
            description: 'Title displayed at the top of the story',
            table: {
                category: 'Display',
                defaultValue: { summary: 'Design Layer Storybook Demo' },
            },
        },
        description: {
            control: 'text',
            description: 'Optional description text displayed below the title',
            table: {
                category: 'Display',
            },
        },
        componentLocalized: {
            control: 'boolean',
            description:
                'Controls whether all components are localized. This sets the `localized` property on all components in the page data.',
            table: {
                category: 'Component Properties',
                defaultValue: { summary: 'true' },
            },
        },
    },
    decorators: [
        (Story: React.ComponentType, context: { args?: { designMode?: DesignMode } }) => {
            const mode = ((context.args as { designMode?: DesignMode })?.designMode as DesignMode) || 'design';
            return <ModeDecorator Story={Story} mode={mode} />;
        },
    ],
    tags: ['autodocs', 'skip-a11y'],
};

export default meta;
type StoryArgs = {
    designMode?: DesignMode;
    pageFactory?: PageFactoryKey;
    title?: string;
    description?: string;
    componentLocalized?: boolean;
};
type Story = Omit<StoryObj<typeof meta>, 'args' | 'render'> & {
    args?: StoryArgs;
    render?: (args: StoryArgs) => React.JSX.Element;
};

export const Default: Story = {
    args: {
        designMode: 'design',
        pageFactory: 'default',
        title: 'Design Layer Storybook Demo',
        componentLocalized: true,
    },
    render: (args: StoryArgs) => {
        const pageData = pageFactories[(args.pageFactory as PageFactoryKey) || 'default'](
            args.componentLocalized ?? true
        );
        return (
            <DesignLayerStory
                pageData={pageData}
                title={args.title || 'Design Layer Storybook Demo'}
                description={args.description}
            />
        );
    },
};

export const WithEmptyRegions: Story = {
    args: {
        designMode: 'design',
        pageFactory: 'empty',
        title: 'Empty Regions Demo',
        description: 'Demonstrates regions with no components',
        componentLocalized: true,
    },
    render: (args: StoryArgs) => {
        const pageData = pageFactories[(args.pageFactory as PageFactoryKey) || 'empty'](
            args.componentLocalized ?? true
        );
        return (
            <DesignLayerStory
                pageData={pageData}
                title={args.title || 'Empty Regions Demo'}
                description={args.description}
            />
        );
    },
};

export const SingleRegion: Story = {
    args: {
        designMode: 'design',
        pageFactory: 'singleRegion',
        title: 'Single Region Demo',
        description: 'Demonstrates a page with a single region containing multiple components',
        componentLocalized: true,
    },
    render: (args: StoryArgs) => {
        const pageData = pageFactories[(args.pageFactory as PageFactoryKey) || 'singleRegion'](
            args.componentLocalized ?? true
        );
        return (
            <DesignLayerStory
                pageData={pageData}
                title={args.title || 'Single Region Demo'}
                description={args.description}
            />
        );
    },
};

export const MultipleRegionsWithMultipleComponents: Story = {
    args: {
        designMode: 'design',
        pageFactory: 'multipleRegions',
        title: 'Multiple Regions with Multiple Components',
        description: 'This story demonstrates a complex page layout with 6 regions, each containing 3-5 components.',
        componentLocalized: true,
    },
    render: (args: StoryArgs) => {
        const pageData = pageFactories[(args.pageFactory as PageFactoryKey) || 'multipleRegions'](
            args.componentLocalized ?? true
        );
        return (
            <DesignLayerStory
                pageData={pageData}
                title={args.title || 'Multiple Regions with Multiple Components'}
                description={args.description}
            />
        );
    },
};

export const EditMode: Story = {
    args: {
        designMode: 'design',
        pageFactory: 'default',
        title: 'Design Mode (EDIT)',
        description:
            'Shows the page in design mode with `?mode=EDIT` in the URL. This enables the Page Designer interface.',
        componentLocalized: true,
    },
    render: (args: any) => {
        const storyArgs = args as StoryArgs;
        const pageData = pageFactories[(storyArgs.pageFactory as PageFactoryKey) || 'default'](
            storyArgs.componentLocalized ?? true
        );
        return (
            <DesignLayerStory
                pageData={pageData}
                title={storyArgs.title || 'Design Mode (EDIT)'}
                description={storyArgs.description}
            />
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the page in design mode with `?mode=EDIT` in the URL. This enables the Page Designer interface.',
            },
        },
    },
};

export const PreviewMode: Story = {
    args: {
        designMode: 'preview',
        pageFactory: 'default',
        title: 'Preview Mode (PREVIEW)',
        description:
            'Shows the page in preview mode with `?mode=PREVIEW` in the URL. This enables preview functionality.',
        componentLocalized: true,
    },
    render: (args: any) => {
        const storyArgs = args as StoryArgs;
        const pageData = pageFactories[(storyArgs.pageFactory as PageFactoryKey) || 'default'](
            storyArgs.componentLocalized ?? true
        );
        return (
            <DesignLayerStory
                pageData={pageData}
                title={storyArgs.title || 'Preview Mode (PREVIEW)'}
                description={storyArgs.description}
            />
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the page in preview mode with `?mode=PREVIEW` in the URL. This enables preview functionality.',
            },
        },
    },
};

export const NoMode: Story = {
    args: {
        designMode: 'none',
        pageFactory: 'default',
        title: 'No Mode (Normal)',
        description: 'Shows the page without any design mode active. No mode parameter is added to the URL.',
    },
    render: (args: any) => {
        const storyArgs = args as StoryArgs;
        const pageData = pageFactories[(storyArgs.pageFactory as PageFactoryKey) || 'default'](
            storyArgs.componentLocalized ?? true
        );
        return (
            <DesignLayerStory
                pageData={pageData}
                title={storyArgs.title || 'No Mode (Normal)'}
                description={storyArgs.description}
            />
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the page without any design mode active. No mode parameter is added to the URL.',
            },
        },
    },
};
