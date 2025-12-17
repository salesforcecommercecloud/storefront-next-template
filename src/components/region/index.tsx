import { Suspense, type ReactNode } from 'react';
import { Await } from 'react-router';
import { Component } from './component';
import { RegionWrapper } from './region-wrapper';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import {
    PageDesignerPageMetadataProvider,
    useRegionContext,
} from '@salesforce/storefront-next-runtime/design/react/core';

interface RegionProps extends React.HTMLAttributes<HTMLDivElement> {
    page: Promise<ShopperExperience.schemas['Page'] | ShopperExperience.schemas['Component']>;
    regionId: string;
    componentData?: Promise<Record<string, Promise<unknown>>>;
    fallback?: ReactNode;
    suspenseFallback?: ReactNode;
}

/**
 * Region - Renders a Page Designer region from Salesforce's ShopperExperience API data
 *
 * Key Functionality:
 * - Takes a page promise and region ID to locate and render a specific region
 * - Handles Suspense and Await logic internally for streaming/async rendering
 * - Finds the region within the page by ID
 * - Creates a container structure with proper CSS classes and the region's ID
 * - Renders all components within the region by mapping through the components array
 * - Uses the Component wrapper to render each individual component
 * - Supports region-specific fallback components for Suspense boundaries
 * - Supports region-specific error components for ErrorBoundary
 *
 * Use Case: This is a foundational component in Salesforce's Page Designer system that allows
 * content managers to organize page content into logical regions, each containing multiple
 * components that can be managed through the Page Designer interface.
 *
 * In Practice: Layout components (like grids) use this Region component to render content areas,
 * making pages flexible and manageable without requiring code changes.
 */

export function Region(props: RegionProps) {
    const { page, regionId, className = '', componentData, fallback, suspenseFallback = <div />, ...rest } = props;
    const regionContext = useRegionContext();

    return (
        <Suspense fallback={suspenseFallback}>
            <Await resolve={page} errorElement={fallback}>
                {(resolvedPage) => {
                    // Find the region within the page
                    const region = resolvedPage.regions?.find((r) => r.id === regionId);
                    const metadata = resolvedPage.designMetadata?.regionDefinitions?.find((r) => r.id === regionId);

                    // If region not found, return fallback
                    if (!region) {
                        return fallback ?? null;
                    }

                    return (
                        <>
                            {/* Only register page metadata if we are at the root of the page
                                The provider will dedupe strictly equal object */}
                            {!regionContext && <PageDesignerPageMetadataProvider page={resolvedPage} />}
                            <RegionWrapper
                                region={region}
                                className={className}
                                designMetadata={{
                                    id: region.id,
                                    componentTypeExclusions:
                                        metadata?.componentTypeExclusions?.map((c) => c.typeId) ?? [],
                                    componentTypeInclusions:
                                        metadata?.componentTypeInclusions?.map((c) => c.typeId) ?? [],
                                }}
                                {...rest}>
                                {region.components?.map(
                                    (component) =>
                                        component.id && (
                                            <Component
                                                key={component.id}
                                                component={component}
                                                componentData={componentData}
                                                regionId={region.id}
                                                page={Promise.resolve(component)}
                                            />
                                        )
                                )}
                            </RegionWrapper>
                        </>
                    );
                }}
            </Await>
        </Suspense>
    );
}

// Re-export RegionWrapper for direct usage if needed
export { RegionWrapper } from './region-wrapper';
export type { RegionRendererProps } from './region-wrapper';
