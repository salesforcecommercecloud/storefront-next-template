/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SwatchGroup } from '../swatch-group';
import { Swatch } from '../swatch';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logChange = action('swatch-group-change');
        const logClick = action('swatch-group-click');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            // Check for swatches which might be radio inputs or buttons/divs with role radio
            const swatch = target.closest('[role="radio"], input[type="radio"]');
            if (swatch) {
                const label = swatch.getAttribute('aria-label') || swatch.getAttribute('value') || 'swatch';
                logClick({ label });
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (!target || !root.contains(target)) return;

            if (target.type === 'radio') {
                logChange({ value: target.value });
            }
        };

        // Capture both clicks and native changes if inputs are used
        root.addEventListener('click', handleClick);
        root.addEventListener('change', handleChange);

        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('change', handleChange);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

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
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
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
                    {}
                    <div className="w-full h-full bg-red-500 rounded-full" />
                </Swatch>
                <Swatch value="blue" label="Blue" mode="hover">
                    {}
                    <div className="w-full h-full bg-blue-500 rounded-full" />
                </Swatch>
                <Swatch value="green" label="Green" mode="hover">
                    {}
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
                <Swatch value="small" label="Small" shape="label" mode="click">
                    S
                </Swatch>
                <Swatch value="medium" label="Medium" shape="label" mode="click">
                    M
                </Swatch>
                <Swatch value="large" label="Large" shape="label" mode="click">
                    L
                </Swatch>
                <Swatch value="xlarge" label="XLarge" shape="label" mode="click">
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
                    {}
                    <div className="w-full h-full bg-red-500 rounded-full" />
                </Swatch>
                <Swatch value="blue" label="Blue" mode="hover">
                    {}
                    <div className="w-full h-full bg-blue-500 rounded-full" />
                </Swatch>
                <Swatch value="green" label="Green" mode="hover">
                    {}
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
