/**
 * Adapters Server Middleware Tests
 *
 * Tests the server-side adapter middleware initialization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouterContextProvider } from 'react-router';
import { adaptersMiddlewareServer } from './adapters.server';
import { getConfig } from '@/config';
import { initializeEngagementAdapters } from '@/adapters';

vi.mock('@/config', () => ({
    getConfig: vi.fn(),
}));

vi.mock('@/adapters', () => ({
    initializeEngagementAdapters: vi.fn(),
}));

describe('adaptersMiddlewareServer', () => {
    let mockContext: RouterContextProvider;
    let mockNext: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockContext = new RouterContextProvider();
        mockNext = vi.fn().mockResolvedValue(undefined);

        vi.mocked(getConfig).mockReturnValue({
            engagement: {
                adapters: [
                    {
                        type: 'einstein',
                        enabled: true,
                        siteId: 'test-site-id',
                    },
                ],
            },
        } as any);
    });

    it('should initialize adapters with config', async () => {
        await adaptersMiddlewareServer(
            {
                context: mockContext,
            } as any,
            mockNext
        );

        expect(getConfig).toHaveBeenCalledWith(mockContext);
        expect(initializeEngagementAdapters).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'einstein',
                    enabled: true,
                }),
            ])
        );
        expect(mockNext).toHaveBeenCalled();
    });

    it('should call next middleware', async () => {
        await adaptersMiddlewareServer(
            {
                context: mockContext,
            } as any,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle empty adapters config', async () => {
        vi.mocked(getConfig).mockReturnValue({
            engagement: {
                adapters: [],
            },
        } as any);

        await adaptersMiddlewareServer(
            {
                context: mockContext,
            } as any,
            mockNext
        );

        expect(initializeEngagementAdapters).toHaveBeenCalledWith([]);
        expect(mockNext).toHaveBeenCalled();
    });
});
