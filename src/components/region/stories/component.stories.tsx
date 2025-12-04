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

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
