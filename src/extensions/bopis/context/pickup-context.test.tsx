/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import PickupProvider, { usePickup } from './pickup-context';
import type { PropsWithChildren } from 'react';

describe('PickupProvider', () => {
    const wrapper = ({ children }: PropsWithChildren) => <PickupProvider>{children}</PickupProvider>;

    describe('usePickup hook', () => {
        it('returns null when used outside provider', () => {
            const { result } = renderHook(() => usePickup());

            expect(result.current).toBeNull();
        });

        it('initializes with empty map', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            expect(result.current).toBeDefined();
            if (result.current) {
                expect(result.current.pickupBasketItems).toBeInstanceOf(Map);
                expect(result.current.pickupBasketItems.size).toBe(0);
            }
        });

        it('provides all required methods', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            expect(result.current).toBeDefined();
            if (result.current) {
                expect(typeof result.current.addItem).toBe('function');
                expect(typeof result.current.removeItem).toBe('function');
                expect(typeof result.current.clearItems).toBe('function');
            }
        });
    });

    describe('addItem', () => {
        it('adds a product to the map', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                }
            });

            if (result.current) {
                const pickupInfo = result.current.pickupBasketItems.get('product-1');
                expect(pickupInfo).toEqual({ inventoryId: 'inventory-A', storeId: 'store-1' });
                expect(result.current.pickupBasketItems.size).toBe(1);
            }
        });

        it('updates inventoryId and storeId if product already exists', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                }
            });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-B', 'store-2');
                }
            });

            if (result.current) {
                const pickupInfo = result.current.pickupBasketItems.get('product-1');
                expect(pickupInfo).toEqual({ inventoryId: 'inventory-B', storeId: 'store-2' });
                expect(result.current.pickupBasketItems.size).toBe(1);
            }
        });

        it('adds multiple products correctly', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                    result.current.addItem('product-2', 'inventory-B', 'store-2');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(2);
                expect(result.current.pickupBasketItems.get('product-1')).toEqual({
                    inventoryId: 'inventory-A',
                    storeId: 'store-1',
                });
                expect(result.current.pickupBasketItems.get('product-2')).toEqual({
                    inventoryId: 'inventory-B',
                    storeId: 'store-2',
                });
            }
        });
    });

    describe('removeItem', () => {
        it('removes a product from the map', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                }
            });

            act(() => {
                if (result.current) {
                    result.current.removeItem('product-1');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.has('product-1')).toBe(false);
                expect(result.current.pickupBasketItems.size).toBe(0);
            }
        });

        it('does nothing if product does not exist', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                }
            });

            act(() => {
                if (result.current) {
                    result.current.removeItem('product-2');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.has('product-1')).toBe(true);
                expect(result.current.pickupBasketItems.size).toBe(1);
            }
        });

        it('removes only the specified product', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                    result.current.addItem('product-2', 'inventory-B', 'store-2');
                }
            });

            act(() => {
                if (result.current) {
                    result.current.removeItem('product-1');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.has('product-1')).toBe(false);
                expect(result.current.pickupBasketItems.has('product-2')).toBe(true);
                expect(result.current.pickupBasketItems.size).toBe(1);
            }
        });
    });

    describe('clearItems', () => {
        it('clears all pickup items', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                    result.current.addItem('product-2', 'inventory-B', 'store-2');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(2);
            }

            act(() => {
                if (result.current) {
                    result.current.clearItems();
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(0);
            }
        });

        it('is safe to call on an empty map', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(0);
            }

            act(() => {
                if (result.current) {
                    result.current.clearItems();
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(0);
            }
        });
    });

    describe('initialItems prop', () => {
        it('accepts initial items', () => {
            const initialItems = new Map([
                ['product-1', { inventoryId: 'inventory-A', storeId: 'store-1' }],
                ['product-2', { inventoryId: 'inventory-B', storeId: 'store-2' }],
            ]);

            const customWrapper = ({ children }: PropsWithChildren) => (
                <PickupProvider initialItems={initialItems}>{children}</PickupProvider>
            );

            const { result } = renderHook(() => usePickup(), { wrapper: customWrapper });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(2);
                expect(result.current.pickupBasketItems.get('product-1')).toEqual({
                    inventoryId: 'inventory-A',
                    storeId: 'store-1',
                });
                expect(result.current.pickupBasketItems.get('product-2')).toEqual({
                    inventoryId: 'inventory-B',
                    storeId: 'store-2',
                });
            }
        });

        it('uses empty map when initialItems is undefined', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(0);
            }
        });
    });

    describe('state immutability', () => {
        it('creates new map instance on add', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            if (!result.current) return;
            const initialMap = result.current.pickupBasketItems;

            act(() => {
                result.current?.addItem('product-1', 'inventory-A', 'store-1');
            });

            expect(result.current.pickupBasketItems).not.toBe(initialMap);
        });

        it('creates new map instance on remove', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                }
            });

            if (!result.current) return;
            const mapAfterAdd = result.current.pickupBasketItems;

            act(() => {
                if (result.current) {
                    result.current.removeItem('product-1');
                }
            });

            expect(result.current.pickupBasketItems).not.toBe(mapAfterAdd);
        });

        it('creates new map instance on clear', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                }
            });

            if (!result.current) return;
            const mapAfterAdd = result.current.pickupBasketItems;

            act(() => {
                if (result.current) {
                    result.current.clearItems();
                }
            });

            expect(result.current.pickupBasketItems).not.toBe(mapAfterAdd);
        });
    });

    describe('complex scenarios', () => {
        it('maintains state consistency across multiple actions', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-1', 'inventory-A', 'store-1');
                }
            });

            act(() => {
                if (result.current) {
                    result.current.removeItem('product-1');
                }
            });

            act(() => {
                if (result.current) {
                    result.current.addItem('product-2', 'inventory-B', 'store-2');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(1);
                expect(result.current.pickupBasketItems.get('product-2')).toEqual({
                    inventoryId: 'inventory-B',
                    storeId: 'store-2',
                });
            }
        });

        it('handles add, remove, and clear in sequence', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('p1', 'i1', 's1');
                    result.current.addItem('p2', 'i2', 's2');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(2);
            }

            act(() => {
                if (result.current) {
                    result.current.removeItem('p1');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(1);
            }

            act(() => {
                if (result.current) {
                    result.current.clearItems();
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(0);
            }
        });

        it('correctly handles clear and then add new items', () => {
            const { result } = renderHook(() => usePickup(), { wrapper });

            act(() => {
                if (result.current) {
                    result.current.addItem('prod1', 'inv1', 'store1');
                }
            });

            act(() => {
                if (result.current) {
                    result.current.clearItems();
                }
            });

            act(() => {
                if (result.current) {
                    result.current.addItem('prod2', 'inv2', 'store2');
                }
            });

            if (result.current) {
                expect(result.current.pickupBasketItems.size).toBe(1);
                expect(result.current.pickupBasketItems.get('prod2')).toEqual({
                    inventoryId: 'inv2',
                    storeId: 'store2',
                });
            }
        });
    });
});
