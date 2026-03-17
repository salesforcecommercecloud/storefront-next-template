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
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import CartEmptySkeleton from '../cart-empty-skeleton';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRender = action('cart-empty-skeleton-render');
        logRender({});
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CartEmptySkeleton> = {
    title: 'SKELETON/CartEmptySkeleton',
    component: CartEmptySkeleton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Skeleton component for the empty cart state. Provides loading placeholders that mirror the CartEmpty component layout.

## Features

- **Icon Placeholder**: Circular skeleton for the shopping cart icon
- **Message Placeholders**: Skeletons for title and description text
- **Button Placeholders**: Conditional button skeletons based on user registration state
- **Responsive Design**: Matches the responsive layout of CartEmpty

## User States

- **Guest Users (isRegistered=false)**: Shows two button skeletons (Continue Shopping + Sign In)
- **Registered Users (isRegistered=true)**: Shows only one button skeleton (Continue Shopping)

## Usage

Used as a loading fallback when the cart page is hydrating and the cart is empty.
                `,
            },
        },
    },
    argTypes: {
        isRegistered: {
            control: 'boolean',
            description: 'Whether the user is registered/logged in. Affects the number of button skeletons shown.',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
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
type Story = StoryObj<typeof CartEmptySkeleton>;

export const Default: Story = {
    args: {
        isRegistered: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Default skeleton state for guest users. Shows:

- Icon placeholder in muted circle
- Title and message text placeholders
- Two button placeholders (Continue Shopping + Sign In)

This is the loading state shown before the actual empty cart content loads.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();
    },
};

export const GuestUser: Story = {
    args: {
        isRegistered: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state for guest users. Demonstrates:

- Two button placeholders matching the guest user CartEmpty layout
- Sign-in button placeholder encouraging account creation
- Full loading state before guest-specific content appears
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();

        // Verify two button skeletons are present
        const buttonContainer = canvasElement.querySelector('.space-y-3');
        const buttonSkeletons = buttonContainer?.querySelectorAll('.h-9');
        await expect(buttonSkeletons?.length).toBe(2);
    },
};

export const RegisteredUser: Story = {
    args: {
        isRegistered: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state for registered/logged-in users. Shows:

- Only one button placeholder (Continue Shopping)
- No sign-in button placeholder since user is already authenticated
- Cleaner, simpler skeleton matching the registered user CartEmpty layout
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();

        // Verify only one button skeleton is present
        const buttonContainer = canvasElement.querySelector('.space-y-3');
        const buttonSkeletons = buttonContainer?.querySelectorAll('.h-9');
        await expect(buttonSkeletons?.length).toBe(1);
    },
};

export const MobileView: Story = {
    args: {
        isRegistered: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state on mobile devices. Demonstrates:

- Responsive card layout on small screens
- Proper spacing for mobile display
- Full-width button placeholders
                `,
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();
    },
};

export const TabletView: Story = {
    args: {
        isRegistered: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state on tablet devices. Shows:

- Medium screen layout optimization
- Balanced spacing and sizing
- Proper card proportions for tablet screens
                `,
            },
        },
    },
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();
    },
};

export const DesktopView: Story = {
    args: {
        isRegistered: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state on desktop devices. Demonstrates:

- Large screen layout with centered card
- Optimal spacing and proportions
- Full desktop skeleton experience
                `,
            },
        },
    },
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();
    },
};
