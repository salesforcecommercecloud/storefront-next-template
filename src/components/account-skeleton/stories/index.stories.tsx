/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { AccountSkeleton } from '../index';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logSkeletonInteraction = action('skeleton-interaction');
        const logSkeletonHover = action('skeleton-hover');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const skeleton = target.closest('[class*="animate-pulse"], [class*="skeleton"]');
            if (skeleton) {
                const label = target.getAttribute('data-testid') || target.className || 'skeleton-element';
                logSkeletonInteraction({ element: label, type: 'click' });
            }
        };

        const handleMouseOver = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const skeleton = target.closest('[class*="animate-pulse"], [class*="skeleton"]');
            if (skeleton) {
                logSkeletonHover({});
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('mouseover', handleMouseOver, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

/**
 * Skeleton component for the account page layout.
 * Matches the structure of the actual account page with navigation and content areas.
 */
const meta: Meta<typeof AccountSkeleton> = {
    title: 'ACCOUNT/Account Skeleton',
    component: AccountSkeleton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Skeleton loading component for the account page layout. Displays placeholder content that matches the structure of the actual account page, including:

- Mobile and desktop navigation skeletons
- Page title skeleton
- Profile card skeleton
- Password card skeleton

This component is used as a loading fallback while account data is being fetched.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AccountSkeleton>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Default skeleton state showing the account page layout structure.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify skeleton elements are present
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(0);

        // Verify skeleton elements exist (check for any skeleton-related elements)
        const skeletonElements = canvasElement.querySelectorAll('[class*="animate-pulse"], [class*="rounded"]');
        await expect(skeletonElements.length).toBeGreaterThan(0);
    },
};

export const LoadingState: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Skeleton in loading state, showing all placeholder elements.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify multiple skeleton elements exist
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(5);

        // Verify desktop navigation skeleton
        const desktopNav = canvasElement.querySelector('.hidden.lg\\:block');
        await expect(desktopNav).toBeInTheDocument();

        // Verify main content skeleton
        const mainContent = canvasElement.querySelector('.lg\\:col-span-3');
        await expect(mainContent).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify skeleton elements are present
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(0);

        // Verify skeleton elements exist (check for any skeleton-related elements)
        const skeletonElements = canvasElement.querySelectorAll('[class*="animate-pulse"], [class*="rounded"]');
        await expect(skeletonElements.length).toBeGreaterThan(0);
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify skeleton elements are present
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(0);

        // Verify skeleton elements exist (check for any skeleton-related elements)
        const skeletonElements = canvasElement.querySelectorAll('[class*="animate-pulse"], [class*="rounded"]');
        await expect(skeletonElements.length).toBeGreaterThan(0);
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify skeleton elements are present
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(0);

        // Verify skeleton elements exist (check for any skeleton-related elements)
        const skeletonElements = canvasElement.querySelectorAll('[class*="animate-pulse"], [class*="rounded"]');
        await expect(skeletonElements.length).toBeGreaterThan(0);
    },
};
