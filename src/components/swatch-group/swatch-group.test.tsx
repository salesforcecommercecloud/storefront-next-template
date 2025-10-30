import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SwatchGroup } from './swatch-group';
import { Swatch } from './swatch';

// Mock child swatch components for testing
const MockSwatch = ({ value, children, ...props }: { value: string; children: React.ReactNode }) => (
    <button data-testid={`swatch-${value}`} value={value} {...props}>
        {children}
    </button>
);

describe('SwatchGroup', () => {
    test('renders with label and display name', () => {
        render(
            <SwatchGroup label="Color" displayName="Navy Blue">
                <MockSwatch value="navy">Navy</MockSwatch>
                <MockSwatch value="black">Black</MockSwatch>
            </SwatchGroup>
        );

        expect(screen.getByText('Color:')).toBeInTheDocument();
        expect(screen.getByText('Navy Blue')).toBeInTheDocument();
    });

    test('handles empty children gracefully', () => {
        render(<SwatchGroup label="Color">{null}</SwatchGroup>);

        expect(screen.getByText('Color:')).toBeInTheDocument();
        expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    test('renders with proper radiogroup accessibility attributes', () => {
        render(
            <SwatchGroup label="Color" ariaLabel="Choose a color">
                <MockSwatch value="red">Red</MockSwatch>
                <MockSwatch value="blue">Blue</MockSwatch>
            </SwatchGroup>
        );

        const radioGroup = screen.getByRole('radiogroup');
        expect(radioGroup).toHaveAttribute('aria-label', 'Choose a color');
    });

    test('uses label as aria-label when ariaLabel not provided', () => {
        render(
            <SwatchGroup label="Size">
                <MockSwatch value="small">S</MockSwatch>
                <MockSwatch value="large">L</MockSwatch>
            </SwatchGroup>
        );

        const radioGroup = screen.getByRole('radiogroup');
        expect(radioGroup).toHaveAttribute('aria-label', 'Size');
    });

    test('calls handleChange when selection changes', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <SwatchGroup label="Color" handleChange={handleChange}>
                <Swatch value="red" mode="click">
                    Red
                </Swatch>
                <Swatch value="blue" mode="click">
                    Blue
                </Swatch>
            </SwatchGroup>
        );

        const redSwatch = screen.getByRole('radio', { name: /red/i });
        await user.click(redSwatch);

        expect(handleChange).toHaveBeenCalledWith('red');
    });

    test('handles keyboard navigation with arrow keys', async () => {
        const user = userEvent.setup();

        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup label="Size">
                            <Swatch value="small" href="/small">
                                Small
                            </Swatch>
                            <Swatch value="medium" href="/medium">
                                Medium
                            </Swatch>
                            <Swatch value="large" href="/large">
                                Large
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
                // Catch-all route to prevent 404 errors when navigating
                {
                    path: '*',
                    element: <div>Navigated</div>,
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        render(<RouterProvider router={router} />);

        const swatches = screen.getAllByRole('radio');

        // Focus first swatch
        swatches[0].focus();

        // Arrow right should move to next swatch
        await user.keyboard('{ArrowRight}');
        expect(swatches[1]).toHaveFocus();

        // Arrow left should move to previous swatch
        await user.keyboard('{ArrowLeft}');
        expect(swatches[0]).toHaveFocus();

        // Arrow down should move to next swatch
        await user.keyboard('{ArrowDown}');
        expect(swatches[1]).toHaveFocus();

        // Arrow up should move to previous swatch
        await user.keyboard('{ArrowUp}');
        expect(swatches[0]).toHaveFocus();
    });

    test('wraps keyboard navigation at boundaries', async () => {
        const user = userEvent.setup();

        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup label="Size">
                            <Swatch value="small" href="/small">
                                Small
                            </Swatch>
                            <Swatch value="large" href="/large">
                                Large
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
                // Catch-all route to prevent 404 errors when navigating
                {
                    path: '*',
                    element: <div>Navigated</div>,
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        render(<RouterProvider router={router} />);

        const swatches = screen.getAllByRole('radio');

        // Focus last swatch
        swatches[1].focus();

        // Arrow right should wrap to first swatch
        await user.keyboard('{ArrowRight}');
        await waitFor(() => {
            expect(swatches[0]).toHaveFocus();
        });

        // Arrow left should wrap to last swatch
        await user.keyboard('{ArrowLeft}');
        expect(swatches[1]).toHaveFocus();
    });

    test('sets correct selected state based on value prop', () => {
        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup label="Color" value="blue">
                            <Swatch value="red" href="/red">
                                Red
                            </Swatch>
                            <Swatch value="blue" href="/blue">
                                Blue
                            </Swatch>
                            <Swatch value="green" href="/green">
                                Green
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        render(<RouterProvider router={router} />);

        const redSwatch = screen.getByRole('radio', { name: /red/i });
        const blueSwatch = screen.getByRole('radio', { name: /blue/i });
        const greenSwatch = screen.getByRole('radio', { name: /green/i });

        expect(redSwatch).not.toBeChecked();
        expect(blueSwatch).toBeChecked();
        expect(greenSwatch).not.toBeChecked();
    });

    test('sets correct focusable state - selected item is focusable', () => {
        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup label="Color" value="blue">
                            <Swatch value="red" href="/red">
                                Red
                            </Swatch>
                            <Swatch value="blue" href="/blue">
                                Blue
                            </Swatch>
                            <Swatch value="green" href="/green">
                                Green
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        render(<RouterProvider router={router} />);

        const redSwatch = screen.getByRole('radio', { name: /red/i });
        const blueSwatch = screen.getByRole('radio', { name: /blue/i });
        const greenSwatch = screen.getByRole('radio', { name: /green/i });

        expect(redSwatch).toHaveAttribute('tabIndex', '-1');
        expect(blueSwatch).toHaveAttribute('tabIndex', '0');
        expect(greenSwatch).toHaveAttribute('tabIndex', '-1');
    });

    test('sets first item as focusable when no value selected', () => {
        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup label="Color">
                            <Swatch value="red" href="/red">
                                Red
                            </Swatch>
                            <Swatch value="blue" href="/blue">
                                Blue
                            </Swatch>
                            <Swatch value="green" href="/green">
                                Green
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        render(<RouterProvider router={router} />);

        const redSwatch = screen.getByRole('radio', { name: /red/i });
        const blueSwatch = screen.getByRole('radio', { name: /blue/i });
        const greenSwatch = screen.getByRole('radio', { name: /green/i });

        expect(redSwatch).toHaveAttribute('tabIndex', '0');
        expect(blueSwatch).toHaveAttribute('tabIndex', '-1');
        expect(greenSwatch).toHaveAttribute('tabIndex', '-1');
    });

    test('applies custom className when provided', () => {
        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup label="Color" className="custom-swatch-group">
                            <Swatch value="red" href="/red">
                                Red
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        render(<RouterProvider router={router} />);

        const container = screen.getByRole('radiogroup').parentElement;
        expect(container).toHaveClass('custom-swatch-group');
    });

    test('does not render label when not provided', () => {
        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup>
                            <Swatch value="red" href="/red">
                                Red
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        render(<RouterProvider router={router} />);

        expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    });

    test('updates selected index when value prop changes', () => {
        // Using createMemoryRouter in framework mode is fine
        // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
        // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
        const router1 = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup label="Color" value="red">
                            <Swatch value="red" href="/red">
                                Red
                            </Swatch>
                            <Swatch value="blue" href="/blue">
                                Blue
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        const { rerender } = render(<RouterProvider router={router1} />);

        let redSwatch = screen.getByRole('radio', { name: /red/i });
        let blueSwatch = screen.getByRole('radio', { name: /blue/i });

        expect(redSwatch).toBeChecked();
        expect(blueSwatch).not.toBeChecked();

        // Update value prop
        const router2 = createMemoryRouter(
            [
                {
                    path: '/',
                    element: (
                        <SwatchGroup label="Color" value="blue">
                            <Swatch value="red" href="/red">
                                Red
                            </Swatch>
                            <Swatch value="blue" href="/blue">
                                Blue
                            </Swatch>
                        </SwatchGroup>
                    ),
                },
            ],
            {
                initialEntries: ['/'],
            }
        );

        rerender(<RouterProvider router={router2} />);

        redSwatch = screen.getByRole('radio', { name: /red/i });
        blueSwatch = screen.getByRole('radio', { name: /blue/i });

        expect(redSwatch).not.toBeChecked();
        expect(blueSwatch).toBeChecked();
    });
});
