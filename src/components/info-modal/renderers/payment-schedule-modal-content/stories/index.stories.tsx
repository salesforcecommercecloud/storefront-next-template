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
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { PaymentScheduleModalContent } from '../../payment-schedule-modal-content';
import type { PaymentSchedule, StepInfo, ModalLink } from '../../../types';
import { ConfigProvider } from '@/config/context';
import { CurrencyProvider } from '@/providers/currency';
import { mockConfig } from '@/test-utils/config';
import type { ReactElement } from 'react';

function PaymentScheduleModalContentWrapper({
    paymentSchedule,
    steps,
    disclaimer,
    links,
    currency = 'USD',
}: {
    paymentSchedule?: PaymentSchedule;
    steps?: StepInfo[];
    disclaimer?: string;
    links?: ModalLink[];
    currency?: string;
}): ReactElement {
    const inRouter = useInRouterContext();
    const content = (
        <ConfigProvider config={mockConfig}>
            <CurrencyProvider value={currency}>
                <div className="max-w-md p-6">
                    <PaymentScheduleModalContent
                        paymentSchedule={paymentSchedule}
                        steps={steps}
                        disclaimer={disclaimer}
                        links={links}
                        currency={currency}
                    />
                </div>
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
}

const meta: Meta<typeof PaymentScheduleModalContentWrapper> = {
    title: 'Components/InfoModal/Renderers/PaymentScheduleModalContent',
    component: PaymentScheduleModalContentWrapper,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
PaymentScheduleModalContent is a renderer component that displays payment schedule content within the InfoModal.

This component is used internally by InfoModal when the modal type is 'payment-schedule'. It renders:
- Payment schedule with amounts and due dates
- "How it works" steps
- Disclaimer text
- Footer links
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof PaymentScheduleModalContentWrapper>;

export const Default: Story = {
    args: {
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
        currency: 'USD',
    },
};

export const PaymentScheduleOnly: Story = {
    args: {
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
        currency: 'USD',
    },
};

export const StepsOnly: Story = {
    args: {
        steps: [
            { number: 1, text: 'Select payment method at checkout' },
            { number: 2, text: 'Choose Pay in 4' },
            { number: 3, text: 'Complete your purchase' },
        ],
        currency: 'USD',
    },
};

export const WithLinks: Story = {
    args: {
        links: [
            { text: 'Learn more about payment plans', url: '/payment', openInNewTab: false },
            { text: 'Terms and conditions', url: '/terms', openInNewTab: true },
        ],
        currency: 'USD',
    },
};
