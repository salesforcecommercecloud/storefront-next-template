import type { Meta, StoryObj } from '@storybook/react-vite';
import PopularCategory from './index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

/**
 * ActionLogger wrapper component to capture user interactions
 */
function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logNavigate = action('navigate');
        const logClick = action('click');
        const logCategorySelect = action('category-select');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const link = target.closest('a[href]');
            if (link) {
                const href = link.getAttribute('href') || '';
                const text = link.textContent?.trim() || '';
                event.preventDefault();

                // Log specific category selection if it's a category link
                if (href.startsWith('/category/')) {
                    const categoryId = href.replace('/category/', '');
                    logCategorySelect({ categoryId, categoryName: text, href });
                }

                logNavigate({ href, text });
                logClick({ type: 'link', href, text });
                return;
            }

            const button = target.closest('button');
            if (button) {
                const label = button.textContent?.trim() || button.getAttribute('aria-label') || '';
                logClick({ type: 'button', label });
            }
        };

        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const mockCategory: ShopperProducts.schemas['Category'] = {
    id: 'newarrivals',
    name: 'New Arrivals',
    pageDescription:
        'Shop all new arrivals including women and mens clothing, jewelry, accessories, suits & more at Commerce Cloud',
    pageTitle: 'Women and Mens New Arrivals in Clothing, Jewelry, Accessories & More',
    image: '/images/hero-new-arrivals.png',
    c_slotBannerImage: '/images/new-arrivals-banner.jpg',
};

const mockCategoryWomens: ShopperProducts.schemas['Category'] = {
    id: 'womens',
    name: 'Womens',
    pageDescription:
        "Women's range. Fashionable and stylish Shoes, jackets and all other clothing for unbeatable comfort day in, day out. Practical and fashionable styles wherever the occasion.",
    image: '/images/womens.jpg',
};

const mockCategoryNoImage: ShopperProducts.schemas['Category'] = {
    id: 'mens',
    name: 'Mens',
    pageDescription: "Men's range. Hard-wearing boots, jackets and clothing for unbeatable comfort day in, day out.",
    // No image - should use fallback
};

const meta: Meta<typeof PopularCategory> = {
    title: 'HOME/Popular Category',
    component: PopularCategory,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Popular Category component that displays a single category card.

### Features:
- Category card with image, title, description, and shop now button
- Supports data from loader (Page Designer) or direct category prop (programmatic)
- Automatic image fallback handling
- Responsive design

### Usage Modes:
1. **With data prop**: Receives full category object from component loader (Page Designer mode)
2. **With category prop**: Accepts full category object directly (programmatic use)
3. **Fallback**: Shows empty card if no data provided
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="bg-background min-h-screen p-8">
                    <div className="max-w-md mx-auto">
                        <Story />
                    </div>
                </div>
            </ActionLogger>
        ),
    ],
    argTypes: {
        data: {
            description: 'Full category object from loader (Page Designer mode)',
            control: 'object',
        },
        category: {
            description: 'Full category object for programmatic use',
            control: 'object',
        },
    },
};

export default meta;
type Story = StoryObj<typeof PopularCategory>;

/**
 * Default story with category data from loader
 */
export const Default: Story = {
    args: {
        data: mockCategory,
    },
    parameters: {
        docs: {
            description: {
                story: 'Standard popular category card with full category data from loader (Page Designer mode).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify category name is displayed
        const title = await canvas.findByText('New Arrivals', {}, { timeout: 3000 });
        await expect(title).toBeInTheDocument();

        // Verify description is displayed
        await expect(canvas.getByText(/shop all new arrivals/i)).toBeInTheDocument();

        // Verify shop now button is present
        const shopNowButton = await canvas.findByText(/shop now/i, {}, { timeout: 3000 });
        await expect(shopNowButton).toBeInTheDocument();

        // Verify category link
        const link = canvas.getByRole('link');
        await expect(link).toHaveAttribute('href', '/category/newarrivals');
    },
};

/**
 * Category with programmatic category prop
 */
export const WithCategoryProp: Story = {
    args: {
        category: mockCategoryWomens,
    },
    parameters: {
        docs: {
            description: {
                story: 'Category card using category prop (programmatic use, not from loader).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Womens')).toBeInTheDocument();
        await expect(canvas.getByText(/women's range/i)).toBeInTheDocument();
        await expect(canvas.getByRole('link')).toHaveAttribute('href', '/category/womens');
    },
};

/**
 * Category without image (fallback to hero image)
 */
export const WithoutImage: Story = {
    args: {
        data: mockCategoryNoImage,
    },
    parameters: {
        docs: {
            description: {
                story: 'Category card without image - uses fallback hero image.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Mens')).toBeInTheDocument();
        // Image should still be present (fallback)
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
    },
};

/**
 * Fallback state (no data)
 */
export const Fallback: Story = {
    args: {},
    parameters: {
        docs: {
            description: {
                story: 'Category card in fallback state when no data is provided.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Should still show shop now button
        await expect(canvas.getByText(/shop now/i)).toBeInTheDocument();
        // Link should point to root
        await expect(canvas.getByRole('link')).toHaveAttribute('href', '/category/root');
    },
};

/**
 * Interactive test - testing user interactions
 */
export const InteractionTest: Story = {
    args: {
        data: mockCategory,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test story for verifying user interactions with category card.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for component to render
        const title = await canvas.findByText('New Arrivals', {}, { timeout: 3000 });
        await expect(title).toBeInTheDocument();

        // Find the shop now button/link
        const shopNowLink = await canvas.findByRole('link', { name: /shop now/i }, { timeout: 3000 });
        await expect(shopNowLink).toBeInTheDocument();

        // Test clicking the shop now button
        await userEvent.click(shopNowLink);

        // Test hovering over the card
        const card = canvas.getByText('New Arrivals').closest('div');
        if (card) {
            await userEvent.hover(card);
        }

        // Verify all elements are present
        await expect(canvas.getByText('New Arrivals')).toBeInTheDocument();
        await expect(canvas.getByText(/shop all new arrivals/i)).toBeInTheDocument();
        await expect(canvas.getByRole('img')).toBeInTheDocument();
    },
};
