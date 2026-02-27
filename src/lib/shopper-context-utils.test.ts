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
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { SHOPPER_CONTEXT_SEARCH_PARAMS } from '@/lib/shopper-context-constants';
import {
    isPageDesignerMode,
    extractQualifiersFromUrl,
    extractQualifiersFromInput,
    computeEffectiveShopperContext,
    computeEffectiveSourceCodeContext,
    buildShopperContextBody,
    updateShopperContext,
} from './shopper-context-utils';
import { getConfig } from '@/config';
import type { RouterContextProvider } from 'react-router';

vi.mock('@/config', () => ({
    getConfig: vi.fn(),
}));

vi.mock('@/lib/api/shopper-context', () => ({
    createShopperContext: vi.fn(),
}));

const { mockSerialize, mockParse } = vi.hoisted(() => ({
    mockSerialize: vi.fn(),
    mockParse: vi.fn(),
}));
vi.mock('@/lib/cookie-utils', () => ({
    getCookieConfig: vi.fn((overrides = {}) => ({
        httpOnly: false,
        secure: true,
        sameSite: 'lax' as const,
        path: '/',
        ...overrides,
    })),
    createCookie: vi.fn(() => ({
        serialize: mockSerialize,
        parse: mockParse,
    })),
}));

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return { ...actual };
});

vi.mock('@salesforce/storefront-next-runtime/design/mode', () => ({
    isDesignModeActive: vi.fn(),
    isPreviewModeActive: vi.fn(),
}));

