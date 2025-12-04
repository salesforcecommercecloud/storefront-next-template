import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioCard, RadioCardGroup } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function RadioCardStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('radio-card-click');
        const logChange = action('radio-card-change');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const label = target.closest('label');
            if (label) {
                const input = label.querySelector('input[type="radio"]') as HTMLInputElement;
                if (input) {
                    logClick({ value: input.value });
                    logChange({ value: input.value });
                }
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof RadioCardGroup> = {
    title: 'COMMON/Radio Card',
    component: RadioCardGroup,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A radio card component group that provides a card-based selection interface for radio buttons.

### Features:
- Card-based radio selection
- Visual check indicator
- Horizontal and vertical orientations
- Disabled state support
- Keyboard navigation
                `,
            },
        },
        a11y: {
            config: {
                rules: [
                    // In isolated Storybook context, heading hierarchy is incomplete
                    // Real page provides proper h1/h2 context from page layout
                    { id: 'heading-order', enabled: false },
                ],
            },
        },
    },
    decorators: [
        (Story) => (
            <RadioCardStoryHarness>
                <Story />
            </RadioCardStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof RadioCardGroup>;

export const Default: Story = {
    render: () => (
        <RadioCardGroup defaultValue="option1">
            <RadioCard value="option1">
                <div>
                    <h3 className="font-semibold">Option 1</h3>
                    {/* Use text-foreground/80 for better contrast on selected (blue) background */}
                    <p className="text-sm text-foreground/80">This is the first option</p>
                </div>
            </RadioCard>
            <RadioCard value="option2">
                <div>
                    <h3 className="font-semibold">Option 2</h3>
                    <p className="text-sm text-foreground/80">This is the second option</p>
                </div>
            </RadioCard>
            <RadioCard value="option3">
                <div>
                    <h3 className="font-semibold">Option 3</h3>
                    <p className="text-sm text-foreground/80">This is the third option</p>
                </div>
            </RadioCard>
        </RadioCardGroup>
    ),
    parameters: {
        docs: {
            story: `
Standard radio card group with vertical orientation.

### Features:
- 3 options
- First option selected by default
- Vertical layout
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for option 1
        const option1 = await canvas.findByText(/option 1/i, {}, { timeout: 5000 });
        await expect(option1).toBeInTheDocument();
    },
};

export const Horizontal: Story = {
    render: () => (
        <RadioCardGroup defaultValue="option1" orientation="horizontal">
            <RadioCard value="option1">
                <div>
                    <h3 className="font-semibold">Option 1</h3>
                </div>
            </RadioCard>
            <RadioCard value="option2">
                <div>
                    <h3 className="font-semibold">Option 2</h3>
                </div>
            </RadioCard>
            <RadioCard value="option3">
                <div>
                    <h3 className="font-semibold">Option 3</h3>
                </div>
            </RadioCard>
        </RadioCardGroup>
    ),
    parameters: {
        docs: {
            story: `
Radio card group with horizontal orientation.

### Features:
- Horizontal layout
- Side-by-side cards
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for option 1
        const option1 = await canvas.findByText(/option 1/i, {}, { timeout: 5000 });
        await expect(option1).toBeInTheDocument();
    },
};

export const WithDisabled: Story = {
    render: () => (
        <RadioCardGroup defaultValue="option1">
            <RadioCard value="option1">
                <div>
                    <h3 className="font-semibold">Option 1</h3>
                    {/* Use text-foreground/80 for better contrast on selected (blue) background */}
                    <p className="text-sm text-foreground/80">Available</p>
                </div>
            </RadioCard>
            <RadioCard value="option2" disabled>
                <div>
                    <h3 className="font-semibold">Option 2</h3>
                    <p className="text-sm text-foreground/80">Unavailable</p>
                </div>
            </RadioCard>
            <RadioCard value="option3">
                <div>
                    <h3 className="font-semibold">Option 3</h3>
                    <p className="text-sm text-foreground/80">Available</p>
                </div>
            </RadioCard>
        </RadioCardGroup>
    ),
    parameters: {
        docs: {
            story: `
Radio card group with a disabled option.

### Features:
- One option disabled
- Visual disabled state
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Check for disabled option
        const option2 = await canvas.findByText(/option 2/i, {}, { timeout: 5000 });
        await expect(option2).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for option 1
        const option1 = await canvas.findByText(/option 1/i, {}, { timeout: 5000 });
        await expect(option1).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for option 1
        const option1 = await canvas.findByText(/option 1/i, {}, { timeout: 5000 });
        await expect(option1).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for option 1
        const option1 = await canvas.findByText(/option 1/i, {}, { timeout: 5000 });
        await expect(option1).toBeInTheDocument();
    },
};
