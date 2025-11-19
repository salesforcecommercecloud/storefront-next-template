import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';

// Mock dependencies
const mockExistsSync = vi.fn();
const mockTsImport = vi.fn();

vi.mock('node:fs', () => ({
    existsSync: mockExistsSync,
}));

vi.mock('tsx/esm/api', () => ({
    tsImport: mockTsImport,
}));

// Import after mocks are set up
const { loadConfigFromEnv, loadProjectConfig } = await import('./config');

describe('server config', () => {
    describe('loadConfigFromEnv', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should successfully load config from environment variables', () => {
            process.env.PUBLIC_COMMERCE_API_SHORT_CODE = 'test-short-code';
            process.env.PUBLIC_COMMERCE_API_ORG_ID = 'test-org-id';
            process.env.PUBLIC_COMMERCE_API_CLIENT_ID = 'test-client-id';
            process.env.PUBLIC_COMMERCE_API_SITE_ID = 'test-site-id';
            process.env.PUBLIC_COMMERCE_API_PROXY = '/custom/proxy';

            const config = loadConfigFromEnv();

            expect(config).toEqual({
                commerce: {
                    api: {
                        shortCode: 'test-short-code',
                        organizationId: 'test-org-id',
                        clientId: 'test-client-id',
                        siteId: 'test-site-id',
                        proxy: '/custom/proxy',
                    },
                },
            });
        });

        it('should use default proxy value when not provided', () => {
            process.env.PUBLIC_COMMERCE_API_SHORT_CODE = 'test-short-code';
            process.env.PUBLIC_COMMERCE_API_ORG_ID = 'test-org-id';
            process.env.PUBLIC_COMMERCE_API_CLIENT_ID = 'test-client-id';
            process.env.PUBLIC_COMMERCE_API_SITE_ID = 'test-site-id';
            delete process.env.PUBLIC_COMMERCE_API_PROXY;

            const config = loadConfigFromEnv();

            expect(config.commerce.api.proxy).toBe('/mobify/proxy/api');
        });

        it('should throw error when PUBLIC_COMMERCE_API_SHORT_CODE is missing', () => {
            delete process.env.PUBLIC_COMMERCE_API_SHORT_CODE;
            process.env.PUBLIC_COMMERCE_API_ORG_ID = 'test-org-id';
            process.env.PUBLIC_COMMERCE_API_CLIENT_ID = 'test-client-id';
            process.env.PUBLIC_COMMERCE_API_SITE_ID = 'test-site-id';

            expect(() => loadConfigFromEnv()).toThrow('Missing PUBLIC_COMMERCE_API_SHORT_CODE environment variable');
        });

        it('should throw error when PUBLIC_COMMERCE_API_ORG_ID is missing', () => {
            process.env.PUBLIC_COMMERCE_API_SHORT_CODE = 'test-short-code';
            delete process.env.PUBLIC_COMMERCE_API_ORG_ID;
            process.env.PUBLIC_COMMERCE_API_CLIENT_ID = 'test-client-id';
            process.env.PUBLIC_COMMERCE_API_SITE_ID = 'test-site-id';

            expect(() => loadConfigFromEnv()).toThrow('Missing PUBLIC_COMMERCE_API_ORG_ID environment variable');
        });

        it('should throw error when PUBLIC_COMMERCE_API_CLIENT_ID is missing', () => {
            process.env.PUBLIC_COMMERCE_API_SHORT_CODE = 'test-short-code';
            process.env.PUBLIC_COMMERCE_API_ORG_ID = 'test-org-id';
            delete process.env.PUBLIC_COMMERCE_API_CLIENT_ID;
            process.env.PUBLIC_COMMERCE_API_SITE_ID = 'test-site-id';

            expect(() => loadConfigFromEnv()).toThrow('Missing PUBLIC_COMMERCE_API_CLIENT_ID environment variable');
        });

        it('should throw error when PUBLIC_COMMERCE_API_SITE_ID is missing', () => {
            process.env.PUBLIC_COMMERCE_API_SHORT_CODE = 'test-short-code';
            process.env.PUBLIC_COMMERCE_API_ORG_ID = 'test-org-id';
            process.env.PUBLIC_COMMERCE_API_CLIENT_ID = 'test-client-id';
            delete process.env.PUBLIC_COMMERCE_API_SITE_ID;

            expect(() => loadConfigFromEnv()).toThrow('Missing PUBLIC_COMMERCE_API_SITE_ID environment variable');
        });
    });

    describe('loadProjectConfig', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should throw error when config.server.ts does not exist', async () => {
            mockExistsSync.mockReturnValue(false);

            await expect(loadProjectConfig('/test/project')).rejects.toThrow('config.server.ts not found at');
        });

        it('should successfully load config from config.server.ts', async () => {
            mockExistsSync.mockReturnValue(true);
            mockTsImport.mockResolvedValue({
                default: {
                    app: {
                        commerce: {
                            api: {
                                shortCode: 'config-short-code',
                                organizationId: 'config-org-id',
                                clientId: 'config-client-id',
                                siteId: 'config-site-id',
                                proxy: '/config/proxy',
                            },
                        },
                    },
                },
            });

            const config = await loadProjectConfig('/test/project');

            expect(config).toEqual({
                commerce: {
                    api: {
                        shortCode: 'config-short-code',
                        organizationId: 'config-org-id',
                        clientId: 'config-client-id',
                        siteId: 'config-site-id',
                        proxy: '/config/proxy',
                    },
                },
            });

            expect(mockTsImport).toHaveBeenCalledWith(resolve('/test/project', 'config.server.ts'), {
                parentURL: expect.any(String),
                tsconfig: resolve('/test/project', 'tsconfig.json'),
            });
        });

        it('should use default proxy when not provided in config', async () => {
            mockExistsSync.mockReturnValue(true);
            mockTsImport.mockResolvedValue({
                default: {
                    app: {
                        commerce: {
                            api: {
                                shortCode: 'config-short-code',
                                organizationId: 'config-org-id',
                                clientId: 'config-client-id',
                                siteId: 'config-site-id',
                            },
                        },
                    },
                },
            });

            const config = await loadProjectConfig('/test/project');

            expect(config.commerce.api.proxy).toBe('/mobify/proxy/api');
        });

        it('should handle missing tsconfig.json', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (typeof path === 'string' && path.endsWith('config.server.ts')) {
                    return true;
                }
                return false;
            });

            mockTsImport.mockResolvedValue({
                default: {
                    app: {
                        commerce: {
                            api: {
                                shortCode: 'config-short-code',
                                organizationId: 'config-org-id',
                                clientId: 'config-client-id',
                                siteId: 'config-site-id',
                            },
                        },
                    },
                },
            });

            await loadProjectConfig('/test/project');

            expect(mockTsImport).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    tsconfig: undefined,
                })
            );
        });

        it('should throw error when config.server.ts is missing commerce.api', async () => {
            mockExistsSync.mockReturnValue(true);
            mockTsImport.mockResolvedValue({
                default: {
                    app: {},
                },
            });

            await expect(loadProjectConfig('/test/project')).rejects.toThrow(
                'Invalid config.server.ts: missing app.commerce.api configuration'
            );
        });

        it('should throw error when config.server.ts has no default export', async () => {
            mockExistsSync.mockReturnValue(true);
            mockTsImport.mockResolvedValue({});

            await expect(loadProjectConfig('/test/project')).rejects.toThrow(
                'Invalid config.server.ts: missing app.commerce.api configuration'
            );
        });

        it('should throw error when shortCode is missing', async () => {
            mockExistsSync.mockReturnValue(true);
            mockTsImport.mockResolvedValue({
                default: {
                    app: {
                        commerce: {
                            api: {
                                organizationId: 'config-org-id',
                                clientId: 'config-client-id',
                                siteId: 'config-site-id',
                            },
                        },
                    },
                },
            });

            await expect(loadProjectConfig('/test/project')).rejects.toThrow(
                'Missing shortCode in config.server.ts commerce.api configuration'
            );
        });

        it('should throw error when organizationId is missing', async () => {
            mockExistsSync.mockReturnValue(true);
            mockTsImport.mockResolvedValue({
                default: {
                    app: {
                        commerce: {
                            api: {
                                shortCode: 'config-short-code',
                                clientId: 'config-client-id',
                                siteId: 'config-site-id',
                            },
                        },
                    },
                },
            });

            await expect(loadProjectConfig('/test/project')).rejects.toThrow(
                'Missing organizationId in config.server.ts commerce.api configuration'
            );
        });

        it('should throw error when clientId is missing', async () => {
            mockExistsSync.mockReturnValue(true);
            mockTsImport.mockResolvedValue({
                default: {
                    app: {
                        commerce: {
                            api: {
                                shortCode: 'config-short-code',
                                organizationId: 'config-org-id',
                                siteId: 'config-site-id',
                            },
                        },
                    },
                },
            });

            await expect(loadProjectConfig('/test/project')).rejects.toThrow(
                'Missing clientId in config.server.ts commerce.api configuration'
            );
        });

        it('should throw error when siteId is missing', async () => {
            mockExistsSync.mockReturnValue(true);
            mockTsImport.mockResolvedValue({
                default: {
                    app: {
                        commerce: {
                            api: {
                                shortCode: 'config-short-code',
                                organizationId: 'config-org-id',
                                clientId: 'config-client-id',
                            },
                        },
                    },
                },
            });

            await expect(loadProjectConfig('/test/project')).rejects.toThrow(
                'Missing siteId in config.server.ts commerce.api configuration'
            );
        });
    });
});
