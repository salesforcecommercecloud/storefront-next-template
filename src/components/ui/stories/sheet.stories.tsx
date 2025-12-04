import type { Meta, StoryObj } from '@storybook/react-vite';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '../sheet';
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

const meta: Meta<typeof Sheet> = {
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    title: 'UI/Sheet',
    component: Sheet,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A sheet component that slides in from the edge of the screen. Built with Radix UI Dialog primitives. Supports multiple sides (top, right, bottom, left).',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
    render: () => (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline">Open Sheet</Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Edit Profile</SheetTitle>
                    <SheetDescription>
                        Make changes to your profile here. Click save when you&apos;re done.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Name</label>
                        <input type="text" placeholder="John Doe" className="border rounded px-3 py-2" />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Email</label>
                        <input type="email" placeholder="john@example.com" className="border rounded px-3 py-2" />
                    </div>
                </div>
                <SheetFooter>
                    <SheetClose asChild>
                        <Button type="submit">Save changes</Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /open sheet/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const title = await documentBody.findByText(/edit profile/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const Left: Story = {
    render: () => (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline">Open Left Sheet</Button>
            </SheetTrigger>
            <SheetContent side="left">
                <SheetHeader>
                    <SheetTitle>Sidebar</SheetTitle>
                    <SheetDescription>This sheet slides in from the left side.</SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <p>Content goes here.</p>
                </div>
            </SheetContent>
        </Sheet>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /open left sheet/i });
        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const title = await documentBody.findByText(/sidebar/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const Top: Story = {
    render: () => (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline">Open Top Sheet</Button>
            </SheetTrigger>
            <SheetContent side="top">
                <SheetHeader>
                    <SheetTitle>Top Sheet</SheetTitle>
                    <SheetDescription>This sheet slides in from the top.</SheetDescription>
                </SheetHeader>
            </SheetContent>
        </Sheet>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /open top sheet/i });
        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const title = await documentBody.findByRole('heading', { name: /top sheet/i }, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const Bottom: Story = {
    render: () => (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline">Open Bottom Sheet</Button>
            </SheetTrigger>
            <SheetContent side="bottom">
                <SheetHeader>
                    <SheetTitle>Bottom Sheet</SheetTitle>
                    <SheetDescription>This sheet slides in from the bottom.</SheetDescription>
                </SheetHeader>
            </SheetContent>
        </Sheet>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const trigger = canvas.getByRole('button', { name: /open bottom sheet/i });
        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const title = await documentBody.findByRole('heading', { name: /bottom sheet/i }, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /open sheet/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const title = await documentBody.findByText(/edit profile/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /open sheet/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const title = await documentBody.findByText(/edit profile/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
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

        const trigger = canvas.getByRole('button', { name: /open sheet/i });
        await expect(trigger).toBeInTheDocument();

        await userEvent.click(trigger);

        const documentBody = within(document.body);
        const title = await documentBody.findByText(/edit profile/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};
