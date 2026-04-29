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
import PriceRangeInput from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { mockConfig, mockLocale } from '@/test-utils/config';

const mockSite = mockConfig.commerce.sites[0];

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
            <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="USD">
                <PriceRangeInputStoryHarness>
                    <Story />
                </PriceRangeInputStoryHarness>
            </SiteProvider>
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
