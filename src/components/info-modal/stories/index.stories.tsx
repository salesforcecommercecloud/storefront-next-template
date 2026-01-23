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
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@/config/context';
import { CurrencyProvider } from '@/providers/currency';
import { mockConfig } from '@/test-utils/config';
import InfoModal, { type InfoModalData } from '../index';
import { Button } from '@/components/ui/button';

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

function InfoModalWrapper({ data, currency = 'USD' }: { data?: InfoModalData; currency?: string }): ReactElement {
    const [open, setOpen] = useState(false);

    return (
        <ConfigProvider config={mockConfig}>
            <CurrencyProvider value={currency}>
                <ActionLogger>
                    <div className="p-6">
                        <Button onClick={() => setOpen(true)}>Open Modal</Button>
                        <InfoModal open={open} onOpenChange={setOpen} data={data} />
                    </div>
                </ActionLogger>
            </CurrencyProvider>
        </ConfigProvider>
    );
}

const meta: Meta<typeof InfoModalWrapper> = {
    title: 'Components/InfoModal',
    component: InfoModalWrapper,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The InfoModal is a generic, reusable modal component that displays informational content.

**Features:**
- Supports multiple modal types: payment schedule and generic content
- Accepts structured data from adapters
- Handles all rendering logic internally
- Themeable and accessible

**Modal Types:**
- **Payment Schedule**: Displays payment schedule, steps, disclaimer, and links
- **Generic**: Displays custom React content

**Usage:**
The modal accepts structured data (not React components) and transforms it into the appropriate UI structure.
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType<{ data?: InfoModalData; currency?: string }>, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const args = context.args as { data?: InfoModalData; currency?: string };
                const content = <Story data={args.data} currency={args.currency} />;

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
    argTypes: {
        data: {
            description: 'Structured modal data from adapter',
            control: 'object',
        },
        currency: {
            description: 'Currency code for formatting',
            control: 'select',
            options: ['USD', 'EUR', 'GBP', 'JPY'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof InfoModalWrapper>;

export const NoData: Story = {
    args: {
        data: undefined,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const openButton = canvas.getByRole('button', { name: /open modal/i });
        await userEvent.click(openButton);

        const documentBody = within(document.body);
        await expect(documentBody.getByRole('dialog')).toBeInTheDocument();
        await expect(documentBody.getByText('Information')).toBeInTheDocument();
        await expect(documentBody.getByText('No data available.')).toBeInTheDocument();
    },
};

export const PaymentScheduleType: Story = {
    args: {
        data: {
            type: 'payment-schedule',
            title: 'Pay in 4',
            description: 'Split your purchase into 4 interest-free payments',
            paymentSchedule: {
                totalAmount: 59.0,
                numberOfPayments: 4,
                payments: [
                    { amount: 14.75, dueDate: 'Today' },
                    { amount: 14.75, dueDate: '2 weeks' },
                    { amount: 14.75, dueDate: '4 weeks' },
                    { amount: 14.75, dueDate: '6 weeks' },
                ],
            },
            steps: [
                { number: 1, text: 'Select payment method at checkout' },
                { number: 2, text: 'Choose Pay in 4' },
                { number: 3, text: 'Complete your purchase' },
                { number: 4, text: 'Pay over time, interest-free' },
            ],
            disclaimer: 'Subject to credit approval. Terms apply.',
            links: [
                { text: 'Learn more', url: '/payment-info', openInNewTab: false },
                { text: 'Terms and conditions', url: '/terms', openInNewTab: true },
            ],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const openButton = canvas.getByRole('button', { name: /open modal/i });
        await userEvent.click(openButton);

        const documentBody = within(document.body);
        await expect(documentBody.getByRole('dialog')).toBeInTheDocument();
        await expect(documentBody.getByText('Pay in 4')).toBeInTheDocument();
        await expect(documentBody.getByText('Split your purchase into 4 interest-free payments')).toBeInTheDocument();
        await expect(documentBody.getByText('How it works')).toBeInTheDocument();
        await expect(documentBody.getByText('Select payment method at checkout')).toBeInTheDocument();
        await expect(documentBody.getByText('Subject to credit approval. Terms apply.')).toBeInTheDocument();
    },
};

export const GenericType: Story = {
    args: {
        data: {
            type: 'generic',
            title: 'Custom Information',
            description: 'This is a generic modal with custom content',
            content: (
                <div className="space-y-4">
                    <p>This is custom content that can be anything you want.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li>Feature one</li>
                        <li>Feature two</li>
                        <li>Feature three</li>
                    </ul>
                </div>
            ),
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const openButton = canvas.getByRole('button', { name: /open modal/i });
        await userEvent.click(openButton);

        const documentBody = within(document.body);
        await expect(documentBody.getByRole('dialog')).toBeInTheDocument();
        await expect(documentBody.getByText('Custom Information')).toBeInTheDocument();
        await expect(documentBody.getByText('This is a generic modal with custom content')).toBeInTheDocument();
        await expect(
            documentBody.getByText('This is custom content that can be anything you want.')
        ).toBeInTheDocument();
    },
};

export const PaymentScheduleOnly: Story = {
    args: {
        data: {
            type: 'payment-schedule',
            title: 'Pay in 4',
            paymentSchedule: {
                totalAmount: 100.0,
                numberOfPayments: 4,
                payments: [
                    { amount: 25.0, dueDate: 'Today' },
                    { amount: 25.0, dueDate: '2 weeks' },
                    { amount: 25.0, dueDate: '4 weeks' },
                    { amount: 25.0, dueDate: '6 weeks' },
                ],
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const openButton = canvas.getByRole('button', { name: /open modal/i });
        await userEvent.click(openButton);

        const documentBody = within(document.body);
        await expect(documentBody.getByRole('dialog')).toBeInTheDocument();
        await expect(documentBody.getByText('Pay in 4')).toBeInTheDocument();
    },
};
