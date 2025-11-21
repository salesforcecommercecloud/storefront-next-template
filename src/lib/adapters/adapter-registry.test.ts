import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerAdapter, unregisterAdapter, getAdapter } from './adapter-registry';
import type { EngagementAdapter } from './types';

describe('Adapter Registry', () => {
    let mockAdapter: EngagementAdapter;

    beforeEach(() => {
        mockAdapter = {
            name: 'test-adapter',
            sendEvent: vi.fn().mockResolvedValue({ success: true }),
        };

        // Clear any existing adapters
        unregisterAdapter('test-adapter');
    });

    afterEach(() => {
        // Clean up
        unregisterAdapter('test-adapter');
        vi.clearAllMocks();
    });

    describe('adapter registry', () => {
        it('should register, unregister, and retrieve adapters', () => {
            registerAdapter('test-adapter', mockAdapter);
            expect(getAdapter('test-adapter')).toBe(mockAdapter);

            unregisterAdapter('test-adapter');
            expect(getAdapter('test-adapter')).toBeUndefined();
        });

        it('should handle non-existent adapters gracefully', () => {
            expect(getAdapter('non-existent')).toBeUndefined();
            expect(() => unregisterAdapter('non-existent')).not.toThrow();
        });

        it('should allow multiple adapters with different names', () => {
            const adapter1 = { ...mockAdapter, name: 'adapter-1' };
            const adapter2 = { ...mockAdapter, name: 'adapter-2' };

            registerAdapter('adapter-1', adapter1);
            registerAdapter('adapter-2', adapter2);

            expect(getAdapter('adapter-1')).toBe(adapter1);
            expect(getAdapter('adapter-2')).toBe(adapter2);
        });
    });
});
