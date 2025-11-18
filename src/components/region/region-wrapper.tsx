/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { type ReactNode } from 'react';
import type { ShopperExperienceTypes } from 'commerce-sdk-isomorphic';
import { isDesignModeActive } from '@salesforce/storefront-next-runtime/design';
import { createReactRegionDesignDecorator } from '@salesforce/storefront-next-runtime/design/react';
import { cn } from '@/lib/utils';

/**
 * Design metadata for a region in Page Designer
 */
export interface RegionDesignMetadata {
    id: string;
    parentId?: string;
    componentTypeExclusions?: string[];
    componentTypeInclusions?: string[];
}

/**
 * Props for the base region renderer
 */
export interface RegionRendererProps extends React.HTMLAttributes<HTMLDivElement> {
    region: ShopperExperienceTypes.Page['Region'];
    children: ReactNode;
    designMetadata?: RegionDesignMetadata;
}

/**
 * Base region renderer component that handles the actual DOM structure
 * This is the component that gets decorated in design mode
 */
function RegionRenderer({
    region,
    children,
    className,
    designMetadata: _designMetadata,
    ...rest
}: RegionRendererProps) {
    return (
        <div
            id={region.id}
            className={cn('region', className)}
            data-testid="region"
            data-region-id={region.id}
            {...rest}>
            <div className="container">{children}</div>
        </div>
    );
}

/**
 * Create the design-mode decorated version of the region renderer
 * This wraps the region with Page Designer functionality when in design mode
 */
const DecoratedRegionRenderer = createReactRegionDesignDecorator(RegionRenderer);

/**
 * RegionWrapper - Smart wrapper that conditionally applies design mode decoration
 *
 * This component provides a clean abstraction for rendering regions that:
 * - Automatically detects design mode and applies the appropriate decorator
 * - Maintains a simple API for region rendering
 * - Handles design metadata when in Page Designer
 *
 * @example
 * ```tsx
 * <RegionWrapper regionId={region.id}>
 *   {region.components.map(component => (
 *     <Component key={component.id} component={component} />
 *   ))}
 * </RegionWrapper>
 * ```
 */
export function RegionWrapper({ region, children, className, designMetadata, ...rest }: RegionRendererProps) {
    const isDesignMode = isDesignModeActive();

    if (isDesignMode && region?.id) {
        return (
            <DecoratedRegionRenderer
                region={region}
                designMetadata={{
                    id: region.id,
                    // TODO: We need to know this information via metadata
                    regionDirection: 'column',
                    componentIds: region?.components?.map((cmp) => cmp.id) || [],
                    componentTypeExclusions: designMetadata?.componentTypeExclusions || [],
                    componentTypeInclusions: designMetadata?.componentTypeInclusions || [],
                }}
                className={className}
                {...rest}>
                {children}
            </DecoratedRegionRenderer>
        );
    }

    // At runtime, render directly without decoration overhead
    return (
        <RegionRenderer region={region} className={className} {...rest}>
            {children}
        </RegionRenderer>
    );
}
