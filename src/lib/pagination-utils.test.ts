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

import { describe, it, expect } from 'vitest';
import { getPaginationItems } from './pagination-utils';

describe('getPaginationItems', () => {
    it('returns all pages when totalPages <= maxVisible', () => {
        expect(getPaginationItems(5, 1)).toEqual([1, 2, 3, 4, 5]);
        expect(getPaginationItems(7, 4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('returns truncated list with ellipsis when many pages', () => {
        const items = getPaginationItems(20, 7, 7);
        expect(items).toContain(1);
        expect(items).toContain(20);
        expect(items).toContain(6);
        expect(items).toContain(7);
        expect(items).toContain(8);
        expect(items.filter((i) => typeof i === 'object' && i.type === 'ellipsis')).toHaveLength(2);
    });

    it('clamps currentPage to valid range', () => {
        expect(getPaginationItems(10, 0, 7)[0]).toBe(1);
        expect(getPaginationItems(10, 99, 7).slice(-1)[0]).toBe(10);
    });
});
