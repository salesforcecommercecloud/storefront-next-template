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
import type { MiddlewareFunction, RouterContextProvider } from 'react-router';
import {
    resolvePage,
    type ManifestStorage,
    type PageManifest,
    type IdentifierType,
    type ContextResolver,
    type SiteManifest,
} from '@salesforce/storefront-next-runtime/design/data';
import {
    DataStore,
    DataStoreNotFoundError,
    DataStoreUnavailableError,
    DataStoreServiceError,
} from '@salesforce/storefront-next-runtime/data-store';
import type { ShopperExperience, Middleware, Clients } from '@salesforce/storefront-next-runtime/scapi';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import type { AppConfig } from '@/types/config';
import { scapiMiddlewareContext } from '@/lib/scapi-middleware';
import { getLogger } from '@/lib/logger.server';
import type { Logger } from '@/lib/logger';
import { createInflate } from 'node:zlib';
import { Readable } from 'node:stream';
import { json } from 'node:stream/consumers';

/**
 * URL path pattern matching shopperExperience `getPage` requests.
 *
 * Anchored to the end of the pathname (`$`) so it only matches
 * `/pages/{pageId}` as the final path segment. This avoids false positives
 * from other shopper-experience endpoints (e.g. `/pages` without a page ID)
 * or from organization IDs that happen to contain the word "pages".
 */
const GET_PAGE_PATH_RE = /\/pages\/([^/?]+)$/;

type ManifestType = 'page' | 'site';
type ManifestWrapperKey<TType extends ManifestType> = TType extends 'page' ? 'compressedData' : 'data';
type ManifestValue<TType extends ManifestType> = {
    [K in ManifestWrapperKey<TType>]: string;
};
type DataStoreClient = Pick<DataStore, 'getEntry'>;

/**
 * Thrown when a Data Store entry cannot be decoded (base64), decompressed
 * (inflate), or parsed (JSON). Wraps the underlying error as `cause`.
 */
class DataStoreEntryUnpackError extends Error {
    constructor(key: string, cause: unknown) {
        super(`Failed to unpack data store entry for key: ${key}`);
        this.name = 'DataStoreEntryUnpackError';
        this.cause = cause;
    }
}

/**
 * Thrown when the SCAPI Shopper Experience `qualifiers/resolve` call fails.
 * Wraps the underlying error as `cause`.
 */
class QualifierResolveError extends Error {
    constructor(cause: unknown) {
        super('Failed to resolve qualifiers');
        this.name = 'QualifierResolveError';
        this.cause = cause;
    }
}

/**
 * Server-only middleware that registers an SCAPI client middleware factory to
 * intercept `shopperExperience.getPage` calls and resolve Page Designer pages
 * from the MRT Data Store when available.
 *
 * The factory is evaluated lazily at `createApiClients` time (inside loaders),
 * so all context values are guaranteed to be available regardless of middleware
 * ordering. When the feature flag is disabled or the Data Store is not
 * available (e.g. local development), the factory returns `null` and `getPage`
 * calls pass through to SCAPI as usual.
 *
 * Design/preview mode requests (containing `mode` or `pdToken` query params)
 * are never intercepted — they always reach SCAPI for live content.
 */
export const pageDesignerResolutionMiddleware: MiddlewareFunction<Response> = async ({ context }, next) => {
    const config = getConfig<AppConfig>(context);

    if (config.features.mrtBasedPageDesignerResolution) {
        const scapiMiddlewares = context.get(scapiMiddlewareContext);
        scapiMiddlewares.push({
            clients: ['shopperExperience'],
            factory: createPageResolutionMiddleware,
        });
    }

    return next();
};

/**
 * SCAPI middleware factory for Page Designer page resolution.
 *
 * Reads the Data Store, site ID, and locale from context.
 * Returns an openapi-fetch middleware that intercepts `getPage` requests,
 * or `null` if the Data Store is unavailable.
 */
function createPageResolutionMiddleware(
    context: RouterContextProvider | Readonly<RouterContextProvider>,
    clients: Clients
): Middleware | null {
    const config = getConfig<AppConfig>(context);
    const siteCtx = context.get(siteContext);
    const { i18next } = getTranslation(context);
    const siteId = siteCtx?.site.id ?? config.defaultSiteId;
    const locale = i18next.language ?? config.i18n.fallbackLng;
    const logger = getLogger(context);
    const onError = getErrorHandler(logger);
    const dataStore = DataStore.getDataStore();

    return {
        async onRequest({ request }) {
            const metrics: Metrics = {};

            const response = await resolveGetPageRequest({
                metrics,
                request,
                context,
                dataStore,
                siteId,
                locale,
                onError,
                clients,
                logger,
            });

            logMetrics(logger, metrics);

            return response;
        },
    };
}

