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
import StaticPayPalButton from '../static-paypal-button';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';

const meta: Meta<typeof StaticPayPalButton> = {
    title: 'CHECKOUT/StaticPayPalButton',
    component: StaticPayPalButton,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Static PayPal button component that matches the exact appearance of PayPal SDK gold button. Uses official PayPal gold color (#FFC439) and logo. SDK loads in the background when clicked.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        onClick: {
            description: 'Callback when button is clicked',
            action: 'onClick',
        },
        disabled: {
            description: 'Whether the button should be disabled',
            control: 'boolean',
        },
    },
};

export default meta;
type Story = StoryObj<typeof StaticPayPalButton>;

export const Default: Story = {
    args: {
        onClick: action('onClick'),
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button');
        await expect(button).toBeInTheDocument();
        const logo = canvas.getByAltText('PayPal');
        await expect(logo).toBeInTheDocument();
    },
};

export const Disabled: Story = {
    args: {
        onClick: action('onClick'),
        disabled: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button');
        await expect(button).toBeDisabled();
    },
};
