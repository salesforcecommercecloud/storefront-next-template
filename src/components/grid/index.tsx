import { type ComponentPropsWithoutRef, type CSSProperties, type ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators';
import { Region } from '@/components/region';
import type { ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';

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
    page?: Promise<ShopperExperience.schemas['Page']>;
    componentData?: Promise<Record<string, Promise<unknown>>>;
    designMetadata?: unknown;
    regionId?: string;
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
            page,
            componentData,
            designMetadata: _designMetadata,
            regionId: _regionId,
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
                {page ? (
                    <Region page={page} regionId="main" componentData={componentData} fallback={children} />
                ) : (
                    children
                )}
            </ComponentElement>
        );
    }
);

Grid.displayName = 'Grid';

export { Grid };
export type { GridProps };
export default Grid;
