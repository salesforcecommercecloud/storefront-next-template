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
import { describe, test, expect } from 'vitest';
import { MemoryRouter } from 'react-router';
import OrderListPage from './_app.account.orders._index';

describe('AccountOrders Page', () => {
    const renderAccountOrders = () => {
        return render(
            <MemoryRouter>
                <OrderListPage />
            </MemoryRouter>
        );
    };

    describe('Page Content', () => {
        test('renders Order History title', () => {
            renderAccountOrders();
            expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Order History');
        });

        test('renders subtitle', () => {
            renderAccountOrders();
            expect(screen.getByText('View and track your orders')).toBeInTheDocument();
        });

        test('renders mock orders', () => {
            renderAccountOrders();
            // Check for mock order links by href (order numbers are not visibly rendered, but used in links)
            const orderLinks = screen.getAllByRole('link');
            const orderHrefs = orderLinks.map((link) => link.getAttribute('href'));

            expect(orderHrefs).toContain('/account/orders/ORD-2024-001');
            expect(orderHrefs).toContain('/account/orders/ORD-2024-002');
            expect(orderHrefs).toContain('/account/orders/ORD-2024-003');
            expect(orderHrefs).toContain('/account/orders/ORD-2024-004');
            expect(orderHrefs).toContain('/account/orders/ORD-2024-005');
            expect(orderHrefs).toContain('/account/orders/ORD-2024-006');
        });

        test('renders View Details buttons', () => {
            renderAccountOrders();
            const viewDetailsLinks = screen.getAllByText('View Order Details');
            expect(viewDetailsLinks).toHaveLength(6); // 6 mock orders
        });
    });

    describe('Order Status Display', () => {
        test('renders created status with pickup badge', () => {
            renderAccountOrders();
            const createdBadge = screen.getByText('Created').closest('span');
            expect(createdBadge).toHaveClass('bg-order-status-new');
        });

        test('renders new status with pickup badge', () => {
            renderAccountOrders();
            const newBadge = screen.getByText('New').closest('span');
            expect(newBadge).toHaveClass('bg-order-status-new');
        });

        test('renders completed status with delivered badge', () => {
            renderAccountOrders();
            const completedBadge = screen.getByText('Completed').closest('span');
            expect(completedBadge).toHaveClass('bg-order-status-completed');
        });

        test('renders cancelled status with cancelled badge', () => {
            renderAccountOrders();
            const cancelledBadge = screen.getByText('Cancelled').closest('span');
            expect(cancelledBadge).toHaveClass('bg-order-status-cancelled');
        });

        test('renders failed status with cancelled badge', () => {
            renderAccountOrders();
            const failedBadge = screen.getByText('Failed').closest('span');
            expect(failedBadge).toHaveClass('bg-order-status-cancelled');
        });

        test('renders failed_with_reopen status with partial badge', () => {
            renderAccountOrders();
            const failedWithReopenBadge = screen.getByText('Failed With Reopen').closest('span');
            expect(failedWithReopenBadge).toHaveClass('bg-order-status-warning');
        });
    });
});
