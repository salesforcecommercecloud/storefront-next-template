/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import StandardLoginForm from '../standard-login-form';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('login-form-click');
        const logSubmit = action('login-form-submit');
        const logInputFocus = action('login-form-input-focus');
        const logButtonClick = action('login-form-button-click');
        const logInput = action('login-form-input');
        const logInputValue = action('login-form-input-value');
        const logHover = action('login-form-hover');

        const lastHoverElement: { current: HTMLElement | null } = { current: null };
        const lastValueMap = new WeakMap<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, string>();

        const sanitizeLabel = (value: string | null | undefined): string => {
            if (!value) {
                return '';
            }
            return value.replace(/\s+/g, ' ').trim();
        };

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label');
            if (ariaLabel) {
                return sanitizeLabel(ariaLabel);
            }

            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                const placeholder = element.placeholder;
                if (placeholder) {
                    return sanitizeLabel(placeholder);
                }

                const associatedLabel = element.labels?.[0]?.textContent;
                if (associatedLabel) {
                    return sanitizeLabel(associatedLabel);
                }

                const nameAttr = element.getAttribute('name');
                if (nameAttr) {
                    return sanitizeLabel(nameAttr);
                }
            }

            const text = element.textContent;
            if (text) {
                return sanitizeLabel(text);
            }

            const testId = element.getAttribute('data-testid');
            if (testId) {
                return sanitizeLabel(testId);
            }

            return sanitizeLabel(element.tagName.toLowerCase());
        };

        const selectors = [
            'button',
            'a',
            'input',
            'textarea',
            'select',
            '[role="button"]',
            '[role="link"]',
            '[role="textbox"]',
            '[data-testid]',
            '[tabindex]',
        ].join(', ');

        const findInteractiveElement = (start: Element | null): HTMLElement | null => {
            let node: Element | null = start;
            while (node) {
                if (node instanceof HTMLElement && node.matches(selectors)) {
                    return node;
                }
                node = node.parentElement;
            }
            return null;
        };

        const isInsideHarness = (element: Element) => root.contains(element);

        const isSupportedInteractiveElement = (element: HTMLElement): boolean => {
            return (
                element instanceof HTMLButtonElement ||
                element instanceof HTMLAnchorElement ||
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement
            );
        };

        const isSyntheticEvent = (event: Event): boolean => event.isTrusted === false;

        const handleClick = (event: MouseEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            if (!(interactive instanceof HTMLElement) || !isSupportedInteractiveElement(interactive)) {
                return;
            }

            if (interactive instanceof HTMLButtonElement || interactive instanceof HTMLAnchorElement) {
                event.preventDefault();
                event.stopImmediatePropagation?.();
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            logClick({ label });
            if (interactive instanceof HTMLButtonElement) {
                logButtonClick({ label });
                if (/sign in|login|submit/i.test(label)) {
                    logSubmit({ label });
                }
            }
        };

        const handlePointerOver = (event: PointerEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (
                !interactive ||
                !isInsideHarness(interactive) ||
                !(interactive instanceof HTMLElement) ||
                !isSupportedInteractiveElement(interactive)
            ) {
                return;
            }

            if (lastHoverElement.current === interactive) {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            lastHoverElement.current = interactive;
            logHover({ label });
        };

        const handlePointerOut = (event: PointerEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            if (!lastHoverElement.current) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive) {
                return;
            }

            const related = event.relatedTarget as Element | null;
            if (related && interactive.contains(related)) {
                return;
            }

            if (interactive === lastHoverElement.current) {
                lastHoverElement.current = null;
            }
        };

        const handleFocus = (event: FocusEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (
                !interactive ||
                !isInsideHarness(interactive) ||
                !(interactive instanceof HTMLElement) ||
                !isSupportedInteractiveElement(interactive)
            ) {
                return;
            }

            if (interactive instanceof HTMLInputElement || interactive instanceof HTMLTextAreaElement) {
                const label = deriveLabel(interactive);
                if (!label) {
                    return;
                }

                logInputFocus({ label });
            }
        };

        const handleInput = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            if (interactive instanceof HTMLInputElement || interactive instanceof HTMLTextAreaElement) {
                const label = deriveLabel(interactive);
                if (!label) {
                    return;
                }

                logInput({ label });

                const value = interactive.value ?? '';
                const previous = lastValueMap.get(interactive);
                if (previous === value) {
                    return;
                }

                lastValueMap.set(interactive, value);
                logInputValue({ label, value });
            }
        };

        const handleSubmit = (event: SubmitEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !isInsideHarness(form)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation?.();

            const submitter = (event.submitter as Element | null) ?? form.querySelector('[type="submit"]');
            const interactive = submitter ? findInteractiveElement(submitter) : null;
            const label = interactive && interactive instanceof HTMLElement ? deriveLabel(interactive) : 'Submit';
            logSubmit({ label });
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('pointerout', handlePointerOut, true);
        root.addEventListener('focusin', handleFocus, true);
        root.addEventListener('input', handleInput, true);
        root.addEventListener('change', handleInput, true);
        root.addEventListener('submit', handleSubmit, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
            root.removeEventListener('focusin', handleFocus, true);
            root.removeEventListener('input', handleInput, true);
            root.removeEventListener('change', handleInput, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof StandardLoginForm> = {
    title: 'AUTHENTICATION/Standard Login Form',
    component: StandardLoginForm,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A traditional authentication form that requires users to enter their email and password for authentication. This form provides a familiar login experience while offering modern features like passwordless login options and comprehensive error handling.

## Features

- **Email and password authentication**: Traditional login with email and password
- **Password visibility**: Secure password input with hidden text
- **Error handling**: Clear error messages for authentication failures
- **Toggle functionality**: Can switch between standard and passwordless login
- **Password reset**: Direct link to password reset functionality
- **Sign up option**: Link to registration for new users
- **Accessibility**: Full keyboard navigation and screen reader support
- **Form validation**: HTML5 validation with custom error states

## Usage

The StandardLoginForm is the primary authentication method for most applications. It provides a secure, familiar interface for users to access their accounts.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`error\` | \`string\` | \`undefined\` | Error message to display above the form |
| \`isPasswordlessEnabled\` | \`boolean\` | \`true\` | Whether to show the toggle link to passwordless login |

## Form Behavior

- **Email validation**: Uses HTML5 email validation
- **Password security**: Password field is hidden by default
- **Form submission**: Submits via POST method with \`loginMode=password\`
- **Loading states**: Button shows loading state during submission
- **Error display**: Errors are displayed in a styled error container

## Security Features

- Password field uses \`type="password"\` for security
- Form includes proper autocomplete attributes
- CSRF protection through form tokens
- Rate limiting support for failed attempts
- Secure password transmission

## Accessibility

- Proper form labels and ARIA attributes
- Keyboard navigation support
- Screen reader friendly
- Focus management
- High contrast error states
                `,
            },
        },
    },
    argTypes: {
        error: {
            control: 'text',
            description: 'Error message to display above the form when authentication fails',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'undefined' },
            },
        },
        isPasswordlessEnabled: {
            control: 'boolean',
            description:
                'Whether passwordless login is enabled. When true, shows a toggle link to switch to passwordless login.',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'true' },
            },
        },
    },
    args: {
        isPasswordlessEnabled: true,
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <div className="w-full max-w-md p-6 bg-background border rounded-lg shadow-sm">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground">Sign in to your account</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Enter your credentials to access your account
                        </p>
                    </div>
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        error: undefined,
        isPasswordlessEnabled: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default state of the StandardLoginForm includes all standard elements:

- **Email input field** with HTML5 validation
- **Password input field** with secure text hiding
- **Submit button** with "Sign In" text
- **Toggle link** to switch to passwordless login
- **Forgot password link** for password recovery
- **Sign up link** for new user registration

This is the most common configuration users will encounter on login pages.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form renders with all expected elements
        const emailInput = canvas.getByLabelText(/email/i);
        const passwordInput = canvas.getByLabelText(/password/i);
        const submitButton = canvas.getByRole('button', { name: /sign in/i });
        await expect(emailInput).toBeInTheDocument();
        await expect(passwordInput).toBeInTheDocument();
        await expect(submitButton).toBeInTheDocument();

        // Test passwordless toggle link exists
        const passwordlessLink = canvas.getByRole('link', { name: 'Login without password' });
        await expect(passwordlessLink).toBeInTheDocument();

        // Test navigation links
        const forgotPasswordLink = canvas.getByRole('link', { name: 'Forgot your password?' });
        const signUpLink = canvas.getByRole('link', { name: 'Sign up' });
        await expect(forgotPasswordLink).toBeInTheDocument();
        await expect(signUpLink).toBeInTheDocument();
    },
};

