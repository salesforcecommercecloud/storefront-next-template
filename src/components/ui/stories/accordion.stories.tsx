import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../accordion';
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

const meta: Meta<typeof Accordion> = {
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    title: 'UI/Accordion',
    component: Accordion,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A vertically stacked set of interactive headings that each reveal a section of content. Built with Radix UI Accordion primitives.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        type: {
            description: 'Type of accordion behavior',
            control: 'select',
            options: ['single', 'multiple'],
        },
        collapsible: {
            description: 'Whether the accordion can collapse all items',
            control: 'boolean',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
    render: () => (
        <Accordion type="single" collapsible className="w-[400px]">
            <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern and uses Radix UI primitives for accessibility.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                    Yes. It comes with default styles that match the other components aesthetic, but it&apos;s
                    customizable.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>Yes. It uses CSS animations for smooth open and close transitions.</AccordionContent>
            </AccordionItem>
        </Accordion>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger1 = canvas.getByRole('button', { name: /is it accessible/i });
        await expect(trigger1).toBeInTheDocument();

        await userEvent.click(trigger1);
        const content1 = await canvas.findByText(/yes. it adheres to the wai-aria/i, {}, { timeout: 5000 });
        await expect(content1).toBeInTheDocument();
    },
};

export const Multiple: Story = {
    render: () => (
        <Accordion type="multiple" className="w-[400px]">
            <AccordionItem value="item-1">
                <AccordionTrigger>Section 1</AccordionTrigger>
                <AccordionContent>Content for section 1</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                <AccordionTrigger>Section 2</AccordionTrigger>
                <AccordionContent>Content for section 2</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
                <AccordionTrigger>Section 3</AccordionTrigger>
                <AccordionContent>Content for section 3</AccordionContent>
            </AccordionItem>
        </Accordion>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger1 = canvas.getByRole('button', { name: /section 1/i });
        const trigger2 = canvas.getByRole('button', { name: /section 2/i });

        await userEvent.click(trigger1);
        await userEvent.click(trigger2);

        const content1 = await canvas.findByText(/content for section 1/i, {}, { timeout: 5000 });
        const content2 = await canvas.findByText(/content for section 2/i, {}, { timeout: 5000 });
        await expect(content1).toBeInTheDocument();
        await expect(content2).toBeInTheDocument();
    },
};

export const SingleItem: Story = {
    render: () => (
        <Accordion type="single" collapsible className="w-[400px]">
            <AccordionItem value="item-1">
                <AccordionTrigger>Single Item Accordion</AccordionTrigger>
                <AccordionContent>
                    This accordion contains only one item. It can be expanded and collapsed.
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /single item accordion/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);
        const content = await canvas.findByText(/this accordion contains only one item/i, {}, { timeout: 5000 });
        await expect(content).toBeInTheDocument();
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

        const trigger1 = canvas.getByRole('button', { name: /is it accessible/i });
        await expect(trigger1).toBeInTheDocument();

        await userEvent.click(trigger1);
        const content1 = await canvas.findByText(/yes. it adheres to the wai-aria/i, {}, { timeout: 5000 });
        await expect(content1).toBeInTheDocument();
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

        const trigger1 = canvas.getByRole('button', { name: /is it accessible/i });
        await expect(trigger1).toBeInTheDocument();

        await userEvent.click(trigger1);
        const content1 = await canvas.findByText(/yes. it adheres to the wai-aria/i, {}, { timeout: 5000 });
        await expect(content1).toBeInTheDocument();
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

        const trigger1 = canvas.getByRole('button', { name: /is it accessible/i });
        await expect(trigger1).toBeInTheDocument();

        await userEvent.click(trigger1);
        const content1 = await canvas.findByText(/yes. it adheres to the wai-aria/i, {}, { timeout: 5000 });
        await expect(content1).toBeInTheDocument();
    },
};
