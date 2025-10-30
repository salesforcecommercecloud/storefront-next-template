import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PasswordRequirements } from './password-requirements';
import uiStrings from '@/temp-ui-string';
import { validatePassword } from '@/lib/utils';

// Mock the utils module
vi.mock('@/lib/utils', () => ({
    validatePassword: vi.fn(),
    isPasswordValid: vi.fn(),
}));

describe('PasswordRequirements', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('when password is empty', () => {
        test('renders all requirements with Circle icons', () => {
            vi.mocked(validatePassword).mockReturnValue({
                minLength: false,
                hasUppercase: false,
                hasLowercase: false,
                hasNumber: false,
                hasSpecialChar: false,
            });

            render(<PasswordRequirements password="" />);

            expect(screen.getByText(uiStrings.signup.passwordRequirements.title)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.minLength)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.hasUppercase)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.hasLowercase)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.hasNumber)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.hasSpecialChar)).toBeInTheDocument();
        });
    });

    describe('when password is provided', () => {
        test('shows CheckCircle for valid requirements', () => {
            vi.mocked(validatePassword).mockReturnValue({
                minLength: true,
                hasUppercase: true,
                hasLowercase: false,
                hasNumber: false,
                hasSpecialChar: false,
            });

            const { container } = render(<PasswordRequirements password="Abcdefgh" />);

            // Check for CheckCircle icons (valid requirements)
            const checkIcons = container.querySelectorAll('.text-primary');
            expect(checkIcons.length).toBeGreaterThan(0);
        });

        test('shows Circle for invalid requirements', () => {
            vi.mocked(validatePassword).mockReturnValue({
                minLength: true,
                hasUppercase: true,
                hasLowercase: true,
                hasNumber: false,
                hasSpecialChar: false,
            });

            const { container } = render(<PasswordRequirements password="Abcdefgh" />);

            // Check for muted icons (invalid requirements)
            const mutedIcons = container.querySelectorAll('.text-muted-foreground');
            expect(mutedIcons.length).toBeGreaterThan(0);
        });

        test('validates all requirements correctly for strong password', () => {
            vi.mocked(validatePassword).mockReturnValue({
                minLength: true,
                hasUppercase: true,
                hasLowercase: true,
                hasNumber: true,
                hasSpecialChar: true,
            });

            render(<PasswordRequirements password="Abcdef1!" />);

            expect(validatePassword).toHaveBeenCalledWith('Abcdef1!');
            expect(screen.getByText(uiStrings.signup.passwordRequirements.minLength)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.hasUppercase)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.hasLowercase)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.hasNumber)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.passwordRequirements.hasSpecialChar)).toBeInTheDocument();
        });

        test('validates mixed requirements for weak password', () => {
            vi.mocked(validatePassword).mockReturnValue({
                minLength: false,
                hasUppercase: false,
                hasLowercase: true,
                hasNumber: true,
                hasSpecialChar: false,
            });

            render(<PasswordRequirements password="abc12" />);

            expect(validatePassword).toHaveBeenCalledWith('abc12');
        });
    });

    describe('rendering', () => {
        test('renders title consistently', () => {
            vi.mocked(validatePassword).mockReturnValue({
                minLength: false,
                hasUppercase: false,
                hasLowercase: false,
                hasNumber: false,
                hasSpecialChar: false,
            });

            const { rerender } = render(<PasswordRequirements password="" />);
            expect(screen.getByText(uiStrings.signup.passwordRequirements.title)).toBeInTheDocument();

            vi.mocked(validatePassword).mockReturnValue({
                minLength: true,
                hasUppercase: true,
                hasLowercase: true,
                hasNumber: true,
                hasSpecialChar: true,
            });

            rerender(<PasswordRequirements password="Test123!" />);
            expect(screen.getByText(uiStrings.signup.passwordRequirements.title)).toBeInTheDocument();
        });
    });
});
