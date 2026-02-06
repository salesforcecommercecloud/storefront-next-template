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
import { Suspense, type ReactNode } from 'react';
import { Await } from 'react-router';
import { Component } from './component';
import { RegionWrapper } from './region-wrapper';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import {
    PageDesignerPageMetadataProvider,
    useRegionContext,
} from '@salesforce/storefront-next-runtime/design/react/core';
import type {
    ComponentDecoratorProps,
    PageDecoratorProps,
    RegionDesignMetadata,
} from '@salesforce/storefront-next-runtime/design/react';
import { ComponentDataProvider, useComponentData } from './component-data-context';

export type { RegionDesignMetadata };

// Extended Page type with design metadata
type PageWithDesignMetadata = PageDecoratorProps<ShopperExperience.schemas['Page']> & {
    componentData?: Record<string, Promise<unknown>>;
};

// Props when rendering a page-level region
interface PageRegionProps extends React.HTMLAttributes<HTMLDivElement> {
    page: Promise<PageWithDesignMetadata> | PageWithDesignMetadata;
    component?: never;
    regionId: string;
    fallbackElement?: ReactNode;
    errorElement?: ReactNode;
}

export type ComponentType = ComponentDecoratorProps<ShopperExperience.schemas['Component']>;

// Props when rendering a component-level region (nested)
interface ComponentRegionProps extends React.HTMLAttributes<HTMLDivElement> {
    page?: never;
    component: ComponentType;
    regionId: string;
    fallbackElement?: ReactNode;
    errorElement?: ReactNode;
}

// Discriminated union
export type RegionProps = PageRegionProps | ComponentRegionProps;

// Helper: Extract design metadata from region definition
function getDesignMetadata(regionId: string, metadata?: RegionDesignMetadata) {
    return {
        id: regionId,
        componentTypeExclusions: metadata?.componentTypeExclusions ?? [],
        componentTypeInclusions: metadata?.componentTypeInclusions ?? [],
    };
}

// Helper: Render region wrapper with components
function renderRegionContent(
    region: ShopperExperience.schemas['Region'],
    regionId: string,
    metadata: RegionDesignMetadata | undefined,
    className: string,
    rest: React.HTMLAttributes<HTMLDivElement>
) {
    return (
        <RegionWrapper
            region={region}
            className={className}
            designMetadata={getDesignMetadata(regionId, metadata)}
            {...rest}>
            {region.components?.map(
                (comp) => comp.id && <Component key={comp.id} component={comp as ComponentType} regionId={region.id} />
            )}
        </RegionWrapper>
    );
}

/**
 * Region - Renders a Page Designer region from Salesforce's ShopperExperience API data
 *
 * This component supports two distinct modes via a discriminated union:
 *
 * 1. **Page Mode** - For route-level regions:
 *    ```tsx
 *    <Region page={loaderData.page} regionId="main" fallbackElement={<Skeleton />} />
 *    ```
 *    - Accepts page (Promise<PageWithComponentData> or PageWithComponentData)
 *    - Wraps in Suspense for async loading
 *    - Provides ComponentDataContext at page level
 *    - Registers PageDesignerPageMetadataProvider for root regions
 *
 * 2. **Component Mode** - For nested regions in layout components:
 *    ```tsx
 *    <Region component={component} regionId="main" errorElement={children} />
 *    ```
 *    - Accepts component (ShopperExperience.schemas['Component'])
 *    - Synchronous rendering (no Suspense overhead)
 *    - Inherits ComponentDataContext from parent
 *    - No PageDesignerPageMetadataProvider (only for page-level)
 *
 * Key Functionality:
 * - TypeScript enforces you pass EITHER page OR component, never both
 * - Finds the region by ID within the page or component
 * - Renders all components within the region using the Component wrapper
 * - Supports region-specific fallback and error elements
 * - Handles metadata for component type inclusions/exclusions
 *
 * Use Case: Foundational component in Salesforce's Page Designer system for rendering
 * regions that can contain multiple components managed through the Page Designer interface.
 */
export function Region(props: RegionProps) {
    const { regionId, className = '', errorElement, fallbackElement = <div />, ...rest } = props;
    const regionContext = useRegionContext();
    const existingComponentData = useComponentData();

    // COMPONENT MODE: Rendering a component-level region (nested)
    if (props.component !== undefined) {
        const region = props.component.regions?.find((r) => r.id === regionId);
        if (!region) {
            return errorElement ?? null;
        }

        const metadata = props.component.designMetadata?.regionDefinitions?.find((r) => r.id === regionId);
        return renderRegionContent(region, regionId, metadata, className, rest);
    }

    // PAGE MODE: Rendering a page-level region
    const pagePromise = Promise.resolve(props.page);

    return (
        <Suspense fallback={fallbackElement}>
            <Await resolve={pagePromise} errorElement={errorElement}>
                {(resolvedPage) => {
                    const region = resolvedPage?.regions?.find((r) => r.id === regionId);
                    if (!region) {
                        return errorElement ?? null;
                    }

                    const metadata = resolvedPage.designMetadata?.regionDefinitions?.find((r) => r.id === regionId);
                    const { componentData: pageComponentData, ...pageData } = resolvedPage;

                    const content = (
                        <>
                            {!regionContext && <PageDesignerPageMetadataProvider page={pageData} />}
                            {renderRegionContent(region, regionId, metadata, className, rest)}
                        </>
                    );

                    // Provide ComponentDataContext at page level only
                    if (pageComponentData && !existingComponentData) {
                        return <ComponentDataProvider value={pageComponentData}>{content}</ComponentDataProvider>;
                    }

                    return content;
                }}
            </Await>
        </Suspense>
    );
}

// Re-export RegionWrapper for direct usage if needed
export { RegionWrapper } from './region-wrapper';
export type { RegionRendererProps } from './region-wrapper';

// Re-export component data context utilities
// eslint-disable-next-line react-refresh/only-export-components
export { ComponentDataProvider, useComponentData, useComponentDataById } from './component-data-context';
export type { ComponentDataMap } from './component-data-context';
