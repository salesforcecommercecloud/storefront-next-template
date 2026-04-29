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
import React, { Suspense, useEffect, useState, type ComponentType } from 'react';
import { registry } from '@/lib/registry';
import { initializeRegistry } from '@/lib/static-registry';
import { Skeleton } from '@/components/ui/skeleton';

// Initialize the registry with all static components
initializeRegistry(registry);

/**
 * List of all registered components from the static registry
 * These correspond to the components registered in static-registry.ts
 */
const REGISTERED_COMPONENTS = registry.getRegisteredIds();

type RegisteredComponentId = string;

/**
 * Hook to dynamically load a component from the registry
 */
function useRegistryComponent(componentId: RegisteredComponentId) {
    const [Component, setComponent] = useState<ComponentType<any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadComponent() {
            try {
                setLoading(true);
                setError(null);

                // Preload the component to ensure it's available
                await registry.preload(componentId);

                // Get the component from the registry
                const comp = registry.getComponent(componentId);

                if (mounted) {
                    if (comp) {
                        setComponent(() => comp as ComponentType<any>);
                    } else {
                        setError(`Component "${componentId}" not found in registry`);
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load component');
                    setLoading(false);
                }
            }
        }

        loadComponent();

        return () => {
            mounted = false;
        };
    }, [componentId]);

    return { Component, loading, error };
}

/**
 * Hook to get the fallback component for a given component ID
 */
function useRegistryFallback(componentId: RegisteredComponentId) {
    const [Fallback, setFallback] = useState<ComponentType<any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadFallback() {
            try {
                setLoading(true);
                setError(null);

                // Preload to ensure the component module is loaded
                await registry.preload(componentId);

                // Get the fallback component
                const fallback = registry.getFallback(componentId);

                if (mounted) {
                    if (fallback) {
                        setFallback(() => fallback as ComponentType<any>);
                    } else {
                        setError(`No fallback component found for "${componentId}"`);
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load fallback');
                    setLoading(false);
                }
            }
        }

        loadFallback();

        return () => {
            mounted = false;
        };
    }, [componentId]);

    return { Fallback, loading, error };
}

/**
 * Loading placeholder component
 */
function LoadingPlaceholder() {
    return (
        <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
        </div>
    );
}

/**
 * Error display component
 */
function ErrorDisplay({ message }: { message: string }) {
    return (
        <div className="p-8 border-2 border-destructive rounded-none bg-destructive/10">
            <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Component</h3>
            <p className="text-muted-foreground">{message}</p>
        </div>
    );
}

/**
 * Info banner about the registry
 */
function RegistryInfoBanner({
    componentId,
    hasLoader,
    hasFallback,
}: {
    componentId: string;
    hasLoader: boolean;
    hasFallback: boolean;
}) {
    return (
        <div className="mb-6 p-4 bg-muted rounded-none border">
            <h3 className="font-semibold mb-2">Registry Component Info</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Component ID:</dt>
                <dd className="font-mono">{componentId}</dd>
                <dt className="text-muted-foreground">Has Loader:</dt>
                <dd>{hasLoader ? '✅ Yes' : '❌ No'}</dd>
                <dt className="text-muted-foreground">Has Fallback:</dt>
                <dd>{hasFallback ? '✅ Yes' : '❌ No'}</dd>
                <dt className="text-muted-foreground">Registered:</dt>
                <dd>{registry.has(componentId) ? '✅ Yes' : '❌ No'}</dd>
            </dl>
        </div>
    );
}

/**
 * Story component that renders a component from the registry
 */
function RegistryComponentStory({
    componentId,
    showInfoBanner = true,
    componentProps = {},
}: {
    componentId: RegisteredComponentId;
    showInfoBanner?: boolean;
    componentProps?: Record<string, unknown>;
}) {
    const { Component, loading, error } = useRegistryComponent(componentId);
    const hasLoader = registry.hasLoaders(componentId);
    const hasFallback = registry.getFallback(componentId) !== undefined;

    return (
        <div className="p-4">
            {showInfoBanner && (
                <RegistryInfoBanner componentId={componentId} hasLoader={hasLoader} hasFallback={hasFallback} />
            )}

            <div className="border rounded-none overflow-hidden">
                {loading && <LoadingPlaceholder />}
                {error && <ErrorDisplay message={error} />}
                {!loading && !error && Component && (
                    <Suspense fallback={<LoadingPlaceholder />}>
                        <Component {...componentProps} />
                    </Suspense>
                )}
            </div>
        </div>
    );
}

/**
 * Story component that renders the fallback for a component from the registry
 */
function RegistryFallbackStory({
    componentId,
    showInfoBanner = true,
}: {
    componentId: RegisteredComponentId;
    showInfoBanner?: boolean;
}) {
    const { Fallback, loading, error } = useRegistryFallback(componentId);
    const hasLoader = registry.hasLoaders(componentId);
    const hasFallback = registry.getFallback(componentId) !== undefined;

    return (
        <div className="p-4">
            {showInfoBanner && (
                <RegistryInfoBanner componentId={componentId} hasLoader={hasLoader} hasFallback={hasFallback} />
            )}

            <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-none border border-amber-300 dark:border-amber-700">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Fallback Component:</strong> This is the skeleton/placeholder component shown while the main
                    component is loading.
                </p>
            </div>

            <div className="border rounded-none overflow-hidden">
                {loading && <LoadingPlaceholder />}
                {error && <ErrorDisplay message={error} />}
                {!loading && !error && Fallback && <Fallback title="Loading Products..." />}
            </div>
        </div>
    );
}

