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
import Signup from '../signup';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function SignupStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('footer-signup-input');
        const logSubmit = action('footer-signup-submit');

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
            const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
            if (emailInput) {
                logSubmit({ email: emailInput.value });
            }
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

const meta: Meta<typeof Signup> = {
    title: 'LAYOUT/Footer/Signup',
    component: Signup,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Footer signup component for newsletter subscription.

### Features:
- Email input field
- Subscribe button
- Form submission handling
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <SignupStoryHarness>
                <div className="p-8 max-w-md">
                    <Story />
                </div>
            </SignupStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Signup>;

export const Default: Story = {
    render: () => <Signup />,
    parameters: {
        docs: {
            description: {
                story: 'Standard footer signup component with email input field and subscribe button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for email input
        const emailInput = await canvas.findByPlaceholderText(/your email/i, {}, { timeout: 500 });
        await expect(emailInput).toBeInTheDocument();
        await userEvent.type(emailInput, 'user@example.com');
        await expect(emailInput).toHaveValue('user@example.com');

        // Check for subscribe button
        const subscribeButton = await canvas.findByRole('button', { name: /subscribe/i }, { timeout: 500 });
        await expect(subscribeButton).toBeInTheDocument();
        await userEvent.click(subscribeButton);
    },
};
