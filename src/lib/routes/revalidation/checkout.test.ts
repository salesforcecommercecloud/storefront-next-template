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
import { describe, it, expect } from 'vitest';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { shouldRevalidate, FRAMEWORK_SKIP_REVALIDATION } from './checkout';
import { CHECKOUT_ACTION_INTENTS } from '@/components/checkout/utils/checkout-context-types';

const baseArgs = {
    currentUrl: new URL('http://localhost/checkout'),
    currentParams: {},
    nextUrl: new URL('http://localhost/checkout'),
    nextParams: {},
    formMethod: 'POST' as const,
    formAction: '/checkout',
    formEncType: 'application/x-www-form-urlencoded' as const,
    text: undefined,
    formData: undefined,
    json: undefined,
} satisfies Omit<ShouldRevalidateFunctionArgs, 'defaultShouldRevalidate'>;

describe('checkout shouldRevalidate', () => {
    describe('3xx redirect skip', () => {
        it.each([300, 301, 302, 303, 307, 308])('skips revalidation for %i', (status) => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: status,
                    defaultShouldRevalidate: true,
                })
            ).toBe(false);
        });
    });

    describe('framework_skipRevalidation flag', () => {
        it('skips when actionResult.framework_skipRevalidation is true', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true, [FRAMEWORK_SKIP_REVALIDATION]: true },
                    defaultShouldRevalidate: true,
                })
            ).toBe(false);
        });

        it('does not skip when flag is explicitly false', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true, [FRAMEWORK_SKIP_REVALIDATION]: false },
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it('does not skip when flag is absent (opt-in only)', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 200,
                    actionResult: { success: true },
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it.each([null, undefined, 'string', 42, true, [], [{ framework_skipRevalidation: true }]])(
            'ignores flag when actionResult is %p',
            (actionResult) => {
                expect(
                    shouldRevalidate({
                        ...baseArgs,
                        actionStatus: 200,
                        actionResult,
                        defaultShouldRevalidate: true,
                    })
                ).toBe(true);
            }
        );
    });

    describe('checkout step intent denylist', () => {
        const intents = [
            CHECKOUT_ACTION_INTENTS.CONTACT_INFO,
            CHECKOUT_ACTION_INTENTS.SHIPPING_ADDRESS,
            CHECKOUT_ACTION_INTENTS.SHIPPING_OPTIONS,
            CHECKOUT_ACTION_INTENTS.PAYMENT,
        ];

        it.each(intents)('skips revalidation for intent=%s', (intent) => {
            const formData = new FormData();
            formData.set('intent', intent);
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formData,
                    actionStatus: 200,
                    defaultShouldRevalidate: true,
                })
            ).toBe(false);
        });

        it('does not skip for an unknown intent', () => {
            const formData = new FormData();
            formData.set('intent', 'placeOrder');
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formData,
                    actionStatus: 200,
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it('does not skip when intent is missing from formData', () => {
            const formData = new FormData();
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formData,
                    actionStatus: 200,
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });

        it('does not skip when formData is undefined (e.g. plain navigation)', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formData: undefined,
                    actionStatus: undefined,
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
        });
    });

    describe('default fallthrough', () => {
        it('returns defaultShouldRevalidate when nothing matches (200, no flag, unknown intent)', () => {
            const formData = new FormData();
            formData.set('intent', 'something-else');
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formData,
                    actionStatus: 200,
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    formData,
                    actionStatus: 200,
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });

        it('returns defaultShouldRevalidate for navigation without an action (actionStatus undefined)', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: undefined,
                    defaultShouldRevalidate: true,
                })
            ).toBe(true);
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: undefined,
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });

        it('delegates to defaultShouldRevalidate for 4xx and 5xx', () => {
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 400,
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
            expect(
                shouldRevalidate({
                    ...baseArgs,
                    actionStatus: 500,
                    defaultShouldRevalidate: false,
                })
            ).toBe(false);
        });
    });
});
