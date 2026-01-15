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
import { MemoryRouter } from 'react-router';
import { OrderList, type Order } from './index';

const testOrders: Order[] = [
    { orderNo: 'ORD001', status: 'completed', method: 'Credit Card', amount: 150.0 },
    { orderNo: 'ORD002', status: 'new', method: 'PayPal', amount: 75.5 },
    { orderNo: 'ORD003', status: 'cancelled', method: 'Credit Card', amount: 200.0 },
];

describe('OrderList Component', () => {
    const renderOrderList = (props: Partial<React.ComponentProps<typeof OrderList>> = {}) => {
        const defaultProps = {
            title: 'Order History',
            orders: testOrders,
        };
        return render(
            <MemoryRouter>
                <OrderList {...defaultProps} {...props} />
            </MemoryRouter>
        );
    };

    describe('Header Rendering', () => {
        test('renders title', () => {
            renderOrderList({ title: 'My Orders' });
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Orders');
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

    describe('Table Headers', () => {
        test('renders all table headers', () => {
            renderOrderList();
            expect(screen.getByText('Order Number')).toBeInTheDocument();
            expect(screen.getByText('Status')).toBeInTheDocument();
            expect(screen.getByText('Method')).toBeInTheDocument();
            expect(screen.getByText('Amount')).toBeInTheDocument();
        });
    });

    describe('Order Rows', () => {
        test('renders all orders', () => {
            renderOrderList();
            expect(screen.getByText('ORD001')).toBeInTheDocument();
            expect(screen.getByText('ORD002')).toBeInTheDocument();
            expect(screen.getByText('ORD003')).toBeInTheDocument();
        });

        test('renders order details correctly', () => {
            renderOrderList();
            // Use getAllByText for items that appear multiple times
            expect(screen.getAllByText('Credit Card')).toHaveLength(2); // Two orders use Credit Card
            expect(screen.getByText('PayPal')).toBeInTheDocument();
            expect(screen.getByText('$150.00')).toBeInTheDocument();
            expect(screen.getByText('$75.50')).toBeInTheDocument();
        });

        test('renders View Details button for each order', () => {
            renderOrderList();
            const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
            expect(viewDetailsButtons).toHaveLength(testOrders.length);
        });
    });

    describe('Status Badge', () => {
        test('renders new status with primary styling', () => {
            renderOrderList({
                orders: [{ orderNo: 'ORD001', status: 'new', method: 'Credit Card', amount: 100 }],
            });
            const badge = screen.getByText('new').closest('span');
            expect(badge).toHaveClass('bg-primary/20');
        });

        test('renders completed status with success styling', () => {
            renderOrderList({
                orders: [{ orderNo: 'ORD001', status: 'completed', method: 'Credit Card', amount: 100 }],
            });
            const badge = screen.getByText('completed').closest('span');
            expect(badge).toHaveClass('bg-success/85');
        });

        test('renders cancelled status with destructive styling', () => {
            renderOrderList({
                orders: [{ orderNo: 'ORD001', status: 'cancelled', method: 'Credit Card', amount: 100 }],
            });
            const badge = screen.getByText('cancelled').closest('span');
            expect(badge).toHaveClass('bg-destructive/20');
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

        test('does not render table headers when no orders', () => {
            renderOrderList({ orders: [] });
            expect(screen.queryByText('Order Number')).not.toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        test('calls onViewDetails when View Details button is clicked', async () => {
            const user = userEvent.setup();
            const mockOnViewDetails = vi.fn();
            renderOrderList({ onViewDetails: mockOnViewDetails });

            const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
            await user.click(viewDetailsButtons[0]);

            expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
            expect(mockOnViewDetails).toHaveBeenCalledWith(testOrders[0]);
        });
    });
});
