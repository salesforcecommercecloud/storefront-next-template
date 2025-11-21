import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RouterContextProvider } from 'react-router';
import viewPageEventMiddleware, { getOrInitializeEventMediator } from '@/middlewares/view-page-event.client';
import { getAuth } from '@/middlewares/auth.client';
import { getConfig } from '@/config';
import {
    initializeEventMediator,
    createEvent,
    sendViewPageEvent,
    type EventMediator,
    type ViewPageEvent,
} from '@salesforce/storefront-next-runtime/events';
import { getAllAdapters } from '@/lib/adapters';

// Mock dependencies
vi.mock('@/middlewares/auth.client', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/config', () => ({
    getConfig: vi.fn(),
}));

vi.mock('@/lib/adapters', () => ({
    getAllAdapters: vi.fn(),
}));

vi.mock('@salesforce/storefront-next-runtime/events', async () => {
    const actual = await vi.importActual('@salesforce/storefront-next-runtime/events');
    return {
        ...actual,
        createEvent: vi.fn(),
        sendViewPageEvent: vi.fn(),
        initializeEventMediator: vi.fn(),
    };
});

describe('analytics middleware', () => {
    let mockMediator: EventMediator;
    let mockContext: RouterContextProvider;
    let mockNext: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockMediator = {
            track: vi.fn(),
        };

        vi.mocked(getConfig).mockReturnValue({
            engagement: {
                analytics: {
                    doNotTrackPaths: ['/api', '/action', '/resource', '/oauth2'],
                },
            },
        } as any);

        vi.mocked(getAllAdapters).mockReturnValue([]);
        vi.mocked(initializeEventMediator).mockReturnValue(mockMediator);
        vi.mocked(getAuth).mockReturnValue({
            userType: 'guest',
            usid: 'test-usid',
        } as any);

        vi.mocked(createEvent).mockImplementation((eventType: string, data: any) => {
            return {
                eventType,
                ...data,
            } as ViewPageEvent;
        });

        mockContext = new RouterContextProvider();
        mockNext = vi.fn().mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe('middleware initialization', () => {
        test('should initialize mediator on first call and reuse singleton on subsequent calls', async () => {
            const mockRequest = {
                url: 'https://example.com/login',
            };

            // First call
            await viewPageEventMiddleware(
                {
                    context: mockContext,
                    request: mockRequest as Request,
                } as any,
                mockNext
            );

            expect(getConfig).toHaveBeenCalledWith(mockContext);
            expect(initializeEventMediator).toHaveBeenCalledTimes(1);
            expect(getOrInitializeEventMediator()).toBe(mockMediator);

            // Second call - should reuse singleton
            await viewPageEventMiddleware(
                {
                    context: mockContext,
                    request: mockRequest as Request,
                } as any,
                mockNext
            );

            expect(initializeEventMediator).toHaveBeenCalledTimes(1);
            expect(mockNext).toHaveBeenCalledTimes(2);
        });
    });

    describe('page view tracking', () => {
        test('should track page view for tracked routes', async () => {
            const mockRequest = {
                url: 'https://example.com/login',
            };

            await viewPageEventMiddleware(
                {
                    context: mockContext,
                    request: mockRequest as Request,
                } as any,
                mockNext
            );

            expect(createEvent).toHaveBeenCalledWith('view_page', {
                path: '/login',
                payload: {
                    userType: 'guest',
                    usid: 'test-usid',
                },
            });

            // Verify the mediator was initialized and sendViewPageEvent was called
            const mediator = getOrInitializeEventMediator();
            expect(mediator).toBeDefined();
            expect(sendViewPageEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'view_page',
                    path: '/login',
                }),
                mediator
            );
        });

        test('should not track page view for non-tracked routes', async () => {
            const mockRequest = {
                url: 'https://example.com/resource/auth/refresh-token',
            };

            await viewPageEventMiddleware(
                {
                    context: mockContext,
                    request: mockRequest as Request,
                } as any,
                mockNext
            );

            expect(createEvent).not.toHaveBeenCalled();
            expect(sendViewPageEvent).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should not track page view for paths matching doNotTrackPaths', async () => {
            const mockRequest = {
                url: 'https://example.com/api/products',
            };

            await viewPageEventMiddleware(
                {
                    context: mockContext,
                    request: mockRequest as Request,
                } as any,
                mockNext
            );

            expect(createEvent).not.toHaveBeenCalled();
            expect(sendViewPageEvent).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should track page view when doNotTrackPaths is empty', async () => {
            vi.mocked(getConfig).mockReturnValue({
                engagement: {
                    analytics: {
                        doNotTrackPaths: [],
                    },
                },
            } as any);

            const mockRequest = {
                url: 'https://example.com/resource/auth/refresh-token',
            };

            await viewPageEventMiddleware(
                {
                    context: mockContext,
                    request: mockRequest as Request,
                } as any,
                mockNext
            );

            expect(createEvent).toHaveBeenCalledWith('view_page', {
                path: '/resource/auth/refresh-token',
                payload: {
                    userType: 'guest',
                    usid: 'test-usid',
                },
            });

            const mediator = getOrInitializeEventMediator();
            expect(sendViewPageEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'view_page',
                    path: '/resource/auth/refresh-token',
                }),
                mediator
            );
        });

        test('should use guest user when auth is undefined', async () => {
            const mockRequest = {
                url: 'https://example.com/login',
            };

            vi.mocked(getAuth).mockReturnValue(undefined as any);

            await viewPageEventMiddleware(
                {
                    context: mockContext,
                    request: mockRequest as Request,
                } as any,
                mockNext
            );

            expect(createEvent).toHaveBeenCalledWith('view_page', {
                path: '/login',
                payload: {
                    userType: 'guest',
                    usid: undefined,
                },
            });

            const mediator = getOrInitializeEventMediator();
            expect(sendViewPageEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'view_page',
                    path: '/login',
                }),
                mediator
            );
        });

        test('should use registered user data when available', async () => {
            const mockRequest = {
                url: 'https://example.com/account',
            };

            vi.mocked(getAuth).mockReturnValue({
                userType: 'registered',
                usid: 'registered-usid',
                customer_id: 'customer-123',
            } as any);

            await viewPageEventMiddleware(
                {
                    context: mockContext,
                    request: mockRequest as Request,
                } as any,
                mockNext
            );

            expect(createEvent).toHaveBeenCalledWith('view_page', {
                path: '/account',
                payload: {
                    userType: 'registered',
                    usid: 'registered-usid',
                },
            });

            const mediator = getOrInitializeEventMediator();
            expect(sendViewPageEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'view_page',
                    path: '/account',
                }),
                mediator
            );
        });
    });
});
