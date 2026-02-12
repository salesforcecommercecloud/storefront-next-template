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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect } from 'vitest';
import { OrderList, type Order } from './index';

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

const testOrders: Order[] = [
    {
        orderNo: 'ORD001',
        orderDate: '2024-09-14T10:30:00Z',
        status: 'completed',
        statusLabel: 'Completed',
        total: 150.0,
        itemCount: 2,
        productItems: [
            { productId: 'prod-1', productName: 'Item 1', quantity: 1, imageUrl: '/images/item1.jpg' },
            { productId: 'prod-2', productName: 'Item 2', quantity: 1, imageUrl: '/images/item2.jpg' },
        ],
    },
    {
        orderNo: 'ORD002',
        orderDate: '2024-09-12T14:00:00Z',
        status: 'new',
        statusLabel: 'New',
        total: 75.5,
        itemCount: 1,
        productItems: [{ productId: 'prod-3', productName: 'Item 3', quantity: 1, imageUrl: '/images/item3.jpg' }],
    },
    {
        orderNo: 'ORD003',
        orderDate: '2024-09-08T11:30:00Z',
        status: 'cancelled',
        statusLabel: 'Cancelled',
        total: 200.0,
        itemCount: 3,
        productItems: [
            { productId: 'prod-4', productName: 'Item 4', quantity: 2, imageUrl: '/images/item4.jpg' },
            { productId: 'prod-5', productName: 'Item 5', quantity: 1, imageUrl: '/images/item5.jpg' },
        ],
    },
];

