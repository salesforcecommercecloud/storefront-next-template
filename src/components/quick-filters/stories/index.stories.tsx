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
import { within, expect, userEvent } from 'storybook/test';
import QuickFilters from '../index';

const meta: Meta<typeof QuickFilters> = {
    title: 'Components/QuickFilters',
    component: QuickFilters,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof QuickFilters>;

export const Default: Story = {
    args: {
        category: {
            id: 'mens',
            name: 'Men',
            categories: [
                { id: 'mens-suits', name: 'Suits' },
                { id: 'mens-shorts', name: 'Shorts' },
                { id: 'mens-pants', name: 'Pants' },
                { id: 'mens-accessories', name: 'Accessories' },
            ],
        },
    },
};

export const ManyCategories: Story = {
    args: {
        category: {
            id: 'womens',
            name: 'Women',
            categories: [
                { id: 'womens-tops', name: 'Tops' },
                { id: 'womens-bottoms', name: 'Bottoms' },
                { id: 'womens-dresses', name: 'Dresses' },
                { id: 'womens-outerwear', name: 'Outerwear' },
                { id: 'womens-shoes', name: 'Shoes' },
                { id: 'womens-accessories', name: 'Accessories' },
                { id: 'womens-bags', name: 'Bags' },
                { id: 'womens-jewelry', name: 'Jewelry' },
            ],
        },
    },
};

export const NoLabels: Story = {
    args: {
        category: {
            id: 'mens',
            name: 'Men',
            categories: [{ id: 'mens-tops' }, { id: 'mens-bottoms' }],
        },
    },
};

export const EmptyState: Story = {
    args: {},
};

// Interaction test
export const ClickCategory: Story = {
    args: {
        category: {
            id: 'mens',
            name: 'Men',
            categories: [
                { id: 'mens-tops', name: 'Tops' },
                { id: 'mens-bottoms', name: 'Bottoms' },
            ],
        },
    },
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement);

        // Find the Bottoms button
        const bottomsButton = canvas.getByRole('button', { name: 'Bottoms' });

        // Verify it's not pressed initially
        expect(bottomsButton).toHaveAttribute('aria-pressed', 'false');

        // Click it
        await userEvent.click(bottomsButton);

        // Note: Navigation is mocked in Storybook, so we can't test the actual navigation
        // But we can verify the button is clickable
        expect(bottomsButton).toBeInTheDocument();
    },
};

// Accessibility test - shows all buttons in default state
export const AccessibilityTest: Story = {
    args: {
        category: {
            id: 'mens',
            name: 'Men',
            categories: [
                { id: 'mens-tops', name: 'Tops' },
                { id: 'mens-bottoms', name: 'Bottoms' },
                { id: 'mens-outerwear', name: 'Outerwear' },
            ],
        },
    },
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement);

        // Verify all buttons have proper aria attributes
        const topsButton = canvas.getByRole('button', { name: 'Tops' });
        expect(topsButton).toHaveAttribute('aria-pressed');

        const bottomsButton = canvas.getByRole('button', { name: 'Bottoms' });
        expect(bottomsButton).toHaveAttribute('aria-pressed');
    },
};
