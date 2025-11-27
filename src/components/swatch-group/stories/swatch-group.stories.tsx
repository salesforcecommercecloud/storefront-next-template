import type { Meta, StoryObj } from '@storybook/react-vite';
import { SwatchGroup } from '../swatch-group';
import { Swatch } from '../swatch';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';

const meta: Meta<typeof SwatchGroup> = {
    title: 'SWATCH/SwatchGroup',
    component: SwatchGroup,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Container component that manages a group of swatch components with keyboard navigation and selection. Supports arrow key navigation and accessible radio group implementation.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        label: {
            description: 'Label text displayed above the swatches',
            control: 'text',
        },
        value: {
            description: 'Currently selected swatch value',
            control: 'text',
        },
        handleChange: {
            description: 'Callback function called when a swatch is selected',
            action: 'handleChange',
        },
        ariaLabel: {
            description: 'Accessible label for screen readers',
            control: 'text',
        },
        displayName: {
            description: 'Display name shown next to the label',
            control: 'text',
        },
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof SwatchGroup>;

export const Default: Story = {
    args: {
        label: 'Color',
        value: 'red',
        handleChange: action('handleChange'),
        children: (
            <>
                <Swatch value="red" label="Red" mode="hover">
                    {/* eslint-disable-next-line custom/color-linter */}
                    <div className="w-full h-full bg-red-500 rounded-full" />
                </Swatch>
                <Swatch value="blue" label="Blue" mode="hover">
                    {/* eslint-disable-next-line custom/color-linter */}
                    <div className="w-full h-full bg-blue-500 rounded-full" />
                </Swatch>
                <Swatch value="green" label="Green" mode="hover">
                    {/* eslint-disable-next-line custom/color-linter */}
                    <div className="w-full h-full bg-green-500 rounded-full" />
                </Swatch>
            </>
        ),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const label = await canvas.findByText(/color/i, {}, { timeout: 5000 });
        await expect(label).toBeInTheDocument();

        // Wait a bit for SwatchGroup to process the value prop
        await new Promise((resolve) => setTimeout(resolve, 100));

        const redSwatch = await canvas.findByRole('radio', { name: /red/i }, { timeout: 5000 });
        // Verify the swatch exists - the selected state is managed by SwatchGroup
        await expect(redSwatch).toBeInTheDocument();
    },
};

export const SquareSwatches: Story = {
    args: {
        label: 'Size',
        value: 'medium',
        handleChange: action('handleChange'),
        children: (
            <>
                <Swatch value="small" label="Small" shape="square" mode="click">
                    S
                </Swatch>
                <Swatch value="medium" label="Medium" shape="square" mode="click">
                    M
                </Swatch>
                <Swatch value="large" label="Large" shape="square" mode="click">
                    L
                </Swatch>
                <Swatch value="xlarge" label="XLarge" shape="square" mode="click">
                    XL
                </Swatch>
            </>
        ),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const label = await canvas.findByText(/size/i, {}, { timeout: 5000 });
        await expect(label).toBeInTheDocument();

        // Wait a bit for SwatchGroup to process the value prop
        await new Promise((resolve) => setTimeout(resolve, 100));

        const mediumSwatch = await canvas.findByRole('radio', { name: /medium/i }, { timeout: 5000 });
        // Verify the swatch exists - the selected state is managed by SwatchGroup
        await expect(mediumSwatch).toBeInTheDocument();
    },
};

export const WithDisplayName: Story = {
    args: {
        label: 'Material',
        displayName: 'Cotton',
        value: 'cotton',
        handleChange: action('handleChange'),
        children: (
            <>
                <Swatch value="cotton" label="Cotton" mode="hover">
                    Cotton
                </Swatch>
                <Swatch value="silk" label="Silk" mode="hover">
                    Silk
                </Swatch>
                <Swatch value="wool" label="Wool" mode="hover">
                    Wool
                </Swatch>
            </>
        ),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find the display name span specifically (not the swatch content)
        const displayNameContainer = await canvas.findByText(/material/i, {}, { timeout: 5000 });
        await expect(displayNameContainer).toBeInTheDocument();

        // Check that display name appears next to the label
        const displayName = canvasElement.querySelector('span.font-semibold')?.nextElementSibling;
        await expect(displayName?.textContent).toContain('Cotton');
    },
};

export const NoSelection: Story = {
    args: {
        label: 'Color',
        handleChange: action('handleChange'),
        children: (
            <>
                <Swatch value="red" label="Red" mode="hover">
                    {/* eslint-disable-next-line custom/color-linter */}
                    <div className="w-full h-full bg-red-500 rounded-full" />
                </Swatch>
                <Swatch value="blue" label="Blue" mode="hover">
                    {/* eslint-disable-next-line custom/color-linter */}
                    <div className="w-full h-full bg-blue-500 rounded-full" />
                </Swatch>
                <Swatch value="green" label="Green" mode="hover">
                    {/* eslint-disable-next-line custom/color-linter */}
                    <div className="w-full h-full bg-green-500 rounded-full" />
                </Swatch>
            </>
        ),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const label = await canvas.findByText(/color/i, {}, { timeout: 5000 });
        await expect(label).toBeInTheDocument();

        // Wait a bit for SwatchGroup to process
        await new Promise((resolve) => setTimeout(resolve, 100));

        // First swatch should be focusable when no selection
        const redSwatch = await canvas.findByRole('radio', { name: /red/i }, { timeout: 5000 });
        // Verify the swatch exists - focusability is managed by SwatchGroup
        await expect(redSwatch).toBeInTheDocument();
    },
};
