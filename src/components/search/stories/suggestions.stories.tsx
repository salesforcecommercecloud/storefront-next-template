import type { Meta, StoryObj } from '@storybook/react-vite';
import Suggestions from '../suggestions';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';

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
