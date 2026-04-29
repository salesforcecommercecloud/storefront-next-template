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
import SuggestionSection from '../suggestions-section';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig, mockLocale } from '@/test-utils/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('suggestion-section-click');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            // Check for buttons or links
            const interactive = target.closest('button, a');
            if (interactive && root.contains(interactive)) {
                if (interactive.tagName.toLowerCase() === 'a') {
                    event.preventDefault(); // Prevent navigation in storybook
                    logClick({
                        type: 'link',
                        href: interactive.getAttribute('href'),
                        text: interactive.textContent?.trim(),
                    });
                } else {
                    logClick({ type: 'button', text: interactive.textContent?.trim() });
                }
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof SuggestionSection> = {
    title: 'Search/SuggestionsSection',
    component: SuggestionSection,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Main container for search suggestions that displays categories, products, and popular searches in a responsive layout.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <SiteProvider
                    site={mockConfig.commerce.sites[0]}
                    locale={mockLocale}
                    language="en-GB"
                    currency={mockConfig.commerce.sites[0].defaultCurrency}>
                    <ActionLogger>
                        <Story />
                    </ActionLogger>
                </SiteProvider>
            </ConfigProvider>
        ),
    ],
    argTypes: {
        searchSuggestions: {
            description: 'Object containing various types of search suggestions',
            control: 'object',
        },
        closeAndNavigate: {
            description: 'Callback function to close the search and navigate to a URL',
            action: 'closeAndNavigate',
        },
    },
};

export default meta;
type Story = StoryObj<typeof SuggestionSection>;

const mockSearchSuggestions = {
    categorySuggestions: [
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
        },
    ],
    productSuggestions: [
        {
            name: 'Running Shoes',
            link: '/products/running-shoes',
            type: 'product',
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
            price: 99.99,
        },
        {
            name: 'Hiking Boots',
            link: '/products/hiking-boots',
            type: 'product',
            image: 'https://images.unsplash.com/photo-1608256246200-53bd35f3f44e?w=400&h=400&fit=crop',
            price: 149.99,
        },
        {
            name: 'Casual Sneakers',
            link: '/products/casual-sneakers',
            type: 'product',
            image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop',
            price: 79.99,
        },
    ],
    popularSearchSuggestions: [
        {
            name: 'Shoes',
            link: '/search?q=shoes',
            type: 'popular',
        },
        {
            name: 'Boots',
            link: '/search?q=boots',
            type: 'popular',
        },
    ],
    searchPhrase: 'shoes',
};

export const Default: Story = {
    args: {
        searchSuggestions: mockSearchSuggestions,
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for categories section
        const categoriesLabels = await canvas.findAllByText(/categories/i, {}, { timeout: 5000 });
        await expect(categoriesLabels.length).toBeGreaterThan(0);

        // Check for products section
        const productsLabels = await canvas.findAllByText(/products/i, {}, { timeout: 5000 });
        await expect(productsLabels.length).toBeGreaterThan(0);

        // Check for popular searches section
        const popularSearchesLabels = await canvas.findAllByText(/popular searches/i, {}, { timeout: 5000 });
        await expect(popularSearchesLabels.length).toBeGreaterThan(0);
    },
};

export const CategoriesOnly: Story = {
    args: {
        searchSuggestions: {
            categorySuggestions: mockSearchSuggestions.categorySuggestions,
            searchPhrase: 'footwear',
        },
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const categoriesLabels = await canvas.findAllByText(/categories/i, {}, { timeout: 5000 });
        await expect(categoriesLabels.length).toBeGreaterThan(0);

        // Use getAllByRole since there may be multiple buttons (mobile + desktop views)
        const footwearButtons = canvas.getAllByRole('button', { name: /footwear/i });
        await expect(footwearButtons.length).toBeGreaterThan(0);
        // Just verify at least one exists, don't interact with it to avoid ambiguity
    },
};

export const ProductsOnly: Story = {
    args: {
        searchSuggestions: {
            productSuggestions: mockSearchSuggestions.productSuggestions,
            searchPhrase: 'shoes',
        },
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const productsLabel = canvas.getByText(/products/i);
        await expect(productsLabel).toBeInTheDocument();

        const runningShoesLink = canvas.getByRole('link', { name: /running shoes/i });
        await expect(runningShoesLink).toBeInTheDocument();
    },
};

export const WithDidYouMean: Story = {
    args: {
        searchSuggestions: {
            ...mockSearchSuggestions,
            phraseSuggestions: [
                {
                    name: 'shoes',
                    link: '/search?q=shoes',
                    type: 'phrase',
                    exactMatch: false,
                },
            ],
        },
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const didYouMeanTexts = await canvas.findAllByText(/did you mean/i, {}, { timeout: 5000 });
        await expect(didYouMeanTexts.length).toBeGreaterThan(0);

        const links = canvas.getAllByRole('link');
        const shoesLink = links.find((link) => link.textContent?.toLowerCase().includes('shoes'));
        await expect(shoesLink).toBeInTheDocument();
    },
};

export const PopularSearchesOnly: Story = {
    args: {
        searchSuggestions: {
            popularSearchSuggestions: mockSearchSuggestions.popularSearchSuggestions,
            searchPhrase: 'boots',
        },
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const popularSearchesLabels = await canvas.findAllByText(/popular searches/i, {}, { timeout: 5000 });
        await expect(popularSearchesLabels.length).toBeGreaterThan(0);

        const buttons = canvas.getAllByRole('button');
        const shoesButton = buttons.find((btn) => btn.textContent?.toLowerCase().includes('shoes'));
        await expect(shoesButton).toBeInTheDocument();
    },
};
