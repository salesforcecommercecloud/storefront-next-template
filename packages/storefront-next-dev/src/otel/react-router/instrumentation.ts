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

/**
 * Platform-level handler instrumentation.
 *
 * Uses React Router's unstable_ServerInstrumentation API to observe the
 * request lifecycle at the handler and route levels. This runs around ALL
 * requests (document + data) and provides OpenTelemetry spans for:
 * - `request` — root span per incoming HTTP request
 * - `loader` — child span per route loader
 * - `action` — child span per route action
 * - `middleware` — child span per route middleware
 *
 * `tracer` is `null` when OTel is disabled. Each handler checks explicitly
 * and calls through immediately, so the disabled path is always obvious.
 *
 * @env SFNEXT_OTEL_ENABLED — set to `"true"` to enable OpenTelemetry tracing.
 *   Spans are written synchronously to stdout via ConsoleSpanExporter, which is
 *   compatible with both local development and the Managed Runtime serverless
 *   environment (see otel/setup.ts for the full design rationale).
 *   Example: `SFNEXT_OTEL_ENABLED=true pnpm dev`
 *
 * @see https://reactrouter.com/how-to/instrumentation
 */

import { type Tracer, type Attributes, SpanStatusCode } from '@opentelemetry/api';
import type { unstable_ServerInstrumentation } from 'react-router';
import { ATTR_HTTP_REQUEST_METHOD, ATTR_URL_PATH } from '@opentelemetry/semantic-conventions';
import { initTelemetry } from '../setup';

const tracer: Tracer | null = process.env.SFNEXT_OTEL_ENABLED === 'true' ? initTelemetry() : null;

/**
 * Runs `handle` inside an active OTel span, recording errors and ending the span.
 * When `tracer` is null (OTel disabled), calls `handle` directly with no overhead.
 */
async function traced(
    spanName: string,
    attributes: Attributes,
    handle: () => Promise<{ status: string; error?: Error }>
): Promise<void> {
    if (!tracer) {
        await handle();
        return;
    }
    let handled = false;
    try {
        await tracer.startActiveSpan(spanName, { attributes }, async (span) => {
            try {
                handled = true;
                const result = await handle();
                if (result.status === 'error' && result.error) {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
                    span.recordException(result.error);
                }
            } finally {
                span.end();
            }
        });
    } catch {
        // OTel failure must never break the request pipeline.
        // If handle() was already called inside the span callback, don't call it again.
        if (!handled) await handle();
    }
}

/**
 * HTTP attributes common to all spans.
 * url.path only — url.full would expose query params which may contain auth
 * tokens or PII. http.response.status_code is not available from
 * unstable_InstrumentationHandlerResult.
 */
function httpAttributes(request: { method: string; url: string }): Attributes {
    const attrs: Attributes = { [ATTR_HTTP_REQUEST_METHOD]: request.method };
    try {
        attrs[ATTR_URL_PATH] = new URL(request.url).pathname;
    } catch {
        // Malformed URL — skip url.path rather than throwing
    }
    return attrs;
}

export const platformInstrumentation: unstable_ServerInstrumentation = {
    handler(handler) {
        handler.instrument({
            async request(handleRequest, { request }) {
                await traced('react-router ssr', httpAttributes(request), handleRequest);
            },
        });
    },
    route(route) {
        // HTTP attributes (method, url.path) are intentionally omitted here.
        // These spans are children of the request span which already carries
        // them, and rr.route.id / rr.route.pattern are the meaningful
        // identifiers at the route level.
        function routeAttributes(unstable_pattern: string): Attributes {
            return {
                'rr.route.id': route.id,
                'rr.route.pattern': unstable_pattern,
            };
        }

        route.instrument({
            async loader(handleLoader, { unstable_pattern }) {
                await traced(`loader (${route.id})`, routeAttributes(unstable_pattern), handleLoader);
            },
            async action(handleAction, { unstable_pattern }) {
                await traced(`action (${route.id})`, routeAttributes(unstable_pattern), handleAction);
            },
            async middleware(handleMiddleware, { unstable_pattern }) {
                await traced(`middleware (${route.id})`, routeAttributes(unstable_pattern), handleMiddleware);
            },
        });
    },
};
