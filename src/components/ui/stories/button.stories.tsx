import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('button-click');
        const logHover = action('button-hover');
        const logFocus = action('button-focus');
        const logBlur = action('button-blur');
        const logKeyDown = action('button-keydown');

        const sanitizeLabel = (value: string | null | undefined): string => {
            if (!value) {
                return '';
            }
            return value.replace(/\s+/g, ' ').trim();
        };

        const findButton = (start: Element | null): HTMLButtonElement | null => {
            let node: Element | null = start;
            while (node) {
                if (node instanceof HTMLButtonElement) {
                    return node;
                }
                node = node.parentElement;
            }
            return null;
        };

        const isSyntheticEvent = (event: Event): boolean => event.isTrusted === false;

        const handleClick = (event: MouseEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target as Element | null;
            const button = findButton(target);
            if (!button) {
                return;
            }

            const label = sanitizeLabel(button.textContent);
            logClick({ label });
        };

        const handlePointerOver = (event: PointerEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target as Element | null;
            const button = findButton(target);
            if (!button) {
                return;
            }

            const label = sanitizeLabel(button.textContent);
            logHover({ label });
        };

        const handleFocus = (event: FocusEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target as Element | null;
            const button = findButton(target);
            if (!button) {
                return;
            }

            const label = sanitizeLabel(button.textContent);
            logFocus({ label });
        };

        const handleBlur = (event: FocusEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target as Element | null;
            const button = findButton(target);
            if (!button) {
                return;
            }

            const label = sanitizeLabel(button.textContent);
            logBlur({ label });
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target as Element | null;
            const button = findButton(target);
            if (!button) {
                return;
            }

            const label = sanitizeLabel(button.textContent);
            logKeyDown({ label });
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('focusin', handleFocus, true);
        root.addEventListener('focusout', handleBlur, true);
        root.addEventListener('keydown', handleKeyDown, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('focusin', handleFocus, true);
            root.removeEventListener('focusout', handleBlur, true);
            root.removeEventListener('keydown', handleKeyDown, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    args: {},
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A versatile button component with multiple variants, sizes, and states. Built with Radix UI Slot for composition and class-variance-authority for styling variants.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        variant: {
            description: 'Visual style variant of the button',
            control: 'select',
            options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        },
        size: {
            description: 'Size of the button',
            control: 'select',
            options: ['default', 'sm', 'lg', 'icon'],
        },
        asChild: {
            description: 'Render as a child component using Radix UI Slot',
            control: 'boolean',
        },
        disabled: {
            description: 'Whether the button is disabled',
            control: 'boolean',
        },
        onClick: {
            description: 'Click handler function',
            table: { disable: true },
        },
        onMouseEnter: {
            description: 'Mouse enter handler function',
            table: { disable: true },
        },
        onMouseLeave: {
            description: 'Mouse leave handler function',
            table: { disable: true },
        },
        onFocus: {
            description: 'Focus handler function',
            table: { disable: true },
        },
        onBlur: {
            description: 'Blur handler function',
            table: { disable: true },
        },
        onKeyDown: {
            description: 'Key down handler function',
            table: { disable: true },
        },
        onMouseDown: {
            description: 'Mouse down handler function',
            table: { disable: true },
        },
        onMouseUp: {
            description: 'Mouse up handler function',
            table: { disable: true },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: {
        children: 'Button',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: /button/i });

        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        void expect(button).toHaveTextContent('Button');
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const Destructive: Story = {
    args: {
        children: 'Delete',
        variant: 'destructive',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Delete' });
        await userEvent.hover(button);
        await userEvent.click(button);
    },
};

export const Outline: Story = {
    args: {
        children: 'Outline Button',
        variant: 'outline',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Outline Button' });
        await userEvent.click(button);
    },
};

export const Secondary: Story = {
    args: {
        children: 'Secondary',
        variant: 'secondary',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Secondary' });
        await userEvent.click(button);
    },
};

export const Ghost: Story = {
    args: {
        children: 'Ghost Button',
        variant: 'ghost',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Ghost Button' });
        await userEvent.hover(button);
        await userEvent.click(button);
    },
};

export const Link: Story = {
    args: {
        children: 'Link Button',
        variant: 'link',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Link Button' });
        await userEvent.click(button);
    },
};

export const Small: Story = {
    args: {
        children: 'Small Button',
        size: 'sm',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Small Button' });
        await userEvent.click(button);
    },
};

export const Large: Story = {
    args: {
        children: 'Large Button',
        size: 'lg',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Large Button' });
        await userEvent.click(button);
    },
};

export const IconButton: Story = {
    args: {
        size: 'icon',
        children: '★',
        'aria-label': 'Favorite',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Favorite' });
        await userEvent.click(button);
    },
};

export const Disabled: Story = {
    args: {
        children: 'Disabled Button',
        disabled: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Disabled Button' });
        void expect(button).toBeDisabled();
    },
};

export const AsChildLink: Story = {
    render: (props) => (
        <Button asChild {...props}>
            <a href="/products" onClick={(event) => event.preventDefault()}>
                Browse Products
            </a>
        </Button>
    ),
    args: {
        variant: 'link',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const linkButton = canvas.getByRole('link', { name: 'Browse Products' });
        await userEvent.hover(linkButton);
        await userEvent.click(linkButton);
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: /button/i });

        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        void expect(button).toHaveTextContent('Button');
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: /button/i });

        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        void expect(button).toHaveTextContent('Button');
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: /button/i });

        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        void expect(button).toHaveTextContent('Button');
        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};
