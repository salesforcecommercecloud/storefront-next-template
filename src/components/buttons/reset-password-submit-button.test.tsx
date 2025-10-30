import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ResetPasswordSubmitButton } from './reset-password-submit-button';
import uiStrings from '@/temp-ui-string';

// Mock react-router
const mockNavigation = {
    state: 'idle' as 'idle' | 'submitting' | 'loading',
};

vi.mock('react-router', () => ({
    useNavigation: () => mockNavigation,
}));

describe('ResetPasswordSubmitButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default state
        mockNavigation.state = 'idle';
    });

    test('renders reset password button when not submitting', () => {
        render(<ResetPasswordSubmitButton />);

        const button = screen.getByRole('button', { name: uiStrings.resetPassword.resetButton });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('type', 'submit');
        expect(button).not.toBeDisabled();
    });

    test('shows sending email text when submitting', () => {
        mockNavigation.state = 'submitting';

        render(<ResetPasswordSubmitButton />);

        const button = screen.getByRole('button');
        expect(button).toHaveTextContent(uiStrings.resetPassword.sendingEmail);
        expect(button).toBeDisabled();
    });

    test('renders spinner element when submitting', () => {
        mockNavigation.state = 'submitting';

        const { container } = render(<ResetPasswordSubmitButton />);

        // Check for spinner element by its className
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    test('button is disabled only when submitting', () => {
        const { rerender } = render(<ResetPasswordSubmitButton />);

        let button = screen.getByRole('button');
        expect(button).not.toBeDisabled();

        // Change to submitting state
        mockNavigation.state = 'submitting';
        rerender(<ResetPasswordSubmitButton />);

        button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });
});
