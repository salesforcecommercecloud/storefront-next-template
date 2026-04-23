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
import { PasswordRequirement } from '@/components/password-requirements';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('password-requirements-click');
        const logInputFocus = action('password-requirements-input-focus');
        const logInputChange = action('password-requirements-input-change');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const element = target.closest('[data-testid]');
            if (element) {
                const testId = element.getAttribute('data-testid');
                logClick({ testId, element: element.tagName.toLowerCase() });
            }
        };

        const handleFocus = (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (target && target.tagName === 'INPUT') {
                logInputFocus({ type: target.type });
            }
        };

        const handleInput = (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (target && target.tagName === 'INPUT') {
                logInputChange({ type: target.type, value: target.value.length });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('focus', handleFocus, true);
        root.addEventListener('input', handleInput, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('focus', handleFocus, true);
            root.removeEventListener('input', handleInput, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PasswordRequirement> = {
    title: 'AUTHENTICATION/Password Requirements',
    component: PasswordRequirement,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A real-time password validation component that displays security requirements with visual feedback. This component helps users create secure passwords by showing which requirements are met and which still need to be satisfied.

## Features

- **Real-time validation**: Updates as user types
- **Visual feedback**: Checkmarks for met requirements, circles for unmet
- **Comprehensive criteria**: Length, character types, and special characters
- **Accessibility**: Screen reader friendly with proper ARIA labels
- **Responsive design**: Works on all device sizes
- **Color coding**: Green for met requirements, gray for unmet

## Password Requirements

The component validates passwords against these criteria:

1. **Minimum length**: At least 8 characters
2. **Uppercase letter**: At least one uppercase letter (A-Z)
3. **Lowercase letter**: At least one lowercase letter (a-z)
4. **Number**: At least one digit (0-9)
5. **Special character**: At least one special character (, ! % # @ $ & * etc.)

## Usage

\`\`\`tsx
import { PasswordRequirement } from '@/components/password-requirements';

function SignupForm() {
  const [password, setPassword] = useState('');
  
  return (
    <div>
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
      />
      <PasswordRequirement password={password} />
    </div>
  );
}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`password\` | \`string\` | \`''\` | The password string to validate against requirements |

## Validation Logic

The component uses the \`validatePassword\` utility function which returns an object with boolean values for each requirement:

\`\`\`typescript
{
  minLength: boolean,
  hasUppercase: boolean,
  hasLowercase: boolean,
  hasNumber: boolean,
  hasSpecialChar: boolean
}
\`\`\`

## Accessibility

- Uses semantic HTML with proper heading structure
- Icons have appropriate alt text and ARIA labels
- Color is not the only indicator of state
- Keyboard navigation friendly
- Screen reader announcements for requirement changes
                `,
            },
        },
    },
    argTypes: {
        password: {
            control: 'text',
            description: 'The password string to validate against security requirements',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: "''" },
            },
        },
    },
    args: {
        password: '',
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <div className="w-full max-w-md p-6 bg-background border rounded-none">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
                        <h2 className="text-lg font-semibold text-foreground mt-2">Security Settings</h2>
                        <h3 className="text-base font-medium text-foreground mt-1">Password</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your password must meet the following criteria
                        </p>
                    </div>
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test component interaction
        const buttons = canvas.queryAllByRole('button');
        const inputs = canvas.queryAllByRole('textbox');

        // Perform basic interactions
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }

        // Verify component renders
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyPassword: Story = {
    args: {
        password: '',
    },
    parameters: {
        docs: {
            description: {
                story: `
## Empty Password State

When no password is entered, all requirements are displayed as unmet:

- **Visual indicators**: Empty circles (○) for all requirements
- **Text color**: Muted gray for all requirement text
- **User guidance**: Clear indication that all criteria need to be met

This is the initial state users see when they start creating a password.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test component interaction
        const buttons = canvas.queryAllByRole('button');
        const inputs = canvas.queryAllByRole('textbox');

        // Perform basic interactions
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }

        // Verify component renders
        await expect(canvasElement.firstChild).toBeInTheDocument();
    },
};
