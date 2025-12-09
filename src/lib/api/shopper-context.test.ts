import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { RouterContextProvider } from 'react-router';
import { createShopperContext } from './shopper-context';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { createTestContext } from '@/lib/test-utils';

// Mock dependencies
vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getConfig: vi.fn(),
    };
});

describe('shopper-context API', () => {
    let mockContext: RouterContextProvider;
    let mockShopperContextClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockContext = createTestContext();
        mockShopperContextClient = {
            createShopperContext: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(getConfig).mockReturnValue({
            commerce: {
                api: {
                    organizationId: 'test-org-id',
                    siteId: 'test-site-id',
                },
            },
        } as any);

        vi.mocked(createApiClients).mockReturnValue({
            shopperContext: mockShopperContextClient,
        } as any);
    });

    describe('createShopperContext', () => {
        test('should call API with correct parameters', async () => {
            const usid = 'test-usid';
            const body = { sourceCode: 'email' };

            await createShopperContext(mockContext, usid, body);

            expect(createApiClients).toHaveBeenCalledWith(mockContext);
            expect(mockShopperContextClient.createShopperContext).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org-id',
                        usid,
                    },
                    query: {
                        siteId: 'test-site-id',
                    },
                },
                body: expect.objectContaining({ sourceCode: 'email' }),
            });
        });

        test('should throw error when context is null', async () => {
            const usid = 'test-usid';
            const body = { sourceCode: 'email' };

            await expect(createShopperContext(null as any, usid, body)).rejects.toThrow('Context is required');
        });

        test('should throw error when context is undefined', async () => {
            const usid = 'test-usid';
            const body = { sourceCode: 'email' };

            await expect(createShopperContext(undefined as any, usid, body)).rejects.toThrow('Context is required');
        });

        test('should throw error when usid is empty string', async () => {
            const usid = '';
            const body = { sourceCode: 'email' };

            await expect(createShopperContext(mockContext, usid, body)).rejects.toThrow(
                'USID is required and must be a non-empty string'
            );
        });

        test('should throw error when usid is whitespace only', async () => {
            const usid = '   ';
            const body = { sourceCode: 'email' };

            await expect(createShopperContext(mockContext, usid, body)).rejects.toThrow(
                'USID is required and must be a non-empty string'
            );
        });

        test('should throw error when usid is not a string', async () => {
            const usid = 123 as any;
            const body = { sourceCode: 'email' };

            await expect(createShopperContext(mockContext, usid, body)).rejects.toThrow(
                'USID is required and must be a non-empty string'
            );
        });

        test('should throw error when body is null', async () => {
            const usid = 'test-usid';
            const body = null as any;

            await expect(createShopperContext(mockContext, usid, body)).rejects.toThrow(
                'Body is required and must be a plain object'
            );
        });

        test('should throw error when body is undefined', async () => {
            const usid = 'test-usid';
            const body = undefined as any;

            await expect(createShopperContext(mockContext, usid, body)).rejects.toThrow(
                'Body is required and must be a plain object'
            );
        });

        test('should handle API errors', async () => {
            const usid = 'test-usid';
            const body = { sourceCode: 'email' };
            const apiError = new Error('API Error');
            mockShopperContextClient.createShopperContext.mockRejectedValue(apiError);

            await expect(createShopperContext(mockContext, usid, body)).rejects.toThrow('API Error');
        });

        test('should handle empty body object', async () => {
            const usid = 'test-usid';
            const body = {};

            await createShopperContext(mockContext, usid, body);

            expect(mockShopperContextClient.createShopperContext).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org-id',
                        usid,
                    },
                    query: {
                        siteId: 'test-site-id',
                    },
                },
                body: expect.objectContaining({}),
            });
        });

        test('should handle body with multiple qualifiers', async () => {
            const usid = 'test-usid';
            const body = { sourceCode: 'email', otherKey: 'value' };

            await createShopperContext(mockContext, usid, body);

            expect(mockShopperContextClient.createShopperContext).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org-id',
                        usid,
                    },
                    query: {
                        siteId: 'test-site-id',
                    },
                },
                body: expect.objectContaining(body),
            });
        });

        test('should use correct organizationId and siteId from config', async () => {
            const usid = 'test-usid';
            const body = { sourceCode: 'email' };

            await createShopperContext(mockContext, usid, body);

            expect(mockShopperContextClient.createShopperContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    params: expect.objectContaining({
                        path: expect.objectContaining({
                            organizationId: 'test-org-id',
                            usid: 'test-usid',
                        }),
                        query: expect.objectContaining({
                            siteId: 'test-site-id',
                        }),
                    }),
                })
            );
        });
    });
});
