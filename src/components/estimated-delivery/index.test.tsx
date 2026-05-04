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
import type { EstimatedDeliveryData } from '@/lib/adapters/product-content/data-types';
import EstimatedDelivery from './index';

const mockDeliveryData: EstimatedDeliveryData = {
    title: 'Fulfillment & Shipping',
    estimatedDelivery: {
        options: [
            { name: 'Standard', deliveryTime: '5-7 business days' },
            { name: 'Express', deliveryTime: '2-3 business days' },
        ],
        note: 'Delivery times may vary.',
    },
    shippingOptions: [
        { name: 'Standard', deliveryTime: '5-7 business days', cost: 0 },
        { name: 'Express', deliveryTime: '2-3 business days', cost: 9.99 },
    ],
    internationalShipping: {
        heading: 'International Shipping',
        points: ['We ship to over 50 countries.'],
    },
    orderTracking: {
        heading: 'Order Tracking',
        points: ['Track your order online.'],
    },
};

const mockGetEstimatedDelivery = vi.fn();

vi.mock('@/hooks/product-content/use-product-content', () => ({
    useProductContent: () => ({
        adapter: { getEstimatedDelivery: mockGetEstimatedDelivery },
        isEnabled: true,
    }),
}));

vi.mock('@/components/info-modal', () => ({
    default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
        if (!open) return null;
        return (
            <div role="dialog" data-testid="info-modal">
                <button type="button" onClick={() => onOpenChange(false)}>
                    Close
                </button>
            </div>
        );
    },
}));

const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter([{ path: '/', element: component }]);
    return render(<RouterProvider router={router} />);
};

describe('EstimatedDelivery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetEstimatedDelivery.mockResolvedValue(mockDeliveryData);
    });

    it('renders card with delivery time after data loads', async () => {
        renderWithRouter(<EstimatedDelivery productId="prod-1" />);

        await waitFor(() => {
            expect(screen.getByText('Estimated Delivery')).toBeInTheDocument();
        });
        expect(screen.getByText(/5-7 business days/)).toBeInTheDocument();
        expect(screen.getByText('Learn More')).toBeInTheDocument();
    });

    it('renders nothing when adapter returns null', async () => {
        mockGetEstimatedDelivery.mockResolvedValue(null);

        const { container } = renderWithRouter(<EstimatedDelivery productId="prod-1" />);

        // Wait for effect to settle, then verify nothing rendered
        await waitFor(() => {
            expect(mockGetEstimatedDelivery).toHaveBeenCalled();
        });
        expect(container.textContent).toBe('');
    });

    it('opens modal when Learn More is clicked', async () => {
        const user = userEvent.setup();
        renderWithRouter(<EstimatedDelivery productId="prod-1" />);

        await waitFor(() => {
            expect(screen.getByText('Learn More')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Learn More'));

        await waitFor(() => {
            expect(screen.getByTestId('info-modal')).toBeInTheDocument();
        });
    });
});
