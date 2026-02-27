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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { ReturnsAndWarrantyModalContent } from '../returns-and-warranty-modal-content';
import type { ReturnsAndWarrantyData } from '@/lib/adapters/product-content-data-types';

const mockData: ReturnsAndWarrantyData = {
    title: 'Returns & Warranty',
    description: 'Our returns and warranty policy',
    returnsPolicy: {
        heading: 'Returns Policy',
        intro: 'Items can be returned within 30 days of purchase.',
        conditions: ['Item must be unused', 'Original packaging required'],
        howToReturn: ['Contact support', 'Ship item back', 'Receive refund'],
        note: 'Sale items are final sale.',
    },
    warranty: {
        heading: 'Warranty',
        intro: '1-year limited warranty on all products.',
        whatsCovered: ['Manufacturing defects', 'Material failures'],
        whatsNotCovered: ['Normal wear and tear', 'Misuse'],
        claimsProcess: 'Contact us with your order number to file a claim.',
    },
    exchanges: {
        heading: 'Exchanges',
        intro: 'We offer free exchanges within 30 days.',
        process: 'Request an exchange through your account or contact support.',
    },
    needHelp: {
        intro: 'Our team is here to help.',
        email: 'support@example.com',
        phone: '1-800-555-0100',
    },
};

const meta: Meta<typeof ReturnsAndWarrantyModalContent> = {
    title: 'Components/InfoModal/ReturnsAndWarrantyModalContent',
    component: ReturnsAndWarrantyModalContent,
    parameters: {
        layout: 'centered',
    },
};

export default meta;
type Story = StoryObj<typeof ReturnsAndWarrantyModalContent>;

export const Default: Story = {
    args: {
        returnsAndWarrantyData: mockData,
    },
    decorators: [
        (Story) => (
            <div className="max-w-2xl p-6 space-y-6">
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Returns Policy')).toBeInTheDocument();
        await expect(canvas.getByText('Warranty')).toBeInTheDocument();
        await expect(canvas.getByText('Exchanges')).toBeInTheDocument();
    },
};
