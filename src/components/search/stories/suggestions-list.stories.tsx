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
import SuggestionsList from '../suggestions-list';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('suggestion-click');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const button = target.closest('button');
            if (button && root.contains(button)) {
                logClick({ text: button.textContent?.trim() });
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof SuggestionsList> = {
    title: 'Search/SuggestionsList',
    component: SuggestionsList,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Displays a vertical list of search suggestions (categories, products, or popular searches) with optional images.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <ActionLogger>
                    <Story />
                </ActionLogger>
            </ConfigProvider>
        ),
    ],
    argTypes: {
        suggestions: {
            description: 'Array of suggestions to display',
            control: 'object',
        },
        closeAndNavigate: {
            description: 'Callback function to close the search and navigate to a URL',
            action: 'closeAndNavigate',
        },
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof SuggestionsList>;

const mockCategorySuggestions = [
    {
        name: 'Footwear',
        link: '/category/footwear',
        type: 'category',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop',
    },
    {
        name: 'Clothing',
        link: '/category/clothing',
        type: 'category',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    },
    {
        name: 'Accessories',
        link: '/category/accessories',
        type: 'category',
    },
];

const mockProductSuggestions = [
    {
        name: 'Running Shoes',
        link: '/products/running-shoes',
        type: 'product',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop',
    },
    {
        name: 'Hiking Boots',
        link: '/products/hiking-boots',
        type: 'product',
        image: 'https://images.unsplash.com/photo-1608256246200-53bd35f3f44e?w=100&h=100&fit=crop',
    },
];

export const Default: Story = {
    args: {
        suggestions: mockCategorySuggestions,
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const footwearButton = await canvas.findByRole('button', { name: /footwear/i });
        await expect(footwearButton).toBeInTheDocument();

        await userEvent.click(footwearButton);
    },
};

export const Empty: Story = {
    args: {
        suggestions: [],
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render nothing when empty (returns null)
        // The container might have a wrapper div, so we check that no buttons are rendered
        const buttons = canvasElement.querySelectorAll('button');
        await expect(buttons.length).toBe(0);
    },
};

export const WithProducts: Story = {
    args: {
        suggestions: mockProductSuggestions,
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const runningShoesButton = canvas.getByRole('button', { name: /running shoes/i });
        await expect(runningShoesButton).toBeInTheDocument();
    },
};

export const WithoutImages: Story = {
    args: {
        suggestions: [
            {
                name: 'Category Without Image',
                link: '/category/no-image',
                type: 'category',
            },
            {
                name: 'Another Category',
                link: '/category/another',
                type: 'category',
            },
        ],
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const categoryButton = canvas.getByRole('button', { name: /category without image/i });
        await expect(categoryButton).toBeInTheDocument();
    },
};

export const SingleSuggestion: Story = {
    args: {
        suggestions: [
            {
                name: 'Single Item',
                link: '/category/single',
                type: 'category',
                image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop',
            },
        ],
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const itemButton = canvas.getByRole('button', { name: /single item/i });
        await expect(itemButton).toBeInTheDocument();
    },
};