/**
 * Story component that shows all registered component IDs
 */
function RegistryOverviewStory() {
    const registeredIds = registry.getRegisteredIds();

    return (
        <div className="p-4">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Static Registry Overview</h2>
                <p className="text-muted-foreground">
                    This story displays all components registered in the static registry. Components are lazy-loaded
                    from the registry when selected.
                </p>
            </div>

            <div className="grid gap-4">
                <div className="p-4 bg-muted rounded-none">
                    <h3 className="font-semibold mb-3">Registered Components ({registeredIds.length})</h3>
                    <div className="grid gap-2">
                        {registeredIds.map((id) => {
                            const hasLoader = registry.hasLoaders(id);
                            const hasFallback = registry.getFallback(id) !== undefined;
                            return (
                                <div
                                    key={id}
                                    className="flex items-center justify-between p-2 bg-background rounded border">
                                    <code className="text-sm">{id}</code>
                                    <div className="flex gap-2 text-xs">
                                        {hasLoader && (
                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                                                Has Loader
                                            </span>
                                        )}
                                        {hasFallback && (
                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                                                Has Fallback
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

const meta = {
    title: 'Registry/Static Registry',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
This story demonstrates the Static Component Registry functionality.

**Features:**
- Displays all components registered in the static registry
- Allows selecting individual components to render
- Shows fallback components for components that support them
- Displays metadata about each component (has loader, has fallback, etc.)

**Registry Components:**
The static registry is initialized from \`static-registry.ts\` and contains:
${registry
    .getRegisteredIds()
    .map((id) => `- \`${id}\` - ${registry.getComponent(id)?.name ?? 'Unknown Component'}`)
    .join('\n')}
                `,
            },
        },
    },
    argTypes: {
        componentId: {
            control: 'select',
            options: REGISTERED_COMPONENTS,
            description: 'Select a component from the registry to render',
            table: {
                category: 'Component Selection',
                defaultValue: { summary: 'Content.hero' },
            },
        },
        showInfoBanner: {
            control: 'boolean',
            description: 'Show the registry info banner above the component',
            table: {
                category: 'Display Options',
                defaultValue: { summary: 'true' },
            },
        },
        componentProps: {
            control: 'object',
            description: 'JSON object of properties to pass to the component',
            table: {
                category: 'Component Properties',
                defaultValue: { summary: '{}' },
                type: { summary: 'Record<string, unknown>' },
            },
        },
    },
    decorators: [(Story: React.ComponentType) => <Story />],
    tags: ['autodocs', 'skip-a11y'],
};

export default meta;

type StoryArgs = {
    componentId?: RegisteredComponentId;
    showInfoBanner?: boolean;
    componentProps?: Record<string, unknown>;
};

type Story = Omit<StoryObj<typeof meta>, 'args' | 'render'> & {
    args?: StoryArgs;
    render?: (args: StoryArgs) => React.JSX.Element;
};

/**
 * Overview story showing all registered components
 */
export const Overview: Story = {
    render: () => <RegistryOverviewStory />,
    parameters: {
        docs: {
            description: {
                story: 'Shows an overview of all components registered in the static registry.',
            },
        },
    },
};

/**
 * Interactive story to select and render any registered component
 */
export const ComponentSelector: Story = {
    args: {
        componentId: 'Content.hero',
        showInfoBanner: true,
        componentProps: {
            title: 'Welcome to Our Store',
            subtitle: 'Discover amazing products and great deals',
            ctaText: 'Shop Now',
            ctaLink: '/shop',
        },
    },
    render: (args: StoryArgs) => (
        <RegistryComponentStory
            componentId={args.componentId || 'Content.hero'}
            showInfoBanner={args.showInfoBanner ?? true}
            componentProps={args.componentProps ?? {}}
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use the control to select different components from the registry. Edit the `componentProps` JSON object to pass custom properties to the component.',
            },
        },
    },
};

/**
 * Story with a control to select fallback components
 */
export const FallbackSelector: Story = {
    args: {
        componentId: 'Layout.productCarousel',
        showInfoBanner: true,
    },
    render: (args: StoryArgs) => {
        const componentId = args.componentId || 'Layout.productCarousel';
        if (!registry.getFallback(componentId)) {
            return (
                <div className="p-8">
                    <ErrorDisplay message={`Component "${componentId}" does not have a fallback component.`} />
                </div>
            );
        }
        return <RegistryFallbackStory componentId={componentId} showInfoBanner={args.showInfoBanner ?? true} />;
    },
    parameters: {
        docs: {
            description: {
                story: 'Select from components that have registered fallback/skeleton components. Currently only `Layout.productCarousel` has a fallback.',
            },
        },
    },
};
