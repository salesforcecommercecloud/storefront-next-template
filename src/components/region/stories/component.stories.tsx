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
import { Component } from '../component';
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

        const logRender = action('region-component-render');
        logRender({});
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

// Register a test component in the registry so the Component wrapper can find it
const TestComponent = ({
    component,
    designMetadata,
    className,
}: {
    component?: { name: string };
    designMetadata?: { name: string };
    className?: string;
}) => (
    <div className={className} data-testid="dynamic-component">
        Component: {component?.name || designMetadata?.name || 'Unknown'}
    </div>
);
TestComponent.displayName = 'TestComponent';

registry.registerComponent('test-component', TestComponent);

const meta: Meta<typeof Component> = {
    title: 'REGION/Component',
    component: Component,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Component wrapper that renders dynamic components from the registry. Supports Suspense boundaries and async data loading.',
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
        component: {
            description: 'Component definition from Page Designer',
            control: 'object',
        },
        componentData: {
            description: 'Promise of component data',
            control: 'object',
        },
        className: {
            description: 'Additional CSS classes',
            control: 'text',
        },
        regionId: {
            description: 'ID of the parent region',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
    args: {
        component: {
            id: 'component-1',
            typeId: 'test-component',
            data: {},
        },
        regionId: 'region-1',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
