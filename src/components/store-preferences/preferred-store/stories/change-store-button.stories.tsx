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
/** @sfdc-extension-file SFDC_EXT_STORE_LOCATOR */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import ChangeStoreButton from '../change-store-button';

const meta: Meta<typeof ChangeStoreButton> = {
    title: 'Components/Store Preferences/Change Store Button',
    component: ChangeStoreButton,
    tags: ['autodocs', 'sfdc-ext-store-locator'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Client component that provides a button to open the Store Selector extension. Requires the store-locator extension to be installed.',
            },
        },
    },
    args: {
        currentStoreId: 'store-001',
    },
};

export default meta;
type Story = StoryObj<typeof ChangeStoreButton>;

/**
 * Default story showing the button when Store Selector extension is installed.
 */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: 'Change store' })).toBeInTheDocument();
    },
};

/**
 * Story showing behavior when no store is currently selected
 */
export const NoCurrentStore: Story = {
    args: {
        currentStoreId: undefined,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: 'Change store' })).toBeInTheDocument();
    },
};

/**
 * Story demonstrating interaction with the button.
 */
export const InteractiveButton: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Change store' });
        await userEvent.click(button);
    },
};
