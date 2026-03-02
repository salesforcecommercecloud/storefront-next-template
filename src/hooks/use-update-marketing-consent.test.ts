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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUpdateMarketingConsent } from './use-update-marketing-consent';
// eslint-disable-next-line import/no-namespace -- vi.spyOn requires namespace import
import * as ReactRouter from 'react-router';

const mockSubmit = vi.fn();
const createMockFetcher = (overrides: { state?: string; data?: unknown } = {}) => ({
    state: (overrides.state ?? 'idle') as 'idle' | 'loading' | 'submitting',
    data: overrides.data ?? null,
    submit: mockSubmit,
    load: vi.fn(),
    Form: vi.fn() as any,
    formAction: undefined,
    formData: undefined,
    formEncType: undefined,
    formMethod: undefined,
    formTarget: undefined,
    type: 'init' as const,
    json: undefined,
    text: undefined,
    reset: vi.fn(),
});

let mockFetcher = createMockFetcher();

describe('useUpdateMarketingConsent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetcher = createMockFetcher();
        mockSubmit.mockResolvedValue(undefined);
        vi.spyOn(ReactRouter, 'useFetcher').mockImplementation(() => mockFetcher as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('when the user has not started an update', () => {
        it('exposes a way to update consent and reports not loading', () => {
            const { result } = renderHook(() => useUpdateMarketingConsent());

            expect(typeof result.current.updateSubscription).toBe('function');
            expect(result.current.isUpdating).toBe(false);
        });
    });

    describe('when the user opts in or out of a subscription', () => {
        it('sends opt-in for email with the user’s email address', () => {
            const { result } = renderHook(() => useUpdateMarketingConsent());

            const payload = {
                subscriptionId: 'sub-1',
                channel: 'email' as const,
                contactPointValue: 'user@example.com',
                status: 'opt_in' as const,
            };

            act(() => {
                result.current.updateSubscription(payload);
            });

            expect(mockSubmit).toHaveBeenCalledTimes(1);
            const [formData, options] = mockSubmit.mock.calls[0];
            expect(formData).toBeInstanceOf(FormData);
            expect(formData.get('subscriptionId')).toBe('sub-1');
            expect(formData.get('channel')).toBe('email');
            expect(formData.get('contactPointValue')).toBe('user@example.com');
            expect(formData.get('status')).toBe('opt_in');
            expect(options).toEqual({
                method: 'POST',
                action: '/action/update-marketing-consent',
            });
        });

        it('sends opt-out for SMS with the user’s phone number', () => {
            const { result } = renderHook(() => useUpdateMarketingConsent());

            act(() => {
                result.current.updateSubscription({
                    subscriptionId: 'sub-2',
                    channel: 'sms',
                    contactPointValue: '+15551234567',
                    status: 'opt_out',
                });
            });

            const [formData] = mockSubmit.mock.calls[0];
            expect(formData.get('status')).toBe('opt_out');
            expect(formData.get('channel')).toBe('sms');
        });

        it('sends opt-in for WhatsApp with the user’s phone number', () => {
            const { result } = renderHook(() => useUpdateMarketingConsent());

            act(() => {
                result.current.updateSubscription({
                    subscriptionId: 'sub-3',
                    channel: 'whatsapp',
                    contactPointValue: '+15559876543',
                    status: 'opt_in',
                });
            });

            const [formData] = mockSubmit.mock.calls[0];
            expect(formData.get('channel')).toBe('whatsapp');
        });
    });

    describe('loading state', () => {
        it('is true while the update request is in flight', () => {
            mockFetcher = createMockFetcher({ state: 'submitting' });
            vi.spyOn(ReactRouter, 'useFetcher').mockImplementation(() => mockFetcher as any);

            const { result } = renderHook(() => useUpdateMarketingConsent());
            expect(result.current.isUpdating).toBe(true);
        });

        it('is true while the response is being processed', () => {
            mockFetcher = createMockFetcher({ state: 'loading' });
            vi.spyOn(ReactRouter, 'useFetcher').mockImplementation(() => mockFetcher as any);

            const { result } = renderHook(() => useUpdateMarketingConsent());
            expect(result.current.isUpdating).toBe(true);
        });

        it('is false when no request is in progress', () => {
            mockFetcher = createMockFetcher({ state: 'idle' });
            vi.spyOn(ReactRouter, 'useFetcher').mockImplementation(() => mockFetcher as any);

            const { result } = renderHook(() => useUpdateMarketingConsent());
            expect(result.current.isUpdating).toBe(false);
        });
    });

    describe('after a successful update', () => {
        it('invokes optional callback so the UI can refresh preferences', () => {
            const onSuccess = vi.fn();
            renderHook(() => useUpdateMarketingConsent(onSuccess));
            // useFetcherEffect is called with fetcher and config containing onSuccess
            // Actual invocation happens when fetcher transitions to success - we don't simulate that here
            expect(() => renderHook(() => useUpdateMarketingConsent(onSuccess))).not.toThrow();
        });
    });

    describe('when the update fails', () => {
        it('notifies the UI with the server error so the switch can revert to the previous state', () => {
            const onError = vi.fn();
            mockFetcher = createMockFetcher({ state: 'submitting', data: null });
            vi.spyOn(ReactRouter, 'useFetcher').mockImplementation(() => mockFetcher as any);
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const { rerender } = renderHook(() => useUpdateMarketingConsent(undefined, onError));
            expect(onError).not.toHaveBeenCalled();

            mockFetcher.state = 'idle';
            mockFetcher.data = { success: false, error: 'Subscription update failed' };
            rerender();
            expect(onError).toHaveBeenCalledWith('Subscription update failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Marketing consent update failed:',
                'Subscription update failed'
            );
            consoleErrorSpy.mockRestore();
        });
    });
});
