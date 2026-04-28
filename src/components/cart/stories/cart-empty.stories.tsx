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
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const { t } = getTranslation();

        const logClick = action('cart-empty-click');
        const logHover = action('cart-empty-hover');

        const STOP_PROPAGATION_LABELS = new Set<string>([t('cart:empty.continueShopping')]);

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
The EmptyCart component displays when the shopping cart has no items. It provides a clean, centered empty state with a shopping bag icon, messaging, and a single "Start Shopping" call-to-action.

## Features

- **Shopping Bag Icon**: Inline SVG (w-24 h-24) with light muted stroke (strokeWidth 1.5)
- **Empty State Messaging**: "Your cart is empty" heading with subtitle
- **Single CTA**: "Start Shopping" button linking back to the homepage
- **Responsive Padding**: p-8 on mobile, md:p-16 on larger screens
- **Accessibility**: aria-hidden icon, semantic heading, proper link markup

## Props

- \`isRegistered\` (boolean, default: false) — Controls subtitle text. Both states show "Start shopping to add items to your cart" and the same single button.

## Layout

- **Outer Container**: Full-width muted background with max-w-7xl centered content
- **Card**: \`bg-background rounded-none shadow-md\` with generous responsive padding
- **Icon**: 96×96px inline SVG shopping bag with \`text-muted-foreground/30\`
- **Typography**: h2 heading (text-xl font-semibold) with mb-2, subtitle (text-sm) with mb-8
- **Button**: Centered "Start Shopping" button (not full-width)
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

- Shopping bag icon with muted styling
- Empty cart title and guest-specific message
- Start Shopping button (primary action)

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

- Guest-specific messaging
- Start Shopping button
- Clean, simple empty state for anonymous users
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
- Start Shopping button
- Same clean interface for authenticated users

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
