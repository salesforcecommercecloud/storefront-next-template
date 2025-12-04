import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '../label';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('interaction');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            // Try to find a meaningful element to log
            const element = target.closest('button, a, input, select, [role="button"]');

            if (element) {
                const label =
                    element.textContent?.trim() || element.getAttribute('aria-label') || element.tagName.toLowerCase();
                logClick({ type: 'click', element: element.tagName.toLowerCase(), label });
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const element = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const label =
                element.name || element.id || element.getAttribute('aria-label') || element.tagName.toLowerCase();
            logClick({ type: 'change', element: element.tagName.toLowerCase(), label, value: element.value });
        };

        root.addEventListener('click', handleClick);
        root.addEventListener('change', handleChange);

        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('change', handleChange);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Label> = {
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    title: 'UI/Label',
    component: Label,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Renders an accessible label associated with controls. Built with Radix UI Label primitives for proper accessibility.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        htmlFor: {
            description: 'Associates the label with a form control',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
    render: () => <Label>Email</Label>,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const label = canvas.getByText('Email');
        await expect(label).toBeInTheDocument();
    },
};

export const WithInput: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <input id="email" type="email" placeholder="Enter your email" className="border rounded px-3 py-2" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const label = canvas.getByText('Email');
        await expect(label).toBeInTheDocument();

        const input = canvas.getByLabelText('Email');
        await expect(input).toBeInTheDocument();
    },
};

export const WithCheckbox: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <input type="checkbox" id="terms" />
            <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const label = canvas.getByText('Accept terms and conditions');
        await expect(label).toBeInTheDocument();
    },
};

export const Required: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
            </Label>
            <input id="name" type="text" placeholder="Enter your name" className="border rounded px-3 py-2" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const label = canvas.getByText(/name/i);
        await expect(label).toBeInTheDocument();
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
        const label = canvas.getByText('Email');
        await expect(label).toBeInTheDocument();
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
        const label = canvas.getByText('Email');
        await expect(label).toBeInTheDocument();
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
        const label = canvas.getByText('Email');
        await expect(label).toBeInTheDocument();
    },
};
