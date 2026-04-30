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
import { deflateSync } from 'node:zlib';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pageDesignerResolutionMiddleware } from './page-designer-page-resolution.server';
import { createTestContext } from '@/lib/test-utils';
import { scapiMiddlewareContext, type ScapiMiddlewareEntry } from '@/lib/scapi-middleware';
import { resolvePage } from '@salesforce/storefront-next-runtime/design/data';
import {
    DataStore,
    DataStoreNotFoundError,
    DataStoreUnavailableError,
    DataStoreServiceError,
} from '@salesforce/storefront-next-runtime/data-store';

const mockGetEntry = vi.fn();
const mockResolveQualifiers = vi.fn();

const mockLogger = vi.hoisted(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => mockLogger),
}));

const mockClients = {
    shopperExperience: {
        resolveQualifiers: mockResolveQualifiers,
    },
} as any;

vi.mock('@salesforce/storefront-next-runtime/data-store', async (importOriginal) => {
    const original = await importOriginal<typeof import('@salesforce/storefront-next-runtime/data-store')>();
    return {
        ...original,
        DataStore: {
            getDataStore: vi.fn(() => ({ getEntry: mockGetEntry })),
        },
    };
});

vi.mock('@salesforce/storefront-next-runtime/design/data', () => ({
    resolvePage: vi.fn(),
}));

const mockedResolvePage = vi.mocked(resolvePage);

/**
 * Helper: creates a mock page Data Store entry with the given object deflate-compressed
 * and base64-encoded under `compressedData`, matching the format expected by
 * `getAndUnpackDataStoreEntry` for page manifests.
 */
function packPageEntry(data: Record<string, unknown>) {
    const compressed = deflateSync(Buffer.from(JSON.stringify(data), 'utf-8'));
    return { value: { compressedData: compressed.toString('base64') } };
}

/**
 * Helper: creates a mock site Data Store entry with the given object as a
 * UTF-8 JSON string under `data`, matching the format expected by
 * `getAndUnpackDataStoreEntry` for site manifests.
 */
function packSiteEntry(data: Record<string, unknown>) {
    return { value: { data: JSON.stringify(data) } };
}

/** Base URL pattern matching SCAPI shopperExperience getPage endpoint */
const SCAPI_BASE = 'https://short.api.commercecloud.salesforce.com/shopper/shopper-experience/v1/organizations/org1';

