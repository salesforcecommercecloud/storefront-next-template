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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type React from 'react';
import BuyNowPayLater from './index';
import type { InfoModalData } from '@/components/info-modal/types';

// Mock the InfoModal component for BuyNowPayLater tests
vi.mock('@/components/info-modal', () => ({
    default: ({
        open,
        onOpenChange,
        data,
    }: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        data?: unknown;
    }) => {
        if (!open) return null;
        return (
            <div role="dialog" data-testid="info-modal">
                <button onClick={() => onOpenChange(false)}>Close</button>
                {data ? (
                    <div data-testid="modal-data">Data loaded</div>
                ) : (
                    <div data-testid="no-modal-data">No data</div>
                )}
            </div>
        );
    },
}));

// Mock currency provider
vi.mock('@/providers/currency', () => ({
    useCurrency: () => 'USD',
}));

const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter([
        {
            path: '/',
            element: component,
        },
    ]);
    return render(<RouterProvider router={router} />);
};

describe('BuyNowPayLater', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the installment message', () => {
        renderWithRouter(<BuyNowPayLater />);

        expect(screen.getByText(/Pay in 4 interest-free payments of/i)).toBeInTheDocument();
        expect(screen.getByText('$12.25')).toBeInTheDocument();
        expect(screen.getByText('Learn more')).toBeInTheDocument();
    });

    it('should open modal when "Learn more" button is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(<BuyNowPayLater />);

        // Modal should not be visible initially
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        // Click "Learn more" button
        const learnMoreButton = screen.getByText('Learn more');
        await user.click(learnMoreButton);

        // Modal should be visible after click
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Should show "No data" since modalData is undefined
        expect(screen.getByTestId('no-modal-data')).toBeInTheDocument();
    });
});

describe('InfoModal - Payment Schedule Type', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render payment schedule modal content when type is payment-schedule', async () => {
        // Unmock InfoModal to use the real component
        vi.doUnmock('@/components/info-modal');
        // Reset modules to allow importing the real InfoModal
        vi.resetModules();

        // Import the real InfoModal component after resetting modules
        const InfoModalModule = await import('@/components/info-modal');
        const InfoModal = InfoModalModule.default;

        const mockPaymentScheduleData: InfoModalData = {
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
        };

        const mockOnOpenChange = vi.fn();
        const router = createMemoryRouter([
            {
                path: '/',
                element: <InfoModal open={true} onOpenChange={mockOnOpenChange} data={mockPaymentScheduleData} />,
            },
        ]);
        render(<RouterProvider router={router} />);

        // Verify modal is rendered
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Verify title and description
        expect(screen.getByText('Pay in 4')).toBeInTheDocument();
        expect(screen.getByText('Split your purchase into 4 interest-free payments')).toBeInTheDocument();

        // Verify payment schedule amounts are displayed (formatCurrency will format as $14.75)
        const amounts = screen.getAllByText(/\$14\.75/);
        expect(amounts.length).toBeGreaterThan(0);
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('2 weeks')).toBeInTheDocument();
        expect(screen.getByText('4 weeks')).toBeInTheDocument();
        expect(screen.getByText('6 weeks')).toBeInTheDocument();

        // Verify "How it works" section
        expect(screen.getByText('How it works')).toBeInTheDocument();
        expect(screen.getByText('Select payment method at checkout')).toBeInTheDocument();
        expect(screen.getByText('Choose Pay in 4')).toBeInTheDocument();
        expect(screen.getByText('Complete your purchase')).toBeInTheDocument();
        expect(screen.getByText('Pay over time, interest-free')).toBeInTheDocument();

        // Verify disclaimer
        expect(screen.getByText('Subject to credit approval. Terms apply.')).toBeInTheDocument();

        // Verify links
        expect(screen.getByText('Learn more')).toBeInTheDocument();
        expect(screen.getByText('Terms and conditions')).toBeInTheDocument();
    });
});
