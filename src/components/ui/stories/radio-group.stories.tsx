import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from '../radio-group';
import { Label } from '../label';
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

const meta: Meta<typeof RadioGroup> = {
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    title: 'UI/RadioGroup',
    component: RadioGroup,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time. Built with Radix UI Radio Group primitives.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        defaultValue: {
            description: 'Default selected value',
            control: 'text',
        },
        disabled: {
            description: 'Whether the radio group is disabled',
            control: 'boolean',
        },
    },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
    render: () => (
        <RadioGroup defaultValue="option-one">
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-one" id="option-one" />
                <Label htmlFor="option-one">Option One</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-two" id="option-two" />
                <Label htmlFor="option-two">Option Two</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-three" id="option-three" />
                <Label htmlFor="option-three">Option Three</Label>
            </div>
        </RadioGroup>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const option1 = canvas.getByRole('radio', { name: /option one/i });
        await expect(option1).toBeChecked();

        const option2 = canvas.getByRole('radio', { name: /option two/i });
        await userEvent.click(option2);
        await expect(option2).toBeChecked();
    },
};

export const Horizontal: Story = {
    render: () => (
        <RadioGroup defaultValue="small" className="flex gap-6">
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="small" />
                <Label htmlFor="small">Small</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="large" />
                <Label htmlFor="large">Large</Label>
            </div>
        </RadioGroup>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const small = canvas.getByRole('radio', { name: /small/i });
        await expect(small).toBeChecked();
    },
};

export const Disabled: Story = {
    render: () => (
        <RadioGroup defaultValue="option-one" disabled>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-one" id="disabled-one" />
                <Label htmlFor="disabled-one">Option One</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-two" id="disabled-two" />
                <Label htmlFor="disabled-two">Option Two</Label>
            </div>
        </RadioGroup>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const option1 = canvas.getByRole('radio', { name: /option one/i });
        await expect(option1).toBeDisabled();
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

        const option1 = canvas.getByRole('radio', { name: /option one/i });
        await expect(option1).toBeChecked();

        const option2 = canvas.getByRole('radio', { name: /option two/i });
        await userEvent.click(option2);
        await expect(option2).toBeChecked();
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

        const option1 = canvas.getByRole('radio', { name: /option one/i });
        await expect(option1).toBeChecked();

        const option2 = canvas.getByRole('radio', { name: /option two/i });
        await userEvent.click(option2);
        await expect(option2).toBeChecked();
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

        const option1 = canvas.getByRole('radio', { name: /option one/i });
        await expect(option1).toBeChecked();

        const option2 = canvas.getByRole('radio', { name: /option two/i });
        await userEvent.click(option2);
        await expect(option2).toBeChecked();
    },
};
