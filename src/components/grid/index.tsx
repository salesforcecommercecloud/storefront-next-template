import { type ComponentPropsWithoutRef, type CSSProperties, type ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Based on Radix UI Themes Grid component API
// Reference: https://www.radix-ui.com/themes/docs/components/grid

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
            as: Component = 'div',
            className,
            display = 'grid',
            columns = '1',
            flow,
            p,
            px,
            py,
            style,
            children,
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
            <Component ref={ref} className={classes} style={gridStyles} data-slot="grid" {...props}>
                {children}
            </Component>
        );
    }
);

Grid.displayName = 'Grid';

export { Grid };
export type { GridProps };
