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
import { allModes } from '../../../../.storybook/modes';
import ProductCartActions from '../index';
// @ts-expect-error mock file is JS
import { mockStandardProductOrderable } from '../../__mocks__/standard-product';
import ProductViewProvider from '@/providers/product-view';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';

// Mock ProductViewProvider to control internal state if needed,
// but using the real one is better for integration testing if possible.
// We need to ensure all dependencies of ProductViewProvider are met.

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logAction = action('interaction');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const interactiveElement = target.closest('button, a, [role="button"]');
            if (interactiveElement) {
                event.preventDefault();
                event.stopPropagation();
                const label = interactiveElement.textContent?.trim().substring(0, 50) || 'unlabeled';
                const tag = interactiveElement.tagName.toLowerCase();

                if (label.match(/add to cart/i)) {
                    action('add-to-cart')({ label });
                } else if (label.match(/wishlist/i)) {
                    action('wishlist')({ label });
                } else {
                    logAction({ type: 'click', tag, label });
                }
            }
        };

        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ProductCartActions> = {
    title: 'Components/ProductCartActions',
    component: ProductCartActions,
    tags: ['autodocs', 'interaction'],
    parameters: {
        chromatic: { modes: { desktop: allModes.desktop } },
        layout: 'centered',
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            return (
                <ConfigProvider config={mockConfig}>
                    <ProductViewProvider product={context.args.product as any} initialQuantity={1} mode="add">
                        <ActionLogger>
                            <Story />
                        </ActionLogger>
                    </ProductViewProvider>
                </ConfigProvider>
            );
        },
    ],
};

export default meta;
type Story = StoryObj<typeof ProductCartActions>;

export const Default: Story = {
    args: {
        product: mockStandardProductOrderable.product as any,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const addToCartButton = canvas.getByRole('button', { name: /add to cart/i });
        await expect(addToCartButton).toBeInTheDocument();
        await expect(addToCartButton).toBeEnabled();

        const wishlistButton = canvas.getByRole('button', { name: /add to wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();
    },
};

export const EditMode: Story = {
    args: {
        product: mockStandardProductOrderable.product as any,
    },
    decorators: [
        (Story: React.ComponentType, context) => (
            <ConfigProvider config={mockConfig}>
                <ProductViewProvider product={context.args.product as any} initialQuantity={1} mode="edit">
                    <ActionLogger>
                        <Story />
                    </ActionLogger>
                </ProductViewProvider>
            </ConfigProvider>
        ),
    ],
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Updated matcher to find "Update" or "Update Cart"
        const updateCartButton = canvas.getByRole('button', { name: /update/i });
        await expect(updateCartButton).toBeInTheDocument();

        // Wishlist button should not be present in edit mode
        const wishlistButton = canvas.queryByRole('button', { name: /add to wishlist/i });
        await expect(wishlistButton).not.toBeInTheDocument();
    },
};
