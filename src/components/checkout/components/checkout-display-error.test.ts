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
import { describe, test, expect } from 'vitest';
import { getCheckoutDisplayError } from './checkout-display-error';

describe('getCheckoutDisplayError', () => {
    test('returns undefined when data is null', () => {
        expect(getCheckoutDisplayError(null)).toBeUndefined();
    });

    test('returns undefined when data is undefined', () => {
        expect(getCheckoutDisplayError(undefined)).toBeUndefined();
    });

    test('returns undefined when step does not match', () => {
        expect(
            getCheckoutDisplayError({ step: 'contactInfo', formError: 'Email required' }, 'shippingAddress')
        ).toBeUndefined();
    });

    test('returns formError when step matches', () => {
        expect(getCheckoutDisplayError({ step: 'contactInfo', formError: 'Email already in use' }, 'contactInfo')).toBe(
            'Email already in use'
        );
    });

    test('returns error when step matches and formError is absent', () => {
        expect(getCheckoutDisplayError({ step: 'payment', error: 'Payment failed' }, 'payment')).toBe('Payment failed');
    });

    test('prefers error over formError when both present', () => {
        expect(
            getCheckoutDisplayError(
                { step: 'contactInfo', error: 'Server error', formError: 'Validation error' },
                'contactInfo'
            )
        ).toBe('Server error');
    });

    test('returns undefined when step matches but message is empty string', () => {
        expect(getCheckoutDisplayError({ step: 'contactInfo', formError: '' }, 'contactInfo')).toBeUndefined();
    });

    test('returns undefined when step matches but message is not a string', () => {
        expect(
            getCheckoutDisplayError({ step: 'contactInfo', formError: 123 as unknown as string }, 'contactInfo')
        ).toBeUndefined();
    });

    test('returns message when step is not passed (any step)', () => {
        expect(getCheckoutDisplayError({ step: 'shipping', formError: 'Address invalid' })).toBe('Address invalid');
    });
});
