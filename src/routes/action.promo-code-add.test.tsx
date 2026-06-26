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
import { action } from './action.promo-code-add';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';

vi.mock('@/middlewares/basket.server');

const { createContext: reactCreateContext, actualReactRouter } = vi.hoisted(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reactRouter = require('react-router');
    return { createContext: React.createContext, actualReactRouter: reactRouter };
});

vi.mock('@/lib/api-clients.server');
// `t` echoes the key so message assertions read as `cart:promoCode.errors.*`.
// Spied so we can assert the action passes the request `context` through —
// bare `getTranslation()` returns the uninitialized module-global instance and
// shopper-facing keys resolve to a generic fallback (W-23127951 follow-up).
const getTranslationMock = vi.fn((_context?: unknown) => ({ t: (key: string) => key }));
vi.mock('@salesforce/storefront-next-runtime/i18n', () => ({
    getTranslation: (context?: unknown) => getTranslationMock(context),
}));
vi.mock('react-router', () => {
    return {
        ...actualReactRouter,
        createContext: reactCreateContext,
    };
});
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

import { createFormDataRequest } from '@/test-utils/request-helpers';
import { createActionArgs, expectStatus } from '@/lib/test-utils';
import { resourceRoutes } from '@/route-paths';

describe('action.promo-code-add', () => {
    const emptyBasket = { basketId: 'test-basket-123', couponItems: [] };

    const mockClients = {
        shopperBasketsV2: {
            addCouponToBasket: vi.fn(),
        },
    };

    const submit = (code: string) =>
        action(
            createActionArgs(
                createFormDataRequest(`http://localhost${resourceRoutes.promoCodeAdd}`, 'POST', { promoCode: code }),
                {} as any,
                { unstable_pattern: resourceRoutes.promoCodeAdd }
            )
        );

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getBasket).mockResolvedValue({ current: emptyBasket, snapshot: null } as any);
        vi.mocked(updateBasketResource).mockImplementation(() => {});
        vi.mocked(createApiClients).mockReturnValue(mockClients as any);
    });

    test('succeeds when SCAPI returns an applied coupon', async () => {
        mockClients.shopperBasketsV2.addCouponToBasket.mockResolvedValue({
            data: {
                basketId: 'test-basket-123',
                couponItems: [{ couponItemId: 'ci-1', code: 'SAVE10', statusCode: 'applied', valid: true }],
            },
        });

        const result = await submit('SAVE10');

        expect(result.data.success).toBe(true);
        expect(updateBasketResource).toHaveBeenCalledTimes(1);
    });

    test('succeeds for an adhoc (CSR-issued) coupon', async () => {
        mockClients.shopperBasketsV2.addCouponToBasket.mockResolvedValue({
            data: {
                basketId: 'test-basket-123',
                couponItems: [{ couponItemId: 'ci-1', code: 'CSR50', statusCode: 'adhoc', valid: true }],
            },
        });

        const result = await submit('CSR50');

        expect(result.data.success).toBe(true);
    });

    test('fails with "not applicable" when the coupon is valid but no cart item qualifies', async () => {
        // SCAPI returns HTTP 200 and parks the coupon on the basket, but no discount applies.
        mockClients.shopperBasketsV2.addCouponToBasket.mockResolvedValue({
            data: {
                basketId: 'test-basket-123',
                couponItems: [
                    { couponItemId: 'ci-1', code: 'PRODUCT', statusCode: 'no_applicable_promotion', valid: true },
                ],
            },
        });

        const result = await submit('PRODUCT');

        expectStatus(result, 400);
        expect(result.data.success).toBe(false);
        expect(result.data.error?.code).toBe('INVALID_INPUT');
        expect(result.data.error?.message).toBe('cart:promoCode.errors.notApplicable');
        // The basket is NOT committed as a success.
        expect(updateBasketResource).not.toHaveBeenCalled();
        // Translations must resolve against the request-scoped i18next instance,
        // so the action must pass `context` to getTranslation (not call it bare).
        expect(getTranslationMock).toHaveBeenCalledWith(expect.anything());
    });

    test('fails with "invalid code" for an unknown coupon', async () => {
        mockClients.shopperBasketsV2.addCouponToBasket.mockResolvedValue({
            data: {
                basketId: 'test-basket-123',
                couponItems: [{ couponItemId: 'ci-1', code: 'BOGUS', statusCode: 'coupon_code_unknown', valid: false }],
            },
        });

        const result = await submit('BOGUS');

        expectStatus(result, 400);
        expect(result.data.error?.message).toBe('cart:promoCode.errors.invalidCode');
    });

    test('fails with a 410 (not a 500) for an expired coupon', async () => {
        // Regression: no_active_promotion -> EXPIRED previously fell through to a
        // 500, misreporting an expired-coupon business outcome as a server fault.
        mockClients.shopperBasketsV2.addCouponToBasket.mockResolvedValue({
            data: {
                basketId: 'test-basket-123',
                couponItems: [
                    { couponItemId: 'ci-1', code: 'EXPIRED', statusCode: 'no_active_promotion', valid: true },
                ],
            },
        });

        const result = await submit('EXPIRED');

        expectStatus(result, 410);
        expect(result.data.success).toBe(false);
        expect(result.data.error?.code).toBe('EXPIRED');
        expect(result.data.error?.message).toBe('cart:promoCode.errors.expiredCode');
    });

    test('fails with a 409 (not a 500) when a redemption limit is exceeded', async () => {
        mockClients.shopperBasketsV2.addCouponToBasket.mockResolvedValue({
            data: {
                basketId: 'test-basket-123',
                couponItems: [
                    { couponItemId: 'ci-1', code: 'MAXED', statusCode: 'redemption_limit_exceeded', valid: true },
                ],
            },
        });

        const result = await submit('MAXED');

        expectStatus(result, 409);
        expect(result.data.success).toBe(false);
        expect(result.data.error?.code).toBe('CONFLICT');
    });

    test('identifies the newly-added coupon when the basket already has applied coupons', async () => {
        // An applied coupon is already on the basket; the new one is ineligible.
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'test-basket-123',
                couponItems: [{ couponItemId: 'ci-existing', code: 'OLD', statusCode: 'applied', valid: true }],
            },
            snapshot: null,
        } as any);
        mockClients.shopperBasketsV2.addCouponToBasket.mockResolvedValue({
            data: {
                basketId: 'test-basket-123',
                couponItems: [
                    { couponItemId: 'ci-existing', code: 'OLD', statusCode: 'applied', valid: true },
                    { couponItemId: 'ci-new', code: 'PRODUCT', statusCode: 'no_applicable_promotion', valid: true },
                ],
            },
        });

        const result = await submit('PRODUCT');

        expect(result.data.success).toBe(false);
        expect(result.data.error?.message).toBe('cart:promoCode.errors.notApplicable');
    });

    test('rejects an empty promo code before calling SCAPI', async () => {
        const result = await submit('');

        expectStatus(result, 400);
        expect(result.data.success).toBe(false);
        expect(mockClients.shopperBasketsV2.addCouponToBasket).not.toHaveBeenCalled();
    });
});
