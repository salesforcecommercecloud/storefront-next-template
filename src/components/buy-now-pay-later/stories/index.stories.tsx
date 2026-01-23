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
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@/config/context';
import { CurrencyProvider } from '@/providers/currency';
import { mockConfig } from '@/test-utils/config';
import BuyNowPayLater from '../index';

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

const meta: Meta<typeof BuyNowPayLater> = {
    title: 'Components/BuyNowPayLater',
    component: BuyNowPayLater,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The BuyNowPayLater component displays buy now pay later installment information.

**Features:**
- Displays installment payment message
- Opens modal when "Learn more" is clicked
- Plugin component style - can be overridden by customers
- Default fallback component when no custom extension is registered

**Usage:**
This component is typically placed below the "Add to Cart" button on product detail pages.
It uses the plugin system, allowing customers to register their own custom components.
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <ConfigProvider config={mockConfig}>
                        <CurrencyProvider value="USD">
                            <ActionLogger>
                                <div className="max-w-md p-6">
                                    <Story />
                                </div>
                            </ActionLogger>
                        </CurrencyProvider>
                    </ConfigProvider>
                );

                if (inRouter) {
                    return content;
                }

                const router = createMemoryRouter(
                    [
                        {
                            path: '/',
                            element: content,
                        },
                    ],
                    { initialEntries: ['/'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof BuyNowPayLater>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify the installment message is displayed
        await expect(canvas.getByText(/Pay in 4 interest-free payments of/i)).toBeInTheDocument();
        await expect(canvas.getByText('$12.25')).toBeInTheDocument();
        await expect(canvas.getByText('Learn more')).toBeInTheDocument();
    },
};

export const WithModalInteraction: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find and click the "Learn more" button
        const learnMoreButton = canvas.getByText('Learn more');
        await expect(learnMoreButton).toBeInTheDocument();

        await userEvent.click(learnMoreButton);

        // Verify modal opens (check for dialog in document body)
        const documentBody = within(document.body);
        await expect(documentBody.getByRole('dialog')).toBeInTheDocument();
        await expect(documentBody.getByText('Information')).toBeInTheDocument();
        await expect(documentBody.getByText('No data available.')).toBeInTheDocument();
    },
};
