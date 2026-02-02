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
import { renderHook } from '@testing-library/react';
import { useProductContent } from './use-product-content';
import { useProductContentAdapter } from '@/providers/product-content';

vi.mock('@/providers/product-content', () => ({
    useProductContentAdapter: vi.fn(),
}));

describe('useProductContent', () => {
    beforeEach(() => {
        vi.mocked(useProductContentAdapter).mockReset();
    });

    it('should return isEnabled false and adapter undefined when no adapter in context', () => {
        vi.mocked(useProductContentAdapter).mockReturnValue(undefined);

        const { result } = renderHook(() => useProductContent());

        expect(result.current.adapter).toBeUndefined();
        expect(result.current.isEnabled).toBe(false);
    });

    it('should return isEnabled true and adapter when adapter is provided in context', () => {
        const mockAdapter = {};
        vi.mocked(useProductContentAdapter).mockReturnValue(mockAdapter as ReturnType<typeof useProductContentAdapter>);

        const { result } = renderHook(() => useProductContent());

        expect(result.current.adapter).toBe(mockAdapter);
        expect(result.current.isEnabled).toBe(true);
    });
});
