import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { Typography } from '../index';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logCopy = action('typography-copy');
        const logHover = action('typography-hover');
        const logClick = action('typography-click');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const typographyElement = target.closest('[data-typography]');
            if (typographyElement) {
                const text = target.textContent?.trim() || '';
                logClick({ text });
            }
        };

        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const typographyElement = target.closest('[data-typography]');
            if (typographyElement) {
                const variant = (typographyElement as HTMLElement).getAttribute('data-typography') || '';
                logHover({ variant });
            }
        };

        const handleCopy = () => {
            const selection = window.getSelection()?.toString() || '';
            if (selection) logCopy({ selection });
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('copy', handleCopy, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('mouseover', handleMouseOver, true);
            document.removeEventListener('copy', handleCopy, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Typography> = {
    title: 'UI/Typography',
    component: Typography,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A comprehensive typography component with multiple variants for headings, body text, and product-specific text styles. Supports semantic HTML elements and custom styling.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        variant: {
            description: 'Typography variant style',
            control: 'select',
            options: [
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'p',
                'blockquote',
                'inline-code',
                'lead',
                'large',
                'small',
                'muted',
                'product-title',
                'product-price',
                'product-description',
            ],
        },
        align: {
            description: 'Text alignment',
            control: 'select',
            options: ['left', 'center', 'right'],
        },
        as: {
            description: 'HTML element to render as',
            control: 'select',
            options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'blockquote', 'code'],
        },
        asChild: {
            description: 'Render as child component using Slot',
            control: 'boolean',
        },
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
        children: {
            description: 'Text content',
            control: 'text',
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <div data-typography="root">
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Typography>;

export const Heading1: Story = {
    args: {
        variant: 'h1',
        children: 'Heading 1 - Main Title',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const heading = canvas.getByRole('heading', { level: 1 });
        await expect(heading).toHaveTextContent('Heading 1 - Main Title');
    },
};

export const Heading2: Story = {
    args: {
        variant: 'h2',
        children: 'Heading 2 - Section Title',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const heading = within(canvasElement).getByRole('heading', { level: 2 });
        await expect(heading).toHaveTextContent('Heading 2 - Section Title');
    },
};

export const Heading3: Story = {
    args: {
        variant: 'h3',
        children: 'Heading 3 - Subsection Title',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const heading = within(canvasElement).getByRole('heading', { level: 3 });
        await expect(heading).toHaveTextContent('Heading 3 - Subsection Title');
    },
};

export const Heading4: Story = {
    args: {
        variant: 'h4',
        children: 'Heading 4 - Minor Title',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const heading = within(canvasElement).getByRole('heading', { level: 4 });
        await expect(heading).toHaveTextContent('Heading 4 - Minor Title');
    },
};

export const Heading5: Story = {
    args: {
        variant: 'h5',
        children: 'Heading 5 - Small Title',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const heading = within(canvasElement).getByRole('heading', { level: 5 });
        await expect(heading).toHaveTextContent('Heading 5 - Small Title');
    },
};

export const Heading6: Story = {
    args: {
        variant: 'h6',
        children: 'Heading 6 - Smallest Title',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const heading = within(canvasElement).getByRole('heading', { level: 6 });
        await expect(heading).toHaveTextContent('Heading 6 - Smallest Title');
    },
};

export const Paragraph: Story = {
    args: {
        variant: 'p',
        children:
            'This is a paragraph with regular text. It demonstrates the default paragraph styling with proper line height and spacing.',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const paragraph = within(canvasElement).getByText(/regular text/i);
        await expect(paragraph).toBeInTheDocument();
        void expect(paragraph.tagName.toLowerCase()).toBe('p');
    },
};

export const Lead: Story = {
    args: {
        variant: 'lead',
        children:
            'This is a lead paragraph that stands out with larger text and muted color to introduce important content.',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const lead = within(canvasElement).getByText(/lead paragraph/i);
        await expect(lead.className).toContain('text-xl');
    },
};

export const Large: Story = {
    args: {
        variant: 'large',
        children: 'Large text for emphasis',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const large = within(canvasElement).getByText('Large text for emphasis');
        await expect(large).toHaveClass('text-lg', { exact: false });
    },
};

export const Small: Story = {
    args: {
        variant: 'small',
        children: 'Small text for captions and labels',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const small = within(canvasElement).getByText('Small text for captions and labels');
        await expect(small).toHaveClass('text-sm', { exact: false });
    },
};

export const Muted: Story = {
    args: {
        variant: 'muted',
        children: 'Muted text for secondary information',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const muted = within(canvasElement).getByText('Muted text for secondary information');
        await expect(muted).toHaveClass('text-muted-foreground', { exact: false });
    },
};

export const Blockquote: Story = {
    args: {
        variant: 'blockquote',
        children: 'This is a blockquote that highlights important text with special styling and indentation.',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const blockquote = within(canvasElement).getByText(/blockquote/i);
        await expect(blockquote).toBeInTheDocument();
        void expect(blockquote.tagName.toLowerCase()).toBe('blockquote');
    },
};

export const InlineCode: Story = {
    args: {
        variant: 'inline-code',
        children: 'const example = "inline code";',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const code = within(canvasElement).getByText(/inline code/);
        await expect(code).toBeInTheDocument();
        void expect(code.tagName.toLowerCase()).toBe('code');
    },
};

export const ProductTitle: Story = {
    args: {
        variant: 'product-title',
        children: 'Premium Cotton T-Shirt',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const text = within(canvasElement).getByText('Premium Cotton T-Shirt');
        await expect(text).toHaveClass('text-lg', { exact: false });
    },
};

export const ProductPrice: Story = {
    args: {
        variant: 'product-price',
        children: '$29.99',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const price = within(canvasElement).getByText('$29.99');
        await expect(price).toHaveClass('text-base', { exact: false });
    },
};

export const ProductDescription: Story = {
    args: {
        variant: 'product-description',
        children:
            'Made from 100% organic cotton, this comfortable t-shirt features a classic fit and is perfect for everyday wear.',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const description = within(canvasElement).getByText(/comfortable t-shirt/i);
        await expect(description).toHaveClass('leading-relaxed', { exact: false });
    },
};

export const CenterAligned: Story = {
    args: {
        variant: 'h2',
        align: 'center',
        children: 'Center Aligned Heading',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const heading = within(canvasElement).getByText('Center Aligned Heading');
        await expect(heading).toHaveClass('text-center', { exact: false });
    },
};

export const RightAligned: Story = {
    args: {
        variant: 'p',
        align: 'right',
        children: 'Right aligned paragraph text',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const para = within(canvasElement).getByText('Right aligned paragraph text');
        await expect(para).toHaveClass('text-right', { exact: false });
    },
};

export const CustomElement: Story = {
    args: {
        variant: 'h3',
        as: 'div',
        children: 'H3 variant rendered as div element',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const element = within(canvasElement).getByText('H3 variant rendered as div element');
        await expect(element).toBeInTheDocument();
        void expect(element.tagName.toLowerCase()).toBe('div');
    },
};

export const CustomStyling: Story = {
    args: {
        variant: 'h2',
        children: 'Custom Styled Heading',
        className: 'text-primary bg-primary/10 p-4 rounded-lg',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const heading = canvas.getByText('Custom Styled Heading');
        await expect(heading).toHaveClass('text-primary', { exact: false });
    },
};

export const AsChildButton: Story = {
    render: () => (
        <Typography variant="h4" asChild>
            <button
                type="button"
                className="px-4 py-2 bg-primary text-primary-foreground rounded"
                data-testid="typography-button">
                Typography Button
            </button>
        </Typography>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByTestId('typography-button');
        void expect(button.tagName.toLowerCase()).toBe('button');
        await expect(button).toHaveTextContent('Typography Button');
    },
};

export const AsChildLink: Story = {
    render: () => (
        <Typography variant="lead" asChild>
            <a href="#" className="underline text-primary" data-testid="typography-link">
                Typography Link
            </a>
        </Typography>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const link = within(canvasElement).getByTestId('typography-link');
        await expect(link).toBeInTheDocument();
        void expect(link.tagName.toLowerCase()).toBe('a');
    },
};

export const TypographyShowcase: Story = {
    render: () => (
        <div className="space-y-6" data-typography="showcase">
            <Typography variant="h1" data-typography="h1">
                Typography Showcase
            </Typography>
            <Typography variant="h2" data-typography="h2">
                Typography Showcase
            </Typography>
            <Typography variant="h3" data-typography="h3">
                Typography Showcase
            </Typography>
            <Typography variant="h4" data-typography="h4">
                Typography Showcase
            </Typography>
            <Typography variant="h5" data-typography="h5">
                Typography Showcase
            </Typography>
            <Typography variant="h6" data-typography="h6">
                Typography Showcase
            </Typography>
            <Typography variant="p" data-typography="p">
                Typography Showcase
            </Typography>
            <Typography variant="blockquote" data-typography="blockquote">
                Typography Showcase
            </Typography>
            <Typography variant="inline-code" data-typography="inline-code">
                Typography Showcase
            </Typography>
            <Typography variant="lead" data-typography="lead">
                Typography Showcase
            </Typography>
            <Typography variant="large" data-typography="large">
                Typography Showcase
            </Typography>
            <Typography variant="small" data-typography="small">
                Typography Showcase
            </Typography>
            <Typography variant="muted" data-typography="muted">
                Typography Showcase
            </Typography>
            <Typography variant="product-title" data-typography="product-title">
                Typography Showcase
            </Typography>
            <Typography variant="product-price" data-typography="product-price">
                Typography Showcase
            </Typography>
            <Typography variant="product-description" data-typography="product-description">
                Typography Showcase
            </Typography>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Multiple elements have "Typography Showcase" text
        const allShowcaseElements = canvas.getAllByText('Typography Showcase');
        await expect(allShowcaseElements.length).toBeGreaterThan(0);

        // Verify specific variants exist using data-typography attributes
        const h1Element = canvasElement.querySelector('[data-typography="h1"]');
        const h2Element = canvasElement.querySelector('[data-typography="h2"]');
        const pElement = canvasElement.querySelector('[data-typography="p"]');
        const inlineCodeElement = canvasElement.querySelector('[data-typography="inline-code"]');

        void expect(h1Element).toBeInTheDocument();
        void expect(h2Element).toBeInTheDocument();
        void expect(pElement).toBeInTheDocument();
        void expect(inlineCodeElement).toBeInTheDocument();

        const showcaseContainer = canvasElement.querySelector('[data-typography="showcase"]');
        void expect(showcaseContainer).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Heading1,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const heading = canvas.getByRole('heading', { level: 1 });
        await expect(heading).toHaveTextContent('Heading 1 - Main Title');
    },
};

export const Tablet: Story = {
    ...Heading1,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const heading = canvas.getByRole('heading', { level: 1 });
        await expect(heading).toHaveTextContent('Heading 1 - Main Title');
    },
};

export const Desktop: Story = {
    ...Heading1,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const heading = canvas.getByRole('heading', { level: 1 });
        await expect(heading).toHaveTextContent('Heading 1 - Main Title');
    },
};
