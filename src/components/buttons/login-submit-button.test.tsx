import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LoginSubmitButton } from './login-submit-button';
import uiStrings from '@/temp-ui-string';

// Mock react-router
const mockNavigation = {
    state: 'idle' as 'idle' | 'submitting' | 'loading',
};

vi.mock('react-router', () => ({
    useNavigation: () => mockNavigation,
}));

describe('LoginSubmitButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default state
        mockNavigation.state = 'idle';
    });

    test('renders sign in button when not submitting', () => {
        render(<LoginSubmitButton />);

        const button = screen.getByRole('button', { name: uiStrings.login.signIn });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('type', 'submit');
        expect(button).not.toBeDisabled();
    });

    test('renders send login link button in passwordless mode when not submitting', () => {
        render(<LoginSubmitButton passwordless={true} />);

        const button = screen.getByRole('button', { name: uiStrings.login.sendLoginLink });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('type', 'submit');
        expect(button).not.toBeDisabled();
    });

    test('shows signing in text and spinner when submitting', () => {
        mockNavigation.state = 'submitting';

        render(<LoginSubmitButton />);

        const button = screen.getByRole('button');
        expect(button).toHaveTextContent(uiStrings.login.signingIn);
        expect(button).toBeDisabled();
    });

    test('shows sending login link text and spinner when submitting in passwordless mode', () => {
        mockNavigation.state = 'submitting';

        render(<LoginSubmitButton passwordless={true} />);

        const button = screen.getByRole('button');
        expect(button).toHaveTextContent(uiStrings.login.sendingLoginLink);
        expect(button).toBeDisabled();
    });

    test('renders spinner element when submitting', () => {
        mockNavigation.state = 'submitting';

        const { container } = render(<LoginSubmitButton />);

        // Check for spinner element by its className
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    test('button is disabled only when submitting', () => {
        const { rerender } = render(<LoginSubmitButton />);

        let button = screen.getByRole('button');
        expect(button).not.toBeDisabled();

        // Change to submitting state
        mockNavigation.state = 'submitting';
        rerender(<LoginSubmitButton />);

        button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });
});
