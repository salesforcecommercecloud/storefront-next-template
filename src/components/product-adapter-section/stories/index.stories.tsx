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
import { expect, within, waitFor } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { ReactNode } from 'react';
import ProductAdapterSection from '..';
import CollapsibleSection from '@/components/collapsible-section';
import ProductContentProvider from '@/providers/product-content';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import { addProductContentAdapter, removeProductContentAdapter } from '@/lib/adapters/product-content-store';

const NULL_ADAPTER_NAME = 'product-null-adapter';

/**
 * Wraps children with a ProductContentProvider that uses an empty adapter,
 * causing all adapter method calls to resolve as absent → shows the fallback.
 */
const WithNullAdapter = ({ children }: { children: ReactNode }) => (
    <ConfigProvider config={mockConfig}>
        <ProductContentProvider adapterName={NULL_ADAPTER_NAME}>{children}</ProductContentProvider>
    </ConfigProvider>
);

/**
 * Wraps children with ConfigProvider + ProductContentProvider so the adapter
 * is initialised in both interactive Storybook and portable-story snapshot tests.
 * ConfigProvider is included explicitly because snapshot tests run composeStories
 * without the global Storybook decorators applied.
 */
const WithProductContent = ({ children }: { children: ReactNode }) => (
    <ConfigProvider config={mockConfig}>
        <ProductContentProvider>{children}</ProductContentProvider>
    </ConfigProvider>
);

const meta: Meta<typeof ProductAdapterSection> = {
    title: 'Components/ProductAdapterSection',
    component: ProductAdapterSection,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
    },
    decorators: [
        (Story) => (
            <WithProductContent>
                <Story />
            </WithProductContent>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductAdapterSection>;

/**
 * Materials section — adapter method returns a bulleted list.
 * The shell is rendered immediately; body fills in after the adapter resolves.
 */
export const Materials: Story = {
    render: (args) => (
        <CollapsibleSection label="Materials" defaultOpen>
            <ProductAdapterSection {...args} />
        </CollapsibleSection>
    ),
    args: {
        adapterMethod: 'getIngredientsData',
        productId: 'test-product',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Shell label is visible immediately
        await expect(canvas.getByText('Materials')).toBeInTheDocument();

        // Body content loads after adapter resolves
        await waitFor(() => expect(canvas.getByText('Premium full-grain leather upper')).toBeInTheDocument(), {
            timeout: 2000,
        });
    },
};

/**
 * Usage Instructions section — adapter method returns plain text.
 */
export const UsageInstructions: Story = {
    render: (args) => (
        <CollapsibleSection label="Usage Instructions" defaultOpen>
            <ProductAdapterSection {...args} />
        </CollapsibleSection>
    ),
    args: {
        adapterMethod: 'getUsageInstructions',
        productId: 'test-product',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Usage Instructions')).toBeInTheDocument();

        await waitFor(() => expect(canvas.getByText(/Condition leather regularly/i)).toBeInTheDocument(), {
            timeout: 2000,
        });
    },
};

/**
 * Care Instructions section — adapter method returns a bulleted list.
 */
export const CareInstructions: Story = {
    render: (args) => (
        <CollapsibleSection label="Care Instructions" defaultOpen>
            <ProductAdapterSection {...args} />
        </CollapsibleSection>
    ),
    args: {
        adapterMethod: 'getCareInstructions',
        productId: 'test-product',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Care Instructions')).toBeInTheDocument();

        await waitFor(() => expect(canvas.getByText('Clean with a soft, dry cloth')).toBeInTheDocument(), {
            timeout: 2000,
        });
    },
};

/**
 * Specifications section — adapter method returns a two-column table.
 */
export const Specifications: Story = {
    render: (args) => (
        <CollapsibleSection label="Specifications" defaultOpen>
            <ProductAdapterSection {...args} />
        </CollapsibleSection>
    ),
    args: {
        adapterMethod: 'getTechSpecs',
        productId: 'test-product',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Specifications')).toBeInTheDocument();

        await waitFor(() => expect(canvas.getByText('Full-grain leather')).toBeInTheDocument(), { timeout: 2000 });
    },
};

/**
 * Fallback state — shown when the adapter method is absent, returns null, or throws.
 * Uses a minimal empty adapter so no method is available, triggering "Content coming soon."
 *
 * Decorator composition note: Storybook applies meta decorators outside and story decorators
 * inside, so the render tree is: WithProductContent (meta) → WithNullAdapter (story) → Story.
 * React's nearest-provider rule means WithNullAdapter's ProductContentProvider wins and
 * ProductAdapterSection correctly reads from the null adapter.
 *
 * beforeEach registers the null adapter before each render (including snapshot tests via
 * the manual beforeEach call in product-adapter-section-snapshot.tsx) and the returned
 * cleanup removes it afterwards to keep stories isolated.
 */
export const ContentComingSoon: Story = {
    decorators: [
        (Story) => (
            <WithNullAdapter>
                <Story />
            </WithNullAdapter>
        ),
    ],
    beforeEach: () => {
        addProductContentAdapter(NULL_ADAPTER_NAME, {});
        return () => removeProductContentAdapter(NULL_ADAPTER_NAME);
    },
    render: (args) => (
        <CollapsibleSection label="Materials" defaultOpen>
            <ProductAdapterSection {...args} />
        </CollapsibleSection>
    ),
    args: {
        adapterMethod: 'getIngredientsData',
        productId: 'test-product',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Materials')).toBeInTheDocument();

        await waitFor(() => expect(canvas.getByText('Content coming soon.')).toBeInTheDocument(), {
            timeout: 2000,
        });
    },
};

/**
 * Collapsed by default — shell label is visible but body is hidden until expanded.
 */
export const CollapsedByDefault: Story = {
    render: (args) => (
        <CollapsibleSection label="Materials">
            <ProductAdapterSection {...args} />
        </CollapsibleSection>
    ),
    args: {
        adapterMethod: 'getIngredientsData',
        productId: 'test-product',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Shell label is visible immediately even though section is collapsed
        await expect(canvas.getByText('Materials')).toBeInTheDocument();

        // <details> starts closed
        const details = canvasElement.querySelector('details');
        await expect(details).not.toHaveAttribute('open');
    },
};
