import type { Meta, StoryObj } from '@storybook/react-vite';
import PriceRangeInput from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function PriceRangeInputStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('price-range-input');
        const logChange = action('price-range-change');

        const handleInput = (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (!target || !root.contains(target) || target.type !== 'number') return;
            logInput({ value: target.value, field: target.placeholder || '' });
        };

        const handleChange = (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (!target || !root.contains(target) || target.type !== 'number') return;
            logChange({ value: target.value });
        };

        root.addEventListener('input', handleInput);
        root.addEventListener('change', handleChange);
        return () => {
            root.removeEventListener('input', handleInput);
            root.removeEventListener('change', handleChange);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PriceRangeInput> = {
    title: 'COMMON/Price Range Input',
    component: PriceRangeInput,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A price range input component with min and max price fields, validation, and apply functionality.

### Features:
- Min and max price inputs
- Real-time validation
- Error states
- Enter key to apply
- Customizable min/max allowed values
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <PriceRangeInputStoryHarness>
                <Story />
            </PriceRangeInputStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PriceRangeInput>;

function PriceRangeInputExample({
    initialMin = '',
    initialMax = '',
    minAllowed,
    maxAllowed,
}: {
    initialMin?: string;
    initialMax?: string;
    minAllowed?: number;
    maxAllowed?: number;
}) {
    const [minPrice, setMinPrice] = useState(initialMin);
    const [maxPrice, setMaxPrice] = useState(initialMax);

    return (
        <div className="space-y-4 w-96">
            <PriceRangeInput
                minPrice={minPrice}
                maxPrice={maxPrice}
                onChange={(min, max) => {
                    setMinPrice(min);
                    setMaxPrice(max);
                }}
                onApply={() => {
                    action('price-range-applied')({ min: minPrice, max: maxPrice });
                }}
                minAllowed={minAllowed}
                maxAllowed={maxAllowed}
            />
        </div>
    );
}

export const Default: Story = {
    render: () => <PriceRangeInputExample />,
    parameters: {
        docs: {
            story: `
Standard price range input with empty values.

### Features:
- Empty min and max fields
- Placeholder text
- Validation enabled
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Check for inputs
        const inputs = canvasElement.querySelectorAll('input[type="number"]');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);
    },
};

export const WithValues: Story = {
    render: () => <PriceRangeInputExample initialMin="10" initialMax="100" />,
    parameters: {
        docs: {
            story: `
Price range input with pre-filled values.

### Features:
- Min price: $10
- Max price: $100
            `,
        },
    },
    play: async ({ canvasElement }) => {
        // Check for inputs with values - wait for them to render
        await new Promise((resolve) => setTimeout(resolve, 100));

        const inputs = canvasElement.querySelectorAll('input[type="number"]');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);

        // Check that at least one input has the value "10"
        const hasValue = Array.from(inputs).some((input) => (input as HTMLInputElement).value === '10');
        await expect(hasValue).toBe(true);
    },
};

export const WithLimits: Story = {
    render: () => <PriceRangeInputExample initialMin="5" initialMax="200" minAllowed={0} maxAllowed={500} />,
    parameters: {
        docs: {
            story: `
Price range input with min and max allowed values.

### Features:
- Min allowed: $0
- Max allowed: $500
- Validation against limits
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Check for inputs
        const inputs = canvasElement.querySelectorAll('input[type="number"]');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Check for inputs
        const inputs = canvasElement.querySelectorAll('input[type="number"]');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Check for inputs
        const inputs = canvasElement.querySelectorAll('input[type="number"]');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Check for inputs
        const inputs = canvasElement.querySelectorAll('input[type="number"]');
        await expect(inputs.length).toBeGreaterThanOrEqual(2);
    },
};
