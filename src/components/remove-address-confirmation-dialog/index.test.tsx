import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RemoveAddressConfirmationDialog } from './index';
import uiStrings from '@/temp-ui-string';

// Mock the toast hook
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock the revalidator hook
const mockRevalidate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useRevalidator: () => ({
            revalidate: mockRevalidate,
        }),
    };
});

// Mock useScapiFetcher and useScapiFetcherEffect
const mockSubmit = vi.fn().mockResolvedValue(undefined);
const mockFetcher: ScapiFetcher<unknown> = {
    state: 'idle',
    data: undefined,
    success: false,
    errors: undefined,
    submit: mockSubmit,
    load: vi.fn().mockResolvedValue(undefined),
    formAction: undefined,
    formData: undefined,
    formEncType: 'application/x-www-form-urlencoded',
    formMethod: 'GET',
    formTarget: undefined,
    type: 'init',
} as ScapiFetcher<unknown>;

vi.mock('@/hooks/use-scapi-fetcher', async () => {
    const actual = await vi.importActual('@/hooks/use-scapi-fetcher');
    return {
        ...actual,
        useScapiFetcher: vi.fn(() => mockFetcher),
    };
});

// Mock useScapiFetcherEffect to simulate state changes
let mockOnSuccess: ((data: unknown) => void) | undefined;
let mockOnError: ((errors: string[]) => void) | undefined;
let currentFetcherState: 'idle' | 'loading' | 'submitting' = 'idle';
let currentFetcherSuccess = false;
let currentFetcherErrors: string[] | undefined = undefined;

vi.mock('@/hooks/use-scapi-fetcher-effect', () => ({
    useScapiFetcherEffect: vi.fn(
        (
            fetcher: ScapiFetcher<unknown>,
            config: { onSuccess?: (data: unknown) => void; onError?: (errors: string[]) => void }
        ) => {
            mockOnSuccess = config.onSuccess;
            mockOnError = config.onError;

            // Simulate effect running when fetcher state changes
            if (fetcher.state === 'idle' && fetcher.success && mockOnSuccess) {
                mockOnSuccess(fetcher.data);
            } else if (fetcher.state === 'idle' && !fetcher.success && fetcher.errors && mockOnError) {
                mockOnError(fetcher.errors);
            }
        }
    ),
}));

// Helper to update fetcher state
function updateFetcherState(state: 'idle' | 'loading' | 'submitting', success: boolean = false, errors?: string[]) {
    currentFetcherState = state;
    currentFetcherSuccess = success;
    currentFetcherErrors = errors;
    Object.assign(mockFetcher, {
        state: currentFetcherState,
        success: currentFetcherSuccess,
        errors: currentFetcherErrors,
    });
}

