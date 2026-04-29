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
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import type { ReactElement } from 'react';
import { CartItemAddToWishlistButton } from '../cart-item-add-to-wishlist-button';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import type { EnrichedProductItem } from '@/lib/product-utils';

const sampleLine: EnrichedProductItem = {
    itemId: 'cart-wl-story-line',
    productId: '25505481M',
    productName: 'Sample product',
    quantity: 1,
} as EnrichedProductItem;

const meta: Meta<typeof CartItemAddToWishlistButton> = {
    title: 'CART/Cart item add to wishlist',
    component: CartItemAddToWishlistButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Link-style control on cart lines to add or remove the product from the shopper wishlist. Requires React Router (fetchers) and app providers.',
            },
        },
    },
    args: {
        product: sampleLine,
        wishlistProductIds: [],
        className: '',
    },
    decorators: [
        (Story, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <AllProvidersWrapper>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </AllProvidersWrapper>
                );
                if (inRouter) {
                    return content;
                }
                const router = createMemoryRouter([{ path: '/', element: content }], { initialEntries: ['/'] });
                return <RouterProvider router={router} />;
            };
            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Product not in wishlist — shows add control. */
export const AddToWishlist: Story = {
    args: {
        product: sampleLine,
        wishlistProductIds: [],
    },
};

/** Product already in wishlist — shows remove control (hydration-style IDs). */
export const RemoveFromWishlist: Story = {
    args: {
        product: sampleLine,
        wishlistProductIds: [sampleLine.productId as string],
    },
};