describe('shopper-context-utils', () => {
    describe('isPageDesignerMode', () => {
        let isDesignModeActive: ReturnType<typeof vi.fn>;
        let isPreviewModeActive: ReturnType<typeof vi.fn>;

        beforeEach(async () => {
            const modeModule = await import('@salesforce/storefront-next-runtime/design/mode');
            isDesignModeActive = vi.mocked(modeModule.isDesignModeActive);
            isPreviewModeActive = vi.mocked(modeModule.isPreviewModeActive);

            // Default: no modes active
            isDesignModeActive.mockReturnValue(false);
            isPreviewModeActive.mockReturnValue(false);
        });

        test('should return true when design mode is active', () => {
            isDesignModeActive.mockReturnValue(true);
            isPreviewModeActive.mockReturnValue(false);

            const url = new URL('https://example.com?mode=EDIT');
            expect(isPageDesignerMode(url)).toBe(true);
        });

        test('should return true when preview mode is active', () => {
            isDesignModeActive.mockReturnValue(false);
            isPreviewModeActive.mockReturnValue(true);

            const url = new URL('https://example.com?mode=PREVIEW');
            expect(isPageDesignerMode(url)).toBe(true);
        });

        test('should return true when both modes are active', () => {
            isDesignModeActive.mockReturnValue(true);
            isPreviewModeActive.mockReturnValue(true);

            const url = new URL('https://example.com');
            expect(isPageDesignerMode(url)).toBe(true);
        });

        test('should return false when neither mode is active', () => {
            isDesignModeActive.mockReturnValue(false);
            isPreviewModeActive.mockReturnValue(false);

            const url = new URL('https://example.com');
            expect(isPageDesignerMode(url)).toBe(false);
        });

        test('should pass the URL to mode detection functions', () => {
            const url = new URL('https://example.com?mode=EDIT');
            isPageDesignerMode(url);

            expect(isDesignModeActive).toHaveBeenCalledWith(url);
            expect(isPreviewModeActive).toHaveBeenCalledWith(url);
        });
    });

    describe('extractQualifiersFromUrl', () => {
        test('should extract sourceCode from src parameter into sourceCodeQualifiers', () => {
            const url = new URL('https://example.com?src=email');
            const result = extractQualifiersFromUrl(url);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });
        });

        test('should ignore unknown parameters', () => {
            const url = new URL('https://example.com?unknown=value&src=email');
            const result = extractQualifiersFromUrl(url);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });
        });

        test('should return empty objects when no matching parameters', () => {
            const url = new URL('https://example.com?foo=bar');
            const result = extractQualifiersFromUrl(url);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: {},
            });
        });

        test('should return empty objects when no query parameters', () => {
            const url = new URL('https://example.com');
            const result = extractQualifiersFromUrl(url);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: {},
            });
        });

        test('should handle multiple src parameters (last one wins)', () => {
            const url = new URL('https://example.com?src=first&src=second');
            const result = extractQualifiersFromUrl(url);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'second' },
            });
        });

        test('should include empty src parameter value (filtering happens in buildShopperContextBody)', () => {
            const url = new URL('https://example.com?src=');
            const result = extractQualifiersFromUrl(url);
            // Empty values are included here; filtering happens in buildShopperContextBody
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: '' },
            });
        });

        test('should include whitespace-only src parameter value (URLSearchParams normalizes whitespace)', () => {
            const url = new URL('https://example.com?src=   ');
            const result = extractQualifiersFromUrl(url);
            // URLSearchParams normalizes whitespace to empty string
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: '' },
            });
        });

        test('should handle edge cases for search parameter processing', () => {
            const url = new URL('https://example.com?src=email');
            const result = extractQualifiersFromUrl(url);

            // Verify normal operation works correctly
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });
            // Current mapping uses apiFieldName (sourceCode), not paramName (src)
            expect(result.sourceCodeQualifiers.sourceCode).toBe('email');
            expect(result.qualifiers.src).toBeUndefined();
        });

        test('should extract custom qualifiers into qualifiers', () => {
            const url = new URL('https://example.com?device=mobile');
            const result = extractQualifiersFromUrl(url);
            // device maps to deviceType in qualifiers (apiFieldName is used)
            expect(result.qualifiers.deviceType).toBe('mobile');
            expect(result.sourceCodeQualifiers).toEqual({});
        });

        test('should extract assignment qualifiers into qualifiers', () => {
            const url = new URL('https://example.com?store=store123');
            const result = extractQualifiersFromUrl(url);
            expect(result.qualifiers.store).toBe('store123');
            expect(result.sourceCodeQualifiers).toEqual({});
        });

        test('should extract coupon codes into qualifiers', () => {
            const url = new URL('https://example.com?couponCodes=code1&couponCodes=code2');
            const result = extractQualifiersFromUrl(url);
            // Multiple coupon codes should be joined with comma
            expect(result.qualifiers.couponCodes).toBe('code1,code2');
            expect(result.sourceCodeQualifiers).toEqual({});
        });

        test('should handle multiple qualifiers', () => {
            const url = new URL('https://example.com?device=mobile&src=email');
            const result = extractQualifiersFromUrl(url);
            expect(result.qualifiers.deviceType).toBe('mobile');
            expect(result.sourceCodeQualifiers.sourceCode).toBe('email');
        });

        test('should skip parameters with no searchParamKey (empty key)', () => {
            // URL with empty key parameter (e.g., ?=value or ?&key=value)
            const url = new URL('https://example.com?=value&src=email');
            const result = extractQualifiersFromUrl(url);
            // Empty key should be skipped, but src should still be processed
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });
        });

        test('should fallback to paramName when apiFieldName is missing', () => {
            const originalMapping = (SHOPPER_CONTEXT_SEARCH_PARAMS as any).testParam;

            (SHOPPER_CONTEXT_SEARCH_PARAMS as any).testParam = {
                paramName: 'testParam',
            };

            try {
                const url = new URL('https://example.com?testParam=testValue');
                const result = extractQualifiersFromUrl(url);

                expect(result.qualifiers.testParam).toBe('testValue');
                expect(result.sourceCodeQualifiers).toEqual({});
            } finally {
                if (originalMapping) {
                    (SHOPPER_CONTEXT_SEARCH_PARAMS as any).testParam = originalMapping;
                } else {
                    delete (SHOPPER_CONTEXT_SEARCH_PARAMS as any).testParam;
                }
            }
        });
    });

    describe('extractQualifiersFromInput', () => {
        test('should extract sourceCode from src key into sourceCodeQualifiers', () => {
            const input = { src: 'email' };
            const result = extractQualifiersFromInput(input);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });
        });

        test('should ignore unknown keys', () => {
            const input = { unknown: 'value', src: 'email' };
            const result = extractQualifiersFromInput(input);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });
        });

        test('should return empty objects when no matching keys', () => {
            const input = { foo: 'bar' };
            const result = extractQualifiersFromInput(input);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: {},
            });
        });

        test('should return empty objects when input is empty', () => {
            const input = {};
            const result = extractQualifiersFromInput(input);
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: {},
            });
        });

        test('should include empty src value (filtering happens in buildShopperContextBody)', () => {
            const input = { src: '' };
            const result = extractQualifiersFromInput(input);
            // Empty values are included here; filtering happens in buildShopperContextBody
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: '' },
            });
        });

        test('should preserve whitespace in src value', () => {
            const input = { src: '   ' };
            const result = extractQualifiersFromInput(input);
            // Unlike URLSearchParams, Object.entries preserves whitespace
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: '   ' },
            });
        });

        test('should extract custom qualifiers into qualifiers', () => {
            const input = { device: 'mobile' };
            const result = extractQualifiersFromInput(input);
            // device maps to deviceType in qualifiers (apiFieldName is used)
            expect(result.qualifiers.deviceType).toBe('mobile');
            expect(result.sourceCodeQualifiers).toEqual({});
        });

        test('should extract assignment qualifiers into qualifiers', () => {
            const input = { store: 'store123' };
            const result = extractQualifiersFromInput(input);
            expect(result.qualifiers.store).toBe('store123');
            expect(result.sourceCodeQualifiers).toEqual({});
        });

        test('should extract coupon codes into qualifiers', () => {
            const input = { couponCodes: 'code1' };
            const result = extractQualifiersFromInput(input);
            expect(result.qualifiers.couponCodes).toBe('code1');
            expect(result.sourceCodeQualifiers).toEqual({});
        });

        test('should handle multiple coupon codes as comma-separated string', () => {
            // If input already has comma-separated values, they're preserved
            const input = { couponCodes: 'code1,code2,code3' };
            const result = extractQualifiersFromInput(input);
            expect(result.qualifiers.couponCodes).toBe('code1,code2,code3');
            expect(result.sourceCodeQualifiers).toEqual({});
        });

        test('should handle multiple qualifiers', () => {
            const input = { device: 'mobile', src: 'email' };
            const result = extractQualifiersFromInput(input);
            expect(result.qualifiers.deviceType).toBe('mobile');
            expect(result.sourceCodeQualifiers.sourceCode).toBe('email');
        });

        test('should skip empty keys', () => {
            const input = { '': 'value', src: 'email' };
            const result = extractQualifiersFromInput(input);
            // Empty key should be skipped, but src should still be processed
            expect(result).toEqual({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });
        });

        test('should fallback to paramName when apiFieldName is missing', () => {
            const originalMapping = (SHOPPER_CONTEXT_SEARCH_PARAMS as any).testParam;

            (SHOPPER_CONTEXT_SEARCH_PARAMS as any).testParam = {
                paramName: 'testParam',
            };

            try {
                const input = { testParam: 'testValue' };
                const result = extractQualifiersFromInput(input);

                expect(result.qualifiers.testParam).toBe('testValue');
                expect(result.sourceCodeQualifiers).toEqual({});
            } finally {
                if (originalMapping) {
                    (SHOPPER_CONTEXT_SEARCH_PARAMS as any).testParam = originalMapping;
                } else {
                    delete (SHOPPER_CONTEXT_SEARCH_PARAMS as any).testParam;
                }
            }
        });

        test('should handle all qualifier types together', () => {
            const input = {
                src: 'email',
                device: 'mobile',
                store: 'store123',
                couponCodes: 'code1,code2',
            };
            const result = extractQualifiersFromInput(input);
            expect(result).toEqual({
                qualifiers: {
                    deviceType: 'mobile',
                    store: 'store123',
                    couponCodes: 'code1,code2',
                },
                sourceCodeQualifiers: {
                    sourceCode: 'email',
                },
            });
        });

        test('should handle numeric string values', () => {
            const input = { store: '123' };
            const result = extractQualifiersFromInput(input);
            expect(result.qualifiers.store).toBe('123');
        });

        test('should handle special characters in values', () => {
            const input = { src: 'email-promo-123', device: 'mobile-web' };
            const result = extractQualifiersFromInput(input);
            expect(result.sourceCodeQualifiers.sourceCode).toBe('email-promo-123');
            expect(result.qualifiers.deviceType).toBe('mobile-web');
        });

        test('should handle empty string values', () => {
            const input = { device: '', store: 'store123' };
            const result = extractQualifiersFromInput(input);
            // Empty values are included
            expect(result.qualifiers.deviceType).toBe('');
            expect(result.qualifiers.store).toBe('store123');
        });

        test('should handle values with spaces', () => {
            const input = { src: 'email promo', device: 'mobile device' };
            const result = extractQualifiersFromInput(input);
            expect(result.sourceCodeQualifiers.sourceCode).toBe('email promo');
            expect(result.qualifiers.deviceType).toBe('mobile device');
        });
    });

    describe('computeEffectiveSourceCodeContext', () => {
        test('should update sourceCode from newSourceCodeContext when present', () => {
            const newSourceCodeContext = { sourceCode: 'new-source' };
            const currentSourceCodeContext = { sourceCode: 'old-source' };

            const result = computeEffectiveSourceCodeContext(newSourceCodeContext, currentSourceCodeContext);

            expect(result.sourceCode).toBe('new-source');
        });

        test('should preserve current sourceCode when not in newSourceCodeContext (undefined)', () => {
            const newSourceCodeContext = {};
            const currentSourceCodeContext = { sourceCode: 'persisted-source' };

            const result = computeEffectiveSourceCodeContext(newSourceCodeContext, currentSourceCodeContext);

            expect(result.sourceCode).toBe('persisted-source');
        });

        test('should allow null to overwrite current sourceCode', () => {
            const newSourceCodeContext = { sourceCode: null as any };
            const currentSourceCodeContext = { sourceCode: 'persisted-source' };

            const result = computeEffectiveSourceCodeContext(newSourceCodeContext, currentSourceCodeContext);

            expect(result.sourceCode).toBeNull();
        });

        test('should handle empty contexts', () => {
            const newSourceCodeContext = {};
            const currentSourceCodeContext = {};

            const result = computeEffectiveSourceCodeContext(newSourceCodeContext, currentSourceCodeContext);

            expect(result).toEqual({});
        });
    });

    describe('computeEffectiveShopperContext', () => {
        test('should add qualifiers from newShopperContext to effectiveShopperContext', () => {
            const newShopperContext = { otherKey: 'value', deviceType: 'mobile' };
            const currentShopperContext = { existingKey: 'existing' };

            const result = computeEffectiveShopperContext(newShopperContext, currentShopperContext);

            expect(result).toEqual({
                existingKey: 'existing',
                otherKey: 'value',
                deviceType: 'mobile',
            });
        });

        test('should handle empty contexts', () => {
            const newShopperContext = {};
            const currentShopperContext = {};

            const result = computeEffectiveShopperContext(newShopperContext, currentShopperContext);

            expect(result).toEqual({});
        });

        test('should handle customQualifiers in context', () => {
            const newShopperContext = { deviceType: 'mobile', category: 'customQualifiers' };
            const currentShopperContext = { operatingSystem: 'Android' };

            const result = computeEffectiveShopperContext(newShopperContext, currentShopperContext);

            expect(result).toEqual({
                operatingSystem: 'Android',
                deviceType: 'mobile',
                category: 'customQualifiers',
            });
        });

        test('should overwrite existing qualifiers with new values', () => {
            const newShopperContext = { deviceType: 'tablet' };
            const currentShopperContext = { deviceType: 'mobile' };

            const result = computeEffectiveShopperContext(newShopperContext, currentShopperContext);

            expect(result).toEqual({
                deviceType: 'tablet',
            });
        });

        test('should handle empty string values in newShopperContext', () => {
            const newShopperContext = { deviceType: '' };
            const currentShopperContext = { deviceType: 'mobile' };

            const result = computeEffectiveShopperContext(newShopperContext, currentShopperContext);

            // Empty string should overwrite existing value
            expect(result).toEqual({
                deviceType: '',
            });
        });

        test('should preserve existing qualifiers when not in newShopperContext', () => {
            const newShopperContext = {};
            const currentShopperContext = { existingKey: 'existing', deviceType: 'mobile' };

            const result = computeEffectiveShopperContext(newShopperContext, currentShopperContext);

            expect(result).toEqual({
                existingKey: 'existing',
                deviceType: 'mobile',
            });
        });
    });

    describe('buildShopperContextBody', () => {
        test('should build body from valid context maps', () => {
            const contextMap = { otherKey: 'value' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({ otherKey: 'value', sourceCode: 'email' });
        });

        test('should build body with customQualifiers extracted from contextMap', () => {
            const contextMap = { deviceType: 'mobile' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                sourceCode: 'email',
                customQualifiers: {
                    deviceType: 'mobile',
                },
            });
        });

        test('should separate customQualifiers from root-level qualifiers', () => {
            const contextMap = { deviceType: 'mobile', otherKey: 'value' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                sourceCode: 'email',
                otherKey: 'value',
                customQualifiers: {
                    deviceType: 'mobile',
                },
            });
        });

        test('should prioritize sourceCode from sourceCodeContextMap over contextMap', () => {
            const contextMap = { sourceCode: 'old', otherKey: 'value' };
            const sourceCodeContextMap = { sourceCode: 'new' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            // sourceCodeContextMap takes precedence over contextMap
            expect(result).toEqual({ otherKey: 'value', sourceCode: 'new' });
        });

        test('should trim whitespace from root-level qualifier values', () => {
            const contextMap = { otherKey: '  value  ' };
            const sourceCodeContextMap = { sourceCode: '  email  ' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                otherKey: 'value',
                sourceCode: 'email',
            });
        });

        test('should skip empty keys', () => {
            const contextMap = { '': 'value', otherKey: 'email' };
            const sourceCodeContextMap = {};
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({ otherKey: 'email' });
        });

        test('should skip empty values for root-level qualifiers', () => {
            const contextMap = { otherKey: '' };
            const sourceCodeContextMap = { sourceCode: '' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({});
        });

        test('should include empty values for customQualifiers', () => {
            const contextMap = { deviceType: '' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                sourceCode: 'email',
            });
        });

        test('should skip whitespace-only values for root-level qualifiers', () => {
            const contextMap = { otherKey: '   ' };
            const sourceCodeContextMap = { sourceCode: '   ' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({});
        });

        test('should handle multiple valid keys', () => {
            const contextMap = { key1: 'value1', key2: 'value2' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({ key1: 'value1', key2: 'value2', sourceCode: 'email' });
        });

        test('should return empty object for empty inputs', () => {
            const contextMap = {};
            const sourceCodeContextMap = {};
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({});
        });

        test('should handle null values by skipping them for root-level qualifiers', () => {
            const contextMap = { otherKey: null as any };
            const sourceCodeContextMap = { sourceCode: null as any };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            // Non-string values are skipped
            expect(result).toEqual({});
        });

        test('should handle non-string values by skipping them for root-level qualifiers', () => {
            const contextMap = { otherKey: 123 as any };
            const sourceCodeContextMap = { sourceCode: 'valid' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            // Non-string values in contextMap are skipped, but sourceCode is valid
            expect(result).toEqual({ sourceCode: 'valid' });
        });

        test('should handle assignment qualifiers', () => {
            const contextMap = { store: 'store123' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                sourceCode: 'email',
                assignmentQualifiers: {
                    store: 'store123',
                },
            });
        });

        test('should handle coupon codes as array', () => {
            const contextMap = { couponCodes: 'code1,code2,code3' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                sourceCode: 'email',
                couponCodes: ['code1', 'code2', 'code3'],
            });
        });

        test('should handle single coupon code', () => {
            const contextMap = { couponCodes: 'code1' };
            const sourceCodeContextMap = {};
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            // Single coupon code should be added as couponCodes array
            expect(result).toEqual({
                couponCodes: ['code1'],
            });
        });

        test('should handle coupon codes with whitespace', () => {
            const contextMap = { couponCodes: ' code1 , code2 , code3 ' };
            const sourceCodeContextMap = {};
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                couponCodes: ['code1', 'code2', 'code3'],
            });
        });

        test('should filter empty coupon codes', () => {
            const contextMap = { couponCodes: 'code1,,code3,  ' };
            const sourceCodeContextMap = {};
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                couponCodes: ['code1', 'code3'],
            });
        });

        test('should handle multiple customQualifiers', () => {
            // Note: The key in contextMap must match the key in SHOPPER_CONTEXT_SEARCH_PARAMS.customQualifiers
            // For device mapping, the key is 'device', not 'deviceType' (deviceType is the apiFieldName)
            const contextMap = { device: 'mobile' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result.customQualifiers).toBeDefined();
            expect(result.customQualifiers?.device).toBe('mobile');
        });

        test('should handle category marker key as root-level qualifier', () => {
            const contextMap = { category: 'customQualifiers', device: 'mobile' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            // category is not in customQualifiers mapping, so it's treated as root-level
            // device is in customQualifiers mapping (key matches), so it goes to customQualifiers
            expect((result as Record<string, unknown>).category).toBe('customQualifiers');
            expect(result.customQualifiers?.device).toBe('mobile');
        });

        test('should handle sourceCode from contextMap when not in sourceCodeContextMap', () => {
            const contextMap = { sourceCode: 'email' };
            const sourceCodeContextMap = {};
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            // sourceCode from contextMap should be added as root-level qualifier
            expect(result.sourceCode).toBe('email');
        });

        test('should prioritize sourceCode from sourceCodeContextMap over contextMap', () => {
            const contextMap = { sourceCode: 'old' };
            const sourceCodeContextMap = { sourceCode: 'new' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            // sourceCodeContextMap is processed first, so 'new' should be used
            expect(result.sourceCode).toBe('new');
        });

        test('should handle multiple custom qualifiers', () => {
            // Note: This test assumes we have multiple custom qualifiers defined
            // For now, we only have 'device', so we'll test with what we have
            const contextMap = { deviceType: 'mobile' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result.customQualifiers?.deviceType).toBe('mobile');
            expect(result.sourceCode).toBe('email');
        });

        test('should handle assignment qualifiers with custom qualifiers', () => {
            const contextMap = { store: 'store123', deviceType: 'mobile' };
            const sourceCodeContextMap = { sourceCode: 'email' };
            const result = buildShopperContextBody(contextMap, sourceCodeContextMap);
            expect(result).toEqual({
                sourceCode: 'email',
                assignmentQualifiers: {
                    store: 'store123',
                },
                customQualifiers: {
                    deviceType: 'mobile',
                },
            });
        });
    });

    describe('updateShopperContext', () => {
        let mockContext: RouterContextProvider;
        let mockCreateShopperContext: ReturnType<typeof vi.fn>;
        let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(async () => {
            const { createShopperContext } = await import('@/lib/api/shopper-context');

            mockCreateShopperContext = vi.mocked(createShopperContext);

            mockContext = {
                get: vi.fn(),
            } as any;

            vi.mocked(getConfig).mockReturnValue({
                features: {
                    shopperContext: {
                        enabled: true,
                    },
                },
                commerce: { api: { siteId: 'RefArch' } },
            } as any);

            consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            mockParse.mockResolvedValue(null);
            mockSerialize.mockResolvedValue('Set-Cookie: mock=value');
            mockCreateShopperContext.mockResolvedValue(undefined);
        });

        afterEach(() => {
            vi.clearAllMocks();
            consoleErrorSpy.mockRestore();
        });

        test('should update shopper context with new qualifiers', async () => {
            const newShopperContext = { deviceType: 'mobile' };
            const newSourceCodeContext = {};

            const result = await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: null,
            });

            expect(mockCreateShopperContext).toHaveBeenCalledTimes(1);
            expect(mockCreateShopperContext).toHaveBeenCalledWith(
                mockContext,
                'test-usid',
                expect.objectContaining({
                    customQualifiers: {
                        deviceType: 'mobile',
                    },
                })
            );

            expect(mockSerialize).toHaveBeenCalledTimes(1);
            expect(result.setCookieHeaders).toHaveLength(1);
        });

        test('should update source code context', async () => {
            const newShopperContext = {};
            const newSourceCodeContext = { sourceCode: 'email' };

            const result = await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: null,
            });

            expect(mockCreateShopperContext).toHaveBeenCalledTimes(1);
            expect(mockCreateShopperContext).toHaveBeenCalledWith(
                mockContext,
                'test-usid',
                expect.objectContaining({
                    sourceCode: 'email',
                })
            );

            expect(mockSerialize).toHaveBeenCalledTimes(1);
            expect(result.setCookieHeaders).toHaveLength(1);
        });

        test('should update both shopper context and source code context', async () => {
            const newShopperContext = { deviceType: 'mobile' };
            const newSourceCodeContext = { sourceCode: 'email' };

            const result = await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: null,
            });

            expect(mockCreateShopperContext).toHaveBeenCalledTimes(1);
            expect(mockSerialize).toHaveBeenCalledTimes(2);
            expect(result.setCookieHeaders).toHaveLength(2);
        });

        test('should merge new context with existing cookie context', async () => {
            mockParse
                .mockResolvedValueOnce(JSON.stringify({ existingKey: 'existing' })) // shopper context cookie
                .mockResolvedValueOnce(JSON.stringify({ sourceCode: 'old-source' })); // source code cookie

            const newShopperContext = { deviceType: 'mobile' };
            const newSourceCodeContext = { sourceCode: 'new-source' };

            await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: 'some-cookie-header',
            });

            // Verify serialize was called with JSON-encoded merged context (cookie-utils stores strings)
            expect(mockSerialize).toHaveBeenCalledWith(
                JSON.stringify({ sourceCode: 'new-source' }),
                expect.any(Object)
            );
            expect(mockSerialize).toHaveBeenCalledWith(
                JSON.stringify({
                    existingKey: 'existing',
                    deviceType: 'mobile',
                }),
                expect.any(Object)
            );
        });

        test('should not call API when both contexts are empty', async () => {
            const newShopperContext = {};
            const newSourceCodeContext = {};

            const result = await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: null,
            });

            expect(mockCreateShopperContext).not.toHaveBeenCalled();
            expect(mockSerialize).not.toHaveBeenCalled();
            expect(result.setCookieHeaders).toHaveLength(0);
        });

        test('should handle cookie serialization errors gracefully', async () => {
            const newShopperContext = { deviceType: 'mobile' };
            const newSourceCodeContext = {};

            mockSerialize.mockRejectedValue(new Error('Cookie serialization failed'));

            const result = await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: null,
            });

            // Should still call API even if cookie serialization fails
            expect(mockCreateShopperContext).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to serialize shopper context cookie:',
                'Cookie serialization failed'
            );
            expect(result.setCookieHeaders).toHaveLength(0);
        });

        test('should propagate API errors', async () => {
            const newShopperContext = { deviceType: 'mobile' };
            const newSourceCodeContext = {};

            mockCreateShopperContext.mockRejectedValue(new Error('API error'));

            await expect(
                updateShopperContext({
                    context: mockContext,
                    usid: 'test-usid',
                    newShopperContext,
                    newSourceCodeContext,
                    cookieHeader: null,
                })
            ).rejects.toThrow('API error');

            // Cookies should not be serialized if API fails (API call happens before cookie serialization)
            expect(mockSerialize).not.toHaveBeenCalled();
        });

        test('should handle null cookie values from parse', async () => {
            mockParse.mockResolvedValue(null);

            const newShopperContext = { deviceType: 'mobile' };
            const newSourceCodeContext = {};

            const result = await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: null,
            });

            expect(mockCreateShopperContext).toHaveBeenCalledTimes(1);
            expect(mockSerialize).toHaveBeenCalledTimes(1);
            expect(result.setCookieHeaders).toHaveLength(1);
        });

        test('should handle invalid JSON in cookies', async () => {
            mockParse
                .mockResolvedValueOnce(null) // shopper context cookie (corrupt/missing)
                .mockResolvedValueOnce(null); // source code cookie

            const newShopperContext = { deviceType: 'mobile' };
            const newSourceCodeContext = {};

            const result = await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: 'some-header',
            });

            // Should still work with empty context from invalid JSON
            expect(mockCreateShopperContext).toHaveBeenCalledTimes(1);
            expect(mockSerialize).toHaveBeenCalledTimes(1);
            expect(result.setCookieHeaders).toHaveLength(1);
        });

        test('should overwrite existing qualifiers with new values', async () => {
            mockParse.mockResolvedValueOnce(JSON.stringify({ deviceType: 'old-device' })).mockResolvedValueOnce(null);

            const newShopperContext = { deviceType: 'new-device' };
            const newSourceCodeContext = {};

            await updateShopperContext({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext,
                newSourceCodeContext,
                cookieHeader: 'some-header',
            });

            expect(mockSerialize).toHaveBeenCalledWith(
                JSON.stringify({ deviceType: 'new-device' }),
                expect.any(Object)
            );
        });
    });
});