describe('RemoveAddressConfirmationDialog', () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        addressId: 'address-123',
        customerId: 'customer-456',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnSuccess = undefined;
        mockOnError = undefined;
        updateFetcherState('idle', false);
        mockSubmit.mockResolvedValue(undefined);
    });

    test('renders dialog when open is true', () => {
        render(<RemoveAddressConfirmationDialog {...defaultProps} />);

        expect(screen.getByText(uiStrings.account.addresses.removeConfirmTitle)).toBeInTheDocument();
        expect(
            screen.getByText(
                uiStrings.account.addresses.removeConfirmDescription.replace('{addressName}', 'address-123')
            )
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: uiStrings.account.addresses.removeCancelButton })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: uiStrings.account.addresses.removeConfirmButton })
        ).toBeInTheDocument();
    });

    test('does not render dialog when open is false', () => {
        render(<RemoveAddressConfirmationDialog {...defaultProps} open={false} />);

        expect(screen.queryByText(uiStrings.account.addresses.removeConfirmTitle)).not.toBeInTheDocument();
    });

    test('displays correct address ID in description', () => {
        render(<RemoveAddressConfirmationDialog {...defaultProps} addressId="my-address-id" />);

        expect(
            screen.getByText(
                uiStrings.account.addresses.removeConfirmDescription.replace('{addressName}', 'my-address-id')
            )
        ).toBeInTheDocument();
    });

    test('calls onOpenChange(false) when cancel button is clicked', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();

        render(<RemoveAddressConfirmationDialog {...defaultProps} onOpenChange={onOpenChange} />);

        const cancelButton = screen.getByRole('button', { name: uiStrings.account.addresses.removeCancelButton });
        await user.click(cancelButton);

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('calls fetcher.submit when confirm button is clicked', async () => {
        const user = userEvent.setup();

        render(<RemoveAddressConfirmationDialog {...defaultProps} />);

        const confirmButton = screen.getByRole('button', { name: uiStrings.account.addresses.removeConfirmButton });
        await user.click(confirmButton);

        expect(mockSubmit).toHaveBeenCalledTimes(1);
        expect(mockSubmit).toHaveBeenCalledWith({});
    });

    test('does not call fetcher.submit when addressId is missing', async () => {
        const user = userEvent.setup();

        render(<RemoveAddressConfirmationDialog {...defaultProps} addressId="" />);

        const confirmButton = screen.getByRole('button', { name: uiStrings.account.addresses.removeConfirmButton });
        await user.click(confirmButton);

        expect(mockSubmit).not.toHaveBeenCalled();
        expect(mockAddToast).toHaveBeenCalledWith(uiStrings.account.addresses.removeError, 'error');
    });

    test('does not call fetcher.submit when customerId is missing', async () => {
        const user = userEvent.setup();

        render(<RemoveAddressConfirmationDialog {...defaultProps} customerId="" />);

        const confirmButton = screen.getByRole('button', { name: uiStrings.account.addresses.removeConfirmButton });
        await user.click(confirmButton);

        expect(mockSubmit).not.toHaveBeenCalled();
        expect(mockAddToast).toHaveBeenCalledWith(uiStrings.account.addresses.removeError, 'error');
    });

    test('does not call fetcher.submit when fetcher is not idle', async () => {
        const user = userEvent.setup();
        updateFetcherState('submitting');

        render(<RemoveAddressConfirmationDialog {...defaultProps} />);

        const confirmButton = screen.getByRole('button', { name: uiStrings.account.addresses.removeConfirmButton });
        await user.click(confirmButton);

        expect(mockSubmit).not.toHaveBeenCalled();
    });

    test('disables confirm button when loading', () => {
        updateFetcherState('submitting');

        render(<RemoveAddressConfirmationDialog {...defaultProps} />);

        const confirmButton = screen.getByRole('button', { name: uiStrings.account.addresses.removeConfirmButton });
        expect(confirmButton).toBeDisabled();
    });

    test('calls onSuccess callback when removal succeeds', async () => {
        const onSuccess = vi.fn();
        updateFetcherState('idle', true);

        render(<RemoveAddressConfirmationDialog {...defaultProps} onSuccess={onSuccess} />);

        // Simulate success by calling the onSuccess callback directly
        if (mockOnSuccess) {
            mockOnSuccess(undefined);
        }

        await waitFor(() => {
            expect(mockAddToast).toHaveBeenCalledWith(uiStrings.account.addresses.removeSuccess, 'success');
        });

        expect(onSuccess).toHaveBeenCalled();
    });

    test('closes dialog when removal succeeds', async () => {
        const onOpenChange = vi.fn();
        updateFetcherState('idle', true);

        render(<RemoveAddressConfirmationDialog {...defaultProps} onOpenChange={onOpenChange} />);

        // Simulate success
        if (mockOnSuccess) {
            mockOnSuccess(undefined);
        }

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    test('revalidates data when removal succeeds', async () => {
        updateFetcherState('idle', true);

        render(<RemoveAddressConfirmationDialog {...defaultProps} />);

        // Simulate success
        if (mockOnSuccess) {
            mockOnSuccess(undefined);
        }

        await waitFor(() => {
            expect(mockRevalidate).toHaveBeenCalled();
        });
    });

    test('shows error toast when removal fails', async () => {
        const errors = ['Failed to remove address'];
        updateFetcherState('idle', false, errors);

        render(<RemoveAddressConfirmationDialog {...defaultProps} />);

        // Simulate error
        if (mockOnError) {
            mockOnError(errors);
        }

        await waitFor(() => {
            expect(mockAddToast).toHaveBeenCalledWith(errors.join(', '), 'error');
        });
    });

    test('shows default error message when removal fails without specific errors', async () => {
        updateFetcherState('idle', false, []);

        render(<RemoveAddressConfirmationDialog {...defaultProps} />);

        // Simulate error
        if (mockOnError) {
            mockOnError([]);
        }

        await waitFor(() => {
            expect(mockAddToast).toHaveBeenCalledWith(uiStrings.account.addresses.removeError, 'error');
        });
    });

    test('handles multiple errors correctly', async () => {
        const errors = ['Error 1', 'Error 2', 'Error 3'];
        updateFetcherState('idle', false, errors);

        render(<RemoveAddressConfirmationDialog {...defaultProps} />);

        // Simulate error
        if (mockOnError) {
            mockOnError(errors);
        }

        await waitFor(() => {
            expect(mockAddToast).toHaveBeenCalledWith('Error 1, Error 2, Error 3', 'error');
        });
    });
});
