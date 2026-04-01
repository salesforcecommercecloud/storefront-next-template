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
import { ShareButton } from '../share-button';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { standardProd } from '@/components/__mocks__/standard-product-2';

const SHARE_HARNESS_ATTR = 'data-share-harness';

function ShareStoryHarness({ children, providers }: { children: ReactNode; providers?: string[] }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('share-button-clicked'), []);
    const logShareOption = useMemo(() => action('share-option-selected'), []);
    const logHover = useMemo(() => action('share-button-hovered'), []);

    const configValue = useMemo(() => {
        return {
            ...mockConfig,
            features: {
                ...mockConfig.features,
                socialShare: {
                    enabled: true,
                    providers: providers ?? ['Twitter', 'Facebook', 'LinkedIn', 'Email'],
                },
            },
        } as typeof mockConfig;
    }, [providers]);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${SHARE_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }
            const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
            if (!label) {
                return;
            }

            // Check if it's a dropdown menu item
            const menuItem = button.closest('[role="menuitem"]');
            if (menuItem) {
                const itemText = button.textContent?.trim() || label;
                logShareOption({ option: itemText });
            } else {
                logClick({ label });
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && button.contains(related)) {
                return;
            }
            const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
            if (!label) {
                return;
            }
            logHover({ label });
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logClick, logShareOption, logHover]);

    return (
        <ConfigProvider config={configValue}>
            <div ref={containerRef} {...{ [SHARE_HARNESS_ATTR]: 'true' }}>
                {children}
            </div>
        </ConfigProvider>
    );
}

