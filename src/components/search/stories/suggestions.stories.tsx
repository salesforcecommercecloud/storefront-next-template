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
import Suggestions from '../suggestions';
import { expect, within, userEvent } from 'storybook/test';
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

        const logClick = action('suggestion-click');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            // Check for buttons or links
            const interactive = target.closest('button, a');
            if (interactive) {
                const label =
                    interactive.textContent?.trim() || interactive.getAttribute('aria-label') || 'interactive-element';
                logClick({ label, type: interactive.tagName.toLowerCase() });
            }
        };

        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Suggestions> = {
    title: 'Search/Suggestions',
    component: Suggestions,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Main suggestions component that displays either search suggestions or recent searches based on available data.',
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
        recentSearches: {
            description: 'Array of recent search query strings',
            control: 'object',
        },
        closeAndNavigate: {
            description: 'Callback function to close the search and navigate to a URL',
            action: 'closeAndNavigate',
        },
        clearRecentSearches: {
            description: 'Callback function to clear all recent searches',
            action: 'clearRecentSearches',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Suggestions>;

const mockSearchSuggestions = {
    categorySuggestions: [
        {
            name: 'Footwear',
            link: '/category/footwear',
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
    ],
    popularSearchSuggestions: [
        {
            name: 'Shoes',
            link: '/search?q=shoes',
            type: 'popular',
        },
    ],
};

export const Default: Story = {
    args: {
        searchSuggestions: mockSearchSuggestions,
        recentSearches: [],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Should show suggestions section when searchSuggestions are available
        const categoriesLabels = await canvas.findAllByText(/categories/i, {}, { timeout: 5000 });
        await expect(categoriesLabels.length).toBeGreaterThan(0);
    },
};

export const WithRecentSearches: Story = {
    args: {
        searchSuggestions: null,
        recentSearches: ['shoes', 'boots', 'sneakers'],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Should show recent searches when no searchSuggestions
        const recentSearchesTitles = await canvas.findAllByText(/recent searches/i, {}, { timeout: 5000 });
        await expect(recentSearchesTitles.length).toBeGreaterThan(0);

        const buttons = canvas.getAllByRole('button');
        const shoesButton = buttons.find((btn) => btn.textContent?.trim() === 'shoes');
        await expect(shoesButton).toBeInTheDocument();
    },
};

export const Empty: Story = {
    args: {
        searchSuggestions: null,
        recentSearches: [],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render but show empty recent searches
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const CategoriesOnly: Story = {
    args: {
        searchSuggestions: {
            categorySuggestions: mockSearchSuggestions.categorySuggestions,
        },
        recentSearches: [],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const categoriesLabels = await canvas.findAllByText(/categories/i, {}, { timeout: 5000 });
        await expect(categoriesLabels.length).toBeGreaterThan(0);

        // Use getAllByRole since there may be multiple buttons (mobile + desktop views)
        const footwearButtons = canvas.getAllByRole('button', { name: /footwear/i });
        await expect(footwearButtons.length).toBeGreaterThan(0);
        // Click the first enabled button if available
        const enabledButton = footwearButtons.find((btn) => !btn.hasAttribute('disabled'));
        if (enabledButton) {
            await userEvent.click(enabledButton);
        }
    },
};

export const ProductsOnly: Story = {
    args: {
        searchSuggestions: {
            productSuggestions: mockSearchSuggestions.productSuggestions,
        },
        recentSearches: [],
        closeAndNavigate: action('closeAndNavigate'),
        clearRecentSearches: action('clearRecentSearches'),
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
