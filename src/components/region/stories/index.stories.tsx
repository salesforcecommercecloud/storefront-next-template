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
import { Region } from '../index';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { registry } from '@/lib/registry';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRender = action('region-render');
        logRender({});
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

// Register a test component in the registry so the Region component can find it
const TestComponent = ({
    component,
}: {
    component: { id: string; typeId: string; name: string; data?: Record<string, unknown> };
}) => <div data-testid={`component-${component.id}`}>Component: {component.name}</div>;

registry.registerComponent('test-component', TestComponent);

const meta: Meta<typeof Region> = {
    title: 'REGION/Region',
    component: Region,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Renders a Page Designer region from Salesforce ShopperExperience API data. Creates a container structure and renders all components within the region.',
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
        page: {
            description: 'Promise of Page object from Page Designer API',
            control: 'object',
        },
        regionId: {
            description: 'ID of the region to render',
            control: 'text',
        },
        componentData: {
            description: 'Promise of component data',
            control: 'object',
        },
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Region>;

const mockRegion = {
    id: 'region-1',
    components: [
        {
            id: 'component-1',
            typeId: 'test-component',
            name: 'Test Component 1',
        },
        {
            id: 'component-2',
            typeId: 'test-component',
            name: 'Test Component 2',
        },
    ],
};

export const Default: Story = {
    args: {
        page: Promise.resolve({
            id: 'test-page',
            typeId: 'storePage',
            regions: [mockRegion],
        }),
        regionId: 'region-1',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const SingleComponent: Story = {
    args: {
        page: Promise.resolve({
            id: 'test-page',
            typeId: 'storePage',
            regions: [
                {
                    id: 'region-2',
                    components: [
                        {
                            id: 'component-1',
                            typeId: 'test-component',
                            name: 'Single Component',
                        },
                    ],
                },
            ],
        }),
        regionId: 'region-2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const Empty: Story = {
    args: {
        page: Promise.resolve({
            id: 'test-page',
            typeId: 'storePage',
            regions: [
                {
                    id: 'region-3',
                    components: [],
                },
            ],
        }),
        regionId: 'region-3',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
