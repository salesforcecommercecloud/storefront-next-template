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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSelectedDeliveryOptionValid } from './product-actions';
import { createMockBasketWithPickupItems } from '@/extensions/bopis/tests/__mocks__/basket';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import type { ToastType } from '@/components/toast';

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    getConfig: vi.fn(),
}));

vi.mock('@/extensions/bopis/lib/api/shipment.server', () => ({
    updateShipmentForPickup: vi.fn(),
}));

beforeEach(() => {
    vi.resetAllMocks();
});

describe('isSelectedDeliveryOptionValid', () => {
    let mockAddToast: (message: string, type: ToastType) => void;

    beforeEach(() => {
        mockAddToast = vi.fn() as unknown as (message: string, type: ToastType) => void;
    });

    it('should return true when basket is undefined', () => {
        const result = isSelectedDeliveryOptionValid(undefined, 'store-123', mockAddToast);
        expect(result).toBe(true);
        expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('should return true when basket has no product items', () => {
        const basket = createMockBasketWithPickupItems(undefined, {
            productItems: undefined,
        });

        const result = isSelectedDeliveryOptionValid(basket, 'store-123', mockAddToast);
        expect(result).toBe(true);
        expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('should return true when adding delivery item to basket with empty productItems array', () => {
        const basket = createMockBasketWithPickupItems();

        // Adding delivery item (null) when existingStoreId is undefined should pass
        const result = isSelectedDeliveryOptionValid(basket, null, mockAddToast);
        expect(result).toBe(true);
        expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('should return true when adding delivery item to empty basket', () => {
        const basket = createMockBasketWithPickupItems();

        const result = isSelectedDeliveryOptionValid(basket, null, mockAddToast);
        expect(result).toBe(true);
        expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('should return true when adding pickup item from same store to basket with pickup items', () => {
        const basket = createMockBasketWithPickupItems([
            { productId: 'product-1', inventoryId: 'inventory-1', storeId: 'store-123' },
        ]);

        const result = isSelectedDeliveryOptionValid(basket, 'store-123', mockAddToast);
        expect(result).toBe(true);
        expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('should return false and show error when adding pickup item from different store', () => {
        const basket = createMockBasketWithPickupItems([
            { productId: 'product-1', inventoryId: 'inventory-1', storeId: 'store-123' },
        ]);

        const result = isSelectedDeliveryOptionValid(basket, 'store-456', mockAddToast);
        const { t } = getTranslation();
        expect(result).toBe(false);
        expect(mockAddToast).toHaveBeenCalledWith(t('extBopis:cart.addToCartValidation.changeStoreError'), 'error');
    });
});