describe('OrderList Component', () => {
    const renderOrderList = (props: Partial<React.ComponentProps<typeof OrderList>> = {}) => {
        const defaultProps = {
            title: 'Order History',
            orders: testOrders,
        };
        return render(<OrderList {...defaultProps} {...props} />);
    };

    describe('Header Rendering', () => {
        test('renders title', () => {
            renderOrderList({ title: 'My Orders' });
            expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('My Orders');
        });

        test('renders subtitle when provided', () => {
            renderOrderList({ subtitle: 'View your order history' });
            expect(screen.getByText('View your order history')).toBeInTheDocument();
        });

        test('does not render subtitle when not provided', () => {
            renderOrderList({ subtitle: undefined });
            expect(screen.queryByText('View your order history')).not.toBeInTheDocument();
        });
    });

    describe('Order Cards', () => {
        test('renders all orders', () => {
            renderOrderList();
            // Check for status labels which are unique to each order
            expect(screen.getByText('Completed')).toBeInTheDocument();
            expect(screen.getByText('New')).toBeInTheDocument();
            expect(screen.getByText('Cancelled')).toBeInTheDocument();
        });

        test('renders order totals correctly', () => {
            renderOrderList();
            expect(screen.getByText('$150.00')).toBeInTheDocument();
            expect(screen.getByText('$75.50')).toBeInTheDocument();
            expect(screen.getByText('$200.00')).toBeInTheDocument();
        });

        test('renders View Order Details link for each order', () => {
            renderOrderList();
            const viewDetailsLinks = screen.getAllByText('View Order Details');
            expect(viewDetailsLinks).toHaveLength(testOrders.length);
        });

        test('renders Download Receipt button for each order', () => {
            renderOrderList();
            const downloadButtons = screen.getAllByText('Download Receipt');
            expect(downloadButtons).toHaveLength(testOrders.length);
        });
    });

    describe('Status Badge', () => {
        test('renders completed status with success styling', () => {
            renderOrderList({
                orders: [
                    {
                        orderNo: 'ORD001',
                        orderDate: '2024-09-14T10:30:00Z',
                        status: 'completed',
                        statusLabel: 'Completed',
                        total: 100,
                        itemCount: 1,
                        productItems: [{ productId: 'prod-1', productName: 'Item', quantity: 1 }],
                    },
                ],
            });
            const badge = screen.getByText('Completed').closest('span');
            expect(badge).toHaveClass('bg-order-status-completed');
        });

        test('renders cancelled status with destructive styling', () => {
            renderOrderList({
                orders: [
                    {
                        orderNo: 'ORD001',
                        orderDate: '2024-09-08T11:30:00Z',
                        status: 'cancelled',
                        statusLabel: 'Cancelled',
                        total: 100,
                        itemCount: 1,
                        productItems: [{ productId: 'prod-1', productName: 'Item', quantity: 1 }],
                    },
                ],
            });
            const badge = screen.getByText('Cancelled').closest('span');
            expect(badge).toHaveClass('bg-order-status-cancelled');
        });

        test('renders new status with pickup styling', () => {
            renderOrderList({
                orders: [
                    {
                        orderNo: 'ORD001',
                        orderDate: '2024-09-12T14:00:00Z',
                        status: 'new',
                        statusLabel: 'New',
                        total: 100,
                        itemCount: 1,
                        productItems: [{ productId: 'prod-1', productName: 'Item', quantity: 1 }],
                    },
                ],
            });
            const badge = screen.getByText('New').closest('span');
            expect(badge).toHaveClass('bg-order-status-new');
        });
    });

    describe('Empty State', () => {
        test('renders empty message when no orders', () => {
            renderOrderList({ orders: [] });
            expect(screen.getByText('No orders found. Start shopping to see your order history!')).toBeInTheDocument();
        });

        test('renders custom empty message when provided', () => {
            renderOrderList({ orders: [], emptyMessage: 'Custom empty message' });
            expect(screen.getByText('Custom empty message')).toBeInTheDocument();
        });

        test('does not render order cards when no orders', () => {
            renderOrderList({ orders: [] });
            expect(screen.queryByText('View Order Details')).not.toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        test('calls onViewDetails when View Order Details is clicked', async () => {
            const user = userEvent.setup();
            const mockOnViewDetails = vi.fn();
            renderOrderList({ onViewDetails: mockOnViewDetails });

            const viewDetailsLinks = screen.getAllByText('View Order Details');
            await user.click(viewDetailsLinks[0]);

            expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
            expect(mockOnViewDetails).toHaveBeenCalledWith('ORD001');
        });

        test('calls onDownloadReceipt when Download Receipt is clicked', async () => {
            const user = userEvent.setup();
            const mockOnDownloadReceipt = vi.fn();
            renderOrderList({ onDownloadReceipt: mockOnDownloadReceipt });

            const downloadButtons = screen.getAllByText('Download Receipt');
            await user.click(downloadButtons[0]);

            expect(mockOnDownloadReceipt).toHaveBeenCalledTimes(1);
            expect(mockOnDownloadReceipt).toHaveBeenCalledWith('ORD001');
        });
    });

    describe('Product Thumbnails', () => {
        test('renders product images for each order', () => {
            renderOrderList();
            const images = screen.getAllByRole('img');
            // Each order should have its product images rendered
            expect(images.length).toBeGreaterThan(0);
        });
    });

    describe('Pickup Location', () => {
        test('renders pickup location when provided', () => {
            const orderWithPickup: Order = {
                orderNo: 'ORD001',
                orderDate: '2024-09-14T10:30:00Z',
                status: 'created',
                statusLabel: 'Created',
                total: 50.0,
                itemCount: 1,
                productItems: [{ productId: 'prod-1', productName: 'Item', quantity: 1 }],
                pickupLocation: {
                    name: 'Test Store',
                    address: '123 Main St',
                    city: 'San Francisco',
                    state: 'CA',
                    postalCode: '94105',
                },
            };

            renderOrderList({ orders: [orderWithPickup] });

            expect(screen.getByText('Pickup Location')).toBeInTheDocument();
            expect(screen.getByText('Test Store')).toBeInTheDocument();
            expect(screen.getByText('123 Main St, San Francisco, CA 94105')).toBeInTheDocument();
        });

        test('does not render pickup section when not provided', () => {
            renderOrderList();
            expect(screen.queryByText('Pickup Location')).not.toBeInTheDocument();
        });
    });
});
