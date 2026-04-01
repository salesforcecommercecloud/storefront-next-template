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
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
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
- Supports multiple modal types (payment-schedule, write-review, star-rating-distribution)
- Accepts structured data from adapters
- Handles all rendering logic internally
- Themeable and accessible

**Modal Types:**
- **Payment Schedule**: Displays title, description, payment schedule timeline, "How it works" steps, disclaimer, and Close button
- **Write Review**: Displays a form for submitting product reviews
- **Star Rating Distribution**: Displays star rating and distribution of ratings across 1-5 stars

**Usage:**
The modal accepts structured data with a specific type and transforms it into the appropriate UI.
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
        const dialog = documentBody.getByRole('dialog');
        await expect(dialog).toBeInTheDocument();
        await expect(documentBody.getByText('Information')).toBeInTheDocument();
        await expect(within(dialog).getByText('No data available.')).toBeInTheDocument();
    },
};

export const PaymentScheduleType: Story = {
    args: {
        data: {
            type: 'payment-schedule',
            title: 'Pay in 4 interest-free payments',
            description: 'Split your purchase of $49.00 into 4 with no impact on credit score and no late fees.',
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
                { number: 1, text: 'Choose BNPL at checkout to pay later with Pay in 4.' },
                { number: 2, text: 'Complete your purchase with a 25% down payment.' },
                { number: 3, text: "Use autopay for the rest of your payments. It's easy!" },
            ],
            disclaimer: 'Subject to credit approval. Terms apply.',
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const openButton = canvas.getByRole('button', { name: /open modal/i });
        await userEvent.click(openButton);

        const documentBody = within(document.body);
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        const inDialog = within(dialog);

        await expect(inDialog.getByText('Pay in 4 interest-free payments')).toBeInTheDocument();
        await expect(inDialog.getByText('Payment Schedule')).toBeInTheDocument();
        await expect(inDialog.getByText('How it works')).toBeInTheDocument();
        await expect(inDialog.getByText('Subject to credit approval. Terms apply.')).toBeInTheDocument();
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
        await expect(documentBody.getByText('Payment Schedule')).toBeInTheDocument();
    },
};

export const StarRatingDistributionType: Story = {
    args: {
        data: {
            type: 'star-rating-distribution',
            title: '4.8 out of 5',
            rating: 4.8,
            reviewCount: 200,
            distributions: [
                { rating: 5, count: 120 },
                { rating: 4, count: 50 },
                { rating: 3, count: 20 },
                { rating: 2, count: 8 },
                { rating: 1, count: 2 },
            ],
            onSeeReviewsClick: action('see reviews clicked'),
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
Star rating distribution modal displaying rating overview and distribution breakdown.

### Features:
- Modal width: 19rem (304px) to accommodate w-64 (256px) content + padding
- Content area: w-64 (256px)
- Star rating with right label and review count
- Distribution bars showing rating breakdown
- "See customer reviews" link button (follows project pattern: text-primary hover:underline)
- X button to close (top right)
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const openButton = canvas.getByRole('button', { name: /open modal/i });
        await userEvent.click(openButton);

        const documentBody = within(document.body);
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        const inDialog = within(dialog);

        // Check modal title (same as right label in star rating)
        // Note: Text appears twice (DialogTitle with aria-hidden and StarRating label)
        const ratingTexts = inDialog.getAllByText('4.8 out of 5');
        await expect(ratingTexts.length).toBeGreaterThanOrEqual(1);

        // Check that star rating component is rendered
        await expect(inDialog.getByText('Based on 200 reviews')).toBeInTheDocument();

        // Check that stars are rendered
        const stars = dialog.querySelectorAll('svg');
        await expect(stars.length).toBeGreaterThan(5);
    },
};

export const StarRatingDistributionHighlyRated: Story = {
    args: {
        data: {
            type: 'star-rating-distribution',
            rating: 4.9,
            reviewCount: 200,
            distributions: [
                { rating: 5, count: 180 },
                { rating: 4, count: 15 },
                { rating: 3, count: 3 },
                { rating: 2, count: 1 },
                { rating: 1, count: 1 },
            ],
            onSeeReviewsClick: action('see reviews clicked'),
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
Highly rated product with most reviews being 5-star. Demonstrates how the modal handles excellent ratings with heavily skewed distribution.

### Features:
- 4.9 rating with 90% 5-star reviews
- Distribution bars show clear visual hierarchy
- Modal title defaults to rating label when not explicitly provided
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const openButton = canvas.getByRole('button', { name: /open modal/i });
        await userEvent.click(openButton);

        const documentBody = within(document.body);
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        const inDialog = within(dialog);

        // Check modal title defaults to rating label when title is not provided
        // Note: Text appears twice (DialogTitle with aria-hidden and StarRating label)
        const ratingTexts = inDialog.getAllByText('4.9 out of 5');
        await expect(ratingTexts.length).toBeGreaterThanOrEqual(1);

        // Check that star rating is displayed
        await expect(inDialog.getByText('Based on 200 reviews')).toBeInTheDocument();
    },
};
