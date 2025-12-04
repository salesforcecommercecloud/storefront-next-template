import type { Meta, StoryObj } from '@storybook/react-vite';
import BonusProductSelection from '../bonus-product-selection';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const BONUS_HARNESS_ATTR = 'data-bonus-product-harness';

function BonusProductStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('bonus-product-clicked'), []);
    const logSelect = useMemo(() => action('bonus-product-selected'), []);
    const logAccordionToggle = useMemo(() => action('bonus-accordion-toggled'), []);
    const logHover = useMemo(() => action('bonus-product-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${BONUS_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }
            const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
            if (!label) {
                return;
            }

            // Check if it's the select button
            if (label.toLowerCase().includes('select')) {
                const article = button.closest('article');
                const productId = article?.getAttribute('aria-label') || 'unknown';
                logSelect({ productId, label });
            } else {
                logClick({ label });
            }
        };

        const handleAccordionToggle = (event: MouseEvent) => {
            const trigger = (event.target as HTMLElement | null)?.closest('[role="button"]');
            if (!trigger || !isInsideHarness(trigger)) {
                return;
            }
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            logAccordionToggle({ expanded: !isExpanded });
        };

        const handleMouseOver = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button, article');
            if (!button || !isInsideHarness(button)) {
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
        document.addEventListener('click', handleAccordionToggle, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('click', handleAccordionToggle, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logClick, logSelect, logAccordionToggle, logHover]);

    return (
        <div ref={containerRef} {...{ [BONUS_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof BonusProductSelection> = {
    title: 'CART/Bonus Product Selection',
    component: BonusProductSelection,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
A bonus product selection component that displays eligible bonus products in an accordion with a carousel. Users can select bonus products to add to their cart.

## Features

- **Accordion Interface**: Collapsible section for bonus products
- **Product Carousel**: Horizontal scrolling carousel of bonus products
- **Product Cards**: Individual cards showing product image, title, and "Free" badge
- **Select Button**: Action button to select a bonus product
- **Visual Feedback**: Clear indication of selected products

## Usage

The BonusProductSelection component is used in:
- Shopping cart pages
- Checkout flows
- Promotional sections
- Bundle product displays

\`\`\`tsx
import BonusProductSelection from '../bonus-product-selection';

function CartPage() {
  return (
    <div>
      <CartContent />
      <BonusProductSelection />
    </div>
  );
}
\`\`\`

## Structure

- **Accordion**: Collapsible container for bonus products
- **Carousel**: Horizontal scrolling product list
- **Product Cards**: Individual product displays with images
- **Select Buttons**: Action buttons for each product
- **Badge**: "Free" badge indicator

## Note

This component currently uses dev-only mocks for visual testing. In production, it should integrate with bonus product actions API/state.
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <BonusProductStoryHarness>
                <Story />
            </BonusProductStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `
The default BonusProductSelection shows all available bonus products:

### Features:
- **Accordion closed**: Initially collapsed state
- **Product carousel**: Horizontal scrolling list of products
- **Product cards**: Each product in its own card
- **Select buttons**: Action buttons for each product
- **Free badges**: "Free" badge on each product

### Use Cases:
- Cart page bonus product selection
- Promotional product offers
- Bundle product displays
- Free item promotions
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test accordion is present
        const accordion = await canvas.findByRole('button');
        await expect(accordion).toBeInTheDocument();

        // Test accordion can be toggled
        await userEvent.click(accordion);

        // Wait for accordion content to be visible
        const selectButtons = await canvas.findAllByRole('button', { name: /select/i });
        await expect(selectButtons.length).toBeGreaterThan(0);
    },
};

export const Expanded: Story = {
    parameters: {
        docs: {
            description: {
                story: `
BonusProductSelection with accordion expanded:

### Expanded Features:
- **Accordion open**: Shows all bonus products
- **Visible carousel**: Product carousel is visible
- **All products shown**: Multiple products in carousel
- **Interactive elements**: All buttons and cards are interactive

### Use Cases:
- Default expanded state
- Prominent bonus product display
- User-initiated expansion
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Expand accordion
        const accordion = await canvas.findByRole('button');
        await userEvent.click(accordion);

        // Test select buttons are present
        const selectButtons = await canvas.findAllByRole('button', { name: /select/i });
        await expect(selectButtons.length).toBeGreaterThan(0);

        // Test product cards are present
        const productCards = canvasElement.querySelectorAll('article[aria-label*="Bonus bundle product card"]');
        await expect(productCards.length).toBeGreaterThan(0);
    },
};

export const WithCarouselNavigation: Story = {
    parameters: {
        docs: {
            description: {
                story: `
BonusProductSelection demonstrating carousel navigation:

### Carousel Features:
- **Previous/Next buttons**: Navigation controls for carousel
- **Multiple products**: More products than visible at once
- **Smooth scrolling**: Horizontal scrolling through products
- **Product visibility**: Only some products visible at a time

### Use Cases:
- Many bonus products
- Horizontal scrolling
- Carousel navigation
- Product browsing
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Expand accordion
        const accordion = await canvas.findByRole('button');
        await userEvent.click(accordion);

        // Test carousel navigation buttons
        const prevButton = canvasElement.querySelector('button[aria-label*="Previous"]');
        const nextButton = canvasElement.querySelector('button[aria-label*="Next"]');

        if (prevButton) {
            await expect(prevButton).toBeInTheDocument();
        }
        if (nextButton) {
            await expect(nextButton).toBeInTheDocument();
        }
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test accordion is present
        const accordion = await canvas.findByRole('button');
        await expect(accordion).toBeInTheDocument();

        // Test accordion can be toggled
        await userEvent.click(accordion);

        // Wait for accordion content to be visible
        const selectButtons = await canvas.findAllByRole('button', { name: /select/i });
        await expect(selectButtons.length).toBeGreaterThan(0);
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test accordion is present
        const accordion = await canvas.findByRole('button');
        await expect(accordion).toBeInTheDocument();

        // Test accordion can be toggled
        await userEvent.click(accordion);

        // Wait for accordion content to be visible
        const selectButtons = await canvas.findAllByRole('button', { name: /select/i });
        await expect(selectButtons.length).toBeGreaterThan(0);
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test accordion is present
        const accordion = await canvas.findByRole('button');
        await expect(accordion).toBeInTheDocument();

        // Test accordion can be toggled
        await userEvent.click(accordion);

        // Wait for accordion content to be visible
        const selectButtons = await canvas.findAllByRole('button', { name: /select/i });
        await expect(selectButtons.length).toBeGreaterThan(0);
    },
};
