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
import { allModes } from '../../../../.storybook/modes';
import { ForgotPasswordForm } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { getTranslation } from '@/lib/i18next';

function ForgotPasswordFormStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('forgot-password-form-input');
        const logSubmit = action('forgot-password-form-submit');
        const logLinkClick = action('forgot-password-form-link-click');

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

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const link = target.closest('a');
            if (link) {
                event.preventDefault();
                logLinkClick({ href: link.getAttribute('href') || '' });
            }
        };

        root.addEventListener('change', handleChange, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ForgotPasswordForm> = {
    title: 'ACCOUNT/Forgot Password Form',
    component: ForgotPasswordForm,
    tags: ['autodocs', 'interaction'],
    parameters: {
        chromatic: { modes: { desktop: allModes.desktop } },
        layout: 'centered',
        docs: {
            description: {
                component: `
Forgot Password Form component for requesting password reset emails.

### Features:
- Email input field
- Form submission
- Link back to login
- Error message display
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ForgotPasswordFormStoryHarness>
                <div className="p-8 max-w-md">
                    <Story />
                </div>
            </ForgotPasswordFormStoryHarness>
        ),
    ],
    argTypes: {
        error: {
            description: 'Optional error message to display',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof ForgotPasswordForm>;

export const Default: Story = {
    render: () => <ForgotPasswordForm />,
    parameters: {
        docs: {
            story: `
Default forgot password form.

### Features:
- Email input field
- Submit button
- Link to login page
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for email input
        const emailInput = await canvas.findByPlaceholderText(
            t('resetPassword:emailPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(emailInput).toBeInTheDocument();

        // Check for submit button
        const submitButton = await canvas.findByRole('button', { name: /reset/i }, { timeout: 5000 });
        await expect(submitButton).toBeInTheDocument();

        // Check for login link
        const loginLink = await canvas.findByRole('link', { name: /go back to login/i }, { timeout: 5000 });
        await expect(loginLink).toBeInTheDocument();
    },
};

export const WithError: Story = {
    render: () => <ForgotPasswordForm error="Email address not found. Please try again." />,
    parameters: {
        docs: {
            story: `
Forgot password form with error message.

### Features:
- Error message display
- Email input field
- Submit button
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for error message
        const errorMessage = await canvas.findByText(/email address not found/i, {}, { timeout: 5000 });
        await expect(errorMessage).toBeInTheDocument();

        // Check for email input
        const emailInput = await canvas.findByPlaceholderText(
            t('resetPassword:emailPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(emailInput).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    render: () => <ForgotPasswordForm />,
    parameters: {
        docs: {
            story: `
Interactive forgot password form for testing user interactions.

### Features:
- Email input interaction
- Form submission
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Find and interact with email input
        const emailInput = await canvas.findByPlaceholderText(
            t('resetPassword:emailPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(emailInput, 'user@example.com');
        await expect(emailInput).toHaveValue('user@example.com');
    },
};
