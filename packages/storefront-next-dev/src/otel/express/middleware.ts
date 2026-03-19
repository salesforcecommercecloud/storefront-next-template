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
 * Express middleware that creates server and streaming OTel spans.
 *
 * - **Server span** wraps the entire Express request lifecycle (receive → response close).
 * - **Streaming span** starts at TTFB (first `writeHead` or `write`) and ends when
 *   the response stream closes.
 *
 * Uses `startActiveSpan` for the server span so all downstream spans (React Router's
 * `request`, loaders, middleware) automatically become children via OTel context propagation.
 *
 * Listens to both `close` and `finish` events with a once-guard — dev server emits
 * `close`, MRT Lambda adapter emits `finish`.
 */

import type { RequestHandler } from 'express';
import { context, type Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { initTelemetry } from '../setup';

export function createOtelExpressMiddleware(): RequestHandler {
    const maybeTracer = initTelemetry();
    if (!maybeTracer) return (_req, _res, next) => next();
    const tracer = maybeTracer;

    return (req, res, next) => {
        try {
            const url = new URL(req.originalUrl || req.url, 'http://localhost').pathname;
            const method = req.method;

            tracer.startActiveSpan(
                `[sfnext] server ${method} ${url}`,
                { attributes: { 'http.request.method': method, 'url.path': url } },
                (serverSpan) => {
                    try {
                        // Inject W3C traceparent header so trace ID is accessible from the browser
                        const spanContext = trace.getSpan(context.active())?.spanContext();
                        if (spanContext) {
                            const flags = spanContext.traceFlags.toString(16).padStart(2, '0');
                            const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`;
                            res.setHeader('traceparent', traceparent);
                        }
                    } catch {
                        // traceparent header is non-essential — skip on failure
                    }

                    const serverCtx = context.active();
                    const startTime = performance.now();
                    let streamingSpan: Span | null = null;
                    let ttfbMs = 0;
                    let ended = false;

                    function recordTTFB() {
                        if (streamingSpan) return;
                        try {
                            ttfbMs = Math.round(performance.now() - startTime);
                            serverSpan.setAttribute('sfnext.ttfb_ms', ttfbMs);
                            streamingSpan = tracer.startSpan(
                                `[sfnext] response streaming ${method} ${url}`,
                                {
                                    attributes: {
                                        'http.request.method': method,
                                        'url.path': url,
                                        'sfnext.ttfb_ms': ttfbMs,
                                    },
                                },
                                serverCtx
                            );
                        } catch {
                            // Span creation failure is non-fatal
                        }
                    }

                    // Patch writeHead + write to detect first byte
                    const origWriteHead = res.writeHead.bind(res);
                    res.writeHead = ((...args: Parameters<typeof origWriteHead>) => {
                        recordTTFB();
                        return origWriteHead(...args);
                    }) as typeof origWriteHead;
                    const origWrite = res.write.bind(res);
                    res.write = ((...args: Parameters<typeof origWrite>) => {
                        recordTTFB();
                        return origWrite(...args);
                    }) as typeof origWrite;

                    function endSpans() {
                        if (ended) return;
                        ended = true;
                        try {
                            const totalMs = Math.round(performance.now() - startTime);
                            const statusCode = res.statusCode;

                            if (streamingSpan) {
                                streamingSpan.setAttribute('http.streaming_duration_ms', totalMs - ttfbMs);
                                streamingSpan.setAttribute('http.response.status_code', statusCode);
                                if (statusCode >= 500) streamingSpan.setStatus({ code: SpanStatusCode.ERROR });
                                streamingSpan.end();
                            }
                            serverSpan.setAttribute('http.response.status_code', statusCode);
                            serverSpan.setAttribute('http.total_duration_ms', totalMs);
                            if (statusCode >= 500) serverSpan.setStatus({ code: SpanStatusCode.ERROR });
                            serverSpan.end();
                        } catch {
                            // Response is already closing — swallow OTel errors silently
                        }
                    }

                    res.once('close', endSpans);
                    res.once('finish', endSpans);
                    next();
                }
            );
        } catch {
            // OTel failure must never prevent the request from being handled
            next();
        }
    };
}
