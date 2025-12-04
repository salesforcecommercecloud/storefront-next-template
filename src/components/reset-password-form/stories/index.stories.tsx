import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResetPasswordForm } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { getTranslation } from '@/lib/i18next';

function ResetPasswordFormStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('reset-password-form-input');
        const logSubmit = action('reset-password-form-submit');

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            if (target instanceof HTMLInputElement) {
                logInput({ field: target.name || target.id, value: target.value });
            }
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !root.contains(form)) return;
            event.preventDefault();
            logSubmit({});
        };

        root.addEventListener('change', handleChange, true);
        root.addEventListener('submit', handleSubmit, true);

        return () => {
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ResetPasswordForm> = {
    title: 'ACCOUNT/Reset Password Form',
    component: ResetPasswordForm,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Reset Password Form component for resetting user password with a token.

### Features:
- Email display (read-only)
- New password and confirm password fields
- Password strength requirements
- Form validation
- Token-based password reset
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ResetPasswordFormStoryHarness>
                <div className="p-8 max-w-md">
                    <Story />
                </div>
            </ResetPasswordFormStoryHarness>
        ),
    ],
    argTypes: {
        error: {
            description: 'Optional error message to display',
            control: 'text',
        },
        token: {
            description: 'Password reset token',
            control: 'text',
        },
        email: {
            description: 'Email address for the reset',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof ResetPasswordForm>;

export const Default: Story = {
    args: {
        token: 'reset-token-12345',
        email: 'user@example.com',
    },
    parameters: {
        docs: {
            story: `
Default reset password form with token and email.

### Features:
- Email display (disabled)
- New password field
- Confirm password field
- Password requirements
- Submit button
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for email display using specific id to avoid matching hidden input
        const emailInput = await canvas.findByLabelText(
            t('resetPassword:emailLabel') || t('signup:form.emailLabel'),
            {},
            { timeout: 5000 }
        );
        await expect(emailInput).toBeInTheDocument();
        await expect(emailInput).toBeDisabled();
        await expect(emailInput).toHaveValue('user@example.com');

        // Check for new password field
        const newPasswordInput = await canvas.findByPlaceholderText(
            t('resetPassword:newPasswordPlaceholder') || t('signup:form.passwordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(newPasswordInput).toBeInTheDocument();

        // Check for submit button
        const submitButton = await canvas.findByRole('button', { name: /reset password/i }, { timeout: 5000 });
        await expect(submitButton).toBeInTheDocument();
    },
};

export const WithError: Story = {
    args: {
        token: 'reset-token-12345',
        email: 'user@example.com',
        error: 'Invalid or expired reset token. Please request a new password reset.',
    },
    parameters: {
        docs: {
            story: `
Reset password form with error message.

### Features:
- Error message display
- Email display
- Password fields
- Submit button
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for error message
        const errorMessage = await canvas.findByText(/invalid or expired reset token/i, {}, { timeout: 5000 });
        await expect(errorMessage).toBeInTheDocument();

        // Check for email display using specific id to avoid matching hidden input
        const emailInput = await canvas.findByLabelText(
            t('resetPassword:emailLabel') || t('signup:form.emailLabel'),
            {},
            { timeout: 5000 }
        );
        await expect(emailInput).toBeInTheDocument();
        await expect(emailInput).toHaveValue('user@example.com');
    },
};

export const Interactive: Story = {
    args: {
        token: 'reset-token-12345',
        email: 'user@example.com',
    },
    parameters: {
        docs: {
            story: `
Interactive reset password form for testing user interactions.

### Features:
- Password input interaction
- Password confirmation
- Form validation
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Find and interact with new password input
        const newPasswordInput = await canvas.findByPlaceholderText(
            t('resetPassword:newPasswordPlaceholder') || t('signup:form.passwordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(newPasswordInput, 'NewSecurePass123!');
        await expect(newPasswordInput).toHaveValue('NewSecurePass123!');

        // Find and interact with confirm password input
        const confirmPasswordInput = await canvas.findByPlaceholderText(
            t('resetPassword:confirmPasswordPlaceholder') || t('signup:form.confirmPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(confirmPasswordInput, 'NewSecurePass123!');
        await expect(confirmPasswordInput).toHaveValue('NewSecurePass123!');
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for email display using specific id to avoid matching hidden input
        const emailInput = await canvas.findByLabelText(
            t('resetPassword:emailLabel') || t('signup:form.emailLabel'),
            {},
            { timeout: 5000 }
        );
        await expect(emailInput).toBeInTheDocument();
        await expect(emailInput).toBeDisabled();
        await expect(emailInput).toHaveValue('user@example.com');

        // Check for new password field
        const newPasswordInput = await canvas.findByPlaceholderText(
            t('resetPassword:newPasswordPlaceholder') || t('signup:form.passwordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(newPasswordInput).toBeInTheDocument();

        // Check for submit button
        const submitButton = await canvas.findByRole('button', { name: /reset password/i }, { timeout: 5000 });
        await expect(submitButton).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for email display using specific id to avoid matching hidden input
        const emailInput = await canvas.findByLabelText(
            t('resetPassword:emailLabel') || t('signup:form.emailLabel'),
            {},
            { timeout: 5000 }
        );
        await expect(emailInput).toBeInTheDocument();
        await expect(emailInput).toBeDisabled();
        await expect(emailInput).toHaveValue('user@example.com');

        // Check for new password field
        const newPasswordInput = await canvas.findByPlaceholderText(
            t('resetPassword:newPasswordPlaceholder') || t('signup:form.passwordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(newPasswordInput).toBeInTheDocument();

        // Check for submit button
        const submitButton = await canvas.findByRole('button', { name: /reset password/i }, { timeout: 5000 });
        await expect(submitButton).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for email display using specific id to avoid matching hidden input
        const emailInput = await canvas.findByLabelText(
            t('resetPassword:emailLabel') || t('signup:form.emailLabel'),
            {},
            { timeout: 5000 }
        );
        await expect(emailInput).toBeInTheDocument();
        await expect(emailInput).toBeDisabled();
        await expect(emailInput).toHaveValue('user@example.com');

        // Check for new password field
        const newPasswordInput = await canvas.findByPlaceholderText(
            t('resetPassword:newPasswordPlaceholder') || t('signup:form.passwordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(newPasswordInput).toBeInTheDocument();

        // Check for submit button
        const submitButton = await canvas.findByRole('button', { name: /reset password/i }, { timeout: 5000 });
        await expect(submitButton).toBeInTheDocument();
    },
};