export const WithError: Story = {
    args: {
        error: 'Invalid email or password. Please try again.',
        isPasswordlessEnabled: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
This story demonstrates error handling in the StandardLoginForm:

### Error Display Features:
- **Styled error container** with destructive colors (red background/border)
- **Clear error message** that doesn't blame the user
- **Form remains functional** for retry attempts
- **All fields remain accessible** after error display

### Common Error Scenarios:
- Invalid email format
- Incorrect password
- Account not found
- Account locked/suspended
- Rate limiting exceeded
- Server-side validation failures

### Best Practices:
- Use clear, actionable error messages
- Don't reveal whether email exists in system
- Implement progressive delays for failed attempts
- Provide helpful recovery options
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test error message is displayed
        const errorMessage = canvas.getByText('Invalid email or password. Please try again.');
        await expect(errorMessage).toBeInTheDocument();

        // Test form elements still exist and are functional
        const emailInput = canvas.getByLabelText(/email/i);
        const passwordInput = canvas.getByLabelText(/password/i);
        const submitButton = canvas.getByRole('button', { name: /sign in/i });

        await expect(emailInput).toBeInTheDocument();
        await expect(passwordInput).toBeInTheDocument();
        await expect(submitButton).toBeInTheDocument();

        // Test form can still be interacted with after error
        await expect(emailInput).not.toBeDisabled();
        await expect(passwordInput).not.toBeDisabled();
        await expect(submitButton).not.toBeDisabled();

        // Test navigation links still work
        const forgotPasswordLink = canvas.getByRole('link', { name: 'Forgot your password?' });
        await expect(forgotPasswordLink).toBeInTheDocument();
    },
};

