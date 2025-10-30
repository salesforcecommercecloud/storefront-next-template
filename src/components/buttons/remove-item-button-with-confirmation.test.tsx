import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { RemoveItemButtonWithConfirmation } from './remove-item-button-with-confirmation';
import type { ActionResponse } from '@/routes/types/action-responses';
import uiStrings from '@/temp-ui-string';
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';

// Mock the toast hook
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock the useItemFetcher hook
const mockFetcher = {
    submit: vi.fn(),
    state: 'idle' as const,
    data: null as ActionResponse<unknown> | null,
    Form: ({ children, ...props }: PropsWithChildren) => <form {...props}>{children}</form>,
} as unknown as ReturnType<typeof useItemFetcher>;

vi.mock('@/hooks/use-item-fetcher', () => ({
    useItemFetcher: vi.fn(() => mockFetcher),
}));

const mockUseItemFetcher = vi.mocked(useItemFetcher);

describe('RemoveItemButtonWithConfirmation', () => {
    const defaultConfig = {
        action: '/action/cart-item-remove',
        confirmDescription: uiStrings.cart.removeItemConfirmDescription,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default mock state
        mockFetcher.state = 'idle';
        mockFetcher.data = undefined;
        mockUseItemFetcher.mockReturnValue(mockFetcher);
    });

    test('renders remove button with correct text and attributes', () => {
        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} />
            </ConfigProvider>
        );

        const button = screen.getByTestId('remove-item-item-123');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(uiStrings.removeItem.button);
        expect(button).toHaveAttribute('title', uiStrings.removeItem.title);
    });

    test('renders confirmation dialog content when opened', async () => {
        const user = userEvent.setup();

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} />
            </ConfigProvider>
        );

        // Click the trigger to open the dialog
        const triggerButton = screen.getByTestId('remove-item-item-123');
        await user.click(triggerButton);

        // Now the dialog content should be rendered
        expect(screen.getByText(uiStrings.removeItem.confirmTitle)).toBeInTheDocument();
        expect(screen.getByText(defaultConfig.confirmDescription)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: uiStrings.removeItem.cancelButton })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: uiStrings.removeItem.confirmAction })).toBeInTheDocument();
    });

    test('shows removing text when status is loading', () => {
        // Mock loading state
        mockFetcher.state = 'submitting';
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} />
            </ConfigProvider>
        );

        const button = screen.getByTestId('remove-item-item-123');
        expect(button).toHaveTextContent(uiStrings.removeItem.removing);
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-busy', 'true');
    });

    test('calls removeItem when confirmed', async () => {
        const user = userEvent.setup();

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} />
            </ConfigProvider>
        );

        // Click the remove button to open dialog
        const removeButton = screen.getByTestId('remove-item-item-123');
        await user.click(removeButton);

        // Click the confirm button in the dialog
        const confirmButton = screen.getByRole('button', { name: uiStrings.removeItem.confirmAction });
        await user.click(confirmButton);

        // Verify that fetcher.submit was called with correct parameters
        expect(mockFetcher.submit).toHaveBeenCalledWith(
            expect.any(FormData),
            expect.objectContaining({
                method: 'POST',
                action: defaultConfig.action,
            })
        );
    });

    test('shows success toast when fetcher returns success data', () => {
        // Mock success state
        mockFetcher.state = 'idle';
        mockFetcher.data = { success: true };
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} />
            </ConfigProvider>
        );

        expect(mockAddToast).toHaveBeenCalledWith(uiStrings.removeItem.success, 'success');
    });

    test('shows error toast when fetcher returns error data', () => {
        // Mock error state
        mockFetcher.state = 'idle';
        mockFetcher.data = { success: false };
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} />
            </ConfigProvider>
        );

        expect(mockAddToast).toHaveBeenCalledWith(uiStrings.removeItem.failed, 'error');
    });

    test('disables trigger button when status is loading', () => {
        // Mock loading state
        mockFetcher.state = 'submitting';
        mockUseItemFetcher.mockReturnValue(mockFetcher);

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} />
            </ConfigProvider>
        );

        const removeButton = screen.getByTestId('remove-item-item-123');
        expect(removeButton).toBeDisabled();
        expect(removeButton).toHaveTextContent(uiStrings.removeItem.removing);
        expect(removeButton).toHaveAttribute('aria-busy', 'true');
    });

    test('closes dialog when cancel button is clicked', async () => {
        const user = userEvent.setup();

        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} />
            </ConfigProvider>
        );

        // Click the trigger to open the dialog
        const triggerButton = screen.getByTestId('remove-item-item-123');
        await user.click(triggerButton);

        // Verify dialog is open
        expect(screen.getByText(uiStrings.removeItem.confirmTitle)).toBeInTheDocument();

        // Click cancel button
        const cancelButton = screen.getByRole('button', { name: uiStrings.removeItem.cancelButton });
        await user.click(cancelButton);

        // Verify dialog is closed
        expect(screen.queryByText(uiStrings.removeItem.confirmTitle)).not.toBeInTheDocument();
    });

    test('applies custom className', () => {
        render(
            <ConfigProvider config={mockConfig}>
                <RemoveItemButtonWithConfirmation itemId="item-123" config={defaultConfig} className="custom-class" />
            </ConfigProvider>
        );

        const button = screen.getByTestId('remove-item-item-123');
        expect(button).toHaveClass('custom-class');
    });
});
