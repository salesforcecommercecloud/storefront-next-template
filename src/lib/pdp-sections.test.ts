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
import { describe, test, expect } from 'vitest';
import { resolvePdpSections } from './pdp-sections';

const stubProduct = {} as Parameters<typeof resolvePdpSections>[0];

describe('resolvePdpSections', () => {
    test('returns all four sections in order', () => {
        const sections = resolvePdpSections(stubProduct);

        expect(sections).toHaveLength(4);
        expect(sections.map((s) => s.adapterMethod)).toEqual([
            'getIngredientsData',
            'getUsageInstructions',
            'getCareInstructions',
            'getTechSpecs',
        ]);
    });

    test('each section has a valid labelKey', () => {
        const sections = resolvePdpSections(stubProduct);

        expect(sections.map((s) => s.labelKey)).toEqual([
            'materials',
            'usageInstructions',
            'careInstructions',
            'specifications',
        ]);
    });

    test('returns a new array on each call', () => {
        const a = resolvePdpSections(stubProduct);
        const b = resolvePdpSections(stubProduct);

        expect(a).not.toBe(b);
    });

    test('product argument does not affect the default result', () => {
        const withId = resolvePdpSections({ id: 'test-123' } as any);
        const withoutId = resolvePdpSections(stubProduct);

        expect(withId.map((s) => s.adapterMethod)).toEqual(withoutId.map((s) => s.adapterMethod));
    });
});
