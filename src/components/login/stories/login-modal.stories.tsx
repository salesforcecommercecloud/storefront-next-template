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
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import LoginModal from '../login-modal';

const meta: Meta<typeof LoginModal> = {
    title: 'AUTHENTICATION/Login Modal',
    component: LoginModal,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A modal dialog for user authentication that provides the same functionality as the login page but in a modal overlay. This component allows users to log in without leaving their current page context.

## Features

- **Multiple login modes**: Standard password login and passwordless login
- **Social login support**: Optional social login buttons (Google, Apple, etc.)
- **OTP verification**: Built-in OTP modal for passwordless login verification
- **Error handling**: Clear error messages for authentication failures
- **Flexible callbacks**: Support for custom success handlers
- **Return URL support**: Preserves navigation context after login
- **Full accessibility**: Keyboard navigation and screen reader support

## Usage

The LoginModal is ideal for:
- Header/navigation login buttons
- Protected action prompts (add to cart, checkout, etc.)
- Inline authentication flows
- Any scenario where maintaining page context is important

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`isOpen\` | \`boolean\` | required | Controls modal visibility |
| \`onOpenChange\` | \`(open: boolean) => void\` | required | Callback when modal should close |
| \`mode\` | \`'password' \\| 'passwordless'\` | \`'password'\` | Initial login mode |
| \`isPasswordlessEnabled\` | \`boolean\` | \`false\` | Whether passwordless login is available |
| \`isSocialLoginEnabled\` | \`boolean\` | \`false\` | Whether social login buttons are shown |
| \`returnUrl\` | \`string\` | \`undefined\` | URL to redirect to after successful login |
| \`action\` | \`string\` | \`undefined\` | Pending action to preserve after login |
| \`actionParams\` | \`string\` | \`undefined\` | Action parameters to preserve |
| \`otpLength\` | \`number\` | \`8\` | OTP code length for passwordless login |
| \`onSuccess\` | \`() => void\` | \`undefined\` | Callback when login succeeds |
                `,
            },
        },
    },
    argTypes: {
        isOpen: {
            control: 'boolean',
            description: 'Controls whether the modal is visible',
            table: {
                type: { summary: 'boolean' },
            },
        },
        mode: {
            control: 'select',
            options: ['password', 'passwordless'],
            description: 'Initial login mode to display',
            table: {
                type: { summary: "'password' | 'passwordless'" },
                defaultValue: { summary: "'password'" },
            },
        },
        isPasswordlessEnabled: {
            control: 'boolean',
            description: 'Whether passwordless login option is available',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
        isSocialLoginEnabled: {
            control: 'boolean',
            description: 'Whether social login buttons are shown',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
        returnUrl: {
            control: 'text',
            description: 'URL to redirect to after successful login',
            table: {
                type: { summary: 'string' },
            },
        },
        otpLength: {
            control: 'number',
            description: 'Length of OTP code for passwordless login',
            table: {
                type: { summary: 'number' },
                defaultValue: { summary: '8' },
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Wrapper component to control modal state
 */
function ModalWrapper(args: React.ComponentProps<typeof LoginModal>) {
    const [isOpen, setIsOpen] = useState(args.isOpen ?? false);

    return (
        <div>
            <Button onClick={() => setIsOpen(true)}>Open Login Modal</Button>
            <LoginModal
                {...args}
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                onSuccess={() => {
                    action('login-success')();
                    setIsOpen(false);
                }}
            />
        </div>
    );
}

export const Default: Story = {
    args: {
        isOpen: false,
        mode: 'password',
        isPasswordlessEnabled: true,
        isSocialLoginEnabled: false,
        returnUrl: '/',
        otpLength: 8,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default login modal with standard password login. Click the button to open the modal.

### Features:
- Email and password fields
- Toggle to passwordless login (when enabled)
- Links to forgot password and sign up
- Clean modal design matching the /login page
                `,
            },
        },
    },
    render: (args) => <ModalWrapper {...args} />,
};

export const WithPasswordlessEnabled: Story = {
    args: {
        isOpen: false,
        mode: 'password',
        isPasswordlessEnabled: true,
        isSocialLoginEnabled: false,
        returnUrl: '/',
        otpLength: 8,
    },
    parameters: {
        docs: {
            description: {
                story: `
Login modal with passwordless login enabled. Users can toggle between password and passwordless modes.

### Passwordless Features:
- Switch between password and passwordless mode
- Email-only input for passwordless
- OTP verification modal (appears after email submission)
- Resend code functionality
                `,
            },
        },
    },
    render: (args) => <ModalWrapper {...args} />,
};

export const PasswordlessMode: Story = {
    args: {
        isOpen: false,
        mode: 'passwordless',
        isPasswordlessEnabled: true,
        isSocialLoginEnabled: false,
        returnUrl: '/',
        otpLength: 8,
    },
    parameters: {
        docs: {
            description: {
                story: `
Modal starting in passwordless login mode. Only email input is shown, and users can request a login code.
                `,
            },
        },
    },
    render: (args) => <ModalWrapper {...args} />,
};

export const WithSocialLogin: Story = {
    args: {
        isOpen: false,
        mode: 'password',
        isPasswordlessEnabled: true,
        isSocialLoginEnabled: true,
        returnUrl: '/',
        otpLength: 8,
    },
    parameters: {
        docs: {
            description: {
                story: `
Login modal with social login buttons enabled. Users can choose between:
- Standard email/password login
- Passwordless login
- Social login providers (Google, Apple, etc.)

### Social Login:
- One-click authentication
- Managed by OAuth2 providers
- Secure and convenient
                `,
            },
        },
    },
    render: (args) => <ModalWrapper {...args} />,
};

export const OpenByDefault: Story = {
    args: {
        isOpen: true,
        mode: 'password',
        isPasswordlessEnabled: true,
        isSocialLoginEnabled: true,
        returnUrl: '/',
        otpLength: 8,
    },
    parameters: {
        docs: {
            description: {
                story: `
Modal that opens automatically. This story shows the modal in its open state for easier testing and visual inspection.
                `,
            },
        },
    },
    render: (args) => <ModalWrapper {...args} />,
};

export const WithReturnUrl: Story = {
    args: {
        isOpen: false,
        mode: 'password',
        isPasswordlessEnabled: true,
        isSocialLoginEnabled: true,
        returnUrl: '/checkout',
        otpLength: 8,
    },
    parameters: {
        docs: {
            description: {
                story: `
Login modal with a return URL specified. After successful login, the user will be redirected to the checkout page.

### Use Cases:
- Login required before checkout
- Protected product pages
- Account-only features
- Cart actions requiring authentication
                `,
            },
        },
    },
    render: (args) => <ModalWrapper {...args} />,
};

export const CustomOtpLength: Story = {
    args: {
        isOpen: false,
        mode: 'passwordless',
        isPasswordlessEnabled: true,
        isSocialLoginEnabled: false,
        returnUrl: '/',
        otpLength: 6,
    },
    parameters: {
        docs: {
            description: {
                story: `
Modal with a custom OTP length (6 digits instead of 8). The OTP input will adjust to match the configured length.
                `,
            },
        },
    },
    render: (args) => <ModalWrapper {...args} />,
};
