import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
const mockExistsSync = vi.fn();
const mockImportTypescript = vi.fn();

vi.mock('node:fs', () => ({
    existsSync: mockExistsSync,
}));

vi.mock('./ts-import', () => ({
    importTypescript: mockImportTypescript,
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
            process.env.PUBLIC__app__commerce__api__shortCode = 'test-short-code';
            process.env.PUBLIC__app__commerce__api__organizationId = 'test-org-id';
            process.env.PUBLIC__app__commerce__api__clientId = 'test-client-id';
            process.env.PUBLIC__app__commerce__api__siteId = 'test-site-id';
            process.env.PUBLIC__app__commerce__api__proxy = '/custom/proxy';

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
            process.env.PUBLIC__app__commerce__api__shortCode = 'test-short-code';
            process.env.PUBLIC__app__commerce__api__organizationId = 'test-org-id';
            process.env.PUBLIC__app__commerce__api__clientId = 'test-client-id';
            process.env.PUBLIC__app__commerce__api__siteId = 'test-site-id';
            delete process.env.PUBLIC__app__commerce__api__proxy;

            const config = loadConfigFromEnv();

            expect(config.commerce.api.proxy).toBe('/mobify/proxy/api');
        });

        it('should throw error when PUBLIC__app__commerce__api__shortCode is missing', () => {
            delete process.env.PUBLIC__app__commerce__api__shortCode;
            process.env.PUBLIC__app__commerce__api__organizationId = 'test-org-id';
            process.env.PUBLIC__app__commerce__api__clientId = 'test-client-id';
            process.env.PUBLIC__app__commerce__api__siteId = 'test-site-id';

            expect(() => loadConfigFromEnv()).toThrow(
                'Missing PUBLIC__app__commerce__api__shortCode environment variable'
            );
        });

        it('should throw error when PUBLIC__app__commerce__api__organizationId is missing', () => {
            process.env.PUBLIC__app__commerce__api__shortCode = 'test-short-code';
            delete process.env.PUBLIC__app__commerce__api__organizationId;
            process.env.PUBLIC__app__commerce__api__clientId = 'test-client-id';
            process.env.PUBLIC__app__commerce__api__siteId = 'test-site-id';

            expect(() => loadConfigFromEnv()).toThrow(
                'Missing PUBLIC__app__commerce__api__organizationId environment variable'
            );
        });

        it('should throw error when PUBLIC__app__commerce__api__clientId is missing', () => {
            process.env.PUBLIC__app__commerce__api__shortCode = 'test-short-code';
            process.env.PUBLIC__app__commerce__api__organizationId = 'test-org-id';
            delete process.env.PUBLIC__app__commerce__api__clientId;
            process.env.PUBLIC__app__commerce__api__siteId = 'test-site-id';

            expect(() => loadConfigFromEnv()).toThrow(
                'Missing PUBLIC__app__commerce__api__clientId environment variable'
            );
        });

        it('should throw error when PUBLIC__app__commerce__api__siteId is missing', () => {
            process.env.PUBLIC__app__commerce__api__shortCode = 'test-short-code';
            process.env.PUBLIC__app__commerce__api__organizationId = 'test-org-id';
            process.env.PUBLIC__app__commerce__api__clientId = 'test-client-id';
            delete process.env.PUBLIC__app__commerce__api__siteId;

            expect(() => loadConfigFromEnv()).toThrow(
                'Missing PUBLIC__app__commerce__api__siteId environment variable'
            );
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
            mockImportTypescript.mockResolvedValue({
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

            expect(mockImportTypescript).toHaveBeenCalledWith(
                expect.stringContaining('config.server.ts'),
                expect.objectContaining({
                    projectDirectory: '/test/project',
                    tsconfigPath: expect.stringContaining('tsconfig.json'),
                })
            );
        });

        it('should use default proxy when not provided in config', async () => {
            mockExistsSync.mockReturnValue(true);
            mockImportTypescript.mockResolvedValue({
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

        it('should throw error when config.server.ts is missing commerce.api', async () => {
            mockExistsSync.mockReturnValue(true);
            mockImportTypescript.mockResolvedValue({
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
            mockImportTypescript.mockResolvedValue({});

            await expect(loadProjectConfig('/test/project')).rejects.toThrow(
                'Invalid config.server.ts: missing app.commerce.api configuration'
            );
        });

        it('should throw error when shortCode is missing', async () => {
            mockExistsSync.mockReturnValue(true);
            mockImportTypescript.mockResolvedValue({
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
            mockImportTypescript.mockResolvedValue({
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
            mockImportTypescript.mockResolvedValue({
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
            mockImportTypescript.mockResolvedValue({
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