const meta: Meta<typeof ShareButton> = {
    title: 'ACTIONS/Share Button',
    component: ShareButton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        a11y: {
            config: {
                rules: [
                    // Radix UI intentionally sets aria-hidden="true" on #storybook-root when dropdown opens
                    // This is correct accessibility behavior for modal focus trapping
                    { id: 'aria-hidden-focus', enabled: false },
                ],
            },
        },
        docs: {
            description: {
                component: `
A share button component that provides a dropdown menu with various sharing options for products. This component supports multiple social media platforms and native sharing capabilities.

## Features

- **Dropdown menu**: Custom dropdown with share options
- **Multiple providers**: Supports Twitter, Facebook, LinkedIn, and Email
- **Native sharing**: Uses Web Share API when available
- **Copy link**: Quick copy-to-clipboard functionality
- **Configurable**: Share providers configured via config.features.socialShare config
- **Accessibility**: Proper ARIA attributes and keyboard navigation

## Usage

The ShareButton is commonly used in:
- Product detail pages
- Product cards
- Product listings
- Any context where product sharing is needed

\`\`\`tsx
import { ShareButton } from '../share-button';

function ProductDetail({ product }) {
  return (
    <div>
      {/* product content */}
      <ShareButton product={product} />
    </div>
  );
}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`product\` | \`ShopperProducts.schemas['Product']\` | - | The product data to share |
| \`className\` | \`string\` | \`undefined\` | Optional additional CSS classes |

## Share Options

- **Native Share**: Uses device's native share dialog (when available)
- **Copy Link**: Copies product URL to clipboard
- **Twitter/X**: Opens Twitter share dialog
- **Facebook**: Opens Facebook share dialog
- **LinkedIn**: Opens LinkedIn share dialog
- **Email**: Opens email client with pre-filled message

## Configuration

Share providers are configured via \`config.features.socialShare\`:

\`\`\`typescript
{
  site: {
    features: {
      socialShare: {
        enabled: true,
        providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email']
      }
    }
  }
}
\`\`\`

## Accessibility

- Proper ARIA attributes for dropdown menu
- Keyboard navigation support
- Screen reader announcements
- Focus management during dropdown interaction
                `,
            },
        },
    },
    argTypes: {
        product: {
            control: 'object',
            description: 'The product data to share',
            table: {
                type: { summary: "ShopperProducts.schemas['Product']" },
            },
        },
        className: {
            control: 'text',
            description: 'Optional additional CSS classes',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'undefined' },
            },
        },
    },
    args: {
        product: standardProd,
        className: undefined,
    },
    decorators: [
        (Story: React.ComponentType, context) => (
            <ShareStoryHarness providers={context.parameters?.shareProviders}>
                <Story {...(context.args as Record<string, unknown>)} />
            </ShareStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        product: standardProd,
    },
    parameters: {
        shareProviders: ['Twitter', 'Facebook', 'LinkedIn', 'Email'],
        docs: {
            description: {
                story: `
The default ShareButton shows all available share options:

### Features:
- **Share button**: Main button with "Share" text
- **Dropdown menu**: Opens to reveal share options
- **All providers**: Twitter, Facebook, LinkedIn, and Email
- **Native share**: Available when Web Share API is supported
- **Copy link**: Quick copy functionality

### Use Cases:
- Product detail pages
- Standard sharing functionality
- Most common sharing scenarios
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test share button is present
        const shareButton = canvas.getByRole('button', { name: /share/i });
        await expect(shareButton).toBeInTheDocument();
        await expect(shareButton).not.toBeDisabled();

        // Test dropdown opens on click
        await userEvent.click(shareButton);

        // Wait for dropdown menu to be visible and find the copy link option
        // Note: Dropdown content may be in a portal, so we query from document
        const documentBody = within(document.body);
        const copyLinkOption = await documentBody.findByRole('menuitem', { name: /copy link/i });
        await expect(copyLinkOption).toBeInTheDocument();
    },
};

export const WithCustomProduct: Story = {
    args: {
        product: {
            ...standardProd,
            name: 'Limited Edition Sneakers',
            shortDescription: 'Exclusive design with premium materials. Only 100 pairs available worldwide.',
        },
    },
    parameters: {
        shareProviders: ['Twitter', 'Facebook', 'LinkedIn', 'Email'],
        docs: {
            description: {
                story: `
This story shows the ShareButton with a custom product:

### Custom Product Features:
- **Custom name**: "Limited Edition Sneakers"
- **Custom description**: Exclusive product description
- **Same functionality**: All sharing features work the same
- **Product-specific**: Shares the specific product URL and details

### Use Cases:
- Featured products
- Special promotions
- Limited edition items
- Custom product sharing
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test share button is present
        const shareButton = canvas.getByRole('button', { name: /share/i });
        await expect(shareButton).toBeInTheDocument();
        await expect(shareButton).not.toBeDisabled();

        // Test dropdown opens
        await userEvent.click(shareButton);

        // Wait for dropdown menu to be visible and find the copy link option
        // Note: Dropdown content may be in a portal, so we query from document
        const documentBody = within(document.body);
        const copyLinkOption = await documentBody.findByRole('menuitem', { name: /copy link/i });
        await expect(copyLinkOption).toBeInTheDocument();
    },
};

export const LimitedProviders: Story = {
    args: {
        product: standardProd,
    },
    parameters: {
        shareProviders: ['Twitter', 'Email'],
        docs: {
            description: {
                story: `
This story shows the ShareButton with only Twitter and Email providers:

### Limited Providers:
- **Twitter**: Social media sharing
- **Email**: Email sharing
- **No Facebook/LinkedIn**: Only configured providers shown
- **Same functionality**: All features work the same

### Use Cases:
- Simplified sharing options
- Brand-specific providers
- Reduced choice for users
- Focused sharing experience
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test share button is present
        const shareButton = canvas.getByRole('button', { name: /share/i });
        await expect(shareButton).toBeInTheDocument();
        await expect(shareButton).not.toBeDisabled();

        // Test dropdown opens
        await userEvent.click(shareButton);

        // Wait for dropdown menu to be visible and find the copy link option
        // Note: Dropdown content may be in a portal, so we query from document
        const documentBody = within(document.body);
        const copyLinkOption = await documentBody.findByRole('menuitem', { name: /copy link/i });
        await expect(copyLinkOption).toBeInTheDocument();
    },
};

export const SingleProvider: Story = {
    args: {
        product: standardProd,
    },
    parameters: {
        shareProviders: ['Email'],
        docs: {
            description: {
                story: `
This story shows the ShareButton with only Email provider:

### Single Provider:
- **Email only**: Only email sharing option
- **Copy link**: Still available
- **Native share**: Still available when supported
- **Simplified menu**: Fewer options in dropdown

### Use Cases:
- Email-focused sharing
- Minimal sharing options
- Simple sharing experience
- Email marketing focus
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test share button is present
        const shareButton = canvas.getByRole('button', { name: /share/i });
        await expect(shareButton).toBeInTheDocument();
        await expect(shareButton).not.toBeDisabled();

        // Test dropdown opens
        await userEvent.click(shareButton);

        // Wait for dropdown menu to be visible and find the copy link option
        // Note: Dropdown content may be in a portal, so we query from document
        const documentBody = within(document.body);
        const copyLinkOption = await documentBody.findByRole('menuitem', { name: /copy link/i });
        await expect(copyLinkOption).toBeInTheDocument();
    },
};

export const NoProviders: Story = {
    args: {
        product: standardProd,
    },
    parameters: {
        shareProviders: [],
        docs: {
            description: {
                story: `
This story shows the ShareButton when no providers are configured:

### No Providers:
- **Copy link**: Still available
- **Native share**: Still available when supported
- **No social options**: No Twitter, Facebook, LinkedIn, or Email
- **Minimal menu**: Only basic sharing options

### Use Cases:
- Disabled social sharing
- Basic link copying only
- Minimal sharing functionality
- Configuration testing
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test share button is present
        const shareButton = canvas.getByRole('button', { name: /share/i });
        await expect(shareButton).toBeInTheDocument();
        await expect(shareButton).not.toBeDisabled();

        // Test dropdown opens
        await userEvent.click(shareButton);

        // Wait for dropdown menu to be visible and find the copy link option
        // Note: Dropdown content may be in a portal, so we query from document
        const documentBody = within(document.body);
        const copyLinkOption = await documentBody.findByRole('menuitem', { name: /copy link/i });
        await expect(copyLinkOption).toBeInTheDocument();
    },
};

export const CustomStyling: Story = {
    args: {
        product: standardProd,
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    parameters: {
        shareProviders: ['Twitter', 'Facebook', 'LinkedIn', 'Email'],
        docs: {
            description: {
                story: `
This story shows the ShareButton with custom styling:

### Custom Styling Features:
- **Blue background**: Custom blue color
- **Hover effect**: Darker blue on hover
- **White text**: Contrasting text color
- **Maintains functionality**: All sharing features work the same

### Use Cases:
- Brand-specific styling
- Custom color schemes
- Design system integration
- Enhanced visual appeal
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test share button is present with custom styling
        const shareButton = canvas.getByRole('button', { name: /share/i });
        await expect(shareButton).toBeInTheDocument();
        await expect(shareButton).not.toBeDisabled();
    },
};

export const InProductCard: Story = {
    render: () => (
        <div className="w-64 p-4 border rounded-lg shadow-sm">
            <div className="mb-4">
                <div className="w-full h-48 bg-muted rounded mb-2" />
                <h3 className="font-semibold text-lg">Premium Cotton T-Shirt</h3>
                <p className="text-sm text-muted-foreground mb-2">$29.99</p>
            </div>
            <div className="flex justify-between items-center">
                <ShareButton product={standardProd} className="text-sm" />
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded">Add to Cart</button>
            </div>
        </div>
    ),
    parameters: {
        shareProviders: ['Twitter', 'Facebook', 'LinkedIn', 'Email'],
        docs: {
            description: {
                story: `
This story shows the ShareButton integrated into a product card:

### Product Card Structure:
- **Product image**: Placeholder image area
- **Product name**: Product title
- **Price**: Product price display
- **Share button**: ShareButton component
- **Add to cart**: Additional action button

### Integration Features:
- **Compact layout**: Share button fits naturally in card
- **Visual hierarchy**: Clear product information
- **Action buttons**: Share and add to cart side by side
- **Responsive design**: Works on different screen sizes

### Use Cases:
- Product listings
- Product grids
- Search results
- Category pages
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test share button is present in product card
        const shareButton = canvas.getByRole('button', { name: /share/i });
        await expect(shareButton).toBeInTheDocument();

        // Test add to cart button is present
        const addToCartButton = canvas.getByRole('button', { name: /add to cart/i });
        await expect(addToCartButton).toBeInTheDocument();

        // Test product name is present
        const productName = canvas.getByText(/premium cotton t-shirt/i);
        await expect(productName).toBeInTheDocument();
    },
};
