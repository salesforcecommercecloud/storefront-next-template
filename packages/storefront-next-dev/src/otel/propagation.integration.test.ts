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
 * End-to-end W3C trace-context propagation tests.
 *
 * Unlike middleware.test.ts (which mocks the tracer and the OTel API to verify
 * wiring), this suite exercises the REAL pipeline: the real `initTelemetry()`
 * provider, sampler, and globally-registered W3CTraceContextPropagator, plus the
 * real MrtConsoleSpanExporter. Emitted spans are read back off `console.info` —
 * exactly the signal the plan describes for local verification.
 *
 * Because it runs the production setup, it is the regression guard for AC #1
 * (inbound continuation) and AC #3 (honoring MRT's sampling decision): if the
 * sampler in setup.ts were changed to anything other than parent-based, the
 * unsampled-inbound case below would start emitting a competing trace and fail.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { context, propagation, ROOT_CONTEXT, trace, type Tracer } from '@opentelemetry/api';
import { createOtelExpressMiddleware } from './express/middleware';
import { initTelemetry } from './setup';

const VALID_TRACE_ID = '11111111111111111111111111111111';
const VALID_PARENT_SPAN_ID = '2222222222222222';
const SAMPLED = `00-${VALID_TRACE_ID}-${VALID_PARENT_SPAN_ID}-01`;
const UNSAMPLED = `00-${VALID_TRACE_ID}-${VALID_PARENT_SPAN_ID}-00`;

interface EmittedSpan {
    traceId: string;
    id: string;
    parentId?: string;
    name: string;
}

function mockRequest(headers: Record<string, string> = {}, method = 'GET', url = '/products') {
    return { method, url, originalUrl: url, headers } as unknown as Parameters<
        ReturnType<typeof createOtelExpressMiddleware>
    >[0];
}

function mockResponse(statusCode = 200) {
    const emitter = new EventEmitter();
    const res = Object.assign(emitter, {
        statusCode,
        writeHead: vi.fn(),
        write: vi.fn(),
        setHeader: vi.fn(),
    });
    return res as unknown as Parameters<ReturnType<typeof createOtelExpressMiddleware>>[1] &
        EventEmitter & {
            setHeader: ReturnType<typeof vi.fn>;
        };
}

describe('W3C trace-context propagation (integration)', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    const savedEnv = process.env.SFNEXT_OTEL_ENABLED;

    beforeEach(() => {
        process.env.SFNEXT_OTEL_ENABLED = 'true';
        // Initialize the real pipeline before spying, so any provider-registration
        // log lines don't pollute the per-test console.info capture below.
        initTelemetry();
        consoleSpy = vi.spyOn(console, 'info').mockReturnValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (savedEnv === undefined) delete process.env.SFNEXT_OTEL_ENABLED;
        else process.env.SFNEXT_OTEL_ENABLED = savedEnv;
    });

    /** Drive one request through the middleware and return the spans it emitted. */
    function driveRequest(headers: Record<string, string> = {}): EmittedSpan[] {
        const middleware = createOtelExpressMiddleware();
        const res = mockResponse();
        middleware(mockRequest(headers), res as never, vi.fn());
        res.writeHead(200);
        res.emit('finish');
        return consoleSpy.mock.calls
            .map((call: unknown[]): EmittedSpan | null => {
                try {
                    return JSON.parse(call[0] as string) as EmittedSpan;
                } catch {
                    return null;
                }
            })
            .filter(
                (s: EmittedSpan | null): s is EmittedSpan =>
                    !!s && typeof s.traceId === 'string' && typeof s.id === 'string'
            );
    }

    const serverSpan = (spans: EmittedSpan[]) => spans.find((s) => s.name.startsWith('[sfnext] server'));

    describe('inbound continuation', () => {
        it('continues a sampled inbound trace: same trace ID, parented to the inbound span', () => {
            const spans = driveRequest({ traceparent: SAMPLED });

            expect(spans.length).toBeGreaterThan(0);
            // Every emitted span shares the inbound trace ID.
            for (const span of spans) {
                expect(span.traceId).toBe(VALID_TRACE_ID);
            }
            // The root server span is parented to the inbound span ID.
            expect(serverSpan(spans)?.parentId).toBe(VALID_PARENT_SPAN_ID);
        });

        it('starts a fresh root trace when no inbound traceparent is present', () => {
            const spans = driveRequest({});

            expect(spans.length).toBeGreaterThan(0);
            const root = serverSpan(spans);
            expect(root).toBeDefined();
            // Fresh, random 32-hex trace ID — not the inbound fixture.
            expect(root?.traceId).toMatch(/^[0-9a-f]{32}$/);
            expect(root?.traceId).not.toBe(VALID_TRACE_ID);
            // No parent: a root span.
            expect(root?.parentId).toBeUndefined();
        });

        it('honors an unsampled inbound trace (flags=00): emits no competing trace', () => {
            const spans = driveRequest({ traceparent: UNSAMPLED });

            // The storefront must not record/export a span for an unsampled request,
            // and must not start a competing sampled root trace either.
            expect(spans).toHaveLength(0);
        });

        it('handles a malformed inbound traceparent safely (treated as no parent)', () => {
            const spans = driveRequest({ traceparent: 'not-a-valid-traceparent' });

            const root = serverSpan(spans);
            expect(root).toBeDefined();
            expect(root?.traceId).toMatch(/^[0-9a-f]{32}$/);
            expect(root?.traceId).not.toBe(VALID_TRACE_ID);
            expect(root?.parentId).toBeUndefined();
        });
    });

    describe('outbound injection', () => {
        it('injects a traceparent carrying the active trace ID', () => {
            const tracer = initTelemetry() as Tracer;
            const parentContext = propagation.extract(ROOT_CONTEXT, { traceparent: SAMPLED });

            const carrier: Record<string, string> = {};
            tracer.startActiveSpan('outbound-test', {}, parentContext, (span) => {
                // This is exactly what UndiciInstrumentation does on each outbound fetch.
                propagation.inject(context.active(), carrier);
                span.end();
            });

            expect(carrier.traceparent).toBeDefined();
            // Outbound traceparent continues the active (inbound) trace ID.
            expect(carrier.traceparent).toMatch(new RegExp(`^00-${VALID_TRACE_ID}-[0-9a-f]{16}-01$`));
        });

        it('uses the standard W3C propagator as the registered global propagator', () => {
            // The single registration in setup.ts is what drives outbound injection.
            // Round-tripping a carrier proves a working W3C propagator is installed.
            const carrier: Record<string, string> = {};
            const tracer = initTelemetry() as Tracer;
            tracer.startActiveSpan('roundtrip', (span) => {
                propagation.inject(context.active(), carrier);
                span.end();
            });
            const extracted = propagation.extract(ROOT_CONTEXT, carrier);
            expect(trace.getSpanContext(extracted)?.traceId).toMatch(/^[0-9a-f]{32}$/);
        });
    });
});
