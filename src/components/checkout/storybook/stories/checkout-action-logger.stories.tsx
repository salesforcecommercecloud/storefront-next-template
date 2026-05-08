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
import { Title, Description, Controls } from '@storybook/addon-docs/blocks';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { CheckoutActionLogger } from '../checkout-action-logger';

const meta: Meta<typeof CheckoutActionLogger> = {
    title: 'CHECKOUT/CheckoutActionLogger',
    component: CheckoutActionLogger,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Storybook-only decorator for checkout step components. Wraps children in a `<div>` and attaches native DOM event listeners that log user interactions (click, submit, input, change, focus, hover) to the Storybook Actions panel. Synthetic test events (`isTrusted === false`) are ignored so play function interactions do not pollute the Actions panel.',
            },
            page: () => (
                <>
                    <Title />
                    <Description />
                    <Controls />
                </>
            ),
        },
    },
    argTypes: {
        name: {
            control: 'text',
            description: 'Prefix for action names — e.g. `"payment"` produces `payment-click`, `payment-submit`, etc.',
        },
        children: {
            table: { disable: true },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithButton: Story = {
    args: {
        name: 'example',
        children: (
            <div className="space-y-4 p-4">
                <p className="text-sm text-muted-foreground">
                    Click the button below. The interaction is logged in the Actions panel when triggered by a real user
                    click, but ignored when triggered by a Storybook play function.
                </p>
                <button type="button" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                    Click me
                </button>
            </div>
        ),
    },
    parameters: {
        docs: {
            description: {
                story: 'Wraps a button — real user clicks are logged to the Actions panel as `example-click`.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const button = canvas.getByRole('button', { name: /click me/i });
        await expect(button).toBeInTheDocument();
    },
};

export const WithForm: Story = {
    args: {
        name: 'checkout-step',
        children: (
            <form className="space-y-4 p-4">
                <div>
                    <label htmlFor="logger-name" className="block text-sm font-medium mb-1">
                        Full Name
                    </label>
                    <input
                        id="logger-name"
                        type="text"
                        name="name"
                        className="border border-input rounded-md px-3 py-2 text-sm w-full"
                        placeholder="Jane Doe"
                    />
                </div>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                    Continue
                </button>
            </form>
        ),
    },
    parameters: {
        docs: {
            description: {
                story: 'Wraps a form with a text input and submit button. Real user form submissions are logged as `checkout-step-submit`; input changes are logged as `checkout-step-input-value`.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const input = canvas.getByRole('textbox', { name: /full name/i });
        await expect(input).toBeInTheDocument();

        const button = canvas.getByRole('button', { name: /continue/i });
        await expect(button).toBeInTheDocument();
    },
};

export const WithRadioGroup: Story = {
    args: {
        name: 'shipping-options',
        children: (
            <fieldset className="space-y-3 p-4 border-0">
                <legend className="text-sm font-medium mb-2">Shipping Method</legend>
                {['Standard Shipping', 'Express Shipping', 'Overnight Shipping'].map((label) => (
                    <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="shipping" value={label.toLowerCase().replace(' ', '-')} />
                        {label}
                    </label>
                ))}
            </fieldset>
        ),
    },
    parameters: {
        docs: {
            description: {
                story: 'Wraps a radio group — real user selection changes are logged as `shipping-options-option-select`.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const radios = canvas.getAllByRole('radio');
        await expect(radios.length).toBe(3);
    },
};
