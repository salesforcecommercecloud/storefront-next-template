import type { Meta, StoryObj } from '@storybook/react-vite';
import { SelectNative } from '../select-native';
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

const meta: Meta<typeof SelectNative> = {
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    title: 'UI/SelectNative',
    component: SelectNative,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A native HTML select element with custom styling. Provides a simple dropdown for selecting options.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        disabled: {
            description: 'Whether the select is disabled',
            control: 'boolean',
        },
        multiple: {
            description: 'Whether multiple options can be selected',
            control: 'boolean',
        },
    },
};

export default meta;
type Story = StoryObj<typeof SelectNative>;

export const Default: Story = {
    render: () => (
        <div className="space-y-2 w-[200px]">
            <Label htmlFor="select">Choose an option</Label>
            <SelectNative id="select">
                <option value="">Select...</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
            </SelectNative>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const select = canvas.getByRole('combobox');
        await expect(select).toBeInTheDocument();

        await userEvent.selectOptions(select, 'option1');
        await expect(select).toHaveValue('option1');
    },
};

export const WithDefaultValue: Story = {
    render: () => (
        <div className="space-y-2 w-[200px]">
            <Label htmlFor="select-default">Choose an option</Label>
            <SelectNative id="select-default" defaultValue="option2">
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
            </SelectNative>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const select = canvas.getByRole('combobox');
        await expect(select).toHaveValue('option2');
    },
};

export const Multiple: Story = {
    render: () => (
        <div className="space-y-2 w-[200px]">
            <Label htmlFor="select-multiple">Choose multiple options</Label>
            <SelectNative id="select-multiple" multiple>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
                <option value="option4">Option 4</option>
            </SelectNative>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const select = canvas.getByRole('listbox');
        await expect(select).toBeInTheDocument();
    },
};

export const Disabled: Story = {
    render: () => (
        <div className="space-y-2 w-[200px]">
            <Label htmlFor="select-disabled">Disabled select</Label>
            <SelectNative id="select-disabled" disabled>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
            </SelectNative>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const select = canvas.getByRole('combobox');
        await expect(select).toBeDisabled();
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

        const select = canvas.getByRole('combobox');
        await expect(select).toBeInTheDocument();

        await userEvent.selectOptions(select, 'option1');
        await expect(select).toHaveValue('option1');
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

        const select = canvas.getByRole('combobox');
        await expect(select).toBeInTheDocument();

        await userEvent.selectOptions(select, 'option1');
        await expect(select).toHaveValue('option1');
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

        const select = canvas.getByRole('combobox');
        await expect(select).toBeInTheDocument();

        await userEvent.selectOptions(select, 'option1');
        await expect(select).toHaveValue('option1');
    },
};
