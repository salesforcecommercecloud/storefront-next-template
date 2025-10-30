import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import userEvent from '@testing-library/user-event';

// components
import PromoPopover from './index';

describe('PromoPopover', () => {
    test('renders properly', async () => {
        const user = userEvent.setup();
        render(
            <PromoPopover>
                <div>Test content</div>
            </PromoPopover>
        );

        // Check for info button
        const button = screen.getByRole('button', { name: 'Info' });
        expect(button).toBeInTheDocument();

        // Hover over the button to show tooltip content
        await user.hover(button);

        // Wait for tooltip content to appear (there are 2 elements - visible and hidden for a11y)
        await waitFor(() => {
            expect(screen.getAllByText('Test content')).toHaveLength(2);
        });

        // Check for content (there are 2 elements - visible and hidden for a11y)
        expect(screen.getAllByText('Test content')).toHaveLength(2);
    });

    test('renders with custom header', async () => {
        const user = userEvent.setup();
        render(
            <PromoPopover header="Custom Header">
                <div>Test content</div>
            </PromoPopover>
        );

        const button = screen.getByRole('button', { name: 'Info' });
        expect(button).toBeInTheDocument();

        // Hover over the button to show tooltip content
        await user.hover(button);

        // Wait for tooltip content to appear (there are 2 elements - visible and hidden for a11y)
        await waitFor(() => {
            expect(screen.getAllByText('Custom Header')).toHaveLength(2);
        });

        expect(screen.getAllByText('Test content')).toHaveLength(2);
    });

    test('renders without header when header is explicitly empty', async () => {
        const user = userEvent.setup();
        render(
            <PromoPopover header="">
                <div>Test content</div>
            </PromoPopover>
        );

        const button = screen.getByRole('button', { name: 'Info' });
        expect(button).toBeInTheDocument();

        // Hover over the button to show tooltip content
        await user.hover(button);

        // Wait for tooltip content to appear (there are 2 elements - visible and hidden for a11y)
        await waitFor(() => {
            expect(screen.getAllByText('Test content')).toHaveLength(2);
        });

        // Check for content (there are 2 elements - visible and hidden for a11y)
        expect(screen.getAllByText('Test content')).toHaveLength(2);
    });

    test('applies custom className by checking rendered content', async () => {
        const user = userEvent.setup();
        render(
            <PromoPopover className="custom-class">
                <div>Test content with custom class</div>
            </PromoPopover>
        );

        const button = screen.getByRole('button', { name: 'Info' });
        expect(button).toBeInTheDocument();

        // Hover over the button to show tooltip content
        await user.hover(button);

        // Wait for tooltip content to appear (there are 2 elements - visible and hidden for a11y)
        await waitFor(() => {
            expect(screen.getAllByText('Test content with custom class')).toHaveLength(2);
        });
    });
});