/**
 * Timing markers and contextual data collected during page resolution.
 *
 * All timing fields are `performance.now()` timestamps recorded at the
 * start/end of each phase. They are converted to durations by
 * {@link logMetrics} via {@link getDuration}.
 *
 * Manifest retrieval and unpack markers are split per manifest type
 * (page vs site) because both may be fetched during a single resolution.
 */
interface Metrics {
    resolutionStart?: number;
    resolutionEnd?: number;
    contextResolutionStart?: number;
    contextResolutionEnd?: number;
    pageManifestRetrievalStart?: number;
    pageManifestRetrievalEnd?: number;
    pageManifestUnpackStart?: number;
    pageManifestUnpackEnd?: number;
    siteManifestRetrievalStart?: number;
    siteManifestRetrievalEnd?: number;
    siteManifestUnpackStart?: number;
    siteManifestUnpackEnd?: number;
    resolutionParameters?: { id: string; identifierType: IdentifierType; aspectType?: string; locale: string };
    resolutionResult?: ShopperExperience.schemas['Page'] | null;
}

/**
 * Computes a duration from a sequence of values using left-to-right subtraction.
 *
 * For two arguments `(end, start)` this returns `end - start`.
 * For more arguments this returns `first - second - third - ...`, which is
 * used to derive the runtime processing overhead by subtracting sub-operation
 * durations from the total.
 *
 * Returns `undefined` if any value is missing, preventing `NaN` from
 * propagating into logs.
 */
function getDuration(...values: (number | undefined)[]): number | undefined {
    if (values.length === 0 || values[0] == null) return undefined;

    let result = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] == null) return undefined;

        result -= values[i] as number;
    }
    return result;
}

/**
 * Computes durations from the collected timing markers and emits a
 * structured debug log entry.
 *
 * No-ops when resolution was never attempted (i.e. the request did not
 * match a `getPage` path or was skipped for design/preview mode).
 */
function logMetrics(logger: Logger, metrics: Metrics): void {
    if (metrics.resolutionStart == null) return;

    const resolutionDuration = getDuration(metrics.resolutionEnd, metrics.resolutionStart);
    const contextResolutionDuration = getDuration(metrics.contextResolutionEnd, metrics.contextResolutionStart);
    const pageManifestRetrievalDuration = getDuration(
        metrics.pageManifestRetrievalEnd,
        metrics.pageManifestRetrievalStart
    );
    const siteManifestRetrievalDuration = getDuration(
        metrics.siteManifestRetrievalEnd,
        metrics.siteManifestRetrievalStart
    );
    const pageManifestUnpackDuration = getDuration(metrics.pageManifestUnpackEnd, metrics.pageManifestUnpackStart);
    const siteManifestUnpackDuration = getDuration(metrics.siteManifestUnpackEnd, metrics.siteManifestUnpackStart);

    // Runtime processing = total resolution minus time spent in sub-operations.
    // Only defined when all component durations are available.
    const runtimeProcessingDuration = getDuration(
        resolutionDuration,
        contextResolutionDuration,
        pageManifestRetrievalDuration,
        siteManifestRetrievalDuration,
        pageManifestUnpackDuration,
        siteManifestUnpackDuration
    );

    logger.debug('[page-resolution-middleware] page resolution', {
        resolvedPageId: metrics.resolutionResult?.id,
        resolvedPageTypeId: metrics.resolutionResult?.typeId,
        parameters: metrics.resolutionParameters,
        metrics: {
            resolutionDuration,
            contextResolutionDuration,
            pageManifestRetrievalDuration,
            siteManifestRetrievalDuration,
            pageManifestUnpackDuration,
            siteManifestUnpackDuration,
            runtimeProcessingDuration,
        },
    });
}

/**
 * Attempts to resolve a `getPage` request from the Data Store.
 *
 * Matches GET requests to `/pages/{pageId}`, extracts the page ID and aspect
 * attributes from the URL, and resolves the page from the Data Store manifest.
 * Returns a JSON `Response` if resolution succeeds, or `undefined` to let the
 * request pass through to SCAPI.
 *
 * Requests in design/preview mode (`mode` or `pdToken` query params) are
 * never intercepted.
 */
