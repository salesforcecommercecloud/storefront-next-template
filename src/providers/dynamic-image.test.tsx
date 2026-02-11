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
import { describe, expect, test, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import DynamicImageProvider, { useDynamicImageContext } from './dynamic-image';

describe('DynamicImageProvider', () => {
    describe('useDynamicImageContext', () => {
        test('returns null when no provider is present', () => {
            const { result } = renderHook(() => useDynamicImageContext());
            expect(result.current).toBeNull();
        });

        test('returns context value when provider is present', () => {
            const mockAddSource = vi.fn();
            const mockHasSource = vi.fn();

            const wrapper = ({ children }: { children: ReactNode }) => (
                <DynamicImageProvider
                    value={{
                        addSource: mockAddSource,
                        hasSource: mockHasSource,
                    }}>
                    {children}
                </DynamicImageProvider>
            );

            const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

            expect(result.current).not.toBeNull();
            expect(result.current).toHaveProperty('addSource');
            expect(result.current).toHaveProperty('hasSource');
        });

        describe('addSource', () => {
            test('calls value.addSource with src and internal sources Set', () => {
                const mockAddSource = vi.fn().mockReturnValue(true);
                const mockHasSource = vi.fn();

                const wrapper = ({ children }: { children: ReactNode }) => (
                    <DynamicImageProvider
                        value={{
                            addSource: mockAddSource,
                            hasSource: mockHasSource,
                        }}>
                        {children}
                    </DynamicImageProvider>
                );

                const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

                const returnValue = result.current?.addSource('https://example.com/image.jpg');

                expect(mockAddSource).toHaveBeenCalledWith('https://example.com/image.jpg', expect.any(Set));
                expect(returnValue).toBe(true);
            });

            test('returns false when value.addSource returns false', () => {
                const mockAddSource = vi.fn().mockReturnValue(false);
                const mockHasSource = vi.fn();

                const wrapper = ({ children }: { children: ReactNode }) => (
                    <DynamicImageProvider
                        value={{
                            addSource: mockAddSource,
                            hasSource: mockHasSource,
                        }}>
                        {children}
                    </DynamicImageProvider>
                );

                const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

                const returnValue = result.current?.addSource('https://example.com/image.jpg');

                expect(returnValue).toBe(false);
            });

            test('returns false when value.addSource is undefined', () => {
                const wrapper = ({ children }: { children: ReactNode }) => (
                    <DynamicImageProvider
                        value={{
                            addSource: undefined as any,
                            hasSource: vi.fn(),
                        }}>
                        {children}
                    </DynamicImageProvider>
                );

                const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

                const returnValue = result.current?.addSource('https://example.com/image.jpg');

                expect(returnValue).toBe(false);
            });
        });

        describe('hasSource', () => {
            test('calls value.hasSource with src and internal sources Set', () => {
                const mockAddSource = vi.fn();
                const mockHasSource = vi.fn().mockReturnValue(true);

                const wrapper = ({ children }: { children: ReactNode }) => (
                    <DynamicImageProvider
                        value={{
                            addSource: mockAddSource,
                            hasSource: mockHasSource,
                        }}>
                        {children}
                    </DynamicImageProvider>
                );

                const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

                const returnValue = result.current?.hasSource('https://example.com/image.jpg');

                expect(mockHasSource).toHaveBeenCalledWith('https://example.com/image.jpg', expect.any(Set));
                expect(returnValue).toBe(true);
            });

            test('returns false when value.hasSource returns false', () => {
                const mockAddSource = vi.fn();
                const mockHasSource = vi.fn().mockReturnValue(false);

                const wrapper = ({ children }: { children: ReactNode }) => (
                    <DynamicImageProvider
                        value={{
                            addSource: mockAddSource,
                            hasSource: mockHasSource,
                        }}>
                        {children}
                    </DynamicImageProvider>
                );

                const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

                const returnValue = result.current?.hasSource('https://example.com/image.jpg');

                expect(returnValue).toBe(false);
            });

            test('returns false when value.hasSource is undefined', () => {
                const wrapper = ({ children }: { children: ReactNode }) => (
                    <DynamicImageProvider
                        value={{
                            addSource: vi.fn(),
                            hasSource: undefined as any,
                        }}>
                        {children}
                    </DynamicImageProvider>
                );

                const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

                const returnValue = result.current?.hasSource('https://example.com/image.jpg');

                expect(returnValue).toBe(false);
            });
        });

        describe('sources Set initialization', () => {
            test('uses provided sources Set when passed via value', () => {
                const existingSources = new Set(['https://example.com/existing.jpg']);
                const mockAddSource = vi.fn((src, sources) => sources.has(src));
                const mockHasSource = vi.fn((src, sources) => sources.has(src));

                const wrapper = ({ children }: { children: ReactNode }) => (
                    <DynamicImageProvider
                        value={{
                            sources: existingSources,
                            addSource: mockAddSource,
                            hasSource: mockHasSource,
                        }}>
                        {children}
                    </DynamicImageProvider>
                );

                const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

                // hasSource should return true for existing source
                const hasExisting = result.current?.hasSource('https://example.com/existing.jpg');
                expect(hasExisting).toBe(true);

                // hasSource should return false for non-existing source
                const hasNew = result.current?.hasSource('https://example.com/new.jpg');
                expect(hasNew).toBe(false);
            });

            test('creates new empty Set when sources not provided', () => {
                const mockAddSource = vi.fn((_src: string, sources: Set<string>) => {
                    expect(sources).toBeInstanceOf(Set);
                    expect(sources.size).toBe(0);
                    return true;
                });
                const mockHasSource = vi.fn();

                const wrapper = ({ children }: { children: ReactNode }) => (
                    <DynamicImageProvider
                        value={{
                            addSource: mockAddSource,
                            hasSource: mockHasSource,
                        }}>
                        {children}
                    </DynamicImageProvider>
                );

                const { result } = renderHook(() => useDynamicImageContext(), { wrapper });

                result.current?.addSource('https://example.com/image.jpg');

                expect(mockAddSource).toHaveBeenCalled();
            });
        });
    });

    describe('children rendering', () => {
        test('renders children correctly', () => {
            render(
                <DynamicImageProvider
                    value={{
                        addSource: vi.fn(),
                        hasSource: vi.fn(),
                    }}>
                    <div data-testid="child">Child Content</div>
                </DynamicImageProvider>
            );

            expect(screen.getByTestId('child')).toBeInTheDocument();
            expect(screen.getByText('Child Content')).toBeInTheDocument();
        });

        test('provides context to nested children', () => {
            const mockHasSource = vi.fn().mockReturnValue(true);

            const NestedComponent = () => {
                const context = useDynamicImageContext();
                return <div data-testid="result">{context?.hasSource('test') ? 'has' : 'not'}</div>;
            };

            render(
                <DynamicImageProvider
                    value={{
                        addSource: vi.fn(),
                        hasSource: mockHasSource,
                    }}>
                    <NestedComponent />
                </DynamicImageProvider>
            );

            expect(screen.getByTestId('result')).toHaveTextContent('has');
            expect(mockHasSource).toHaveBeenCalledWith('test', expect.any(Set));
        });
    });

    describe('memoization', () => {
        test('addSource callback maintains stable reference across child rerenders', () => {
            const mockAddSource = vi.fn();
            const mockHasSource = vi.fn();
            const value = {
                addSource: mockAddSource,
                hasSource: mockHasSource,
            };
            const callbacks: Array<((src: string) => boolean) | undefined> = [];

            const Wrapper = ({ children }: { children: ReactNode }) => (
                <DynamicImageProvider value={value}>{children}</DynamicImageProvider>
            );

            const { result, rerender } = renderHook(() => useDynamicImageContext(), { wrapper: Wrapper });

            callbacks.push(result.current?.addSource);
            rerender();
            callbacks.push(result.current?.addSource);

            // Callbacks should be the same reference due to useCallback
            expect(callbacks[0]).toBe(callbacks[1]);
        });

        test('hasSource callback maintains stable reference across child rerenders', () => {
            const mockAddSource = vi.fn();
            const mockHasSource = vi.fn();
            const value = {
                addSource: mockAddSource,
                hasSource: mockHasSource,
            };
            const callbacks: Array<((src: string) => boolean) | undefined> = [];

            const Wrapper = ({ children }: { children: ReactNode }) => (
                <DynamicImageProvider value={value}>{children}</DynamicImageProvider>
            );

            const { result, rerender } = renderHook(() => useDynamicImageContext(), { wrapper: Wrapper });

            callbacks.push(result.current?.hasSource);
            rerender();
            callbacks.push(result.current?.hasSource);

            // Callbacks should be the same reference due to useCallback
            expect(callbacks[0]).toBe(callbacks[1]);
        });
    });
});
