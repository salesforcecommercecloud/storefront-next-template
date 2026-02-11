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
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Order History');
        });

        test('renders subtitle', () => {
            renderAccountOrders();
            expect(screen.getByText('View and track your orders')).toBeInTheDocument();
        });

        test('renders mock orders', () => {
            renderAccountOrders();
            // Check for mock order numbers
            expect(screen.getByText('INV001')).toBeInTheDocument();
            expect(screen.getByText('INV002')).toBeInTheDocument();
            expect(screen.getByText('INV003')).toBeInTheDocument();
            expect(screen.getByText('INV004')).toBeInTheDocument();
            expect(screen.getByText('INV005')).toBeInTheDocument();
        });

        test('renders View Details buttons', () => {
            renderAccountOrders();
            const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
            expect(viewDetailsButtons).toHaveLength(5); // 5 mock orders
        });
    });

    describe('Order Status Display', () => {
        test('renders new status with primary badge', () => {
            renderAccountOrders();
            const newBadges = screen.getAllByText('new');
            expect(newBadges[0].closest('span')).toHaveClass('bg-primary/20');
        });

        test('renders completed status with success badge', () => {
            renderAccountOrders();
            const completedBadges = screen.getAllByText('completed');
            expect(completedBadges[0].closest('span')).toHaveClass('bg-success/85');
        });

        test('renders cancelled status with destructive badge', () => {
            renderAccountOrders();
            const cancelledBadge = screen.getByText('cancelled').closest('span');
            expect(cancelledBadge).toHaveClass('bg-destructive/20');
        });
    });
});
