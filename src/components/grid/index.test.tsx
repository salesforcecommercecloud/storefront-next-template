/**
 * Grid Component Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from './index';

describe('Grid Component', () => {
    describe('Basic Rendering', () => {
        it('should render with children', () => {
            render(
                <Grid data-testid="grid">
                    <div>Child 1</div>
                    <div>Child 2</div>
                </Grid>
            );

            const grid = screen.getByTestId('grid');
            expect(grid).toBeInTheDocument();
            expect(grid.children).toHaveLength(2);
        });

        it('should render as div by default', () => {
            render(<Grid data-testid="grid">Content</Grid>);
            const grid = screen.getByTestId('grid');
            expect(grid.tagName).toBe('DIV');
        });

        it('should render as span when as="span"', () => {
            render(
                <Grid as="span" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.tagName).toBe('SPAN');
        });

        it('should have data-slot="grid" attribute', () => {
            render(<Grid data-testid="grid">Content</Grid>);
            const grid = screen.getByTestId('grid');
            expect(grid).toHaveAttribute('data-slot', 'grid');
        });

        it('should have grid class by default', () => {
            render(<Grid data-testid="grid">Content</Grid>);
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('grid');
        });
    });

    describe('Display Prop', () => {
        it('should apply grid class by default', () => {
            render(<Grid data-testid="grid">Content</Grid>);
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('grid');
        });

        it('should apply inline-grid when display="inline-grid"', () => {
            render(
                <Grid display="inline-grid" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('inline-grid');
        });
    });

    describe('Columns Prop', () => {
        // Test all valid column values (1-6)
        const validColumns = ['1', '2', '3', '4', '5', '6'] as const;

        validColumns.forEach((column) => {
            it(`should apply grid-cols-${column} for columns="${column}"`, () => {
                render(
                    <Grid columns={column} data-testid="grid">
                        Content
                    </Grid>
                );
                const grid = screen.getByTestId('grid');
                expect(grid.className).toContain(`grid-cols-${column}`);
            });
        });

        it('should handle columns outside range (defaults to grid-cols-1)', () => {
            render(
                <Grid columns="7" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('grid-cols-1');
        });

        it('should handle invalid columns string (defaults to grid-cols-1)', () => {
            render(
                <Grid columns="invalid" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('grid-cols-1');
        });
    });

    describe('Flow Prop', () => {
        // Test all flow values
        const flowValues = [
            { flow: 'row', class: 'grid-flow-row' },
            { flow: 'col', class: 'grid-flow-col' },
            { flow: 'dense', class: 'grid-flow-dense' },
            { flow: 'row-dense', class: 'grid-flow-row-dense' },
            { flow: 'col-dense', class: 'grid-flow-col-dense' },
        ] as const;

        flowValues.forEach(({ flow, class: className }) => {
            it(`should apply ${className} for flow="${flow}"`, () => {
                render(
                    <Grid flow={flow} data-testid="grid">
                        Content
                    </Grid>
                );
                const grid = screen.getByTestId('grid');
                expect(grid.className).toContain(className);
            });
        });
    });

    describe('Padding Props', () => {
        it('should apply p-4 for p="4"', () => {
            render(
                <Grid p="4" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('p-4');
        });

        it('should apply px-4 for px="4"', () => {
            render(
                <Grid px="4" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('px-4');
        });

        it('should apply py-2 for py="2"', () => {
            render(
                <Grid py="2" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('py-2');
        });

        it('should apply multiple padding classes', () => {
            render(
                <Grid px="4" py="2" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('px-4');
            expect(grid.className).toContain('py-2');
        });

        it('should not apply padding for "0"', () => {
            render(
                <Grid p="0" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).not.toContain('p-0');
        });

        it('should not apply padding for invalid values', () => {
            render(
                <Grid p="invalid" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).not.toContain('p-invalid');
        });
    });

    describe('Custom Props', () => {
        it('should accept custom className', () => {
            render(
                <Grid className="custom-class" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('custom-class');
        });

        it('should accept custom styles', () => {
            render(
                <Grid style={{ backgroundColor: 'red' }} data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.style.backgroundColor).toBe('red');
        });

        it('should forward DOM props', () => {
            render(
                <Grid id="test-id" aria-label="Test Grid" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid).toHaveAttribute('id', 'test-id');
            expect(grid).toHaveAttribute('aria-label', 'Test Grid');
        });

        it('should merge custom styles with component styles', () => {
            render(
                <Grid style={{ backgroundColor: 'red', color: 'white' }} data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.style.backgroundColor).toBe('red');
            expect(grid.style.color).toBe('white');
        });
    });

    describe('Combined Props', () => {
        it('should handle multiple props together', () => {
            render(
                <Grid columns="3" flow="row" p="4" className="custom" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('grid-cols-3');
            expect(grid.className).toContain('grid-flow-row');
            expect(grid.className).toContain('p-4');
            expect(grid.className).toContain('custom');
        });

        it('should handle all padding props together', () => {
            render(
                <Grid p="4" px="6" py="2" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('p-4');
            expect(grid.className).toContain('px-6');
            expect(grid.className).toContain('py-2');
        });

        it('should work with span element and props', () => {
            render(
                <Grid as="span" columns="2" flow="col" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.tagName).toBe('SPAN');
            expect(grid.className).toContain('grid-cols-2');
            expect(grid.className).toContain('grid-flow-col');
        });
    });

    describe('Ref Forwarding', () => {
        it('should forward ref to the DOM element', () => {
            const ref = { current: null as HTMLDivElement | null };
            render(
                <Grid ref={ref} data-testid="grid">
                    Content
                </Grid>
            );
            expect(ref.current).toBeInstanceOf(HTMLDivElement);
            expect(ref.current).toBe(screen.getByTestId('grid'));
        });

        it('should forward ref to span element', () => {
            const ref = { current: null as HTMLSpanElement | null };
            render(
                <Grid as="span" ref={ref as any} data-testid="grid">
                    Content
                </Grid>
            );
            expect(ref.current).toBeInstanceOf(HTMLSpanElement);
        });
    });

    describe('Edge Cases', () => {
        it('should render with empty children', () => {
            render(<Grid data-testid="grid" />);
            const grid = screen.getByTestId('grid');
            expect(grid).toBeInTheDocument();
            expect(grid.children).toHaveLength(0);
        });

        it('should handle multiple children types', () => {
            render(
                <Grid data-testid="grid">
                    <div>Div</div>
                    <span>Span</span>
                    Text
                    {123}
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid).toBeInTheDocument();
            expect(grid.textContent).toContain('Div');
            expect(grid.textContent).toContain('Span');
            expect(grid.textContent).toContain('Text');
            expect(grid.textContent).toContain('123');
        });
    });

    describe('Class Name Merging', () => {
        it('should properly merge built-in classes with custom className', () => {
            render(
                <Grid columns="3" className="p-8" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            expect(grid.className).toContain('grid');
            expect(grid.className).toContain('grid-cols-3');
            expect(grid.className).toContain('p-8');
        });

        it('should handle conflicting classes', () => {
            render(
                <Grid p="4" className="p-8" data-testid="grid">
                    Content
                </Grid>
            );
            const grid = screen.getByTestId('grid');
            // cn() from lib/utils should handle conflicting classes
            // className prop comes last, so p-8 should win
            expect(grid.className).toContain('p-8');
        });
    });
});
