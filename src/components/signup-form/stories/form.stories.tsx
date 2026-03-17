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
import { SignupForm } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { getTranslation } from '@/lib/i18next';

function SignupFormFormStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('signup-form-form-input');
        const logSubmit = action('signup-form-form-submit');

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

const meta: Meta<typeof SignupForm> = {
    title: 'ACCOUNT/Signup Form/Form',
    component: SignupForm,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Signup Form component (form implementation) for creating new user accounts.

### Features:
- First name and last name fields
- Email field
- Password and confirm password fields
- Password strength requirements
- Form validation
- Error message display
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <SignupFormFormStoryHarness>
                <div className="p-8 max-w-md">
                    <form>
                        <Story />
                    </form>
                </div>
            </SignupFormFormStoryHarness>
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
type Story = StoryObj<typeof SignupForm>;

export const Default: Story = {
    render: () => <SignupForm />,
    parameters: {
        docs: {
            story: `
Default signup form component.

### Features:
- First name and last name fields
- Email field
- Password fields with requirements
- Submit button
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for first name input
        const firstNameInput = await canvas.findByPlaceholderText(
            t('signup:form.firstNamePlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(firstNameInput).toBeInTheDocument();

        // Check for email input
        const emailInput = await canvas.findByPlaceholderText(t('signup:form.emailPlaceholder'), {}, { timeout: 5000 });
        await expect(emailInput).toBeInTheDocument();

        // Check for password input
        const passwordInput = await canvas.findByPlaceholderText(
            t('signup:form.passwordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(passwordInput).toBeInTheDocument();

        // Check for submit button
        const submitButton = await canvas.findByRole('button', { name: /create account/i }, { timeout: 5000 });
        await expect(submitButton).toBeInTheDocument();
    },
};

export const WithError: Story = {
    render: () => (
        <SignupForm error="Email address is already registered. Please use a different email or try logging in." />
    ),
    parameters: {
        docs: {
            story: `
Signup form with error message.

### Features:
- Error message display
- All form fields
- Submit button
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for error message
        const errorMessage = await canvas.findByText(/email address is already registered/i, {}, { timeout: 5000 });
        await expect(errorMessage).toBeInTheDocument();

        // Check for email input
        const emailInput = await canvas.findByPlaceholderText(t('signup:form.emailPlaceholder'), {}, { timeout: 5000 });
        await expect(emailInput).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    render: () => <SignupForm />,
    parameters: {
        docs: {
            story: `
Interactive signup form for testing user interactions.

### Features:
- Form field interactions
- Password validation
- Form submission
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Find and interact with first name input
        const firstNameInput = await canvas.findByPlaceholderText(
            t('signup:form.firstNamePlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(firstNameInput, 'John');
        await expect(firstNameInput).toHaveValue('John');

        // Find and interact with last name input
        const lastNameInput = await canvas.findByPlaceholderText(
            t('signup:form.lastNamePlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(lastNameInput, 'Doe');
        await expect(lastNameInput).toHaveValue('Doe');

        // Find and interact with email input
        const emailInput = await canvas.findByPlaceholderText(t('signup:form.emailPlaceholder'), {}, { timeout: 5000 });
        await userEvent.type(emailInput, 'john.doe@example.com');
        await expect(emailInput).toHaveValue('john.doe@example.com');

        // Find and interact with password input
        const passwordInput = await canvas.findByPlaceholderText(
            t('signup:form.passwordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(passwordInput, 'SecurePass123!');
        await expect(passwordInput).toHaveValue('SecurePass123!');

        // Find and interact with confirm password input
        const confirmPasswordInput = await canvas.findByPlaceholderText(
            t('signup:form.confirmPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(confirmPasswordInput, 'SecurePass123!');
        await expect(confirmPasswordInput).toHaveValue('SecurePass123!');
    },
};
