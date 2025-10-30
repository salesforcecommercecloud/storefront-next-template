import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader, action } from './_empty.$';
import { handlePasswordlessCallback, handlePasswordlessLanding } from '@/lib/passwordless-login';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';

// Mock passwordless-login handlers
vi.mock('@/lib/passwordless-login', () => ({
    handlePasswordlessCallback: vi.fn(),
    handlePasswordlessLanding: vi.fn(),
}));

// Mock config
vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({
        site: {
            features: {
                passwordlessLogin: {
                    landingUri: '/passwordless-login-landing',
                    callbackUri: '/passwordless-login-callback',
                },
            },
        },
    })),
}));

const mockPasswordlessCallback = vi.mocked(handlePasswordlessCallback);
const mockPasswordlessLanding = vi.mocked(handlePasswordlessLanding);

describe('_empty.$.ts - Catch-all route (no layout)', () => {
    const mockContext = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loader', () => {
        it('should handle passwordless login landing route', async () => {
            const mockResponse = new Response(null, {
                status: 302,
                headers: { Location: '/account' },
            });
            mockPasswordlessLanding.mockResolvedValue(mockResponse);

            const args: LoaderFunctionArgs = {
                request: new Request('http://localhost/passwordless-login-landing?token=test'),
                params: {},
                context: mockContext,
            };

            const result = await loader(args);

            expect(mockPasswordlessLanding).toHaveBeenCalledWith(args);
            expect(result).toBe(mockResponse);
        });

        it('should throw 404 for unmatched paths', async () => {
            const args: LoaderFunctionArgs = {
                request: new Request('http://localhost/unknown-path'),
                params: {},
                context: mockContext,
            };

            try {
                await loader(args);
                expect.fail('Should have thrown a Response');
            } catch (error) {
                expect(error).toBeInstanceOf(Response);
                expect((error as Response).status).toBe(404);
                expect(await (error as Response).text()).toBe('Not Found');
            }
        });
    });

    describe('action', () => {
        it('should handle passwordless login callback route', async () => {
            const mockResult = { success: true, data: {} };
            mockPasswordlessCallback.mockResolvedValue(mockResult);

            const args: ActionFunctionArgs = {
                request: new Request('http://localhost/passwordless-login-callback', {
                    method: 'POST',
                }),
                params: {},
                context: mockContext,
            };

            const result = await action(args);

            expect(mockPasswordlessCallback).toHaveBeenCalledWith(args);
            expect(result).toBe(mockResult);
        });

        it('should throw 405 for unmatched paths', async () => {
            const args: ActionFunctionArgs = {
                request: new Request('http://localhost/unknown-path', {
                    method: 'POST',
                }),
                params: {},
                context: mockContext,
            };

            try {
                await action(args);
                expect.fail('Should have thrown a Response');
            } catch (error) {
                expect(error).toBeInstanceOf(Response);
                expect((error as Response).status).toBe(405);
                expect(await (error as Response).text()).toBe('Method Not Allowed');
            }
        });
    });

    describe('getHandler (indirectly tested)', () => {
        it('should correctly route based on pathname from config', async () => {
            // Test that the handler correctly identifies routes from config
            const loaderArgs: LoaderFunctionArgs = {
                request: new Request('http://localhost/passwordless-login-landing'),
                params: {},
                context: mockContext,
            };

            mockPasswordlessLanding.mockResolvedValue(new Response(null, { status: 302 }));
            await loader(loaderArgs);

            expect(mockPasswordlessLanding).toHaveBeenCalled();
        });

        it('should return null for paths not in config', async () => {
            const args: LoaderFunctionArgs = {
                request: new Request('http://localhost/some-random-path'),
                params: {},
                context: mockContext,
            };

            try {
                await loader(args);
                expect.fail('Should have thrown a Response');
            } catch (error) {
                expect(error).toBeInstanceOf(Response);
                expect((error as Response).status).toBe(404);
            }
            expect(mockPasswordlessLanding).not.toHaveBeenCalled();
            expect(mockPasswordlessCallback).not.toHaveBeenCalled();
        });
    });
});
