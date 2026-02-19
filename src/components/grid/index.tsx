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
import { type ComponentPropsWithoutRef, type CSSProperties, type ReactNode, forwardRef } from 'react';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';
import { cn } from '@/lib/utils';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators';
import { type ComponentType, Region } from '@/components/region';

// Based on Radix UI Themes Grid component API
// Reference: https://www.radix-ui.com/themes/docs/components/grid

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('grid', {
    name: 'Grid',
    description: 'A flexible grid layout component for organizing content in columns',
})
@RegionDefinition([
    {
        id: 'main',
        name: 'Main',
    },
])
export class GridMetadata {
    @AttributeDefinition({
        description: 'Number of columns in the grid (1-6)',
        type: 'enum',
        values: ['1', '2', '3', '4', '5', '6'],
        defaultValue: '1',
    })
    columns?: string;
}
/* v8 ignore stop */

type GridFlow = 'row' | 'col' | 'dense' | 'row-dense' | 'col-dense';

interface GridProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
    as?: 'div' | 'span';
    display?: 'none' | 'grid' | 'inline-grid';
    columns?: string;
    flow?: GridFlow;

    // Layout props
    p?: string;
    px?: string;
    py?: string;
    children?: ReactNode;

    // Page Designer props (need to be extracted to avoid passing to DOM)
    regionId?: string;
    component?: ComponentType;
    designMetadata?: ComponentDesignMetadata;
    data?: unknown;
}

// Mapping functions
const columnsMap: Record<string, string> = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
    '5': 'grid-cols-5',
    '6': 'grid-cols-6',
};

const flowMap: Record<GridFlow, string> = {
    row: 'grid-flow-row',
    col: 'grid-flow-col',
    dense: 'grid-flow-dense',
    'row-dense': 'grid-flow-row-dense',
    'col-dense': 'grid-flow-col-dense',
};

const Grid = forwardRef<HTMLDivElement, GridProps>(
    (
        {
            as: ComponentElement = 'div',
            className,
            display = 'grid',
            columns = '1',
            flow,
            p,
            px,
            py,
            style,
            children,
            regionId: _regionId,
            component,
            designMetadata: _designMetadata,
            data: _data,
            ...props
        },
        ref
    ) => {
        // Build grid styles
        const gridStyles: CSSProperties = { ...style };

        // Support for column numbers from 1 to 6
        const columnsNum: string = Number(columns) > 0 && Number(columns) < 7 ? columns : '1';

        // Build class names
        const classes = cn(
            // Display
            typeof display === 'string'
                ? display === 'grid'
                    ? 'grid'
                    : display === 'inline-grid'
                      ? 'inline-grid'
                      : ''
                : '',

            // Columns
            columns && columnsMap[columnsNum],

            // Flow
            flow && flowMap[flow],

            // Padding
            Number(p) > 0 && `p-${p}`,
            Number(px) > 0 && `px-${px}`,
            Number(py) > 0 && `py-${py}`,

            className
        );

        return (
            <ComponentElement ref={ref} className={classes} style={gridStyles} data-slot="grid" {...props}>
                {component ? <Region regionId="main" component={component} errorElement={children} /> : children}
            </ComponentElement>
        );
    }
);

Grid.displayName = 'Grid';

export { Grid };
export type { GridProps };
export default Grid;
