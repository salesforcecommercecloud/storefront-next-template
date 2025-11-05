import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useScapiFetcherEffect, type ScapiFetcherEffectConfig } from './use-scapi-fetcher-effect';
import type { ScapiFetcher } from './use-scapi-fetcher';

// Mock data types for testing
interface TestData {
    id: string;
    name: string;
    email: string;
}

interface ProductData {
    productId: string;
    name: string;
    price: number;
}

// Helper function to create a mock fetcher
function createMockFetcher<TData = unknown>(
    initialState: 'idle' | 'loading' | 'submitting' = 'idle',
    initialData?: TData,
    initialSuccess: boolean = false,
    initialErrors?: string[]
): ScapiFetcher<TData> {
    return {
        state: initialState,
        data: initialData,
        success: initialSuccess,
        errors: initialErrors,
        load: vi.fn().mockResolvedValue(undefined),
        submit: vi.fn().mockResolvedValue(undefined),
        // Mock other fetcher properties
        formAction: undefined,
        formData: undefined,
        formEncType: 'application/x-www-form-urlencoded',
        formMethod: 'GET',
        formTarget: undefined,
        type: 'init',
    } as ScapiFetcher<TData>;
}

describe('useScapiFetcherEffect', () => {
    let mockOnSuccess: vi.MockedFunction<(data: TestData) => void>;
    let mockOnError: vi.MockedFunction<(errors: string[]) => void>;

    beforeEach(() => {
        mockOnSuccess = vi.fn();
        mockOnError = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Success scenarios', () => {
        it('should call onSuccess when fetcher completes successfully', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, true);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should call onSuccess with different data types', () => {
            const productData: ProductData = { productId: 'prod-123', name: 'Test Product', price: 29.99 };
            const fetcher = createMockFetcher('idle', productData, true);

            const config: ScapiFetcherEffectConfig<ProductData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(productData);
        });

        it('should call onSuccess with primitive data types', () => {
            const stringData = 'test string';
            const fetcher = createMockFetcher('idle', stringData, true);

            const config: ScapiFetcherEffectConfig<string> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(stringData);
        });

        it('should call onSuccess with array data', () => {
            const arrayData = [1, 2, 3, 4, 5];
            const fetcher = createMockFetcher('idle', arrayData, true);

            const config: ScapiFetcherEffectConfig<number[]> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(arrayData);
        });

        it('should call onSuccess with null data', () => {
            const fetcher = createMockFetcher('idle', null, true);

            const config: ScapiFetcherEffectConfig<null> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(null);
        });

        it('should not call onSuccess when fetcher is not in idle state', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('loading', testData, true);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should not call onSuccess when success is false', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, false);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should call onSuccess when data is undefined if success is true', () => {
            const fetcher = createMockFetcher('idle', undefined, true);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(undefined);
            expect(mockOnError).not.toHaveBeenCalled();
        });
    });

    describe('Error scenarios', () => {
        it('should call onError when fetcher completes with errors', () => {
            const errors = ['Validation failed', 'Email already exists'];
            const fetcher = createMockFetcher('idle', undefined, false, errors);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onError: mockOnError,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith(errors);
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should call onError with single error', () => {
            const errors = ['Network error'];
            const fetcher = createMockFetcher('idle', undefined, false, errors);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onError: mockOnError,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith(errors);
        });

        it('should call onError with empty errors array', () => {
            const errors: string[] = [];
            const fetcher = createMockFetcher('idle', undefined, false, errors);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onError: mockOnError,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith(errors);
        });

        it('should not call onError when fetcher is not in idle state', () => {
            const errors = ['Some error'];
            const fetcher = createMockFetcher('loading', undefined, false, errors);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onError: mockOnError,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnError).not.toHaveBeenCalled();
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should not call onError when success is true', () => {
            const errors = ['Some error'];
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, true, errors);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onError: mockOnError,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnError).not.toHaveBeenCalled();
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should not call onError when errors is undefined', () => {
            const fetcher = createMockFetcher('idle', undefined, false, undefined);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onError: mockOnError,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnError).not.toHaveBeenCalled();
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });
    });

    describe('State transitions', () => {
        it('should handle state transition from loading to idle with success', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            let fetcher = createMockFetcher('loading', undefined, false);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
                onError: mockOnError,
            };

            const { rerender } = renderHook(() => useScapiFetcherEffect(fetcher, config));

            // Initially no callbacks should be called
            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();

            // Simulate state transition to idle with success
            fetcher = createMockFetcher('idle', testData, true);
            rerender();

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should handle state transition from loading to idle with error', () => {
            const errors = ['Validation failed'];
            let fetcher = createMockFetcher('loading', undefined, false);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
                onError: mockOnError,
            };

            const { rerender } = renderHook(() => useScapiFetcherEffect(fetcher, config));

            // Initially no callbacks should be called
            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();

            // Simulate state transition to idle with error
            fetcher = createMockFetcher('idle', undefined, false, errors);
            rerender();

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith(errors);
            expect(mockOnSuccess).not.toHaveBeenCalled();
        });

        it('should handle state transition from submitting to idle with success', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            let fetcher = createMockFetcher('submitting', undefined, false);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
                onError: mockOnError,
            };

            const { rerender } = renderHook(() => useScapiFetcherEffect(fetcher, config));

            // Initially no callbacks should be called
            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();

            // Simulate state transition to idle with success
            fetcher = createMockFetcher('idle', testData, true);
            rerender();

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should not call callbacks multiple times for same state', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, true);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            const { rerender } = renderHook(() => useScapiFetcherEffect(fetcher, config));

            // First render should call onSuccess
            expect(mockOnSuccess).toHaveBeenCalledTimes(1);

            // Re-render with same state should not call onSuccess again
            rerender();
            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        });

        it.skip('should call callbacks when data changes', () => {
            const initialData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const updatedData: TestData = { id: '456', name: 'Jane Doe', email: 'jane@example.com' };
            let fetcher = createMockFetcher('idle', initialData, true);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            const { rerender } = renderHook(() => useScapiFetcherEffect(fetcher, config));

            // First render should call onSuccess with initial data
            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(initialData);

            // Update data and re-render
            fetcher = createMockFetcher('idle', updatedData, true);
            rerender();

            // Should call onSuccess again with updated data
            expect(mockOnSuccess).toHaveBeenCalledTimes(2);
            expect(mockOnSuccess).toHaveBeenLastCalledWith(updatedData);
        });
    });

    describe('Callback configuration', () => {
        it('should work with only onSuccess callback', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, true);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
        });

        it('should work with only onError callback', () => {
            const errors = ['Validation failed'];
            const fetcher = createMockFetcher('idle', undefined, false, errors);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onError: mockOnError,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnError).toHaveBeenCalledTimes(1);
            expect(mockOnError).toHaveBeenCalledWith(errors);
        });

        it('should work with both callbacks', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, true);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: mockOnSuccess,
                onError: mockOnError,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(testData);
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should work with empty config object', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, true);

            const config: ScapiFetcherEffectConfig<TestData> = {};

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();
        });

        it('should work with undefined callbacks', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, true);

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: undefined,
                onError: undefined,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnError).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        it('should handle fetcher with null data and success true', () => {
            const fetcher = createMockFetcher('idle', null, true);

            const config: ScapiFetcherEffectConfig<null> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(null);
        });

        it('should handle fetcher with empty string data', () => {
            const fetcher = createMockFetcher('idle', '', true);

            const config: ScapiFetcherEffectConfig<string> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith('');
        });

        it('should handle fetcher with zero data', () => {
            const fetcher = createMockFetcher('idle', 0, true);

            const config: ScapiFetcherEffectConfig<number> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(0);
        });

        it('should handle fetcher with false data', () => {
            const fetcher = createMockFetcher('idle', false, true);

            const config: ScapiFetcherEffectConfig<boolean> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(false);
        });

        it('should handle fetcher with empty array data', () => {
            const fetcher = createMockFetcher('idle', [], true);

            const config: ScapiFetcherEffectConfig<unknown[]> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith([]);
        });

        it('should handle fetcher with empty object data', () => {
            const fetcher = createMockFetcher('idle', {}, true);

            const config: ScapiFetcherEffectConfig<Record<string, unknown>> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith({});
        });

        it('should handle complex nested data structures', () => {
            const complexData = {
                user: {
                    id: '123',
                    profile: {
                        name: 'John Doe',
                        preferences: {
                            theme: 'dark',
                            notifications: true,
                        },
                    },
                },
                items: [
                    { id: 1, name: 'Item 1' },
                    { id: 2, name: 'Item 2' },
                ],
            };
            const fetcher = createMockFetcher('idle', complexData, true);

            const config: ScapiFetcherEffectConfig<typeof complexData> = {
                onSuccess: mockOnSuccess,
            };

            renderHook(() => useScapiFetcherEffect(fetcher, config));

            expect(mockOnSuccess).toHaveBeenCalledTimes(1);
            expect(mockOnSuccess).toHaveBeenCalledWith(complexData);
        });
    });

    describe('Callback stability', () => {
        it('should handle callback functions that throw errors gracefully', () => {
            const testData: TestData = { id: '123', name: 'John Doe', email: 'john@example.com' };
            const fetcher = createMockFetcher('idle', testData, true);

            const throwingOnSuccess = vi.fn(() => {
                throw new Error('Callback error');
            });

            const config: ScapiFetcherEffectConfig<TestData> = {
                onSuccess: throwingOnSuccess,
            };

            // This should not throw an error
            expect(() => {
                renderHook(() => useScapiFetcherEffect(fetcher, config));
            }).not.toThrow();

            expect(throwingOnSuccess).toHaveBeenCalledTimes(1);
        });
    });
});
