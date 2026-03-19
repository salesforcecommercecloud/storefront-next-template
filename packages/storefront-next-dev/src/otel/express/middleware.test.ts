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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const { mockServerSpan, mockStreamingSpan, mockTracer } = vi.hoisted(() => {
    const serverSpan = {
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
    };
    const streamingSpan = {
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
    };
    const tracer = {
        startActiveSpan: vi.fn((_name: string, _opts: unknown, callback: (s: typeof serverSpan) => unknown) =>
            callback(serverSpan)
        ),
        startSpan: vi.fn(() => streamingSpan),
    };
    return { mockServerSpan: serverSpan, mockStreamingSpan: streamingSpan, mockTracer: tracer };
});

vi.mock('../setup', () => ({
    initTelemetry: vi.fn(() => mockTracer),
}));

vi.mock('@opentelemetry/api', async (importOriginal) => {
    const original = await importOriginal<typeof import('@opentelemetry/api')>();
    return {
        ...original,
        context: { active: vi.fn(() => 'mock-context') },
        SpanStatusCode: { UNSET: 0, OK: 1, ERROR: 2 },
        trace: {
            getSpan: vi.fn(() => ({
                spanContext: () => ({
                    traceId: 'abc123def456abc123def456abc123de',
                    spanId: '1234567890abcdef',
                    traceFlags: 1,
                }),
            })),
        },
    };
});

import { createOtelExpressMiddleware } from './middleware';
import { initTelemetry } from '../setup';

/** Create a minimal mock Express request. */
function mockRequest(method = 'GET', url = '/products') {
    return { method, url, originalUrl: url } as unknown as Parameters<
        ReturnType<typeof createOtelExpressMiddleware>
    >[0];
}

/** Create a minimal mock Express response with EventEmitter for close/finish. */
function mockResponse(statusCode = 200) {
    const emitter = new EventEmitter();
    const res = Object.assign(emitter, {
        statusCode,
        writeHead: vi.fn(),
        write: vi.fn(),
        setHeader: vi.fn(),
    });
    return res as unknown as Parameters<ReturnType<typeof createOtelExpressMiddleware>>[1] & EventEmitter;
}

