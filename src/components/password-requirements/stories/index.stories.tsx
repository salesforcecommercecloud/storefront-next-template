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
import { PasswordRequirement } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function PasswordRequirementsStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('password-requirements-input');
        const logChange = action('password-requirements-change');

        const handleInput = (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (!target || !root.contains(target) || target.type !== 'password') return;
            logInput({ value: target.value });
            logChange({ length: target.value.length });
        };

        root.addEventListener('input', handleInput);
        return () => {
            root.removeEventListener('input', handleInput);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PasswordRequirement> = {
    title: 'COMMON/Password Requirements',
    component: PasswordRequirement,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A component that displays real-time password validation requirements with visual indicators.

### Features:
- Real-time validation
- Visual checkmarks/X marks
- Multiple requirement checks
- Length, uppercase, lowercase, number, special character validation
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <PasswordRequirementsStoryHarness>
                <Story />
            </PasswordRequirementsStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PasswordRequirement>;

function PasswordInputExample({ initialPassword = '' }: { initialPassword?: string }) {
    const [password, setPassword] = useState(initialPassword);
    return (
        <div className="space-y-4 w-96">
            <div>
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                />
            </div>
            <PasswordRequirement password={password} />
        </div>
    );
}

export const Default: Story = {
    render: () => <PasswordInputExample />,
    parameters: {
        docs: {
            story: `
Password requirements component with input field.

### Features:
- Empty password state
- All requirements shown
- Real-time validation
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for requirements title
        const title = await canvas.findByText(/requirements/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const ValidPassword: Story = {
    render: () => <PasswordInputExample initialPassword="SecurePass123!" />,
    parameters: {
        docs: {
            story: `
Password requirements with a valid password that meets all requirements.

### Features:
- All requirements met
- All checkmarks visible
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for requirements - when password is valid, all should be check-icons (5 total)
        const checkIcons = await canvas.findAllByTestId('check-icon', {}, { timeout: 5000 });
        await expect(checkIcons.length).toBe(5);

        // Verify no x-icons are present for a valid password
        const xIcons = canvas.queryAllByTestId('x-icon');
        await expect(xIcons.length).toBe(0);
    },
};

export const PartialPassword: Story = {
    render: () => <PasswordInputExample initialPassword="Pass123" />,
    parameters: {
        docs: {
            story: `
Password requirements with a partially valid password.

### Features:
- Some requirements met
- Some requirements not met
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for requirements - use specific test IDs
        const checkIcons = await canvas.findAllByTestId('check-icon', {}, { timeout: 5000 });
        const xIcons = await canvas.findAllByTestId('x-icon', {}, { timeout: 5000 });
        await expect(checkIcons.length + xIcons.length).toBeGreaterThan(0);
    },
};
