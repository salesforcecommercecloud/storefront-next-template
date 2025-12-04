import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';
import { Button } from '../button';
import { expect, within, userEvent } from 'storybook/test';
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

const meta: Meta<typeof Tooltip> = {
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    title: 'UI/Tooltip',
    component: Tooltip,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it. Built with Radix UI Tooltip primitives.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
    render: () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>This is a tooltip</p>
            </TooltipContent>
        </Tooltip>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /hover me/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.hover(trigger);

        const documentBody = within(document.body);
        const tooltips = await documentBody.findAllByText('This is a tooltip', {}, { timeout: 5000 });
        await expect(tooltips.length).toBeGreaterThan(0);
        await expect(tooltips[0]).toBeInTheDocument();
    },
};

export const WithoutArrow: Story = {
    render: () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent showArrow={false}>
                <p>Tooltip without arrow</p>
            </TooltipContent>
        </Tooltip>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /hover me/i });
        await userEvent.hover(trigger);

        const documentBody = within(document.body);
        const tooltips = await documentBody.findAllByText('Tooltip without arrow', {}, { timeout: 5000 });
        await expect(tooltips.length).toBeGreaterThan(0);
        await expect(tooltips[0]).toBeInTheDocument();
    },
};

export const WithProvider: Story = {
    render: () => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button>Hover</Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Tooltip with custom provider</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /hover/i });
        await userEvent.hover(trigger);

        const documentBody = within(document.body);
        const tooltips = await documentBody.findAllByText('Tooltip with custom provider', {}, { timeout: 5000 });
        await expect(tooltips.length).toBeGreaterThan(0);
        await expect(tooltips[0]).toBeInTheDocument();
    },
};

export const Multiple: Story = {
    render: () => (
        <div className="flex gap-4">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Button 1</Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Tooltip for button 1</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Button 2</Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Tooltip for button 2</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Button 3</Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Tooltip for button 3</p>
                </TooltipContent>
            </Tooltip>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const button1 = canvas.getByRole('button', { name: /button 1/i });
        await userEvent.hover(button1);

        const documentBody = within(document.body);
        const tooltips = await documentBody.findAllByText('Tooltip for button 1', {}, { timeout: 5000 });
        await expect(tooltips.length).toBeGreaterThan(0);
        await expect(tooltips[0]).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /hover me/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.hover(trigger);

        const documentBody = within(document.body);
        const tooltips = await documentBody.findAllByText('This is a tooltip', {}, { timeout: 5000 });
        await expect(tooltips.length).toBeGreaterThan(0);
        await expect(tooltips[0]).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /hover me/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.hover(trigger);

        const documentBody = within(document.body);
        const tooltips = await documentBody.findAllByText('This is a tooltip', {}, { timeout: 5000 });
        await expect(tooltips.length).toBeGreaterThan(0);
        await expect(tooltips[0]).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /hover me/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.hover(trigger);

        const documentBody = within(document.body);
        const tooltips = await documentBody.findAllByText('This is a tooltip', {}, { timeout: 5000 });
        await expect(tooltips.length).toBeGreaterThan(0);
        await expect(tooltips[0]).toBeInTheDocument();
    },
};
