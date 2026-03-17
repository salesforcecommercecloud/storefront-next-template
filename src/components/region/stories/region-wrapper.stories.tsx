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
import { RegionWrapper } from '../region-wrapper';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRender = action('region-wrapper-render');
        logRender({});
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof RegionWrapper> = {
    title: 'REGION/RegionWrapper',
    component: RegionWrapper,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Smart wrapper that conditionally applies design mode decoration. Automatically detects design mode and applies the appropriate decorator for Page Designer.',
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
        region: {
            description: 'Region object from Page Designer API',
            control: 'object',
        },
        children: {
            description: 'Child components to render within the region',
            control: false,
        },
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
        designMetadata: {
            description: 'Design metadata for Page Designer',
            control: 'object',
        },
    },
};

export default meta;
type Story = StoryObj<typeof RegionWrapper>;

const mockRegion = {
    id: 'region-1',
    components: [],
};

export const Default: Story = {
    args: {
        region: mockRegion,
        children: <div>Child Content</div>,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const WithMultipleChildren: Story = {
    args: {
        region: mockRegion,
        children: (
            <>
                <div>Child 1</div>
                <div>Child 2</div>
                <div>Child 3</div>
            </>
        ),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