function getPageUrl(pageId: string, queryParams?: Record<string, string>): string {
    const url = new URL(`${SCAPI_BASE}/pages/${pageId}`);
    if (queryParams) {
        for (const [key, value] of Object.entries(queryParams)) {
            url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

/** Builds a MiddlewareCallbackParams-compatible object for the onRequest handler. */
function middlewareParams(request: Request, overrides: { schemaPath?: string; id?: string } = {}) {
    return {
        request,
        schemaPath: overrides.schemaPath ?? '/pages/{pageId}',
        params: {},
        id: overrides.id ?? 'getPage',
        options: {} as any,
    };
}

/**
 * Helper: invokes the middleware to register the factory, then calls the factory
 * with context to produce the SCAPI middleware. Returns `null` if the factory
 * returns null (e.g. feature flag disabled, no data store).
 */
async function invokeMiddlewareAndGetHandler(context: ReturnType<typeof createTestContext>) {
    const scapiMiddlewares: ScapiMiddlewareEntry[] = [];
    context.set(scapiMiddlewareContext, scapiMiddlewares);

    const next = vi.fn().mockResolvedValue(new Response());
    await pageDesignerResolutionMiddleware({ context } as any, next);

    expect(next).toHaveBeenCalled();
    expect(scapiMiddlewares).toHaveLength(1);

    const entry = scapiMiddlewares[0];
    expect(entry.clients).toEqual(['shopperExperience']);

    const middleware = entry.factory(context, mockClients);
    if (!middleware) return null;

    return middleware.onRequest;
}

/**
 * Helper: creates a context with the feature flag enabled and data store available,
 * invokes the middleware, and returns the onRequest handler.
 */
async function setupHandler() {
    const context = createTestContext({
        appConfig: { features: { mrtBasedPageDesignerResolution: true } } as any,
    });

    const handler = await invokeMiddlewareAndGetHandler(context);
    if (!handler) throw new Error('Expected factory to return a middleware with onRequest handler');
    return handler;
}

describe('pageDesignerResolutionMiddleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetEntry.mockReset();
        mockResolveQualifiers.mockReset();
        mockedResolvePage.mockReset();
        DataStore._testDocumentClient = null;
        DataStore._testLogMRTError = null;
    });

    describe('factory registration', () => {
        it('should not register a factory entry when feature flag is disabled', async () => {
            const context = createTestContext({
                appConfig: { features: { mrtBasedPageDesignerResolution: false } } as any,
            });
            const scapiMiddlewares: ScapiMiddlewareEntry[] = [];
            context.set(scapiMiddlewareContext, scapiMiddlewares);

            const next = vi.fn().mockResolvedValue(new Response());
            await pageDesignerResolutionMiddleware({ context } as any, next);

            expect(scapiMiddlewares).toHaveLength(0);
            expect(next).toHaveBeenCalled();
        });

        it('should register a factory entry when feature flag is enabled', async () => {
            const context = createTestContext({
                appConfig: { features: { mrtBasedPageDesignerResolution: true } } as any,
            });
            const scapiMiddlewares: ScapiMiddlewareEntry[] = [];
            context.set(scapiMiddlewareContext, scapiMiddlewares);

            const next = vi.fn().mockResolvedValue(new Response());
            await pageDesignerResolutionMiddleware({ context } as any, next);

            expect(scapiMiddlewares).toHaveLength(1);
            expect(scapiMiddlewares[0].clients).toEqual(['shopperExperience']);
            expect(typeof scapiMiddlewares[0].factory).toBe('function');
            expect(next).toHaveBeenCalled();
        });

        it('should return an onRequest handler from factory when feature flag is enabled', async () => {
            const context = createTestContext({
                appConfig: { features: { mrtBasedPageDesignerResolution: true } } as any,
            });

            const handler = await invokeMiddlewareAndGetHandler(context);

            expect(handler).toBeDefined();
        });
    });

    describe('request matching', () => {
        it('should skip non-GET requests', async () => {
            const handler = await setupHandler();

            const result = await handler(middlewareParams(new Request(getPageUrl('homepage'), { method: 'POST' })));

            expect(result).toBeUndefined();
            expect(mockedResolvePage).not.toHaveBeenCalled();
        });

        it('should skip requests that do not match /pages/{pageId}', async () => {
            const handler = await setupHandler();

            const result = await handler(
                middlewareParams(new Request(`${SCAPI_BASE}/other-endpoint`), {
                    schemaPath: '/other',
                    id: 'other',
                })
            );

            expect(result).toBeUndefined();
            expect(mockedResolvePage).not.toHaveBeenCalled();
        });

        it('should skip design mode requests (mode query param)', async () => {
            const handler = await setupHandler();

            const result = await handler(middlewareParams(new Request(getPageUrl('homepage', { mode: 'EDIT' }))));

            expect(result).toBeUndefined();
            expect(mockedResolvePage).not.toHaveBeenCalled();
        });

        it('should skip preview mode requests (pdToken query param)', async () => {
            const handler = await setupHandler();

            const result = await handler(middlewareParams(new Request(getPageUrl('homepage', { pdToken: 'abc123' }))));

            expect(result).toBeUndefined();
            expect(mockedResolvePage).not.toHaveBeenCalled();
        });

        it('should match GET requests to /pages/{pageId}', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            await handler(middlewareParams(new Request(getPageUrl('homepage'))));

            expect(mockedResolvePage).toHaveBeenCalled();
        });
    });

    describe('page resolution', () => {
        it('should call resolvePage with correct params for a page identifier', async () => {
            const handler = await setupHandler();
            const mockPage = { id: 'homepage', regions: [] };
            mockedResolvePage.mockResolvedValue(mockPage as any);

            const aspectAttributes = JSON.stringify({ aspectType: 'storefront' });
            const result = await handler(middlewareParams(new Request(getPageUrl('homepage', { aspectAttributes }))));

            expect(mockedResolvePage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'homepage',
                    identifierType: 'page',
                    aspectType: 'storefront',
                    locale: expect.any(String),
                    manifestStorage: expect.any(Object),
                    contextResolver: expect.any(Function),
                })
            );
            expect(result).toBeInstanceOf(Response);
            const body = await (result as Response).json();
            expect(body).toEqual(mockPage);
        });

        it('should use product identifierType when productId is provided', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            const aspectAttributes = JSON.stringify({ productId: 'shirt-001' });
            await handler(middlewareParams(new Request(getPageUrl('pdp', { aspectAttributes }))));

            expect(mockedResolvePage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'shirt-001',
                    identifierType: 'product',
                })
            );
        });

        it('should use category identifierType when categoryId is provided', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            const aspectAttributes = JSON.stringify({ categoryId: 'mens-clothing' });
            await handler(middlewareParams(new Request(getPageUrl('plp', { aspectAttributes }))));

            expect(mockedResolvePage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'mens-clothing',
                    identifierType: 'category',
                })
            );
        });

        it('should prefer productId over categoryId when both are provided', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            const aspectAttributes = JSON.stringify({ productId: 'shirt-001', categoryId: 'mens-clothing' });
            await handler(middlewareParams(new Request(getPageUrl('pdp', { aspectAttributes }))));

            expect(mockedResolvePage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'shirt-001',
                    identifierType: 'product',
                })
            );
        });

        it('should return undefined when resolvePage returns null (pass through to SCAPI)', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            const result = await handler(middlewareParams(new Request(getPageUrl('nonexistent'))));

            expect(result).toBeUndefined();
        });

        it('should return a JSON Response when resolvePage succeeds', async () => {
            const handler = await setupHandler();
            const mockPage = { id: 'resolved-page', name: 'Resolved Page', regions: [{ id: 'main', components: [] }] };
            mockedResolvePage.mockResolvedValue(mockPage as any);

            const result = await handler(middlewareParams(new Request(getPageUrl('resolved-page'))));

            expect(result).toBeInstanceOf(Response);
            const body = await (result as Response).json();
            expect(body).toEqual(mockPage);
        });
    });

    describe('contextResolver', () => {
        /**
         * Helper: invokes the middleware handler, captures the contextResolver
         * passed to resolvePage, and returns it for direct testing.
         */
        async function captureContextResolver() {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            await handler(middlewareParams(new Request(getPageUrl('test-page'))));

            const resolvePageArgs = mockedResolvePage.mock.calls[0][0];
            return resolvePageArgs.contextResolver as NonNullable<typeof resolvePageArgs.contextResolver>;
        }

        it('should call resolveQualifiers with the provided context and return its data', async () => {
            const qualifierResponse = {
                campaignQualifiers: { camp1: true },
                customerGroups: { group1: true },
                dataBindings: { binding1: 'value' },
            };
            mockResolveQualifiers.mockResolvedValue({ data: qualifierResponse });

            const contextResolver = await captureContextResolver();
            const inputContext = {
                campaignQualifiers: { camp1: ['q1'] },
                customerGroups: ['cg1'],
                dataBindings: [{ key: 'b1' }],
            };

            const result = await contextResolver(inputContext as any);

            expect(mockResolveQualifiers).toHaveBeenCalledWith({
                params: {},
                body: {
                    campaignQualifiers: inputContext.campaignQualifiers,
                    dataBindings: inputContext.dataBindings,
                    customerGroups: inputContext.customerGroups,
                },
            });
            expect(result).toEqual(qualifierResponse);
        });

        it('should return null and log error when resolveQualifiers fails', async () => {
            mockResolveQualifiers.mockRejectedValue(new Error('qualifier API failed'));

            const contextResolver = await captureContextResolver();
            const result = await contextResolver({} as any);

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Failed to resolve qualifiers', {
                message: 'Failed to resolve qualifiers',
                cause: expect.any(Error),
            });
        });

        it('should not throw when resolveQualifiers fails (error is handled by onError)', async () => {
            mockResolveQualifiers.mockRejectedValue(new Error('qualifier API failed'));

            const contextResolver = await captureContextResolver();

            await expect(contextResolver({} as any)).resolves.toBeNull();
        });

        it('should pass undefined context fields through to resolveQualifiers', async () => {
            mockResolveQualifiers.mockResolvedValue({ data: {} });

            const contextResolver = await captureContextResolver();
            const inputContext = {
                campaignQualifiers: undefined,
                customerGroups: undefined,
                dataBindings: undefined,
            };

            await contextResolver(inputContext as any);

            expect(mockResolveQualifiers).toHaveBeenCalledWith({
                params: {},
                body: {
                    campaignQualifiers: undefined,
                    dataBindings: undefined,
                    customerGroups: undefined,
                },
            });
        });
    });

    describe('manifestStorage', () => {
        /**
         * Helper: invokes the middleware handler, captures the manifestStorage
         * passed to resolvePage, and returns it for direct testing.
         */
        async function captureManifestStorage() {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            await handler(middlewareParams(new Request(getPageUrl('test-page'))));

            const resolvePageArgs = mockedResolvePage.mock.calls[0][0];
            return resolvePageArgs.manifestStorage;
        }

        describe('getPageManifest', () => {
            it('should call dataStore.getEntry with the correct key and unpack the entry', async () => {
                const mockManifest = { id: 'page-1', context: {} };
                mockGetEntry.mockResolvedValue(packPageEntry(mockManifest));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getPageManifest('page-1');

                expect(mockGetEntry).toHaveBeenCalledWith(expect.stringMatching(/^siteId:.+:pageId:page-1:MANIFEST$/));
                expect(result).toEqual(mockManifest);
            });

            it('should use the correct siteId in the storage key', async () => {
                mockGetEntry.mockResolvedValue(packPageEntry({}));

                const manifestStorage = await captureManifestStorage();
                await manifestStorage.getPageManifest('my-page');

                const key = mockGetEntry.mock.calls[0][0] as string;
                expect(key).toMatch(/^siteId:[^:]+:pageId:my-page:MANIFEST$/);
            });

            it('should return null and log warning when DataStoreNotFoundError is thrown', async () => {
                mockGetEntry.mockRejectedValue(new DataStoreNotFoundError('not found'));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getPageManifest('missing-page');

                expect(result).toBeNull();
                expect(mockLogger.warn).toHaveBeenCalledWith('[PageDesigner] Data store entry not found', {
                    message: 'not found',
                });
            });

            it('should return null and log error when DataStoreUnavailableError is thrown', async () => {
                mockGetEntry.mockRejectedValue(new DataStoreUnavailableError('unavailable'));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getPageManifest('some-page');

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Data store unavailable', {
                    message: 'unavailable',
                });
            });

            it('should return null and log error when DataStoreServiceError is thrown', async () => {
                mockGetEntry.mockRejectedValue(new DataStoreServiceError('service error'));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getPageManifest('some-page');

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Data store service error', {
                    message: 'service error',
                });
            });

            it('should return null and log unpack error when entry has invalid base64 data', async () => {
                mockGetEntry.mockResolvedValue({ value: { compressedData: '!!!not-base64!!!' } });

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getPageManifest('bad-page');

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Failed to unpack data store entry', {
                    message: expect.stringContaining('Failed to unpack data store entry'),
                    cause: expect.anything(),
                });
            });

            it('should return null and log unpack error when entry has invalid compressed data', async () => {
                mockGetEntry.mockResolvedValue({
                    value: { compressedData: Buffer.from('not compressed').toString('base64') },
                });

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getPageManifest('bad-page');

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Failed to unpack data store entry', {
                    message: expect.stringContaining('Failed to unpack data store entry'),
                    cause: expect.anything(),
                });
            });

            it('should return null and log unpack error when decompressed data is not valid JSON', async () => {
                const compressed = deflateSync(Buffer.from('not json', 'utf-8'));
                mockGetEntry.mockResolvedValue({ value: { compressedData: compressed.toString('base64') } });

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getPageManifest('bad-page');

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Failed to unpack data store entry', {
                    message: expect.stringContaining('Failed to unpack data store entry'),
                    cause: expect.anything(),
                });
            });

            it('should return null and log unexpected error for unknown errors from getEntry', async () => {
                mockGetEntry.mockRejectedValue(new Error('unexpected'));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getPageManifest('some-page');

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith(
                    '[PageDesigner] Unexpected error during page resolution',
                    { error: expect.any(String) }
                );
            });

            it('should not throw for any error type (errors are forwarded to onError)', async () => {
                const errorCases = [
                    new DataStoreNotFoundError('not found'),
                    new DataStoreUnavailableError('unavailable'),
                    new DataStoreServiceError('service error'),
                    new Error('unknown'),
                ];

                for (const error of errorCases) {
                    mockGetEntry.mockRejectedValue(error);

                    const manifestStorage = await captureManifestStorage();

                    await expect(manifestStorage.getPageManifest('page')).resolves.toBeNull();
                }
            });
        });

        describe('getSiteManifest', () => {
            it('should call dataStore.getEntry with site-level key and unpack the entry', async () => {
                const mockSiteManifest = { pages: {} };
                mockGetEntry.mockResolvedValue(packSiteEntry(mockSiteManifest));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getSiteManifest();

                expect(mockGetEntry).toHaveBeenCalledWith(expect.stringMatching(/^siteId:[^:]+:MANIFEST$/));
                expect(result).toEqual(mockSiteManifest);
            });

            it('should return null and log warning when DataStoreNotFoundError is thrown', async () => {
                mockGetEntry.mockRejectedValue(new DataStoreNotFoundError('not found'));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getSiteManifest();

                expect(result).toBeNull();
                expect(mockLogger.warn).toHaveBeenCalledWith('[PageDesigner] Data store entry not found', {
                    message: 'not found',
                });
            });

            it('should return null and log error when DataStoreUnavailableError is thrown', async () => {
                mockGetEntry.mockRejectedValue(new DataStoreUnavailableError('unavailable'));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getSiteManifest();

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Data store unavailable', {
                    message: 'unavailable',
                });
            });

            it('should return null and log error when DataStoreServiceError is thrown', async () => {
                mockGetEntry.mockRejectedValue(new DataStoreServiceError('service error'));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getSiteManifest();

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Data store service error', {
                    message: 'service error',
                });
            });

            it('should return null and log unpack error when entry has invalid JSON data', async () => {
                mockGetEntry.mockResolvedValue({ value: { data: 'not valid json' } });

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getSiteManifest();

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith('[PageDesigner] Failed to unpack data store entry', {
                    message: expect.stringContaining('Failed to unpack data store entry'),
                    cause: expect.anything(),
                });
            });

            it('should return null and log unexpected error for unknown errors from getEntry', async () => {
                mockGetEntry.mockRejectedValue(new Error('unexpected'));

                const manifestStorage = await captureManifestStorage();
                const result = await manifestStorage.getSiteManifest();

                expect(result).toBeNull();
                expect(mockLogger.error).toHaveBeenCalledWith(
                    '[PageDesigner] Unexpected error during page resolution',
                    { error: expect.any(String) }
                );
            });

            it('should not throw for any error type (errors are forwarded to onError)', async () => {
                const errorCases = [
                    new DataStoreNotFoundError('not found'),
                    new DataStoreUnavailableError('unavailable'),
                    new DataStoreServiceError('service error'),
                    new Error('unknown'),
                ];

                for (const error of errorCases) {
                    mockGetEntry.mockRejectedValue(error);

                    const manifestStorage = await captureManifestStorage();

                    await expect(manifestStorage.getSiteManifest()).resolves.toBeNull();
                }
            });
        });
    });

    describe('metrics logging', () => {
        it('should not emit a debug log when the request does not match a getPage path', async () => {
            const handler = await setupHandler();

            await handler(middlewareParams(new Request(`${SCAPI_BASE}/other-endpoint`)));

            expect(mockLogger.debug).not.toHaveBeenCalled();
        });

        it('should not emit a debug log for non-GET requests', async () => {
            const handler = await setupHandler();

            await handler(middlewareParams(new Request(getPageUrl('homepage'), { method: 'POST' })));

            expect(mockLogger.debug).not.toHaveBeenCalled();
        });

        it('should not emit a debug log for design/preview mode requests', async () => {
            const handler = await setupHandler();

            await handler(middlewareParams(new Request(getPageUrl('homepage', { mode: 'EDIT' }))));

            expect(mockLogger.debug).not.toHaveBeenCalled();
        });

        it('should emit a debug log with metrics when resolution is attempted', async () => {
            const handler = await setupHandler();
            const mockPage = { id: 'homepage', typeId: 'storefront', regions: [] };
            mockedResolvePage.mockResolvedValue(mockPage as any);

            await handler(middlewareParams(new Request(getPageUrl('homepage'))));

            expect(mockLogger.debug).toHaveBeenCalledWith(
                '[page-resolution-middleware] page resolution',
                expect.objectContaining({
                    resolvedPageId: 'homepage',
                    resolvedPageTypeId: 'storefront',
                    parameters: expect.objectContaining({
                        id: 'homepage',
                        identifierType: 'page',
                        locale: expect.any(String),
                    }),
                    metrics: expect.objectContaining({
                        resolutionDuration: expect.any(Number),
                    }),
                })
            );
        });

        it('should emit a debug log with undefined result fields when resolvePage returns null', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            await handler(middlewareParams(new Request(getPageUrl('nonexistent'))));

            expect(mockLogger.debug).toHaveBeenCalledWith(
                '[page-resolution-middleware] page resolution',
                expect.objectContaining({
                    resolvedPageId: undefined,
                    resolvedPageTypeId: undefined,
                    metrics: expect.objectContaining({
                        resolutionDuration: expect.any(Number),
                    }),
                })
            );
        });

        it('should log resolution parameters with correct identifierType for product pages', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            const aspectAttributes = JSON.stringify({ productId: 'shirt-001' });
            await handler(middlewareParams(new Request(getPageUrl('pdp', { aspectAttributes }))));

            expect(mockLogger.debug).toHaveBeenCalledWith(
                '[page-resolution-middleware] page resolution',
                expect.objectContaining({
                    parameters: expect.objectContaining({
                        id: 'shirt-001',
                        identifierType: 'product',
                    }),
                })
            );
        });

        it('should log resolution parameters with correct identifierType for category pages', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue(null);

            const aspectAttributes = JSON.stringify({ categoryId: 'mens' });
            await handler(middlewareParams(new Request(getPageUrl('plp', { aspectAttributes }))));

            expect(mockLogger.debug).toHaveBeenCalledWith(
                '[page-resolution-middleware] page resolution',
                expect.objectContaining({
                    parameters: expect.objectContaining({
                        id: 'mens',
                        identifierType: 'category',
                    }),
                })
            );
        });

        it('should include non-negative duration values in metrics', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockResolvedValue({ id: 'page', regions: [] } as any);

            await handler(middlewareParams(new Request(getPageUrl('page'))));

            const logCall = mockLogger.debug.mock.calls[0];
            const metrics = logCall[1].metrics;

            expect(metrics.resolutionDuration).toBeGreaterThanOrEqual(0);
        });

        it('should not emit metrics when resolvePage throws (error propagates before logMetrics)', async () => {
            const handler = await setupHandler();
            mockedResolvePage.mockRejectedValue(new Error('resolution failed'));

            await expect(handler(middlewareParams(new Request(getPageUrl('page'))))).rejects.toThrow(
                'resolution failed'
            );

            expect(mockLogger.debug).not.toHaveBeenCalled();
        });
    });
});