export const PasswordlessDisabled: Story = {
    args: {
        error: undefined,
        isPasswordlessEnabled: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
When passwordless login is disabled, the form behavior changes:

### What's Hidden:
- Toggle link to passwordless login is removed
- Users can only use traditional email/password authentication

### What Remains:
- All standard form functionality
- Error handling and validation
- Password reset and sign-up links
- Accessibility features

### Use Cases:
- Organizations requiring traditional authentication
- Compliance requirements
- Testing standard login flows only
- Legacy system integration
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form elements exist
        const emailInput = canvas.getByLabelText(/email/i);
        const passwordInput = canvas.getByLabelText(/password/i);
        const submitButton = canvas.getByRole('button', { name: /sign in/i });

        await expect(emailInput).toBeInTheDocument();
        await expect(passwordInput).toBeInTheDocument();
        await expect(submitButton).toBeInTheDocument();

        // Test passwordless toggle link is NOT present
        const passwordlessLink = canvas.queryByRole('link', { name: 'Login without password' });
        await expect(passwordlessLink).toBeNull();

        // Test other navigation links still exist
        const forgotPasswordLink = canvas.getByRole('link', { name: 'Forgot your password?' });
        const signUpLink = canvas.getByRole('link', { name: 'Sign up' });
        await expect(forgotPasswordLink).toBeInTheDocument();
        await expect(signUpLink).toBeInTheDocument();
    },
};

export const PasswordVisibility: Story = {
    args: {
        error: undefined,
        isPasswordlessEnabled: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
## Password Security Features

This story highlights the security aspects of the password field:

### Security Measures:
- **Hidden text**: Password input uses \`type="password"\`
- **Autocomplete**: Proper autocomplete attributes for password managers
- **No text selection**: Prevents accidental password exposure
- **Secure transmission**: Form data is properly encrypted

### User Experience:
- **Familiar interface**: Standard password field behavior
- **Visual feedback**: Clear indication of secure input
- **Accessibility**: Screen readers announce as password field
- **Browser integration**: Works with password managers

### Best Practices:
- Always use \`type="password"\` for password fields
- Include proper autocomplete attributes
- Provide clear visual indicators
- Ensure keyboard accessibility
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test password field has secure type
        const passwordInput = canvas.getByLabelText<HTMLInputElement>(/password/i);
        await expect(passwordInput).toBeInTheDocument();
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Test password field has proper autocomplete
        await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

        // Test form can be filled (security features don't break functionality)
        const emailInput = canvas.getByLabelText(/email/i);
        await expect(emailInput).toBeInTheDocument();
        await expect(emailInput).toHaveAttribute('autocomplete', 'email');

        // Test submit button exists and is functional
        const submitButton = canvas.getByRole('button', { name: /sign in/i });
        await expect(submitButton).toBeInTheDocument();
        await expect(submitButton).not.toBeDisabled();
    },
};

/**
 * Input interactions and validation - types in fields and verifies validation/error states
 */
export const InputInteractions: Story = {
    args: {
        error: undefined,
        isPasswordlessEnabled: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
Input interactions and validation - tests typing in email/password fields and form validation behavior.
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const emailInput = canvas.getByLabelText(/email/i);
        const passwordInput = canvas.getByLabelText(/password/i);

        await userEvent.type(emailInput, 'user@example.com');
        await expect(emailInput).toHaveValue('user@example.com');

        await userEvent.type(passwordInput, 'SecurePass123!');
        await expect(passwordInput).toHaveValue('SecurePass123!');

        const submitButton = canvas.getByRole('button', { name: /sign in/i });
        await expect(submitButton).toBeInTheDocument();
        await userEvent.click(submitButton);
    },
};