async function resolveGetPageRequest({
    request,
    dataStore,
    clients,
    siteId,
    locale,
    metrics,
    onError,
    logger,
}: {
    request: Request;
    context: RouterContextProvider | Readonly<RouterContextProvider>;
    dataStore: DataStoreClient;
    siteId: string;
    locale: string;
    metrics: Metrics;
    onError: (error: unknown) => void;
    clients: Clients;
    logger: Logger;
}): Promise<Response | undefined> {
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const match = url.pathname.match(GET_PAGE_PATH_RE);
    if (!match) return;

    // Design/preview mode requests must always reach SCAPI for live content
    if (url.searchParams.has('mode') || url.searchParams.has('pdToken')) return;

    metrics.resolutionStart = performance.now();

    const pageId = decodeURIComponent(match[1]);
    const aspectAttributes = parseAspectAttributes(url, logger);
    const parameters = getPageResolutionParams({
        metrics,
        clients,
        dataStore,
        siteId,
        locale,
        pageId,
        aspectAttributes,
        onError,
    });

    metrics.resolutionParameters = {
        id: parameters.id,
        identifierType: parameters.identifierType,
        aspectType: parameters.aspectType,
        locale: parameters.locale,
    };

    const resolved = await resolvePage(parameters);

    metrics.resolutionEnd = performance.now();

    if (resolved) {
        metrics.resolutionResult = resolved;

        return Response.json(resolved);
    }
}

/**
 * Parses aspect attributes from the `aspectAttributes` query parameter.
 * The parameter is a JSON-encoded string set by `fetchPage` when constructing
 * the `getPage` request.
 */
function parseAspectAttributes(
    url: URL,
    logger: Logger
): { aspectType?: string; categoryId?: string; productId?: string } {
    const raw = url.searchParams.get('aspectAttributes');
    if (!raw) return {};

    try {
        return JSON.parse(raw) as { aspectType?: string; categoryId?: string; productId?: string };
    } catch {
        logger.warn('[Page Designer] Failed to parse aspect attributes', { raw });
        return {};
    }
}

/**
 * Builds the parameters object required by the `resolvePage` function.
 *
 * Determines the identifier type (`product`, `category`, or `page`) based on
 * which aspect attribute is provided, and constructs the manifest storage and
 * context resolver from the given dependencies.
 */
function getPageResolutionParams({
    dataStore,
    siteId,
    locale,
    pageId,
    aspectAttributes,
    metrics,
    onError,
    clients,
}: {
    dataStore: DataStoreClient;
    siteId: string;
    locale: string;
    pageId: string;
    aspectAttributes: { aspectType?: string; categoryId?: string; productId?: string };
    metrics: Metrics;
    onError: (error: unknown) => void;
    clients: Clients;
}): Parameters<typeof resolvePage>[0] {
    const { aspectType, categoryId, productId } = aspectAttributes;
    let identifierType: IdentifierType = 'page';
    let id: string = pageId;

    if (productId) {
        identifierType = 'product';
        id = productId;
    } else if (categoryId) {
        identifierType = 'category';
        id = categoryId;
    }

    return {
        id,
        identifierType,
        aspectType,
        locale,
        manifestStorage: getPageManifestStorage({ dataStore, siteId, onError, metrics }),
        contextResolver: getContextResolver({ onError, metrics, clients }),
    };
}

/**
 * Creates a {@link ContextResolver} that delegates to the SCAPI Shopper
 * Experience `qualifiers/resolve` endpoint.
 *
 * Forwards the resolution context (campaign qualifiers, customer groups,
 * and data bindings) and returns the resolved result. If the call fails,
 * the error is wrapped in a {@link QualifierResolveError} and passed to
 * `onError`; the resolver then returns `null`.
 */
function getContextResolver({
    onError,
    metrics,
    clients,
}: {
    onError: (error: QualifierResolveError) => void;
    metrics: Metrics;
    clients: Clients;
}): ContextResolver {
    return async (resolutionContext) => {
        metrics.contextResolutionStart = performance.now();

        try {
            const result = await clients.shopperExperience.resolveQualifiers({
                params: {},
                body: {
                    campaignQualifiers: resolutionContext.campaignQualifiers,
                    dataBindings: resolutionContext.dataBindings,
                    customerGroups: resolutionContext.customerGroups,
                },
            });

            return result.data;
        } catch (error: unknown) {
            onError(new QualifierResolveError(error));

            return null;
        } finally {
            metrics.contextResolutionEnd = performance.now();
        }
    };
}

