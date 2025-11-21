/**
 * Analytics Provider Tests
 *
 * Tests the AnalyticsProvider component and useAnalytics hook functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import AnalyticsProvider, { useAnalytics } from './analytics';
import type { EventMediator } from '@salesforce/storefront-next-runtime/events';

const mockMediator: EventMediator = {
    track: vi.fn(),
};

describe('AnalyticsProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Provider', () => {
        it('should provide analytics context to children', () => {
            const { result } = renderHook(() => useAnalytics(), {
                wrapper: ({ children }) => <AnalyticsProvider value={mockMediator}>{children}</AnalyticsProvider>,
            });

            expect(result.current).toBe(mockMediator);
        });

        it('should return undefined when no value is provided', () => {
            const { result } = renderHook(() => useAnalytics(), {
                wrapper: ({ children }) => <AnalyticsProvider>{children}</AnalyticsProvider>,
            });

            expect(result.current).toBeUndefined();
        });

        it('should allow value to be undefined', () => {
            const { result } = renderHook(() => useAnalytics(), {
                wrapper: ({ children }) => <AnalyticsProvider value={undefined}>{children}</AnalyticsProvider>,
            });

            expect(result.current).toBeUndefined();
        });

        it('should render children correctly', () => {
            const { container } = render(
                <AnalyticsProvider value={mockMediator}>
                    <div>Test Content</div>
                </AnalyticsProvider>
            );

            expect(container.textContent).toBe('Test Content');
        });
    });

    describe('useAnalytics hook', () => {
        it('should return undefined when used outside provider', () => {
            const { result } = renderHook(() => useAnalytics());

            expect(result.current).toBeUndefined();
        });

        it('should return the mediator from context', () => {
            const { result } = renderHook(() => useAnalytics(), {
                wrapper: ({ children }) => <AnalyticsProvider value={mockMediator}>{children}</AnalyticsProvider>,
            });

            expect(result.current).toBe(mockMediator);
            expect(result.current?.track).toBeDefined();
        });
    });
});
