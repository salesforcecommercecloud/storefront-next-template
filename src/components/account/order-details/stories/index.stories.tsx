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
import { MemoryRouter } from 'react-router';
import { OrderDetails } from '../index';
import { ConfigWrapper } from '@/test-utils/config';
import { mockOrderDetailsOrder, mockOrderDetailsProductsById } from '../mock-order-details';

const meta: Meta<typeof OrderDetails> = {
    title: 'ACCOUNT/Order Details',
    component: OrderDetails,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Order details page showing order info, shipments, line items, and order summary.',
            },
        },
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <ConfigWrapper>
                <MemoryRouter>
                    <Story />
                </MemoryRouter>
            </ConfigWrapper>
        ),
    ],
    argTypes: {
        order: { control: false },
        productsById: { control: false },
    },
};

export default meta;
type Story = StoryObj<typeof OrderDetails>;

export const Default: Story = {
    args: {
        order: mockOrderDetailsOrder,
        productsById: mockOrderDetailsProductsById,
    },
};
