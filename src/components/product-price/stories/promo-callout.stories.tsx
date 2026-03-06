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
import PromoCallout from '../promo-callout';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logAction = action('interaction');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const interactiveElement = target.closest('button, a, [role="button"]');
            if (interactiveElement) {
                const label = interactiveElement.textContent?.trim().substring(0, 50) || 'unlabeled';
                const tag = interactiveElement.tagName.toLowerCase();

                logAction({ type: 'click', tag, label });
            }
        };

        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PromoCallout> = {
    title: 'Components/ProductPrice/PromoCallout',
    component: PromoCallout,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="p-4 border border-dashed">
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PromoCallout>;

const mockProductWithPromo = {
    productPromotions: [
        {
            calloutMsg: 'Buy one get one 50% off',
            promotionId: 'bogo-50',
        },
    ],
    price: 100,
} as any;

const mockProductWithHtmlPromo = {
    productPromotions: [
        {
            calloutMsg: '<strong>Flash Sale!</strong> 20% off',
            promotionId: 'flash-sale',
        },
    ],
    price: 100,
} as any;

export const Default: Story = {
    args: {
        product: mockProductWithPromo,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Buy one get one 50% off')).toBeInTheDocument();
    },
};

export const HtmlContent: Story = {
    args: {
        product: mockProductWithHtmlPromo,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Flash Sale!')).toBeInTheDocument();
        await expect(canvas.getByText('20% off')).toBeInTheDocument();
    },
};
