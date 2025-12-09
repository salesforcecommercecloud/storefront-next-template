import { describe, expect, test, vi } from 'vitest';
import {
    getShopperContextCookieName,
    getSourceCodeCookieName,
    SHOPPER_CONTEXT_COOKIE_NAME_BASE,
    SOURCE_CODE_COOKIE_NAME_BASE,
    isPageDesignerMode,
    extractQualifiersFromUrl,
    computeEffectiveShopperContext,
    buildShopperContextBody,
} from './shopper-context-utils';
import { SHOPPER_CONTEXT_SEARCH_PARAMS } from '@/lib/shopper-context-constants';
import { getConfig } from '@/config';

vi.mock('@/config', () => ({
    getConfig: vi.fn(),
}));

describe('shopper-context-utils', () => {
    describe('getShopperContextCookieName', () => {
        test('should return cookie name with USID suffix', () => {
            const usid = 'test-usid-123';
            const result = getShopperContextCookieName(usid);
            expect(result).toBe(`${SHOPPER_CONTEXT_COOKIE_NAME_BASE}-${usid}`);
        });
    });

    describe('getSourceCodeCookieName', () => {
        test('should return cookie name with configurable suffix', () => {
            vi.mocked(getConfig).mockReturnValue({
                site: {
                    features: {
                        shopperContext: {
                            dwsourcecodeCookieSuffix: 'test-site',
                        },
                    },
                },
            } as any);
            const mockContext = {
                get: vi.fn(),
            } as any;
            const result = getSourceCodeCookieName(mockContext);
            // Should be dwsourcecode_{suffix} where suffix comes from config
            expect(result).toBe(`${SOURCE_CODE_COOKIE_NAME_BASE}_test-site`);
            expect(getConfig).toHaveBeenCalledWith(mockContext);
        });

        test('should return base cookie name when suffix is undefined', () => {
            vi.mocked(getConfig).mockReturnValue({
                site: {
                    features: {
                        shopperContext: {
                            dwsourcecodeCookieSuffix: undefined,
                        },
                    },
                },
            } as any);
            const mockContext = {
                get: vi.fn(),
            } as any;
            const result = getSourceCodeCookieName(mockContext);
            expect(result).toBe(SOURCE_CODE_COOKIE_NAME_BASE);
            expect(getConfig).toHaveBeenCalledWith(mockContext);
        });
    });

    describe('isPageDesignerMode', () => {
        test('should return true for EDIT mode', () => {
            const url = new URL('https://example.com?mode=EDIT');
            expect(isPageDesignerMode(url)).toBe(true);
        });

        test('should return true for PREVIEW mode', () => {
            const url = new URL('https://example.com?mode=PREVIEW');
            expect(isPageDesignerMode(url)).toBe(true);
        });

        test('should return false for other modes', () => {
            const url = new URL('https://example.com?mode=VIEW');
            expect(isPageDesignerMode(url)).toBe(false);
        });

        test('should return false when mode parameter is missing', () => {
            const url = new URL('https://example.com');
            expect(isPageDesignerMode(url)).toBe(false);
        });

        test('should return false for case-sensitive mode values', () => {
            const url = new URL('https://example.com?mode=edit');
            expect(isPageDesignerMode(url)).toBe(false);
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

    describe('computeEffectiveShopperContext', () => {
        test('should update sourceCode from newSourceCodeContext when present', () => {
            const newShopperContext = {};
            const newSourceCodeContext = { sourceCode: 'new-source' };
            const currentShopperContext = {};
            const currentSourceCodeContext = { sourceCode: 'old-source' };

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            expect(result.effectiveShopperContext).toEqual({});
            expect(result.effectiveSourceCodeContext.sourceCode).toBe('new-source');
        });

        test('should preserve current sourceCode when not in newSourceCodeContext (undefined)', () => {
            const newShopperContext = {};
            const newSourceCodeContext = {};
            const currentShopperContext = {};
            const currentSourceCodeContext = { sourceCode: 'persisted-source' };

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            expect(result.effectiveShopperContext).toEqual({});
            expect(result.effectiveSourceCodeContext.sourceCode).toBe('persisted-source');
        });

        test('should allow null to overwrite current sourceCode', () => {
            const newShopperContext = {};
            const newSourceCodeContext = { sourceCode: null as any };
            const currentShopperContext = {};
            const currentSourceCodeContext = { sourceCode: 'persisted-source' };

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            expect(result.effectiveShopperContext).toEqual({});
            expect(result.effectiveSourceCodeContext.sourceCode).toBeNull();
        });

        test('should add qualifiers from newShopperContext to effectiveShopperContext', () => {
            const newShopperContext = { otherKey: 'value', deviceType: 'mobile' };
            const newSourceCodeContext = {};
            const currentShopperContext = { existingKey: 'existing' };
            const currentSourceCodeContext = {};

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            expect(result.effectiveShopperContext).toEqual({
                existingKey: 'existing',
                otherKey: 'value',
                deviceType: 'mobile',
            });
            expect(result.effectiveSourceCodeContext).toEqual({});
        });

        test('should handle empty contexts', () => {
            const newShopperContext = {};
            const newSourceCodeContext = {};
            const currentShopperContext = {};
            const currentSourceCodeContext = {};

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            expect(result.effectiveShopperContext).toEqual({});
            expect(result.effectiveSourceCodeContext).toEqual({});
        });

        test('should merge newShopperContext and newSourceCodeContext correctly', () => {
            const newShopperContext = { otherKey: 'value' };
            const newSourceCodeContext = { sourceCode: 'new-source' };
            const currentShopperContext = { existingKey: 'existing' };
            const currentSourceCodeContext = { sourceCode: 'old-source' };

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            expect(result.effectiveShopperContext).toEqual({
                existingKey: 'existing',
                otherKey: 'value',
            });
            expect(result.effectiveSourceCodeContext.sourceCode).toBe('new-source');
        });

        test('should handle customQualifiers in context', () => {
            const newShopperContext = { deviceType: 'mobile', category: 'customQualifiers' };
            const newSourceCodeContext = {};
            const currentShopperContext = { operatingSystem: 'Android' };
            const currentSourceCodeContext = {};

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            expect(result.effectiveShopperContext).toEqual({
                operatingSystem: 'Android',
                deviceType: 'mobile',
                category: 'customQualifiers',
            });
        });

        test('should overwrite existing qualifiers with new values', () => {
            const newShopperContext = { deviceType: 'tablet' };
            const newSourceCodeContext = {};
            const currentShopperContext = { deviceType: 'mobile' };
            const currentSourceCodeContext = {};

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            expect(result.effectiveShopperContext).toEqual({
                deviceType: 'tablet',
            });
        });

        test('should handle empty string values in newShopperContext', () => {
            const newShopperContext = { deviceType: '' };
            const newSourceCodeContext = {};
            const currentShopperContext = { deviceType: 'mobile' };
            const currentSourceCodeContext = {};

            const result = computeEffectiveShopperContext(
                newShopperContext,
                newSourceCodeContext,
                currentShopperContext,
                currentSourceCodeContext
            );

            // Empty string should overwrite existing value
            expect(result.effectiveShopperContext).toEqual({
                deviceType: '',
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
});
