import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import AuthProvider, { useAuth } from './auth';
import type { SessionData } from '@/lib/api/types';

describe('providers/auth.tsx', () => {
    describe('AuthProvider', () => {
        it('should provide session data to children via useAuth hook', () => {
            const mockSessionData: SessionData = {
                access_token: 'test-token',
                customer_id: 'test-customer',
                userType: 'registered',
                usid: 'test-usid',
            };

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider value={mockSessionData}>{children}</AuthProvider>,
            });

            expect(result.current).toEqual(mockSessionData);
            expect(result.current?.access_token).toBe('test-token');
            expect(result.current?.customer_id).toBe('test-customer');
            expect(result.current?.userType).toBe('registered');
        });

        it('should provide undefined when no value is passed', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            expect(result.current).toBeUndefined();
        });
    });

    describe('useAuth', () => {
        it('should return undefined when used outside AuthProvider', () => {
            const { result } = renderHook(() => useAuth());
            expect(result.current).toBeUndefined();
        });
    });
});
