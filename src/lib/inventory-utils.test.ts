/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect } from 'vitest';
import {
    getStoreInventoryById,
    isStoreOutOfStock,
    isSiteOutOfStock,
    getEffectiveStockLevel,
    isInStock,
} from './inventory-utils';
import { masterProductWithInventories } from '@/components/__mocks__/master-product-with-inventories';
import { setProductWithInventories } from '@/components/__mocks__/set-product-with-inventories';
import { bundleProductWithInventories } from '@/components/__mocks__/bundle-product-with-inventories';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

const mockProduct = masterProductWithInventories;
const mockSetProduct = setProductWithInventories;
const mockBundleProduct = bundleProductWithInventories;

describe('inventory-utils', () => {
    describe('getStoreInventoryById', () => {
        it('returns inventory when found', () => {
            const result = getStoreInventoryById(mockProduct, 'inventory_m');
            expect(result).toEqual({
                ats: 996,
                backorderable: false,
                id: 'inventory_m',
                orderable: true,
                preorderable: false,
                stockLevel: 996,
            });
        });

        it('returns null when inventory not found', () => {
            const result = getStoreInventoryById(mockProduct, 'non-existent');
            expect(result).toBeNull();
        });

        it('returns null when product is undefined', () => {
            const result = getStoreInventoryById(undefined, 'inventory_m');
            expect(result).toBeNull();
        });

        it('returns null when inventoryId is undefined', () => {
            const result = getStoreInventoryById(mockProduct, undefined);
            expect(result).toBeNull();
        });

        it('returns null when product has no inventories', () => {
            const productWithoutInventories = { ...mockProduct, inventories: undefined };
            const result = getStoreInventoryById(productWithoutInventories, 'inventory_m');
            expect(result).toBeNull();
        });

        it('returns null when product has empty inventories array', () => {
            const productWithEmptyInventories = { ...mockProduct, inventories: [] };
            const result = getStoreInventoryById(productWithEmptyInventories, 'inventory_m');
            expect(result).toBeNull();
        });
    });

    describe('isStoreOutOfStock', () => {
        it('returns false when product is undefined', () => {
            expect(isStoreOutOfStock(undefined, 'inventory_m')).toBe(false);
        });

        it('returns false when selectedStoreInventoryId is undefined', () => {
            expect(isStoreOutOfStock(mockProduct, undefined)).toBe(false);
        });

        it('returns false when product is in stock at store', () => {
            expect(isStoreOutOfStock(mockProduct, 'inventory_m', 1)).toBe(false);
        });

        it('returns true when product is out of stock at store', () => {
            expect(isStoreOutOfStock(mockProduct, 'inventory_out_of_stock', 1)).toBe(true);
        });

        it('returns true when inventory is not found', () => {
            expect(isStoreOutOfStock(mockProduct, 'non-existent', 1)).toBe(true);
        });

        it('returns true when quantity exceeds stock level', () => {
            expect(isStoreOutOfStock(mockProduct, 'inventory_m', 1000)).toBe(true);
        });

        it('returns false when quantity is within stock level', () => {
            expect(isStoreOutOfStock(mockProduct, 'inventory_m', 100)).toBe(false);
        });

        it('returns true when inventory exists but is not orderable', () => {
            const productWithUnorderableInventory = {
                ...mockProduct,
                inventories: [
                    {
                        id: 'inventory_m',
                        stockLevel: 100,
                        orderable: false,
                    },
                ],
            };
            expect(isStoreOutOfStock(productWithUnorderableInventory, 'inventory_m', 1)).toBe(true);
        });

        describe('for product sets', () => {
            it('returns false when all child products are in stock', () => {
                expect(isStoreOutOfStock(mockSetProduct, 'inventory_m', 1)).toBe(false);
            });

            it('returns true when any child product is out of stock', () => {
                expect(isStoreOutOfStock(mockSetProduct, 'inventory_out_of_stock', 1)).toBe(true);
            });

            it('returns true when any child product has no inventory', () => {
                expect(isStoreOutOfStock(mockSetProduct, 'non-existent', 1)).toBe(true);
            });

            it('returns true when any child product has insufficient stock', () => {
                expect(isStoreOutOfStock(mockSetProduct, 'inventory_m', 500)).toBe(true);
            });

            it('returns true when any child product is not orderable', () => {
                const setWithUnorderableChild = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventories: [
                                {
                                    id: 'inventory_m',
                                    stockLevel: 100,
                                    orderable: false,
                                },
                            ],
                        },
                        mockSetProduct.setProducts?.[1],
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isStoreOutOfStock(setWithUnorderableChild, 'inventory_m', 1)).toBe(true);
            });
        });

        describe('for bundles', () => {
            it('returns false when bundle is in stock at store', () => {
                expect(isStoreOutOfStock(mockBundleProduct, 'inventory_m', 1)).toBe(false);
            });

            it('returns true when bundle is out of stock at store', () => {
                expect(isStoreOutOfStock(mockBundleProduct, 'inventory_out_of_stock', 1)).toBe(true);
            });
        });
    });

    describe('isSiteOutOfStock', () => {
        it('returns false when product is undefined', () => {
            expect(isSiteOutOfStock(undefined)).toBe(false);
        });

        it('returns false when product is in stock', () => {
            const productWithInventory = {
                ...mockProduct,
                inventory: {
                    id: 'site-inventory',
                    ats: 100,
                    orderable: true,
                },
            } as ShopperProducts.schemas['Product'];
            expect(isSiteOutOfStock(productWithInventory, 1)).toBe(false);
        });

        it('returns true when product has no inventory', () => {
            const productWithoutInventory = {
                ...mockProduct,
                inventory: undefined,
            };
            expect(isSiteOutOfStock(productWithoutInventory, 1)).toBe(true);
        });

        it('returns true when product is out of stock', () => {
            const productOutOfStock = {
                ...mockProduct,
                inventory: {
                    id: 'site-inventory',
                    ats: 0,
                    orderable: false,
                },
            } as ShopperProducts.schemas['Product'];
            expect(isSiteOutOfStock(productOutOfStock, 1)).toBe(true);
        });

        it('returns true when quantity exceeds ats', () => {
            const productLowStock = {
                ...mockProduct,
                inventory: {
                    id: 'site-inventory',
                    ats: 5,
                    orderable: true,
                },
            } as ShopperProducts.schemas['Product'];
            expect(isSiteOutOfStock(productLowStock, 10)).toBe(true);
        });

        it('returns false when quantity is within ats', () => {
            const productWithStock = {
                ...mockProduct,
                inventory: {
                    id: 'site-inventory',
                    ats: 100,
                    orderable: true,
                },
            } as ShopperProducts.schemas['Product'];
            expect(isSiteOutOfStock(productWithStock, 10)).toBe(false);
        });

        it('returns true when product is not orderable', () => {
            const unorderableProduct = {
                ...mockProduct,
                inventory: {
                    id: 'site-inventory',
                    ats: 100,
                    orderable: false,
                },
            } as ShopperProducts.schemas['Product'];
            expect(isSiteOutOfStock(unorderableProduct, 1)).toBe(true);
        });

        describe('for product sets', () => {
            it('returns false when all child products are in stock', () => {
                const setWithInventory = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isSiteOutOfStock(setWithInventory, 1)).toBe(false);
            });

            it('returns true when any child product is out of stock', () => {
                const setWithOneOutOfStock = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 0,
                                orderable: false,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isSiteOutOfStock(setWithOneOutOfStock, 1)).toBe(true);
            });

            it('returns true when any child product has insufficient ats', () => {
                const setWithLowStock = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 5,
                                orderable: true,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isSiteOutOfStock(setWithLowStock, 10)).toBe(true);
            });

            it('returns true when any child product is not orderable', () => {
                const setWithUnorderableChild = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: false,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isSiteOutOfStock(setWithUnorderableChild, 1)).toBe(true);
            });
        });

        describe('for bundles', () => {
            it('returns false when bundle is in stock', () => {
                const bundleWithInventory = {
                    ...mockBundleProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isSiteOutOfStock(bundleWithInventory, 1)).toBe(false);
            });

            it('returns true when bundle is out of stock', () => {
                const bundleOutOfStock = {
                    ...mockBundleProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 0,
                        orderable: false,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isSiteOutOfStock(bundleOutOfStock, 1)).toBe(true);
            });
        });
    });

    describe('getEffectiveStockLevel', () => {
        it('returns 0 when product is undefined', () => {
            expect(getEffectiveStockLevel(undefined, true, 'inventory_m')).toBe(0);
        });

        describe('with store inventory', () => {
            it('returns store stock level when store is selected', () => {
                expect(getEffectiveStockLevel(mockProduct, true, 'inventory_m')).toBe(996);
            });

            it('returns 0 when store inventory is not found', () => {
                expect(getEffectiveStockLevel(mockProduct, true, 'non-existent')).toBe(0);
            });

            it('returns 0 when store inventory has no stockLevel', () => {
                const productWithUndefinedStock = {
                    ...mockProduct,
                    inventories: [
                        {
                            id: 'inventory_m',
                            stockLevel: undefined,
                            orderable: true,
                        },
                    ],
                };
                expect(getEffectiveStockLevel(productWithUndefinedStock, true, 'inventory_m')).toBe(0);
            });
        });

        describe('without store inventory (site inventory)', () => {
            it('returns product inventory ats when no variant provided', () => {
                const productWithInventory = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(getEffectiveStockLevel(productWithInventory, false, undefined)).toBe(100);
            });

            it('returns variant inventory ats when variant is provided', () => {
                const variant: ShopperProducts.schemas['Variant'] = {
                    orderable: true,
                    price: 299.99,
                    productId: '640188016716M',
                    inventory: {
                        id: 'variant-inventory',
                        ats: 50,
                        orderable: true,
                    },
                };
                const productWithInventory = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(getEffectiveStockLevel(productWithInventory, false, undefined, variant)).toBe(50);
            });

            it('returns product inventory ats when variant has no inventory', () => {
                const variant: ShopperProducts.schemas['Variant'] = {
                    orderable: true,
                    price: 299.99,
                    productId: '640188016716M',
                    inventory: undefined,
                };
                const productWithInventory = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(getEffectiveStockLevel(productWithInventory, false, undefined, variant)).toBe(100);
            });

            it('returns 0 when neither product nor variant has inventory', () => {
                const variant: ShopperProducts.schemas['Variant'] = {
                    orderable: true,
                    price: 299.99,
                    productId: '640188016716M',
                    inventory: undefined,
                };
                const productWithoutInventory = {
                    ...mockProduct,
                    inventory: undefined,
                };
                expect(getEffectiveStockLevel(productWithoutInventory, false, undefined, variant)).toBe(0);
            });
        });

        describe('for product sets', () => {
            it('returns minimum stock level across all children with store inventory', () => {
                expect(getEffectiveStockLevel(mockSetProduct, true, 'inventory_m')).toBe(376);
            });

            it('returns minimum ats across all children without store inventory', () => {
                const setWithInventory = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 50,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(getEffectiveStockLevel(setWithInventory, false, undefined)).toBe(50);
            });

            it('returns 0 when any child has no inventory with store', () => {
                expect(getEffectiveStockLevel(mockSetProduct, true, 'non-existent')).toBe(0);
            });

            it('returns 0 when any child has no inventory without store', () => {
                const setWithNoInventory = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: undefined,
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(getEffectiveStockLevel(setWithNoInventory, false, undefined)).toBe(0);
            });
        });

        describe('for bundles', () => {
            it('returns store stock level when store is selected', () => {
                expect(getEffectiveStockLevel(mockBundleProduct, true, 'inventory_m')).toBe(9966);
            });

            it('returns product inventory ats when no store is selected', () => {
                const bundleWithInventory = {
                    ...mockBundleProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(getEffectiveStockLevel(bundleWithInventory, false, undefined)).toBe(100);
            });
        });
    });

    describe('isInStock', () => {
        it('returns false when product is undefined', () => {
            expect(isInStock(undefined, true, 'inventory_m', 1)).toBe(false);
        });

        describe('with store inventory', () => {
            it('returns true when product is in stock at store', () => {
                expect(isInStock(mockProduct, true, 'inventory_m', 1)).toBe(true);
            });

            it('returns false when product is out of stock at store', () => {
                expect(isInStock(mockProduct, true, 'inventory_out_of_stock', 1)).toBe(false);
            });

            it('returns false when inventory is not found', () => {
                expect(isInStock(mockProduct, true, 'non-existent', 1)).toBe(false);
            });

            it('returns false when quantity exceeds stock level', () => {
                expect(isInStock(mockProduct, true, 'inventory_m', 1000)).toBe(false);
            });

            it('returns true when quantity is within stock level', () => {
                expect(isInStock(mockProduct, true, 'inventory_m', 100)).toBe(true);
            });

            it('returns false when inventory exists but is not orderable', () => {
                const productWithUnorderableInventory = {
                    ...mockProduct,
                    inventories: [
                        {
                            id: 'inventory_m',
                            stockLevel: 100,
                            orderable: false,
                        },
                    ],
                };
                expect(isInStock(productWithUnorderableInventory, true, 'inventory_m', 1)).toBe(false);
            });
        });

        describe('without store inventory (site inventory)', () => {
            it('returns true when product is in stock', () => {
                const productWithInventory = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(productWithInventory, false, undefined, 1)).toBe(true);
            });

            it('returns false when product has no inventory', () => {
                const productWithoutInventory = {
                    ...mockProduct,
                    inventory: undefined,
                };
                expect(isInStock(productWithoutInventory, false, undefined, 1)).toBe(false);
            });

            it('returns false when product is out of stock', () => {
                const productOutOfStock = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 0,
                        orderable: false,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(productOutOfStock, false, undefined, 1)).toBe(false);
            });

            it('returns false when quantity exceeds ats', () => {
                const productLowStock = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 5,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(productLowStock, false, undefined, 10)).toBe(false);
            });

            it('returns true when quantity is within ats', () => {
                const productWithStock = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(productWithStock, false, undefined, 10)).toBe(true);
            });

            it('returns false when product is not orderable', () => {
                const unorderableProduct = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: false,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(unorderableProduct, false, undefined, 1)).toBe(false);
            });

            it('uses variant inventory when variant is provided', () => {
                const variant: ShopperProducts.schemas['Variant'] = {
                    orderable: true,
                    price: 299.99,
                    productId: '640188016716M',
                    inventory: {
                        id: 'variant-inventory',
                        ats: 50,
                        orderable: true,
                    },
                };
                const productWithInventory = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(productWithInventory, false, undefined, 1, variant)).toBe(true);
            });

            it('falls back to product inventory when variant has no inventory', () => {
                const variant: ShopperProducts.schemas['Variant'] = {
                    orderable: true,
                    price: 299.99,
                    productId: '640188016716M',
                    inventory: undefined,
                };
                const productWithInventory = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(productWithInventory, false, undefined, 1, variant)).toBe(true);
            });

            it('returns false when variant inventory is out of stock', () => {
                const variant: ShopperProducts.schemas['Variant'] = {
                    orderable: true,
                    price: 299.99,
                    productId: '640188016716M',
                    inventory: {
                        id: 'variant-inventory',
                        ats: 0,
                        orderable: false,
                    },
                };
                const productWithInventory = {
                    ...mockProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(productWithInventory, false, undefined, 1, variant)).toBe(false);
            });
        });

        describe('for product sets', () => {
            it('returns true when all child products are in stock at store', () => {
                expect(isInStock(mockSetProduct, true, 'inventory_m', 1)).toBe(true);
            });

            it('returns false when any child product is out of stock at store', () => {
                expect(isInStock(mockSetProduct, true, 'inventory_out_of_stock', 1)).toBe(false);
            });

            it('returns false when any child product has no inventory at store', () => {
                expect(isInStock(mockSetProduct, true, 'non-existent', 1)).toBe(false);
            });

            it('returns false when any child product has insufficient stock at store', () => {
                expect(isInStock(mockSetProduct, true, 'inventory_m', 500)).toBe(false);
            });

            it('returns true when all child products are in stock (site inventory)', () => {
                const setWithInventory = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(setWithInventory, false, undefined, 1)).toBe(true);
            });

            it('returns false when any child product is out of stock (site inventory)', () => {
                const setWithOneOutOfStock = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 0,
                                orderable: false,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(setWithOneOutOfStock, false, undefined, 1)).toBe(false);
            });

            it('returns false when any child product has insufficient ats', () => {
                const setWithLowStock = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 5,
                                orderable: true,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(setWithLowStock, false, undefined, 10)).toBe(false);
            });

            it('returns false when any child product is not orderable', () => {
                const setWithUnorderableChild = {
                    ...mockSetProduct,
                    setProducts: [
                        {
                            ...(mockSetProduct.setProducts?.[0] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: false,
                            },
                        },
                        {
                            ...(mockSetProduct.setProducts?.[1] ?? {}),
                            inventory: {
                                id: 'site-inventory',
                                ats: 100,
                                orderable: true,
                            },
                        },
                    ],
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(setWithUnorderableChild, false, undefined, 1)).toBe(false);
            });
        });

        describe('for bundles', () => {
            it('returns true when bundle is in stock at store', () => {
                expect(isInStock(mockBundleProduct, true, 'inventory_m', 1)).toBe(true);
            });

            it('returns false when bundle is out of stock at store', () => {
                expect(isInStock(mockBundleProduct, true, 'inventory_out_of_stock', 1)).toBe(false);
            });

            it('returns true when bundle is in stock (site inventory)', () => {
                const bundleWithInventory = {
                    ...mockBundleProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 100,
                        orderable: true,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(bundleWithInventory, false, undefined, 1)).toBe(true);
            });

            it('returns false when bundle is out of stock (site inventory)', () => {
                const bundleOutOfStock = {
                    ...mockBundleProduct,
                    inventory: {
                        id: 'site-inventory',
                        ats: 0,
                        orderable: false,
                    },
                } as ShopperProducts.schemas['Product'];
                expect(isInStock(bundleOutOfStock, false, undefined, 1)).toBe(false);
            });
        });
    });
});
