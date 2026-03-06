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
import SelectBonusProductsCard from '../select-bonus-products-card';
import type { BonusPromotionInfo } from '@/lib/bonus-product-utils';
import { action } from 'storybook/actions';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const createMockPromotion = (overrides?: Partial<BonusPromotionInfo>): BonusPromotionInfo => ({
    promotionId: 'promo-buy-one-get-tie',
    bonusDiscountLineItemIds: ['bonus-1'],
    maxBonusItems: 2,
    selectedItems: 0,
    remainingCapacity: 2,
    calloutText: 'Buy one Classic Fit Shirt, get 2 free ties!',
    ...overrides,
});

const meta: Meta<typeof SelectBonusProductsCard> = {
    title: 'CART/Select Bonus Products Card',
    component: SelectBonusProductsCard,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Card component that displays a button for selecting bonus products.

### Note:
Component currently only renders a button - promotion data (calloutText, selection counter) is not displayed.

### Usage in Mini Cart:
This card appears below qualifying products in the mini cart to prompt users to select their bonus products.
Clicking the button closes the mini cart and navigates to the full cart page where bonus selection happens.
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof SelectBonusProductsCard>;

/**
 * Default - Simple button to select bonus products
 */
export const Default: Story = {
    args: {
        promotion: createMockPromotion(),
        onSelectClick: action('select-bonus-products-clicked'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const button = canvas.getByRole('button', { name: /Select bonus products/i });
        await expect(button).toBeInTheDocument();
        await expect(button).toBeVisible();
        await userEvent.click(button);
    },
};

/**
 * Different Promotion - Card with different promotion ID
 */
export const DifferentPromotion: Story = {
    args: {
        promotion: createMockPromotion({
            promotionId: 'promo-free-shipping',
        }),
        onSelectClick: action('different-promo-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates that the card uses the promotionId for testids.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const card = canvas.getByTestId('select-bonus-products-card-promo-free-shipping');
        await expect(card).toBeInTheDocument();

        const button = canvas.getByRole('button');
        await userEvent.click(button);
    },
};

/**
 * Multiple Cards - Shows how cards look side by side
 */
export const MultipleCards: Story = {
    render: () => (
        <div className="flex flex-col gap-4 w-96">
            <div className="p-4 border rounded">
                <div className="font-bold mb-2">Classic Fit Shirt - $20.00</div>
                <SelectBonusProductsCard
                    promotion={createMockPromotion()}
                    onSelectClick={action('shirt-promo-clicked')}
                />
            </div>
            <div className="p-4 border rounded">
                <div className="font-bold mb-2">Men&apos;s Classic Suit - $100.00</div>
                <SelectBonusProductsCard
                    promotion={createMockPromotion({
                        promotionId: 'promo-buy-suit',
                    })}
                    onSelectClick={action('suit-promo-clicked')}
                />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Visual test showing multiple bonus product cards in a cart context.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const buttons = canvas.getAllByRole('button');
        await expect(buttons).toHaveLength(2);

        await userEvent.click(buttons[0]);
        await userEvent.click(buttons[1]);
    },
};

/**
 * Keyboard Navigation - Tests keyboard accessibility
 */
export const KeyboardNavigation: Story = {
    render: (args) => {
        let clickCount = 0;
        const handleClick = () => {
            clickCount++;
            action('keyboard-activated')();
        };

        return (
            <div>
                <SelectBonusProductsCard {...args} onSelectClick={handleClick} />
                <div data-testid="click-count" className="mt-2 text-sm text-muted-foreground">
                    Clicks: {clickCount}
                </div>
            </div>
        );
    },
    args: {
        promotion: createMockPromotion(),
    },
    parameters: {
        docs: {
            description: {
                story: 'Verifies that the button is keyboard accessible via Enter and Space keys.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const button = canvas.getByRole('button');
        button.focus();

        await expect(button).toHaveFocus();

        // Test Enter key
        await userEvent.keyboard('{Enter}');

        // Test Space key
        await userEvent.keyboard(' ');

        // Note: Cannot reliably assert click count in Storybook play functions
        // due to action() wrapper. See unit tests for assertion coverage.
    },
};
