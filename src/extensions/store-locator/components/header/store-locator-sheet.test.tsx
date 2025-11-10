import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import uiStringsSL from '@/extensions/store-locator/temp-ui-string-store-locator';

// Mock the heavy StoreLocator to a simple placeholder
vi.mock('@/extensions/store-locator/components/store-locator', () => ({
    default: () => <div data-testid="mock-store-locator">Mock StoreLocator</div>,
}));

import StoreLocatorSheet from '@/extensions/store-locator/components/header/store-locator-sheet';

// Test wrapper that manages controlled state
function TestWrapper({ initialOpen = true }: { initialOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(initialOpen);

    return (
        <StoreLocatorSheet open={isOpen} onOpenChange={setIsOpen}>
            <button>Open Sheet</button>
        </StoreLocatorSheet>
    );
}

describe('StoreLocatorSheet', () => {
    test('renders title, description, and content when open', () => {
        render(<TestWrapper initialOpen={true} />);

        expect(screen.getByText(uiStringsSL.storeLocator.title)).toBeInTheDocument();
        expect(screen.getByText(uiStringsSL.storeLocator.description)).toBeInTheDocument();
        expect(screen.getByTestId('mock-store-locator')).toBeInTheDocument();
        // Close control is available while open
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    test('closes via Close button and re-opens via trigger', async () => {
        render(<TestWrapper initialOpen={true} />);

        expect(screen.getByText(uiStringsSL.storeLocator.title)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /close/i }));

        await waitFor(() => {
            expect(screen.queryByText(uiStringsSL.storeLocator.title)).not.toBeInTheDocument();
        });

        await userEvent.click(screen.getByRole('button', { name: 'Open Sheet' }));

        expect(await screen.findByText(uiStringsSL.storeLocator.title)).toBeInTheDocument();
    });

    test('starts closed when initialOpen is false', () => {
        render(<TestWrapper initialOpen={false} />);

        expect(screen.queryByText(uiStringsSL.storeLocator.title)).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-store-locator')).not.toBeInTheDocument();
    });
});