/**
 * Creates a {@link ManifestStorage} backed by the MRT Data Store.
 *
 * Provides methods to retrieve page-level and site-level manifests using
 * Data Store keys in the format `site:{siteId}:page:{pageId}:MANIFEST` and
 * `site:{siteId}:MANIFEST`. Entries are base64-encoded and deflate-compressed;
 * they are decoded and decompressed via {@link getAndUnpackDataStoreEntry}.
 * Data Store errors (not-found, unavailable, service) and unpack errors are
 * caught and forwarded to `onError`, resulting in a `null` return.
 */
function getPageManifestStorage({
    dataStore,
    siteId,
    onError,
    metrics,
}: {
    dataStore: DataStoreClient;
    siteId: string;
    onError: (error: unknown) => void;
    metrics: Metrics;
}): ManifestStorage {
    async function getManifest(): Promise<SiteManifest | null>;
    async function getManifest(id: string): Promise<PageManifest | null>;
    async function getManifest(id?: string): Promise<PageManifest | SiteManifest | null> {
        const key = getStorageKey(siteId, id);
        const manifestType = id ? 'page' : 'site';

        try {
            return await getAndUnpackDataStoreEntry(dataStore, key, manifestType, metrics);
        } catch (error: unknown) {
            onError(error);

            return null;
        }
    }

    return {
        getPageManifest: (id: string) => getManifest(id),
        getSiteManifest: () => getManifest(),
    };
}

/**
 * Fetches a Data Store entry by key and unpacks it by decoding from base64,
 * decompressing with inflate, and parsing the resulting JSON.
 *
 * @throws {DataStoreEntryUnpackError} If decoding, decompression, or parsing fails.
 */
async function getAndUnpackDataStoreEntry(
    dataStore: DataStoreClient,
    key: string,
    manifestType: ManifestType,
    metrics: Metrics
): Promise<PageManifest | SiteManifest> {
    metrics[`${manifestType}ManifestRetrievalStart`] = performance.now();

    const entry = (await dataStore.getEntry(key)) as { value?: ManifestValue<typeof manifestType> } | undefined;

    metrics[`${manifestType}ManifestRetrievalEnd`] = performance.now();

    if (!entry) {
        throw new DataStoreNotFoundError(`Data store entry not found for key: ${key}`);
    }

    try {
        let stream: Readable;

        metrics[`${manifestType}ManifestUnpackStart`] = performance.now();

        if (!entry.value) {
            // This will get caught so the error message doesn't
            // really matter here.
            throw new Error('Data store entry is blank');
        }

        if (manifestType === 'page') {
            const value = entry.value.compressedData;

            stream = Readable.from(Buffer.from(value, 'base64')).pipe(createInflate());
        } else {
            const value = entry.value.data;

            stream = Readable.from(Buffer.from(value, 'utf-8'));
        }

        return (await json(stream)) as PageManifest | SiteManifest;
    } catch (error: unknown) {
        throw new DataStoreEntryUnpackError(key, error);
    } finally {
        metrics[`${manifestType}ManifestUnpackEnd`] = performance.now();
    }
}

/**
 * Returns the Data Store key for a page or site manifest.
 */
function getStorageKey(siteId: string, pageId?: string): string {
    return pageId ? `siteId:${siteId}:pageId:${pageId}:MANIFEST` : `siteId:${siteId}:MANIFEST`;
}

/**
 * Creates an error handler for page resolution errors.
 *
 * Returns a callback that categorises errors by type for observability.
 */
function getErrorHandler(logger: Logger): (error: unknown) => void {
    return (error: unknown) => {
        if (error instanceof DataStoreNotFoundError) {
            // Expected when a manifest hasn't been published yet — not necessarily a bug.
            logger.warn('[PageDesigner] Data store entry not found', { message: error.message });
        } else if (error instanceof DataStoreUnavailableError) {
            logger.error('[PageDesigner] Data store unavailable', { message: error.message });
        } else if (error instanceof DataStoreServiceError) {
            logger.error('[PageDesigner] Data store service error', { message: error.message });
        } else if (error instanceof DataStoreEntryUnpackError) {
            logger.error('[PageDesigner] Failed to unpack data store entry', {
                message: error.message,
                cause: error.cause,
            });
        } else if (error instanceof QualifierResolveError) {
            logger.error('[PageDesigner] Failed to resolve qualifiers', {
                message: error.message,
                cause: error.cause,
            });
        } else {
            logger.error('[PageDesigner] Unexpected error during page resolution', {
                error: String(error),
            });
        }
    };
}
