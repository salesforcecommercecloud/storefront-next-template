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
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { Spinner } from '../index';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logHover = action('spinner-hover');
        const logClick = action('spinner-click');

        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const spinner = target.closest('[data-testid="spinner"]');
            if (spinner) {
                logHover({});
            }
        };

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const spinner = target.closest('[data-testid="spinner"]');
            if (spinner) {
                logClick({});
            }
        };

        root.addEventListener('mouseover', handleMouseOver, true);
        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('mouseover', handleMouseOver, true);
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Spinner> = {
    title: 'FEEDBACK/Spinner',
    component: Spinner,
    tags: ['autodocs', 'interaction'],
    parameters: {
        docs: {
            description: {
                component: `
Loading spinner with size variants using class-variance-authority.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="min-h-[40vh] bg-background flex items-center justify-center">
                    <div data-testid="spinner">
                        <Story />
                    </div>
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        size: 'md',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        void expect(canvasElement).toBeInTheDocument();
        void expect(canvasElement.children.length).toBeGreaterThan(0);

        const spinnerElement = canvasElement.querySelector('.animate-spin');
        void expect(spinnerElement).toBeInTheDocument();

        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};

export const Small: Story = {
    args: {
        size: 'sm',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const spinner = canvasElement.querySelector('.animate-spin');
        void expect(spinner).toHaveClass('size-4');
    },
};

export const Large: Story = {
    args: {
        size: 'lg',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const spinner = canvasElement.querySelector('.animate-spin');
        void expect(spinner).toHaveClass('size-8');
    },
};

export const ExtraLarge: Story = {
    args: {
        size: 'xl',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const spinner = canvasElement.querySelector('.animate-spin');
        void expect(spinner).toHaveClass('size-12');
    },
};

export const CustomColor: Story = {
    args: {
        size: 'lg',
        className: 'border-t-destructive',
    },
    parameters: {
        docs: {
            story: 'The `border-t-*` color is overridable via className for status indicators (e.g. error/destructive spinners).',
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const spinner = canvasElement.querySelector('.animate-spin');
        void expect(spinner).toHaveClass('border-t-destructive');
    },
};
