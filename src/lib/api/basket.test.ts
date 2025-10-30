import { describe, test, expect, vi } from 'vitest';
import { getBasketCurrency } from './basket';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';

describe('getBasketCurrency', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    test('should return basket currency when available', () => {
        const basket: Partial<ShopperBasketsTypes.Basket> = {
            basketId: 'test-basket',
            currency: 'EUR',
        };

        const result = getBasketCurrency(basket as ShopperBasketsTypes.Basket);

        expect(result).toBe('EUR');
    });

    test('should return site currency when basket has no currency', () => {
        vi.stubEnv('PUBLIC_SITE_CURRENCY', 'EUR');

        const basket: Partial<ShopperBasketsTypes.Basket> = {
            basketId: 'test-basket',
            // currency is undefined
        };

        const result = getBasketCurrency(basket as ShopperBasketsTypes.Basket);

        expect(result).toBe('EUR');
    });

    test('should return USD fallback when basket and site have no currency', () => {
        vi.stubEnv('PUBLIC_SITE_CURRENCY', '');

        const basket: Partial<ShopperBasketsTypes.Basket> = {
            basketId: 'test-basket',
            // currency is undefined
        };

        const result = getBasketCurrency(basket as ShopperBasketsTypes.Basket);

        expect(result).toBe('USD');
    });

    test('should return USD fallback when basket is undefined', () => {
        const result = getBasketCurrency(undefined);

        expect(result).toBe('USD');
    });

    test('should handle empty string currency', () => {
        const basket: Partial<ShopperBasketsTypes.Basket> = {
            basketId: 'test-basket',
            currency: '',
        };

        const result = getBasketCurrency(basket as ShopperBasketsTypes.Basket);

        expect(result).toBe('USD');
    });

    test('should handle various currency codes', () => {
        const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

        currencies.forEach((currency) => {
            const basket: Partial<ShopperBasketsTypes.Basket> = {
                basketId: 'test-basket',
                currency,
            };

            const result = getBasketCurrency(basket as ShopperBasketsTypes.Basket);

            expect(result).toBe(currency);
        });
    });
});
