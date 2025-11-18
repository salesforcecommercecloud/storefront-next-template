import { Component } from './component';
import { RegionWrapper } from './region-wrapper';
import type { RegionDefinitionConfig } from '@/lib/decorators';
import type { ShopperExperienceTypes } from 'commerce-sdk-isomorphic';

interface RegionProps extends React.HTMLAttributes<HTMLDivElement> {
    region: ShopperExperienceTypes.Page['Region'];
    componentData?: Promise<Record<string, Promise<unknown>>>;
    metadata?: RegionDefinitionConfig;
}

/**
 * Region - Renders a Page Designer region from Salesforce's ShopperExperience API data
 *
 * Key Functionality:
 * - Takes a region object with an id and array of components
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
    const { region, className = '', componentData, metadata, ...rest } = props;
    return (
        <div className="container">
            <RegionWrapper
                region={region}
                className={className}
                designMetadata={{
                    id: region.id,
                    componentTypeExclusions: metadata?.componentTypeExclusions,
                    componentTypeInclusions: metadata?.componentTypeInclusions,
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
                            />
                        )
                )}
            </RegionWrapper>
        </div>
    );
}

// Re-export RegionWrapper for direct usage if needed
export { RegionWrapper } from './region-wrapper';
export type { RegionRendererProps } from './region-wrapper';
