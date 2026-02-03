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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Payment from '@/components/checkout/components/payment';
import { createMockBasketWithPickupItems } from '@/extensions/bopis/tests/__mocks__/basket';
import { useBasket } from '@/providers/basket';

// Mock dependencies
vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));

const createDefaultProps = (overrides = {}) => ({
    onSubmit: vi.fn(),
    isLoading: false,
    actionData: undefined,
    isCompleted: false,
    isEditing: true,
    onEdit: vi.fn(),
    ...overrides,
});

describe('Payment Component - BOPIS/Store Pickup Scenarios', () => {
    const mockedUseBasket = vi.mocked(useBasket);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('hides "billing same as shipping" checkbox for store pickup orders', () => {
        // Create a basket with pickup items
        const basketWithPickup = createMockBasketWithPickupItems([
            { productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' },
        ]);

        mockedUseBasket.mockReturnValue(basketWithPickup);

        render(<Payment {...createDefaultProps({ showBillingSameAsShipping: false })} />);

        // The checkbox should NOT be rendered for store pickup
        expect(screen.queryByRole('checkbox', { name: /billing same as shipping/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/use shipping address for billing/i)).not.toBeInTheDocument();
    });

    test('does not pre-fill billing address from store address for pickup orders', () => {
        // Create a basket with store pickup
        const basketWithPickup = createMockBasketWithPickupItems([
            { productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' },
        ]);

        mockedUseBasket.mockReturnValue(basketWithPickup);

        render(<Payment {...createDefaultProps({ showBillingSameAsShipping: false })} />);

        // Check that billing address fields are NOT pre-filled with store address
        const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
        const lastNameInput = screen.getByRole('textbox', { name: /last name/i });
        const addressInput = screen.getByPlaceholderText(/street address/i);

        // These should be empty, not filled with "Store", "Location", "456 Store Avenue"
        expect(firstNameInput).toHaveValue('');
        expect(lastNameInput).toHaveValue('');
        expect(addressInput).toHaveValue('');

        // Also check cardholder name is not pre-filled
        const cardholderInput = screen.getByRole('textbox', { name: /cardholder name/i });
        expect(cardholderInput).toHaveValue('');
    });

    test('shows appropriate billing address text in summary for store pickup', () => {
        const basketWithPickup = createMockBasketWithPickupItems(
            [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
            {
                billingAddress: undefined, // No billing address set yet
            }
        );

        mockedUseBasket.mockReturnValue(basketWithPickup);

        render(<Payment {...createDefaultProps({ isEditing: false, showBillingSameAsShipping: false })} />);

        // For store pickup with no billing address, it should show appropriate message
        // Should NOT show "Same as shipping address" for store pickup
        expect(screen.queryByText(/same as shipping address/i)).not.toBeInTheDocument();
        // Should show "No billing address saved" instead
        expect(screen.getByText(/no billing address saved/i)).toBeInTheDocument();
    });

    test('ensures billing address fields are visible and required for store pickup', async () => {
        const basketWithPickup = createMockBasketWithPickupItems([
            { productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' },
        ]);

        mockedUseBasket.mockReturnValue(basketWithPickup);

        const onSubmitMock = vi.fn();
        render(<Payment {...createDefaultProps({ onSubmit: onSubmitMock, showBillingSameAsShipping: false })} />);

        // Verify billing address fields are visible (not hidden by "same as shipping" checkbox)
        expect(screen.getByRole('textbox', { name: /first name/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /last name/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/street address/i)).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /city/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /state/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /postal code/i })).toBeInTheDocument();

        const user = userEvent.setup();

        // Fill in payment info but NOT billing address
        await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111');
        await user.type(screen.getByRole('textbox', { name: /cardholder name/i }), 'Jane Doe');
        await user.type(screen.getByPlaceholderText('MM/YY'), '12/25');
        await user.type(screen.getByPlaceholderText('123'), '123');

        // Try to submit without filling billing address
        await user.click(screen.getByRole('button', { name: /continue/i }));

        // Verify the form was not submitted (onSubmit should not be called)
        await waitFor(() => {
            expect(onSubmitMock).not.toHaveBeenCalled();
        });
    });
});
