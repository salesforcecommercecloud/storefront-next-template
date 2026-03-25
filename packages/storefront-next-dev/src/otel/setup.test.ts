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
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

type SDKTracer = ReturnType<typeof NodeTracerProvider.prototype.getTracer>;

// Spy on NodeTracerProvider prototype methods so:
// - The real constructor runs (no "not a constructor" issues)
// - We can assert which methods were called and with what arguments
// - Global OTel state registration (register()) is suppressed to avoid test pollution

describe('SERVICE_NAME', () => {
    it('is storefront-next', async () => {
        const { SERVICE_NAME } = await import('./setup');
        expect(SERVICE_NAME).toBe('storefront-next');
    });
});

describe('initTelemetry', () => {
    const stubTracer = {} as unknown as SDKTracer;

    // Reset the module registry before each test so that the module-level
    // `cachedTracer` starts fresh — no test-only reset function needed.
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.resetModules();
        // Clean up the process-global undici registration flag
        delete (globalThis as Record<symbol, boolean>)[Symbol.for('sfnext.otel.undici_registered')];
    });

    function spyOnProvider() {
        // register() has global side effects (sets the active context manager) — stub it out
        const registerSpy = vi.spyOn(NodeTracerProvider.prototype, 'register').mockReturnValue(undefined);
        // addSpanProcessor returns `this` (fluent); return the provider instance via mockReturnThis
        const addSpanProcessorSpy = vi.spyOn(NodeTracerProvider.prototype, 'addSpanProcessor').mockReturnThis();
        const getTracerSpy = vi.spyOn(NodeTracerProvider.prototype, 'getTracer').mockReturnValue(stubTracer);
        return { registerSpy, addSpanProcessorSpy, getTracerSpy };
    }

    it('adds a SimpleSpanProcessor wrapping an MrtConsoleSpanExporter to the provider', async () => {
        const { addSpanProcessorSpy } = spyOnProvider();

        const { initTelemetry } = await import('./setup');
        initTelemetry();

        expect(addSpanProcessorSpy).toHaveBeenCalledWith(expect.any(SimpleSpanProcessor));
        // Dynamically import to avoid circular issues; verify the processor
        // wraps our custom MRT exporter via the class name.
        const { MrtConsoleSpanExporter } = await import('./mrt-console-span-exporter');
        const processor = addSpanProcessorSpy.mock.calls[0][0] as unknown as Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/dot-notation
        expect(processor['_exporter']).toBeInstanceOf(MrtConsoleSpanExporter);
    });

    it('registers the provider', async () => {
        const { registerSpy } = spyOnProvider();

        const { initTelemetry } = await import('./setup');
        initTelemetry();

        expect(registerSpy).toHaveBeenCalledOnce();
    });

    it('returns the tracer obtained directly from provider.getTracer(SERVICE_NAME)', async () => {
        const { getTracerSpy } = spyOnProvider();

        const { initTelemetry, SERVICE_NAME } = await import('./setup');
        const result = initTelemetry();

        expect(getTracerSpy).toHaveBeenCalledWith(SERVICE_NAME);
        expect(result).toBe(stubTracer);
    });

    it('returns the same tracer on subsequent calls (idempotent)', async () => {
        const { registerSpy } = spyOnProvider();

        const { initTelemetry } = await import('./setup');
        const first = initTelemetry();
        const second = initTelemetry();

        expect(first).toBe(second);
        // Provider constructor should only be called once
        expect(registerSpy).toHaveBeenCalledOnce();
    });

    it('returns null and logs an error if initialization throws', async () => {
        vi.spyOn(NodeTracerProvider.prototype, 'register').mockImplementation(() => {
            throw new Error('provider error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

        const { initTelemetry } = await import('./setup');
        const result = initTelemetry();

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[sfnext:error]'),
            '[otel] Failed to initialize OpenTelemetry:',
            expect.any(Error)
        );
    });
});
