/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import AddressCard from './index';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

// Mock AddressDisplay component
vi.mock('@/components/address-display', () => ({
    default: ({ address }: { address: ShopperCustomers.schemas['CustomerAddress'] }) => (
        <div data-testid="address-display">
            {address.firstName} {address.lastName}
            {address.address1 && `, ${address.address1}`}
        </div>
    ),
}));

describe('AddressCard', () => {
    const mockAddress: ShopperCustomers.schemas['CustomerAddress'] = {
        addressId: 'address-123',
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main Street',
        city: 'New York',
        stateCode: 'NY',
        postalCode: '10001',
        countryCode: 'US',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders address card with address data', () => {
            render(<AddressCard address={mockAddress} />);

            expect(screen.getByText('address-123')).toBeInTheDocument();
            expect(screen.getByTestId('address-display')).toBeInTheDocument();
        });

        test('displays addressId in card title', () => {
            const addressWithCustomId: ShopperCustomers.schemas['CustomerAddress'] = {
                ...mockAddress,
                addressId: 'home-address',
            };

            render(<AddressCard address={addressWithCustomId} />);

            expect(screen.getByText('home-address')).toBeInTheDocument();
        });

        test('renders AddressDisplay component with address prop', () => {
            render(<AddressCard address={mockAddress} />);

            const addressDisplay = screen.getByTestId('address-display');
            expect(addressDisplay).toBeInTheDocument();
            expect(addressDisplay.textContent).toContain('John Doe');
            expect(addressDisplay.textContent).toContain('123 Main Street');
        });
    });

    describe('Preferred Badge', () => {
        test('displays preferred badge when isPreferred is true', () => {
            render(<AddressCard address={mockAddress} isPreferred={true} />);

            expect(screen.getByText(t('account:addresses.preferred'))).toBeInTheDocument();
        });

        test('does not display preferred badge when isPreferred is false', () => {
            render(<AddressCard address={mockAddress} isPreferred={false} />);

            expect(screen.queryByText(t('account:addresses.preferred'))).not.toBeInTheDocument();
        });

        test('does not display preferred badge when isPreferred is not provided (defaults to false)', () => {
            render(<AddressCard address={mockAddress} />);

            expect(screen.queryByText(t('account:addresses.preferred'))).not.toBeInTheDocument();
        });
    });

    describe('Action Buttons', () => {
        test('does not render footer when no action handlers are provided', () => {
            const { container } = render(<AddressCard address={mockAddress} />);

            const footer = container.querySelector('[data-slot="card-footer"]');
            expect(footer).toBeNull();
        });

        test('renders Edit button when onEdit is provided', () => {
            const onEdit = vi.fn();
            render(<AddressCard address={mockAddress} onEdit={onEdit} />);

            const editButton = screen.getByRole('button', { name: t('actionCard:edit') });
            expect(editButton).toBeInTheDocument();
            expect(editButton).toHaveAttribute('aria-label', t('actionCard:edit'));
        });

        test('renders Remove button when onRemove is provided', () => {
            const onRemove = vi.fn();
            render(<AddressCard address={mockAddress} onRemove={onRemove} />);

            const removeButton = screen.getByRole('button', { name: t('actionCard:remove') });
            expect(removeButton).toBeInTheDocument();
            expect(removeButton).toHaveAttribute('aria-label', t('actionCard:remove'));
        });

        test('renders both Edit and Remove buttons when both handlers are provided', () => {
            const onEdit = vi.fn();
            const onRemove = vi.fn();
            render(<AddressCard address={mockAddress} onEdit={onEdit} onRemove={onRemove} />);

            expect(screen.getByRole('button', { name: t('actionCard:edit') })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: t('actionCard:remove') })).toBeInTheDocument();
        });

        test('renders footer when at least one action handler is provided', () => {
            const onEdit = vi.fn();
            const { container } = render(<AddressCard address={mockAddress} onEdit={onEdit} />);

            const footer = container.querySelector('[data-slot="card-footer"]');
            expect(footer).toBeInTheDocument();
        });
    });

    describe('Button Interactions', () => {
        test('calls onEdit when Edit button is clicked', async () => {
            const user = userEvent.setup();
            const onEdit = vi.fn();
            render(<AddressCard address={mockAddress} onEdit={onEdit} />);

            const editButton = screen.getByRole('button', { name: t('actionCard:edit') });
            await user.click(editButton);

            expect(onEdit).toHaveBeenCalledTimes(1);
        });

        test('calls onRemove when Remove button is clicked', async () => {
            const user = userEvent.setup();
            const onRemove = vi.fn();
            render(<AddressCard address={mockAddress} onRemove={onRemove} />);

            const removeButton = screen.getByRole('button', { name: t('actionCard:remove') });
            await user.click(removeButton);

            expect(onRemove).toHaveBeenCalledTimes(1);
        });

        test('calls both handlers independently when both buttons are clicked', async () => {
            const user = userEvent.setup();
            const onEdit = vi.fn();
            const onRemove = vi.fn();
            render(<AddressCard address={mockAddress} onEdit={onEdit} onRemove={onRemove} />);

            const editButton = screen.getByRole('button', { name: t('actionCard:edit') });
            const removeButton = screen.getByRole('button', { name: t('actionCard:remove') });

            await user.click(editButton);
            expect(onEdit).toHaveBeenCalledTimes(1);
            expect(onRemove).not.toHaveBeenCalled();

            await user.click(removeButton);
            expect(onRemove).toHaveBeenCalledTimes(1);
            expect(onEdit).toHaveBeenCalledTimes(1); // Still only called once
        });
    });

    describe('Button Styling', () => {
        test('Remove button has destructive styling classes', () => {
            const onRemove = vi.fn();
            render(<AddressCard address={mockAddress} onRemove={onRemove} />);

            const removeButton = screen.getByRole('button', { name: t('actionCard:remove') });
            expect(removeButton).toHaveClass('text-destructive');
            expect(removeButton).toHaveClass('hover:text-destructive');
        });
    });

    describe('Card Structure', () => {
        test('card has correct className', () => {
            const { container } = render(<AddressCard address={mockAddress} />);

            const card = container.querySelector('[data-slot="card"]');
            expect(card).toHaveClass('border-border', 'gap-0', 'py-4');
        });

        test('card header contains title and action area', () => {
            render(<AddressCard address={mockAddress} isPreferred={true} />);

            expect(screen.getByText('address-123')).toBeInTheDocument();
            expect(screen.getByText(t('account:addresses.preferred'))).toBeInTheDocument();
        });

        test('card content contains AddressDisplay', () => {
            render(<AddressCard address={mockAddress} />);

            const content = screen.getByTestId('address-display').closest('[data-slot="card-content"]');
            expect(content).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        test('handles address with minimal required fields', () => {
            const minimalAddress: ShopperCustomers.schemas['CustomerAddress'] = {
                addressId: 'minimal-address',
                countryCode: 'US',
                firstName: 'Jane',
                lastName: 'Smith',
            };

            render(<AddressCard address={minimalAddress} />);

            expect(screen.getByText('minimal-address')).toBeInTheDocument();
            expect(screen.getByTestId('address-display')).toBeInTheDocument();
        });

        test('handles address with empty string addressId', () => {
            const addressWithEmptyId: ShopperCustomers.schemas['CustomerAddress'] = {
                ...mockAddress,
                addressId: '',
            };

            const { container } = render(<AddressCard address={addressWithEmptyId} />);

            // Query for the card title element specifically
            const titleElement = container.querySelector('[data-slot="card-title"]');
            expect(titleElement).toBeInTheDocument();
            expect(titleElement?.textContent).toBe('');
        });

        test('handles multiple rapid clicks on Edit button', async () => {
            const user = userEvent.setup();
            const onEdit = vi.fn();
            render(<AddressCard address={mockAddress} onEdit={onEdit} />);

            const editButton = screen.getByRole('button', { name: t('actionCard:edit') });
            await user.click(editButton);
            await user.click(editButton);
            await user.click(editButton);

            expect(onEdit).toHaveBeenCalledTimes(3);
        });

        test('handles multiple rapid clicks on Remove button', async () => {
            const user = userEvent.setup();
            const onRemove = vi.fn();
            render(<AddressCard address={mockAddress} onRemove={onRemove} />);

            const removeButton = screen.getByRole('button', { name: t('actionCard:remove') });
            await user.click(removeButton);
            await user.click(removeButton);

            expect(onRemove).toHaveBeenCalledTimes(2);
        });
    });
});
