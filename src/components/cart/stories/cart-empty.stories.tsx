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
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

import EmptyCart from '../cart-empty';
import { getTranslation } from '@/lib/i18next';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const { t } = getTranslation();

        const logClick = action('cart-empty-click');
        const logHover = action('cart-empty-hover');

        const STOP_PROPAGATION_LABELS = new Set<string>([t('cart:empty.continueShopping'), t('cart:empty.signIn')]);

        const isInsideHarness = (element: HTMLElement) => root.contains(element);

        const deriveLabel = (element: HTMLElement) =>
            (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();

        const findInteractiveElement = (element: Element | null) => {
            const interactive = element?.closest('a, button');
            return interactive instanceof HTMLElement ? interactive : null;
        };

        const maybePreventNavigation = (event: MouseEvent, label: string) => {
            if (STOP_PROPAGATION_LABELS.has(label)) {
                event.preventDefault();
                event.stopImmediatePropagation?.();
            }
        };

        let lastHoverElement: HTMLElement | null = null;

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            maybePreventNavigation(event, label);
            logClick({ label });
        };

        const handlePointerOver = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive) || interactive === lastHoverElement) {
                return;
            }

            lastHoverElement = interactive;

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            logHover({ label });
        };

        const handlePointerOut = (event: PointerEvent) => {
            if (!lastHoverElement) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (!target) return;

            const interactive = findInteractiveElement(target);
            if (!interactive || interactive !== lastHoverElement) {
                return;
            }

            const related = event.relatedTarget as HTMLElement | null;
            if (related && lastHoverElement.contains(related)) {
                return;
            }

            lastHoverElement = null;
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('pointerout', handlePointerOut, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof EmptyCart> = {
    title: 'CART/CartEmpty',
    component: EmptyCart,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
The EmptyCart component displays when the shopping cart has no items. It provides a user-friendly empty state with appropriate messaging and call-to-action buttons.

## Features

- **Empty State Display**: Shows shopping cart icon and empty cart message
- **User Context Awareness**: Different messages for registered vs guest users
- **Action Buttons**: Continue shopping and sign-in options
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Proper semantic markup and ARIA attributes

## User States

- **Guest Users**: Shows sign-in button to encourage account creation
- **Registered Users**: Shows only continue shopping button
- **Consistent Messaging**: Clear, helpful text for both user types

## Layout

- **Centered Card**: Maximum width container with centered card layout
- **Icon Display**: Shopping cart icon in muted background circle
- **Button Actions**: Full-width buttons with proper spacing
- **Responsive Spacing**: Appropriate padding and margins for all screen sizes
                `,
            },
        },
    },
    argTypes: {
        isRegistered: {
            control: 'boolean',
            description: 'Whether the user is registered/logged in',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const buttons = canvas.queryAllByRole('button');
        const inputs = canvas.queryAllByRole('textbox');

        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }

        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        isRegistered: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Default empty cart state for guest users. Shows:

- Shopping cart icon in muted circle
- Empty cart title and guest-specific message
- Continue shopping button (primary action)
- Sign in button (secondary action) to encourage account creation

This is the most common empty cart state for new or anonymous users.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const buttons = canvas.queryAllByRole('button');
        const inputs = canvas.queryAllByRole('textbox');

        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }

        void expect(canvasElement.firstChild).toBeInTheDocument();
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
Empty cart state specifically for guest users. This story demonstrates:

- Guest-specific messaging encouraging sign-in
- Both continue shopping and sign-in buttons
- Clear call-to-action for account creation
- Helpful guidance for anonymous users

Use this state when you want to encourage guest users to create an account.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const buttons = canvas.queryAllByRole('button');
        const inputs = canvas.queryAllByRole('textbox');

        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }

        void expect(canvasElement.firstChild).toBeInTheDocument();
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
Empty cart state for registered/logged-in users. This story shows:

- Registered user-specific messaging
- Only continue shopping button (no sign-in needed)
- Cleaner, simpler interface for authenticated users
- Focus on getting back to shopping

This state is shown when a logged-in user has an empty cart.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        const buttons = canvas.queryAllByRole('button');
        const inputs = canvas.queryAllByRole('textbox');

        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }

        void expect(canvasElement.firstChild).toBeInTheDocument();
    },
};
