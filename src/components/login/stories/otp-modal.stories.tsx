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
import { expect, fn, userEvent, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

import OtpModal from '../otp-modal';

const meta: Meta<typeof OtpModal> = {
    title: 'LOGIN/OtpModal',
    component: OtpModal,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
OTP (One-Time Password) Modal component for passwordless login verification.

## Features

- **6 or 8-Digit OTP Input**: Individual input fields for each digit
- **Auto-advance**: Automatically moves to next input on digit entry
- **Auto-submit**: Automatically verifies when all 8 digits are entered
- **Resend Code**: Timer-based resend functionality
- **Guest Checkout**: Option to continue as guest
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during verification
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Usage

The OTP Modal is typically used after a passwordless login request has been made. It handles the verification flow including:

1. Displaying input fields for the OTP code
2. Auto-advancing between fields
3. Auto-submitting when complete
4. Handling verification success/failure
5. Providing resend functionality with cooldown timer
6. Allowing guest checkout as an alternative

## Props

- \`isOpen\`: Controls modal visibility
- \`onClose\`: Callback when modal is closed
- \`email\`: Email address for OTP verification
- \`onSuccess\`: Callback when verification succeeds
- \`onCheckoutAsGuest\`: Optional callback for guest checkout
- \`onResendCode\`: Optional callback for resending OTP

## Testing

- **Interaction Tests**: Verify OTP input, auto-advance, and submission
- **A11y Tests**: Ensure proper accessibility and keyboard navigation
- **Visual Tests**: Verify modal states and responsive design
                `,
            },
        },
    },
    args: {
        isOpen: false,
        email: 'test@example.com',
        onSuccess: () => {},
        onClose: () => {},
        otpLength: 8,
    },
    argTypes: {
        otpLength: {
            control: { type: 'radio' },
            options: [6, 8],
        },
    },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {
    args: {
        isOpen: false,
        email: 'closed@example.com',
        onSuccess: fn(() => {}),
        onClose: fn(() => {}),
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const body = within(document.body);

        await step('Verify modal is not in DOM', async () => {
            await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
        });
    },
};

export const Default: Story = {
    tags: ['!autodocs'],
    args: {
        isOpen: true,
        email: 'user@example.com',
        otpLength: 8,
        onSuccess: fn(() => {}),
        onClose: fn(() => {}),
    },
    play: async ({ canvasElement, step, args }) => {
        await waitForStorybookReady(canvasElement);
        const body = within(document.body);
        const length = args.otpLength ?? 8;

        await step('Verify modal is open', async () => {
            await expect(body.getByRole('dialog')).toBeInTheDocument();
            await expect(body.getByText('Enter Verification Code')).toBeInTheDocument();
        });

        await step('Verify OTP inputs are present', async () => {
            const inputs = body.getAllByRole('textbox');
            await expect(inputs).toHaveLength(length);

            for (let i = 0; i < length; i++) {
                await expect(inputs[i]).toHaveAttribute('aria-label', `Verification Code ${i + 1} of ${length}`);
            }
        });

        await step('Verify first input is focused', async () => {
            const firstInput = body.getAllByRole('textbox')[0];
            await expect(firstInput).toHaveFocus();
        });
    },
};

export const SixDigit: Story = {
    tags: ['!autodocs'],
    args: {
        isOpen: true,
        email: 'user@example.com',
        otpLength: 6,
        onSuccess: fn(() => {}),
        onClose: fn(() => {}),
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const body = within(document.body);

        await step('Verify 6 OTP inputs are present', async () => {
            const inputs = body.getAllByRole('textbox');
            await expect(inputs).toHaveLength(6);

            for (let i = 0; i < 6; i++) {
                await expect(inputs[i]).toHaveAttribute('aria-label', `Verification Code ${i + 1} of 6`);
            }
        });
    },
};

export const WithGuestCheckout: Story = {
    tags: ['!autodocs'],
    args: {
        isOpen: true,
        email: 'guest@example.com',
        onSuccess: () => {},
        onClose: () => {},
        onCheckoutAsGuest: () => {},
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const body = within(document.body);

        await step('Verify guest checkout button is present', async () => {
            await expect(body.getByRole('button', { name: 'Checkout as Guest' })).toBeInTheDocument();
        });
    },
};

export const WithResendCode: Story = {
    tags: ['!autodocs'],
    args: {
        isOpen: true,
        email: 'resend@example.com',
        onSuccess: () => {},
        onClose: () => {},
        onResendCode: async () => {},
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const body = within(document.body);

        await step('Verify resend button is present and enabled', async () => {
            const resendButton = body.getByRole('button', { name: 'Resend Code' });
            await expect(resendButton).toBeInTheDocument();
            await expect(resendButton).not.toBeDisabled();
        });
    },
};

export const UserInputInteraction: Story = {
    tags: ['!autodocs'],
    args: {
        isOpen: true,
        email: 'interaction@example.com',
        otpLength: 8,
        onSuccess: fn(() => {}),
        onClose: fn(() => {}),
    },
    play: async ({ canvasElement, step, args }) => {
        await waitForStorybookReady(canvasElement);
        const body = within(document.body);
        const length = args.otpLength ?? 8;
        // Type length-1 digits to verify auto-advance without triggering auto-submit
        const partialCode = Array.from({ length: length - 1 }, (_, i) => String(i + 1)).join('');

        await step('Enter digits and verify auto-advance', async () => {
            const inputs = body.getAllByRole('textbox');

            for (let i = 0; i < partialCode.length; i++) {
                await userEvent.type(inputs[i], partialCode[i]);
                await expect(inputs[i + 1]).toHaveFocus();
            }
        });

        await step('Verify inputs are filled', async () => {
            const inputs = body.getAllByRole('textbox');
            for (let i = 0; i < length - 1; i++) {
                await expect(inputs[i]).toHaveValue((i + 1).toString());
            }
        });
    },
};
