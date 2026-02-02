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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    addProductContentAdapter,
    removeProductContentAdapter,
    getProductContentAdapter,
    getAllProductContentAdapters,
    hasProductContentAdapters,
    clearProductContentAdapters,
} from './product-content-store';
import type { ProductContentAdapter } from './product-content-types';

describe('Product Content Store', () => {
    const minimalAdapter: ProductContentAdapter = {};

    afterEach(() => {
        clearProductContentAdapters();
    });

    describe('add, get, remove', () => {
        it('should register and retrieve an adapter', () => {
            addProductContentAdapter('product-content-mock', minimalAdapter);
            expect(getProductContentAdapter('product-content-mock')).toBe(minimalAdapter);
        });

        it('should return undefined after removing an adapter', () => {
            addProductContentAdapter('product-content-mock', minimalAdapter);
            removeProductContentAdapter('product-content-mock');
            expect(getProductContentAdapter('product-content-mock')).toBeUndefined();
        });

        it('should handle non-existent adapter names gracefully', () => {
            expect(getProductContentAdapter('non-existent')).toBeUndefined();
            expect(() => removeProductContentAdapter('non-existent')).not.toThrow();
        });
    });

    describe('getAllProductContentAdapters and hasProductContentAdapters', () => {
        beforeEach(() => {
            clearProductContentAdapters();
        });

        it('should return all registered adapters and report presence correctly', () => {
            expect(hasProductContentAdapters()).toBe(false);
            expect(getAllProductContentAdapters()).toEqual([]);

            const adapter1: ProductContentAdapter = {};
            const adapter2: ProductContentAdapter = {};
            addProductContentAdapter('one', adapter1);
            addProductContentAdapter('two', adapter2);

            expect(hasProductContentAdapters()).toBe(true);
            expect(getAllProductContentAdapters()).toHaveLength(2);
            expect(getAllProductContentAdapters()).toContain(adapter1);
            expect(getAllProductContentAdapters()).toContain(adapter2);
        });

        it('should clear all adapters', () => {
            addProductContentAdapter('one', minimalAdapter);
            expect(hasProductContentAdapters()).toBe(true);

            clearProductContentAdapters();
            expect(hasProductContentAdapters()).toBe(false);
            expect(getAllProductContentAdapters()).toEqual([]);
            expect(getProductContentAdapter('one')).toBeUndefined();
        });
    });
});
