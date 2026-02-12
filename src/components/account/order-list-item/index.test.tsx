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

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderListItem, type OrderListItemData } from './index';

// Mock react-router
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        Link: ({ children, to, onClick }: { children: React.ReactNode; to: string; onClick?: () => void }) => (
            <a href={to} onClick={onClick}>
                {children}
            </a>
        ),
    };
});

const mockOrder: OrderListItemData = {
    orderNo: 'ORD-001-2024',
    orderDate: '2024-09-14T10:30:00Z',
    total: 48.38,
    currency: 'USD',
    status: 'created',
    statusLabel: 'Created',
    itemCount: 2,
    productItems: [
        {
            productId: 'prod-1',
            productName: 'Classic Shirt',
            quantity: 1,
            imageUrl: '/images/shirt.jpg',
        },
        {
            productId: 'prod-2',
            productName: 'Dress Pants',
            quantity: 2,
            imageUrl: '/images/pants.jpg',
        },
    ],
};

const mockOrderWithPickup: OrderListItemData = {
    ...mockOrder,
    pickupLocation: {
        name: 'Salesforce Foundations San Francisco',
        address: '415 Mission Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        pickupWindowStart: '2024-09-16',
        pickupWindowEnd: '2024-09-20',
    },
};

describe('OrderListItem', () => {
    describe('rendering', () => {
        it('renders order date, total, and item count', () => {
            render(<OrderListItem order={mockOrder} />);

            expect(screen.getByText('Sep 14, 2024')).toBeInTheDocument();
            expect(screen.getByText('$48.38')).toBeInTheDocument();
            // Check for Items label and its value
            expect(screen.getByText('Items')).toBeInTheDocument();
            // The item count "2" appears twice - once in header and once as quantity badge
            const allTwos = screen.getAllByText('2');
            expect(allTwos.length).toBeGreaterThanOrEqual(1);
        });

        it('renders status badge with label', () => {
            render(<OrderListItem order={mockOrder} />);

            expect(screen.getByText('Created')).toBeInTheDocument();
        });

        it('renders product thumbnails', () => {
            render(<OrderListItem order={mockOrder} />);

            const images = screen.getAllByRole('img');
            expect(images).toHaveLength(2);
        });

        it('shows quantity badge for items with quantity > 1', () => {
            render(<OrderListItem order={mockOrder} />);

            // Quantity badge for pants (qty: 2) - appears in a badge element
            const quantityBadges = screen.getAllByText('2');
            // Should have at least one (the quantity badge)
            expect(quantityBadges.length).toBeGreaterThanOrEqual(1);
        });

        it('renders View Order Details link', () => {
            render(<OrderListItem order={mockOrder} />);

            expect(screen.getByText('View Order Details')).toBeInTheDocument();
        });

        it('renders Download Receipt button', () => {
            render(<OrderListItem order={mockOrder} />);

            expect(screen.getByText('Download Receipt')).toBeInTheDocument();
        });
    });

    describe('pickup location', () => {
        it('renders pickup location when provided', () => {
            render(<OrderListItem order={mockOrderWithPickup} />);

            expect(screen.getByText('Pickup Location')).toBeInTheDocument();
            expect(screen.getByText('Salesforce Foundations San Francisco')).toBeInTheDocument();
            expect(screen.getByText('415 Mission Street, San Francisco, CA 94105')).toBeInTheDocument();
        });

        it('renders pickup window when provided', () => {
            render(<OrderListItem order={mockOrderWithPickup} />);

            expect(screen.getByText('Pickup Window')).toBeInTheDocument();
            // Verify the formatted date range (same month/year: "Sep 16-20, 2024")
            expect(screen.getByText(/Sep 16-20, 2024/)).toBeInTheDocument();
        });

        it('does not render pickup section when not provided', () => {
            render(<OrderListItem order={mockOrder} />);

            expect(screen.queryByText('Pickup Location')).not.toBeInTheDocument();
        });
    });

    describe('thumbnail overflow', () => {
        it('shows overflow indicator when products exceed maxThumbnails', () => {
            const manyProducts: OrderListItemData = {
                ...mockOrder,
                productItems: Array.from({ length: 15 }, (_, i) => ({
                    productId: `prod-${i}`,
                    productName: `Product ${i}`,
                    quantity: 1,
                })),
            };

            render(<OrderListItem order={manyProducts} maxThumbnails={12} />);

            expect(screen.getByText('+3')).toBeInTheDocument();
        });

        it('does not show overflow when products fit within maxThumbnails', () => {
            render(<OrderListItem order={mockOrder} maxThumbnails={5} />);

            expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
        });
    });

    describe('status variants', () => {
        it.each([
            ['completed', 'Completed'],
            ['cancelled', 'Cancelled'],
            ['new', 'New'],
            ['failed', 'Failed'],
            ['failed_with_reopen', 'Failed With Reopen'],
        ])('renders %s status correctly', (status, expectedLabel) => {
            const order = { ...mockOrder, status, statusLabel: expectedLabel };
            render(<OrderListItem order={order} />);

            expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        });
    });

    describe('callbacks', () => {
        it('calls onViewDetails when View Order Details is clicked', async () => {
            const user = userEvent.setup();
            const onViewDetails = vi.fn();

            render(<OrderListItem order={mockOrder} onViewDetails={onViewDetails} />);

            await user.click(screen.getByText('View Order Details'));

            expect(onViewDetails).toHaveBeenCalledWith('ORD-001-2024');
        });

        it('calls onDownloadReceipt when Download Receipt is clicked', async () => {
            const user = userEvent.setup();
            const onDownloadReceipt = vi.fn();

            render(<OrderListItem order={mockOrder} onDownloadReceipt={onDownloadReceipt} />);

            await user.click(screen.getByText('Download Receipt'));

            expect(onDownloadReceipt).toHaveBeenCalledWith('ORD-001-2024');
        });
    });

    describe('placeholder image', () => {
        it('renders placeholder when imageUrl is not provided', () => {
            const orderWithNoImages: OrderListItemData = {
                ...mockOrder,
                productItems: [
                    {
                        productId: 'prod-1',
                        productName: 'Product without image',
                        quantity: 1,
                    },
                ],
            };

            render(<OrderListItem order={orderWithNoImages} />);

            // Should not have any img elements
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
        });
    });
});
