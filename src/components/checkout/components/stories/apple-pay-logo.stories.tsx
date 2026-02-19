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
import ApplePayLogo from '../apple-pay-logo';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof ApplePayLogo> = {
    title: 'CHECKOUT/ApplePayLogo',
    component: ApplePayLogo,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Official Apple Pay logo component. Uses local SVG file and applies white filter for display on dark backgrounds.',
            },
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ApplePayLogo>;

export const Default: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const logo = canvasElement.querySelector('img[alt="Apple Pay"]');
        await expect(logo).toBeInTheDocument();
    },
};

export const OnDarkBackground: Story = {
    args: {},
    decorators: [
        (Story) => (
            <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '8px' }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const logo = canvasElement.querySelector('img[alt="Apple Pay"]');
        await expect(logo).toBeInTheDocument();
    },
};

export const WithCustomClassName: Story = {
    args: {
        className: 'custom-class',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const logo = canvasElement.querySelector('img[alt="Apple Pay"]');
        await expect(logo).toHaveClass('custom-class');
    },
};
