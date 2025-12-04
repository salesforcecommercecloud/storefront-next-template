import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
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

const meta: Meta<typeof Popover> = {
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    title: 'UI/Popover',
    component: Popover,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Displays rich content in a portal, triggered by a button. Built with Radix UI Popover primitives.',
            },
        },
        a11y: {
            config: {
                rules: [
                    // Radix UI intentionally sets aria-hidden="true" on #storybook-root when popover opens
                    // This is correct accessibility behavior for modal focus trapping
                    { id: 'aria-hidden-focus', enabled: false },
                ],
            },
        },
    },
    tags: ['autodocs', 'interaction'],
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Dimensions settings">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">Dimensions</h4>
                    {/* Use text-foreground/80 for better contrast */}
                    <p className="text-sm text-foreground/80">Set the dimensions for the layer.</p>
                </div>
            </PopoverContent>
        </Popover>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /open popover/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const heading = await documentBody.findByText('Dimensions', {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();
    },
};
export const Simple: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button>Click me</Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Information">
                <p>This is a simple popover with just text content.</p>
            </PopoverContent>
        </Popover>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /click me/i });
        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const content = await documentBody.findByText(/this is a simple popover/i, {}, { timeout: 5000 });
        await expect(content).toBeInTheDocument();
    },
};

export const WithForm: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">Open Form</Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Settings form">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="font-medium">Settings</h4>
                        {/* Use text-foreground/80 for better contrast */}
                        <p className="text-sm text-foreground/80">Configure your preferences.</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="width-input" className="text-sm font-medium">
                            Width
                        </label>
                        <input
                            id="width-input"
                            type="number"
                            placeholder="100"
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="height-input" className="text-sm font-medium">
                            Height
                        </label>
                        <input
                            id="height-input"
                            type="number"
                            placeholder="100"
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                    <Button className="w-full">Apply</Button>
                </div>
            </PopoverContent>
        </Popover>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /open form/i });
        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const heading = await documentBody.findByText('Settings', {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /open popover/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const heading = await documentBody.findByText('Dimensions', {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /open popover/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const heading = await documentBody.findByText('Dimensions', {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /open popover/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const heading = await documentBody.findByText('Dimensions', {}, { timeout: 5000 });
        await expect(heading).toBeInTheDocument();
    },
};
