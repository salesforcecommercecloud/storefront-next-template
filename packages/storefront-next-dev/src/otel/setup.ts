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
 * OpenTelemetry tracer provider initialization.
 *
 * ## Exporter design: why ConsoleSpanExporter?
 *
 * This storefront runs in two environments:
 *   - Local development on a developer's machine (Vite dev server)
 *   - Salesforce Managed Runtime (MRT), a serverless environment backed by AWS Lambda
 *
 * Standard OpenTelemetry exporters (OTLP, Jaeger, Zipkin) are designed for
 * long-running processes: they maintain background agents, batch spans in memory,
 * and flush asynchronously. That model does not work in a serverless environment.
 * Lambda invocations must complete quickly — a background agent or async flush
 * after the response is sent would hold the Lambda open unnecessarily, increasing
 * cost and cold-start latency.
 *
 * Instead, we write spans synchronously to stdout via MrtConsoleSpanExporter — a
 * subclass of ConsoleSpanExporter that outputs structured JSON matching the format
 * MRT's log infrastructure expects. MRT collects stdout from every invocation and
 * forwards the log stream to downstream analytics systems. Telemetry reaches those
 * systems without any in-process agent or network connection from the Lambda
 * function itself.
 *
 * SimpleSpanProcessor is used (instead of BatchSpanProcessor) for the same reason:
 * immediate, synchronous export with no in-memory queue that could be lost if the
 * process exits.
 *
 * Uses NodeTracerProvider directly (instead of NodeSDK) to avoid async resource
 * detection. NodeSDK's autoDetectResources creates a Resource with
 * asyncAttributesPending=true, which causes SimpleSpanProcessor.onEnd() to
 * defer export via waitForAsyncAttributes(). In the Vite SSR module runner
 * context, that deferred microtask never executes. A synchronous Resource
 * ensures the immediate export path is always taken.
 *
 * @env SFNEXT_OTEL_ENABLED — set to `"true"` to enable (e.g. `SFNEXT_OTEL_ENABLED=true pnpm dev`)
 */

import type { Tracer } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { MrtConsoleSpanExporter } from './mrt-console-span-exporter';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { logger } from '../logger';

export const SERVICE_NAME = 'storefront-next';

/**
 * Initializes OpenTelemetry and returns a Tracer from the provider directly.
 *
 * Returns the tracer via `provider.getTracer()` instead of the global
 * `trace.getTracer()` API. In the Vite SSR module runner, the built
 * dist/entry/server.js and the externalized @opentelemetry/sdk-trace-node
 * resolve @opentelemetry/api to different module instances (different paths
 * through pnpm's strict node_modules). Each instance has its own
 * ProxyTracerProvider singleton, so `provider.register()` sets the delegate
 * on sdk-trace-node's API instance while our code's `trace.getTracer()`
 * reads from a separate API instance with no delegate — returning a tracer
 * backed by a bare BasicTracerProvider with NoopSpanProcessor.
 *
 * Getting the tracer directly from the provider bypasses the global registry
 * entirely, guaranteeing the tracer uses our configured span processors.
 */
let cachedTracer: Tracer | null = null;

// In the Vite SSR module runner, setup.ts may be loaded by two different module
// instances (the Express server and the SSR bundle) — each with its own
// `cachedTracer`. UndiciInstrumentation hooks into process-global
// diagnostics_channel events, so registering it twice causes duplicate spans
// for every fetch. This process-global flag ensures it is registered only once.
const UNDICI_REGISTERED_KEY = Symbol.for('sfnext.otel.undici_registered');

export function initTelemetry(): Tracer | null {
    if (cachedTracer) return cachedTracer;
    try {
        const provider = new NodeTracerProvider({
            resource: new Resource({ [ATTR_SERVICE_NAME]: SERVICE_NAME }),
        });

        provider.addSpanProcessor(new SimpleSpanProcessor(new MrtConsoleSpanExporter()));
        provider.register();

        // Guard against double-registration across Vite module boundaries.
        // See comment above UNDICI_REGISTERED_KEY.
        if (!(globalThis as Record<symbol, boolean>)[UNDICI_REGISTERED_KEY]) {
            (globalThis as Record<symbol, boolean>)[UNDICI_REGISTERED_KEY] = true;
            registerInstrumentations({
                tracerProvider: provider,
                instrumentations: [
                    new UndiciInstrumentation({
                        requestHook(span, request) {
                            try {
                                const method = request.method.toUpperCase();
                                const url = `${request.origin}${request.path}`;
                                span.updateName(`${method} ${url}`);
                            } catch {
                                // Non-fatal — default span name is acceptable
                            }
                        },
                    }),
                ],
            });
        }

        cachedTracer = provider.getTracer(SERVICE_NAME);
        return cachedTracer;
    } catch (error) {
        logger.error('[otel] Failed to initialize OpenTelemetry:', error);
        return null;
    }
}