describe('createOtelExpressMiddleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('when OTel is disabled', () => {
        it('returns a no-op middleware that calls next() immediately', () => {
            vi.mocked(initTelemetry).mockReturnValueOnce(null);
            const middleware = createOtelExpressMiddleware();
            const next = vi.fn();

            middleware(mockRequest(), mockResponse() as never, next);

            expect(next).toHaveBeenCalledOnce();
            expect(mockTracer.startActiveSpan).not.toHaveBeenCalled();
        });
    });

    describe('traceparent response header', () => {
        it('sets traceparent and server-timing headers with W3C trace context', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse();
            middleware(mockRequest(), res as never, vi.fn());

            // eslint-disable-next-line @typescript-eslint/unbound-method -- vi.fn() mock, no real `this` binding
            expect(res.setHeader).toHaveBeenCalledWith(
                'traceparent',
                '00-abc123def456abc123def456abc123de-1234567890abcdef-01'
            );
        });
    });

    describe('server span', () => {
        it('creates a span with correct name pattern [sfnext] server METHOD /path', () => {
            const middleware = createOtelExpressMiddleware();
            middleware(mockRequest('GET', '/'), mockResponse() as never, vi.fn());

            expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
                '[sfnext] server GET /',
                { attributes: { 'http.request.method': 'GET', 'url.path': '/' } },
                expect.any(Function)
            );
        });

        it('has http.request.method and url.path attributes', () => {
            const middleware = createOtelExpressMiddleware();
            middleware(mockRequest('POST', '/cart'), mockResponse() as never, vi.fn());

            expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
                '[sfnext] server POST /cart',
                { attributes: { 'http.request.method': 'POST', 'url.path': '/cart' } },
                expect.any(Function)
            );
        });
    });

    describe('streaming span', () => {
        it('is created on first writeHead with sfnext.ttfb_ms', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse();
            middleware(mockRequest(), res as never, vi.fn());

            // Trigger writeHead (patched)
            res.writeHead(200);

            expect(mockTracer.startSpan).toHaveBeenCalledOnce();
            expect(mockTracer.startSpan).toHaveBeenCalledWith(
                '[sfnext] response streaming GET /products',
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        'sfnext.ttfb_ms': expect.any(Number),
                    }),
                }),
                'mock-context'
            );
            expect(mockServerSpan.setAttribute).toHaveBeenCalledWith('sfnext.ttfb_ms', expect.any(Number));
        });

        it('is only created once even if writeHead is called multiple times', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse();
            middleware(mockRequest(), res as never, vi.fn());

            res.writeHead(200);
            res.writeHead(200);
            res.writeHead(200);

            expect(mockTracer.startSpan).toHaveBeenCalledOnce();
        });

        it('is created on write without prior writeHead', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse();
            middleware(mockRequest(), res as never, vi.fn());

            res.write('data');

            expect(mockTracer.startSpan).toHaveBeenCalledOnce();
        });
    });

    describe('span ending', () => {
        it('ends both spans on finish event (MRT Lambda adapter path)', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse();
            middleware(mockRequest(), res as never, vi.fn());

            res.writeHead(200);
            res.emit('finish');

            expect(mockStreamingSpan.end).toHaveBeenCalledOnce();
            expect(mockServerSpan.end).toHaveBeenCalledOnce();
        });

        it('ends both spans on close event (dev server path)', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse();
            middleware(mockRequest(), res as never, vi.fn());

            res.writeHead(200);
            res.emit('close');

            expect(mockStreamingSpan.end).toHaveBeenCalledOnce();
            expect(mockServerSpan.end).toHaveBeenCalledOnce();
        });

        it('only ends spans once even if both close and finish fire', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse();
            middleware(mockRequest(), res as never, vi.fn());

            res.writeHead(200);
            res.emit('finish');
            res.emit('close');

            expect(mockStreamingSpan.end).toHaveBeenCalledOnce();
            expect(mockServerSpan.end).toHaveBeenCalledOnce();
        });

        it('sets http.response.status_code on both spans', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse(201);
            middleware(mockRequest(), res as never, vi.fn());

            res.writeHead(201);
            res.emit('close');

            expect(mockStreamingSpan.setAttribute).toHaveBeenCalledWith('http.response.status_code', 201);
            expect(mockServerSpan.setAttribute).toHaveBeenCalledWith('http.response.status_code', 201);
        });

        it('sets http.total_duration_ms on server span and http.streaming_duration_ms on streaming span', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse();
            middleware(mockRequest(), res as never, vi.fn());

            res.writeHead(200);
            res.emit('close');

            expect(mockServerSpan.setAttribute).toHaveBeenCalledWith('http.total_duration_ms', expect.any(Number));
            expect(mockStreamingSpan.setAttribute).toHaveBeenCalledWith(
                'http.streaming_duration_ms',
                expect.any(Number)
            );
        });

        it('sets SpanStatusCode.ERROR on both spans for 5xx status', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse(502);
            middleware(mockRequest(), res as never, vi.fn());

            res.writeHead(502);
            res.emit('close');

            expect(mockStreamingSpan.setStatus).toHaveBeenCalledWith({ code: 2 });
            expect(mockServerSpan.setStatus).toHaveBeenCalledWith({ code: 2 });
        });

        it('does not set ERROR status for non-5xx status', () => {
            const middleware = createOtelExpressMiddleware();
            const res = mockResponse(404);
            middleware(mockRequest(), res as never, vi.fn());

            res.writeHead(404);
            res.emit('close');

            expect(mockStreamingSpan.setStatus).not.toHaveBeenCalled();
            expect(mockServerSpan.setStatus).not.toHaveBeenCalled();
        });
    });
});
