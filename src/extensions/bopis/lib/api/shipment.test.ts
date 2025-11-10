/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { updateShipmentForPickup } from './shipment';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import type { RouterContextProvider } from 'react-router';

// Mock createClient
vi.mock('@/lib/scapi', () => ({
    default: vi.fn(),
}));

describe('Shipment API utilities', () => {
    const mockContext = {} as RouterContextProvider;

    describe('updateShipmentForPickup', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        test('should update shipment with c_fromStoreId', async () => {
            const mockBasket: Partial<ShopperBasketsTypes.Basket> = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: 'store-123',
                    },
                ],
            };

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue(mockBasket);

            const createClient = await import('@/lib/scapi');
            vi.mocked(createClient.default).mockReturnValue({
                ShopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            const result = await updateShipmentForPickup(mockContext, 'test-basket', 'me', 'store-123');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                parameters: {
                    basketId: 'test-basket',
                    shipmentId: 'me',
                },
                body: {
                    c_fromStoreId: 'store-123',
                },
            });
            expect(result).toEqual(mockBasket);
        });

        test('should use default shipmentId "me"', async () => {
            const mockBasket: Partial<ShopperBasketsTypes.Basket> = {
                basketId: 'test-basket',
            };

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue(mockBasket);

            const createClient = await import('@/lib/scapi');
            vi.mocked(createClient.default).mockReturnValue({
                ShopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            await updateShipmentForPickup(mockContext, 'test-basket', undefined, 'store-456');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                parameters: {
                    basketId: 'test-basket',
                    shipmentId: 'me',
                },
                body: {
                    c_fromStoreId: 'store-456',
                },
            });
        });

        test('should handle API errors', async () => {
            const mockError = new Error('API Error');
            const mockUpdateShipmentForBasket = vi.fn().mockRejectedValue(mockError);

            const createClient = await import('@/lib/scapi');
            vi.mocked(createClient.default).mockReturnValue({
                ShopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            await expect(updateShipmentForPickup(mockContext, 'test-basket', 'me', 'store-123')).rejects.toThrow(
                'API Error'
            );
        });
    });
});
