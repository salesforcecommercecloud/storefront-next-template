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
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { CartItemModalAddContainer } from '../add-container';

const meta: Meta<typeof CartItemModalAddContainer> = {
    title: 'CART/Cart Item Modal/Add Container',
    component: CartItemModalAddContainer,
    tags: ['autodocs'],
    args: {
        productId: '25519583M',
        open: false,
        initialQuantity: 1,
    },
    decorators: [
        (Story, context): ReactElement => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = <Story {...(context.args as Record<string, unknown>)} />;
                if (inRouter) {
                    return content;
                }
                const router = createMemoryRouter([{ path: '/', element: content }], {
                    initialEntries: ['/'],
                });
                return <RouterProvider router={router} />;
            };
            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
