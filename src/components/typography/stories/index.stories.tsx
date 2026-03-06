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

/**
 * All heading and text variants in one composite
 */
export const AllVariants: Story = {
    render: () => (
        <div className="space-y-6" data-typography="showcase">
            <Typography variant="h1" data-typography="h1">
                Heading 1
            </Typography>
            <Typography variant="h2" data-typography="h2">
                Heading 2
            </Typography>
            <Typography variant="h3" data-typography="h3">
                Heading 3
            </Typography>
            <Typography variant="h4" data-typography="h4">
                Heading 4
            </Typography>
            <Typography variant="h5" data-typography="h5">
                Heading 5
            </Typography>
            <Typography variant="h6" data-typography="h6">
                Heading 6
            </Typography>
            <Typography variant="p" data-typography="p">
                Paragraph text with regular styling.
            </Typography>
            <Typography variant="lead" data-typography="lead">
                Lead paragraph with larger text.
            </Typography>
            <Typography variant="large" data-typography="large">
                Large text
            </Typography>
            <Typography variant="small" data-typography="small">
                Small text
            </Typography>
            <Typography variant="muted" data-typography="muted">
                Muted text
            </Typography>
            <Typography variant="blockquote" data-typography="blockquote">
                Blockquote
            </Typography>
            <Typography variant="inline-code" data-typography="inline-code">
                inline code
            </Typography>
            <Typography variant="product-title" data-typography="product-title">
                Product Title
            </Typography>
            <Typography variant="product-price" data-typography="product-price">
                $29.99
            </Typography>
            <Typography variant="product-description" data-typography="product-description">
                Product description text
            </Typography>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'All typography variants: headings h1-h6, paragraph, lead, large, small, muted, blockquote, inline-code, and product variants.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const h1 = canvasElement.querySelector('[data-typography="h1"]');
        const p = canvasElement.querySelector('[data-typography="p"]');
        await expect(h1).toBeInTheDocument();
        await expect(p).toBeInTheDocument();
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
