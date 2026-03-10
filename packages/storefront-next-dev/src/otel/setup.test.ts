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
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SERVICE_NAME, initTelemetry } from './setup';

type SDKTracer = ReturnType<typeof NodeTracerProvider.prototype.getTracer>;

// Spy on NodeTracerProvider prototype methods so:
// - The real constructor runs (no "not a constructor" issues)
// - We can assert which methods were called and with what arguments
// - Global OTel state registration (register()) is suppressed to avoid test pollution

describe('SERVICE_NAME', () => {
    it('is storefront-next', () => {
        expect(SERVICE_NAME).toBe('storefront-next');
    });
});

describe('initTelemetry', () => {
    const stubTracer = {} as unknown as SDKTracer;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function spyOnProvider() {
        // register() has global side effects (sets the active context manager) — stub it out
        const registerSpy = vi.spyOn(NodeTracerProvider.prototype, 'register').mockReturnValue(undefined);
        // addSpanProcessor returns `this` (fluent); return the provider instance via mockReturnThis
        const addSpanProcessorSpy = vi.spyOn(NodeTracerProvider.prototype, 'addSpanProcessor').mockReturnThis();
        const getTracerSpy = vi.spyOn(NodeTracerProvider.prototype, 'getTracer').mockReturnValue(stubTracer);
        return { registerSpy, addSpanProcessorSpy, getTracerSpy };
    }

    it('adds a SimpleSpanProcessor (wrapping a ConsoleSpanExporter) to the provider', () => {
        const { addSpanProcessorSpy } = spyOnProvider();

        initTelemetry();

        expect(addSpanProcessorSpy).toHaveBeenCalledWith(expect.any(SimpleSpanProcessor));
    });

    it('registers the provider', () => {
        const { registerSpy } = spyOnProvider();

        initTelemetry();

        expect(registerSpy).toHaveBeenCalledOnce();
    });

    it('returns the tracer obtained directly from provider.getTracer(SERVICE_NAME)', () => {
        const { getTracerSpy } = spyOnProvider();

        const result = initTelemetry();

        expect(getTracerSpy).toHaveBeenCalledWith(SERVICE_NAME);
        expect(result).toBe(stubTracer);
    });

    it('returns null and logs an error if initialization throws', () => {
        vi.spyOn(NodeTracerProvider.prototype, 'register').mockImplementation(() => {
            throw new Error('provider error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

        const result = initTelemetry();

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('[otel] Failed to initialize OpenTelemetry:', expect.any(Error));
    });
});
