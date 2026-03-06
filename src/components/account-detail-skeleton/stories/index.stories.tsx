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
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { AccountDetailSkeleton } from '../index';

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
 * Skeleton component for the account details page content.
 * Matches the structure of the actual account details with profile and password cards.
 */
const meta: Meta<typeof AccountDetailSkeleton> = {
    title: 'ACCOUNT/Account Detail Skeleton',
    component: AccountDetailSkeleton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Skeleton loading component for the account details page. Displays placeholder content that matches the structure of the actual account details page, including:

- Page header skeleton
- My Profile card with field placeholders
- Password card with field placeholders

This component is used as a loading fallback while customer data is being fetched.
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
type Story = StoryObj<typeof AccountDetailSkeleton>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Default skeleton state showing the account details page structure.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify main container exists
        const container = canvasElement.querySelector('.space-y-6');
        await expect(container).toBeInTheDocument();

        // Verify page header skeleton exists
        const headerSkeleton = canvasElement.querySelector('.h-8.w-40');
        await expect(headerSkeleton).toBeInTheDocument();

        // Verify profile card exists
        const profileCard = canvasElement.querySelector('.border-border');
        await expect(profileCard).toBeInTheDocument();

        // Verify skeleton elements are present
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(0);
    },
};
