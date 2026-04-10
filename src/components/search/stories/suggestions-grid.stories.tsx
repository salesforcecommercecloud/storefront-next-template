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
import SuggestionsGrid from '../suggestions-grid';
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
            if (!target) return;
            const link = target.closest('a');
            if (link && root.contains(link)) {
                event.preventDefault(); // Prevent navigation in storybook
                logClick({ href: link.getAttribute('href'), text: link.textContent?.trim() });
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof SuggestionsGrid> = {
    title: 'Search/SuggestionsGrid',
    component: SuggestionsGrid,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Displays product suggestions in a horizontal grid layout. Used for showing product search results in the search suggestions dropdown.',
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
        suggestions: {
            description: 'Array of product suggestions to display',
            control: 'object',
        },
        closeAndNavigate: {
            description: 'Callback function to close the search and navigate to a URL',
            action: 'closeAndNavigate',
        },
    },
};

export default meta;
type Story = StoryObj<typeof SuggestionsGrid>;

const mockSuggestions = [
    {
        name: 'Running Shoes',
        link: '/products/running-shoes',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
        price: 99.99,
    },
    {
        name: 'Hiking Boots',
        link: '/products/hiking-boots',
        image: 'https://images.unsplash.com/photo-1608256246200-53bd35f3f44e?w=400&h=400&fit=crop',
        price: 149.99,
    },
    {
        name: 'Casual Sneakers',
        link: '/products/casual-sneakers',
        image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop',
        price: 79.99,
    },
    {
        name: 'Dress Shoes',
        link: '/products/dress-shoes',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
        price: 199.99,
    },
    {
        name: 'Sandals',
        link: '/products/sandals',
        image: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=400&h=400&fit=crop',
        price: 49.99,
    },
];

export const Default: Story = {
    args: {
        suggestions: mockSuggestions,
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const runningShoesLink = await canvas.findByRole('link', { name: /running shoes/i });
        await expect(runningShoesLink).toBeInTheDocument();

        await userEvent.click(runningShoesLink);
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
        // The container might have a wrapper div, so we check that no links are rendered
        const links = canvasElement.querySelectorAll('a');
        await expect(links.length).toBe(0);
    },
};

export const SingleProduct: Story = {
    args: {
        suggestions: [
            {
                name: 'Running Shoes',
                link: '/products/running-shoes',
                image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
                price: 99.99,
            },
        ],
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const productLink = canvas.getByRole('link', { name: /running shoes/i });
        await expect(productLink).toBeInTheDocument();
    },
};

export const WithoutImages: Story = {
    args: {
        suggestions: [
            {
                name: 'Product Without Image',
                link: '/products/no-image',
                price: 29.99,
            },
            {
                name: 'Another Product',
                link: '/products/another',
                price: 39.99,
            },
        ],
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const productLink = canvas.getByRole('link', { name: /product without image/i });
        await expect(productLink).toBeInTheDocument();
    },
};

export const WithoutPrices: Story = {
    args: {
        suggestions: [
            {
                name: 'Product Without Price',
                link: '/products/no-price',
                image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
            },
        ],
        closeAndNavigate: action('closeAndNavigate'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const productLink = canvas.getByRole('link', { name: /product without price/i });
        await expect(productLink).toBeInTheDocument();
    },
};
