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

import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import PasswordlessLoginForm from '../passwordless-login-form';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('passwordless-login-click');
        const logSubmit = action('passwordless-login-submit');
        const logInputFocus = action('passwordless-login-input-focus');
        const logButtonClick = action('passwordless-login-button-click');
        const logInput = action('passwordless-login-input');
        const logInputValue = action('passwordless-login-input-value');
        const logHover = action('passwordless-login-hover');

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
                if (/send|submit|continue/i.test(label)) {
                    logSubmit({ label });
                }
            }
        };

        const handleHover = (event: PointerEvent) => {
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
        root.addEventListener('pointerover', handleHover, true);
        root.addEventListener('pointerout', handlePointerOut, true);
        root.addEventListener('focusin', handleFocus, true);
        root.addEventListener('input', handleInput, true);
        root.addEventListener('change', handleInput, true);
        root.addEventListener('submit', handleSubmit, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('pointerover', handleHover, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
            root.removeEventListener('focusin', handleFocus, true);
            root.removeEventListener('input', handleInput, true);
            root.removeEventListener('change', handleInput, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PasswordlessLoginForm> = {
    title: 'AUTHENTICATION/Passwordless Login Form',
    component: PasswordlessLoginForm,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A modern authentication form that allows users to sign in using just their email address. This form eliminates the need for users to remember passwords by sending a secure login link directly to their email.

## Features

- **Email-only authentication**: Users only need to provide their email address
- **Secure login links**: Authentication is handled via email links
- **Error handling**: Displays user-friendly error messages
- **Toggle functionality**: Can switch between passwordless and traditional login
- **Accessibility**: Fully accessible with proper ARIA labels and keyboard navigation
- **Responsive design**: Works seamlessly across all device sizes

## Usage

The PasswordlessLoginForm is typically used on login pages where you want to offer a passwordless authentication option. It integrates with your authentication system to send login links via email.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`error\` | \`string\` | \`undefined\` | Error message to display above the form |
| \`isPasswordlessEnabled\` | \`boolean\` | \`true\` | Whether to show the toggle link to password login |

## Form Behavior

- **Email validation**: Uses HTML5 email validation
- **Form submission**: Submits via POST method with \`loginMode=passwordless\`
- **Loading states**: Button shows loading state during submission
- **Error display**: Errors are displayed in a styled error container

## Security Considerations

- Always validate email addresses on the server side
- Implement rate limiting for login link requests
- Use secure, time-limited tokens for login links
- Consider implementing CAPTCHA for additional security
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
                'Whether passwordless login is enabled. When true, shows a toggle link to switch to password login.',
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
                <div className="w-full max-w-md p-6 bg-background border rounded-none">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground">Sign in to your account</h1>
                        <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a login link</p>
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
The default state of the PasswordlessLoginForm shows all standard elements:

- Email input field with proper validation
- Submit button with "Send Login Link" text
- Toggle link to switch to password login
- Forgot password link

This is the most common state users will see when accessing the login page.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form renders with required elements
        const emailInput = canvas.getByLabelText(/email/i);
        const submitButton = canvas.getByRole('button', { name: 'Send Login Link' });
        await expect(emailInput).toBeInTheDocument();
        await expect(submitButton).toBeInTheDocument();

        // Test password toggle link exists
        const passwordToggleLink = canvas.getByRole('link', { name: 'Login with password' });
        await expect(passwordToggleLink).toBeInTheDocument();

        // Test forgot password link exists
        const forgotPasswordLink = canvas.getByRole('link', { name: 'Forgot your password?' });
        await expect(forgotPasswordLink).toBeInTheDocument();

        // Test no password field (passwordless)
        const passwordField = canvas.queryByLabelText(/password/i);
        await expect(passwordField).toBeNull();

        // Test email input has proper attributes
        await expect(emailInput).toHaveAttribute('type', 'email');
        await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    },
};

export const WithError: Story = {
    args: {
        error: 'Invalid email address. Please try again.',
        isPasswordlessEnabled: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
This story demonstrates how the form handles error states. When an authentication error occurs:

- A styled error message appears above the form
- The error uses destructive styling (red background/border)
- The form remains functional for retry attempts
- All other form elements remain accessible

Common error scenarios include:
- Invalid email format
- Email not found in system
- Rate limiting exceeded
- Server-side validation failures
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test error message is displayed
        const errorMessage = canvas.getByText('Invalid email address. Please try again.');
        await expect(errorMessage).toBeInTheDocument();

        // Test form elements still exist and are functional after error
        const emailInput = canvas.getByLabelText(/email/i);
        const submitButton = canvas.getByRole('button', { name: 'Send Login Link' });

        await expect(emailInput).toBeInTheDocument();
        await expect(submitButton).toBeInTheDocument();
        await expect(emailInput).not.toBeDisabled();
        await expect(submitButton).not.toBeDisabled();

        // Test navigation links still work
        const passwordToggleLink = canvas.getByRole('link', { name: 'Login with password' });
        const forgotPasswordLink = canvas.getByRole('link', { name: 'Forgot your password?' });
        await expect(passwordToggleLink).toBeInTheDocument();
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

- The toggle link to password login is hidden
- Users can only use passwordless authentication
- The form maintains all other functionality
- Error handling and validation remain the same

This configuration is useful when:
- You want to force passwordless-only authentication
- Password login is temporarily disabled
- Testing passwordless-only flows
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form elements exist
        const emailInput = canvas.getByLabelText(/email/i);
        const submitButton = canvas.getByRole('button', { name: 'Send Login Link' });
        await expect(emailInput).toBeInTheDocument();
        await expect(submitButton).toBeInTheDocument();

        // Test password toggle link is NOT present
        const passwordToggleLink = canvas.queryByRole('link', { name: 'Login with password' });
        await expect(passwordToggleLink).toBeNull();

        // Test forgot password link still exists
        const forgotPasswordLink = canvas.getByRole('link', { name: 'Forgot your password?' });
        await expect(forgotPasswordLink).toBeInTheDocument();

        // Test no password field (still passwordless)
        const passwordField = canvas.queryByLabelText(/password/i);
        await expect(passwordField).toBeNull();

        // Test form maintains functionality
        await expect(emailInput).toHaveAttribute('type', 'email');
        await expect(submitButton).not.toBeDisabled();
    },
};
