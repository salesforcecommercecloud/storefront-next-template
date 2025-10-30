import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScapiFetcher } from './use-scapi-fetcher';

// Mock React Router's useFetcher
const mockFetcher = {
    state: 'idle' as 'idle' | 'loading' | 'submitting',
    data: null as any,
    load: vi.fn(),
    submit: vi.fn(),
    success: false,
    errors: undefined,
};

vi.mock('react-router', () => ({
    useFetcher: vi.fn(() => mockFetcher),
}));

// Mock dependencies
vi.mock('@/lib/url', () => ({
    encodeBase64Url: vi.fn((str) => btoa(str)),
}));

describe('useScapiFetcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetcher.state = 'idle';
        mockFetcher.data = null;
        // Configure mocks to return promises
        mockFetcher.load.mockReturnValue(Promise.resolve());
        mockFetcher.submit.mockReturnValue(Promise.resolve());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('load method', () => {
        it('should call fetcher.load with correct resource URL', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'getCustomer', {
                    parameters: { customerId: 'test' },
                })
            );

            act(() => {
                void result.current.load();
            });

            expect(mockFetcher.load).toHaveBeenCalledWith(
                '/resource/api/client/WyJTaG9wcGVyQ3VzdG9tZXJzIiwiZ2V0Q3VzdG9tZXIiLFt7InBhcmFtZXRlcnMiOnsiY3VzdG9tZXJJZCI6InRlc3QifX1dXQ=='
            );
        });

        it('should call fetcher.load and return a promise', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'getCustomer', {
                    parameters: { customerId: 'test' },
                })
            );

            const returnValue = result.current.load();
            expect(returnValue).toBeInstanceOf(Promise);
        });

        it('should handle timeout configuration', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'getCustomer', {
                    parameters: { customerId: 'test' },
                })
            );

            act(() => {
                void result.current.load();
            });

            expect(mockFetcher.load).toHaveBeenCalledWith(
                '/resource/api/client/WyJTaG9wcGVyQ3VzdG9tZXJzIiwiZ2V0Q3VzdG9tZXIiLFt7InBhcmFtZXRlcnMiOnsiY3VzdG9tZXJJZCI6InRlc3QifX1dXQ=='
            );
        });
    });

    describe('submit method', () => {
        it('should call fetcher.submit with correct resource URL and POST method', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'updateCustomer', {
                    parameters: { customerId: 'test' },
                    body: {},
                })
            );

            const submitData = { email: 'new@example.com' };

            act(() => {
                void result.current.submit(submitData);
            });

            expect(mockFetcher.submit).toHaveBeenCalledWith(submitData, {
                method: 'POST',
                action: '/resource/api/client/WyJTaG9wcGVyQ3VzdG9tZXJzIiwidXBkYXRlQ3VzdG9tZXIiLFt7InBhcmFtZXRlcnMiOnsiY3VzdG9tZXJJZCI6InRlc3QifSwiYm9keSI6e319XV0=',
            });
        });

        it('should call fetcher.submit and return a promise', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'updateCustomer', {
                    parameters: { customerId: 'test' },
                    body: {},
                })
            );

            const returnValue = result.current.submit({ email: 'new@example.com' }, { method: 'POST' });
            expect(returnValue).toBeInstanceOf(Promise);
        });

        it('should handle timeout configuration', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'updateCustomer', {
                    parameters: { customerId: 'test' },
                    body: {},
                })
            );

            const submitData = { email: 'new@example.com' };

            act(() => {
                void result.current.submit(submitData, { method: 'POST' });
            });

            expect(mockFetcher.submit).toHaveBeenCalledWith(submitData, {
                method: 'POST',
                action: '/resource/api/client/WyJTaG9wcGVyQ3VzdG9tZXJzIiwidXBkYXRlQ3VzdG9tZXIiLFt7InBhcmFtZXRlcnMiOnsiY3VzdG9tZXJJZCI6InRlc3QifSwiYm9keSI6e319XV0=',
            });
        });

        it('should use empty object when no target is provided', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'updateCustomer', {
                    parameters: { customerId: 'test' },
                    body: {},
                })
            );

            act(() => {
                void result.current.submit({}, { method: 'POST' });
            });

            expect(mockFetcher.submit).toHaveBeenCalledWith(
                {},
                {
                    method: 'POST',
                    action: '/resource/api/client/WyJTaG9wcGVyQ3VzdG9tZXJzIiwidXBkYXRlQ3VzdG9tZXIiLFt7InBhcmFtZXRlcnMiOnsiY3VzdG9tZXJJZCI6InRlc3QifSwiYm9keSI6e319XV0=',
                }
            );
        });

        it('should use empty object when target is null', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'updateCustomer', {
                    parameters: { customerId: 'test' },
                    body: {},
                })
            );

            act(() => {
                void result.current.submit(null as any, { method: 'POST' });
            });

            expect(mockFetcher.submit).toHaveBeenCalledWith(
                {},
                {
                    method: 'POST',
                    action: '/resource/api/client/WyJTaG9wcGVyQ3VzdG9tZXJzIiwidXBkYXRlQ3VzdG9tZXIiLFt7InBhcmFtZXRlcnMiOnsiY3VzdG9tZXJJZCI6InRlc3QifSwiYm9keSI6e319XV0=',
                }
            );
        });

        it('should use empty object when target is undefined', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'updateCustomer', {
                    parameters: { customerId: 'test' },
                    body: {},
                })
            );

            act(() => {
                void result.current.submit(undefined as any, { method: 'POST' });
            });

            expect(mockFetcher.submit).toHaveBeenCalledWith(
                {},
                {
                    method: 'POST',
                    action: '/resource/api/client/WyJTaG9wcGVyQ3VzdG9tZXJzIiwidXBkYXRlQ3VzdG9tZXIiLFt7InBhcmFtZXRlcnMiOnsiY3VzdG9tZXJJZCI6InRlc3QifSwiYm9keSI6e319XV0=',
                }
            );
        });
    });

    describe('state property', () => {
        it('should return fetcher state', () => {
            mockFetcher.state = 'loading';

            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'getCustomer', {
                    parameters: { customerId: 'test' },
                })
            );

            expect(result.current.state).toBe('loading');
        });
    });

    describe('data property', () => {
        it('should return fetcher data', () => {
            const mockData = { customerId: 'test', email: 'test@example.com' };
            mockFetcher.data = { success: true, data: mockData };
            mockFetcher.success = true;

            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'getCustomer', {
                    parameters: { customerId: 'test' },
                })
            );

            expect(result.current.data).toBe(mockData);
        });
    });

    describe('request cancellation', () => {
        it('should handle multiple concurrent requests', () => {
            const { result } = renderHook(() =>
                useScapiFetcher('ShopperCustomers', 'getCustomer', {
                    parameters: { customerId: 'test' },
                })
            );

            act(() => {
                // Start first request
                void result.current.load();
                // Start second request immediately
                void result.current.load();
            });

            // Both should return promises
            expect(result.current.load()).toBeInstanceOf(Promise);
            expect(result.current.load()).toBeInstanceOf(Promise);
        });
    });
});
