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
import { deepMerge, pathToObject, mergeEnvConfig } from './utils';

describe('deepMerge', () => {
    it('should merge two flat objects', () => {
        const target = { a: 1, b: 2 };
        const source = { b: 3, c: 4 };
        const result = deepMerge(target, source);
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
        const target = { a: { b: 1, c: 2 }, d: 3 };
        const source = { a: { b: 10, e: 5 }, f: 6 };
        const result = deepMerge(target, source);
        expect(result).toEqual({ a: { b: 10, c: 2, e: 5 }, d: 3, f: 6 });
    });

    it('should replace arrays instead of merging them', () => {
        const target = { arr: [1, 2, 3] };
        const source = { arr: [4, 5] };
        const result = deepMerge(target, source);
        expect(result).toEqual({ arr: [4, 5] });
    });

    it('should handle deep nesting', () => {
        const target = { a: { b: { c: { d: 1 } } } };
        const source = { a: { b: { c: { e: 2 } } } };
        const result = deepMerge(target, source);
        expect(result).toEqual({ a: { b: { c: { d: 1, e: 2 } } } });
    });

    it('should replace primitives with objects', () => {
        const target = { a: 123 };
        const source = { a: { b: 456 } };
        const result = deepMerge(target, source);
        expect(result).toEqual({ a: { b: 456 } });
    });

    it('should replace objects with primitives', () => {
        const target = { a: { b: 1 } };
        const source = { a: 'string' };
        const result = deepMerge(target, source);
        expect(result).toEqual({ a: 'string' });
    });

    it('should handle null values', () => {
        const target = { a: { b: 1 } };
        const source = { a: null };
        const result = deepMerge(target, source);
        expect(result).toEqual({ a: null });
    });

    it('should handle undefined values', () => {
        const target = { a: 1, b: 2 };
        const source = { a: undefined };
        const result = deepMerge(target, source);
        expect(result).toEqual({ a: undefined, b: 2 });
    });

    it('should not mutate input objects', () => {
        const target = { a: { b: 1 } };
        const source = { a: { c: 2 } };
        deepMerge(target, source);
        expect(target).toEqual({ a: { b: 1 } });
        expect(source).toEqual({ a: { c: 2 } });
    });
});

describe('pathToObject', () => {
    it('should convert single level path', () => {
        const result = pathToObject('foo', 'bar');
        expect(result).toEqual({ foo: 'bar' });
    });

    it('should convert two level path', () => {
        const result = pathToObject('foo__bar', 'baz');
        expect(result).toEqual({ foo: { bar: 'baz' } });
    });

    it('should convert multi-level path', () => {
        const result = pathToObject('app__pages__cart__quantityUpdateDebounce', 1000);
        expect(result).toEqual({
            app: {
                pages: {
                    cart: {
                        quantityUpdateDebounce: 1000,
                    },
                },
            },
        });
    });

    it('should handle different value types', () => {
        expect(pathToObject('a__b', true)).toEqual({ a: { b: true } });
        expect(pathToObject('a__b', null)).toEqual({ a: { b: null } });
        expect(pathToObject('a__b', ['array'])).toEqual({ a: { b: ['array'] } });
        expect(pathToObject('a__b', { nested: 'object' })).toEqual({ a: { b: { nested: 'object' } } });
    });

    it('should normalize keys to match baseConfig casing', () => {
        const baseConfig = {
            app: {
                site: {
                    locale: 'en-US',
                },
            },
        };

        // All uppercase path should be normalized to baseConfig casing
        const result = pathToObject('APP__SITE__LOCALE', 'fr-FR', baseConfig);
        expect(result).toEqual({
            app: {
                site: {
                    locale: 'fr-FR',
                },
            },
        });
    });

    it('should preserve original casing when no baseConfig provided', () => {
        const result = pathToObject('APP__SITE__LOCALE', 'fr-FR');
        expect(result).toEqual({
            APP: {
                SITE: {
                    LOCALE: 'fr-FR',
                },
            },
        });
    });
});

describe('mergeEnvConfig', () => {
    it('should merge PUBLIC__ prefixed variables', () => {
        const env = {
            PUBLIC__app__pages__cart__quantityUpdateDebounce: '1000',
            PUBLIC__app__pages__cart__maxQuantityPerItem: '500',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                pages: {
                    cart: {
                        quantityUpdateDebounce: 1000,
                        maxQuantityPerItem: 500,
                    },
                },
            },
        });
    });

    it('should parse JSON values with optimistic parsing', () => {
        const env = {
            PUBLIC__app__test__stringValue: 'plain string',
            PUBLIC__app__test__numberValue: '42',
            PUBLIC__app__test__boolValue: 'true',
            PUBLIC__app__test__arrayValue: '["a","b"]',
            PUBLIC__app__test__objectValue: '{"key":"value"}',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                test: {
                    stringValue: 'plain string',
                    numberValue: 42,
                    boolValue: true,
                    arrayValue: ['a', 'b'],
                    objectValue: { key: 'value' },
                },
            },
        });
    });

    it('should handle malformed JSON gracefully by treating as string', () => {
        const env = {
            PUBLIC__app__test: '{"invalid json',
        };
        const result = mergeEnvConfig(env);
        // Falls back to string
        expect(result).toEqual({
            app: {
                test: '{"invalid json',
            },
        });
    });

    it('should merge multiple paths correctly', () => {
        const env = {
            PUBLIC__app__pages__home__featuredProductsCount: '20',
            PUBLIC__app__pages__cart__maxQuantityPerItem: '999',
            PUBLIC__app__site__locale: 'fr-FR',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                pages: {
                    home: {
                        featuredProductsCount: 20,
                    },
                    cart: {
                        maxQuantityPerItem: 999,
                    },
                },
                site: {
                    locale: 'fr-FR',
                },
            },
        });
    });

    it('should ignore variables without PUBLIC__ prefix', () => {
        const env = {
            PUBLIC__app__test: 'included',
            NOTPUBLIC__app__test: 'ignored',
            APP__test: 'ignored',
            SOME_OTHER_VAR: 'ignored',
            SERVER_SECRET: 'ignored',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                test: 'included',
            },
        });
    });

    it('should ignore undefined values but allow empty strings', () => {
        const env = {
            PUBLIC__app__test: '',
            PUBLIC__app__test2: undefined,
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                test: '', // Empty string is allowed
            },
        });
    });

    it('should handle complex nested JSON objects', () => {
        const env = {
            PUBLIC__app__complex: '{"a":{"b":{"c":10}},"d":[1,2,3]}',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                complex: {
                    a: { b: { c: 10 } },
                    d: [1, 2, 3],
                },
            },
        });
    });

    it('should deep merge overlapping paths', () => {
        const env = {
            PUBLIC__app__pages__cart__maxQuantityPerItem: '500',
            PUBLIC__app__pages__cart__quantityUpdateDebounce: '1000',
            PUBLIC__app__pages__home__featuredProductsCount: '20',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                pages: {
                    cart: {
                        maxQuantityPerItem: 500,
                        quantityUpdateDebounce: 1000,
                    },
                    home: {
                        featuredProductsCount: 20,
                    },
                },
            },
        });
    });

    it('should handle all common data types', () => {
        const env = {
            PUBLIC__app__commerce__api__clientId: 'abc123',
            PUBLIC__app__site__locale: 'en-US',
            PUBLIC__app__site__features__passwordlessLogin__enabled: 'true',
            PUBLIC__app__pages__cart__quantityUpdateDebounce: '1000',
            PUBLIC__app__site__features__socialLogin__providers: '["Apple","Google"]',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                commerce: {
                    api: {
                        clientId: 'abc123',
                    },
                },
                site: {
                    locale: 'en-US',
                    features: {
                        passwordlessLogin: {
                            enabled: true,
                        },
                        socialLogin: {
                            providers: ['Apple', 'Google'],
                        },
                    },
                },
                pages: {
                    cart: {
                        quantityUpdateDebounce: 1000,
                    },
                },
            },
        });
    });

    it('should handle runtime config paths', () => {
        const env = {
            PUBLIC__runtime__defaultMrtProject: 'my-project',
            PUBLIC__runtime__defaultMrtTarget: 'production',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            runtime: {
                defaultMrtProject: 'my-project',
                defaultMrtTarget: 'production',
            },
        });
    });

    it('should preserve single-level paths', () => {
        const env = {
            PUBLIC__metadata__projectName: 'Test Project',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            metadata: {
                projectName: 'Test Project',
            },
        });
    });

    it('should throw error for empty path after PUBLIC__ prefix', () => {
        const env = {
            PUBLIC__: 'some-value',
        };
        expect(() => mergeEnvConfig(env)).toThrow(
            'Invalid environment variable "PUBLIC__": Path cannot be empty after PUBLIC__ prefix'
        );
    });

    it('should provide helpful error message for empty path', () => {
        const env = {
            PUBLIC__: 'some-value',
        };
        expect(() => mergeEnvConfig(env)).toThrow(
            'Expected format: PUBLIC__path__to__value (e.g., PUBLIC__app__site__locale)'
        );
    });

    it('should throw error when variable name exceeds 512 characters (MRT limit)', () => {
        // Create a variable name longer than 512 characters
        const longPath = 'a'.repeat(520);
        const env = {
            [`PUBLIC__${longPath}`]: 'value',
        };
        expect(() => mergeEnvConfig(env)).toThrow('exceeds MRT limit of 512 characters');
    });

    it('should throw error when total value size exceeds 32 KB (MRT limit)', () => {
        // Create multiple variables that exceed 32 KB total
        const largeValue = 'x'.repeat(20 * 1024); // 20 KB
        const env = {
            PUBLIC__app__test1: largeValue,
            PUBLIC__app__test2: largeValue, // Total: 40 KB > 32 KB
        };
        expect(() => mergeEnvConfig(env)).toThrow(
            'Total size of PUBLIC__ environment variable values exceeds MRT limit of 32768 bytes (32 KB)'
        );
    });

    it('should provide helpful error message for exceeding variable name limit', () => {
        const longPath = 'a'.repeat(520);
        const env = {
            [`PUBLIC__${longPath}`]: 'value',
        };
        expect(() => mergeEnvConfig(env)).toThrow(
            'Consider using shorter paths or consolidating configuration using JSON values'
        );
    });

    it('should provide helpful error message for exceeding total value size', () => {
        const largeValue = 'x'.repeat(20 * 1024);
        const env = {
            PUBLIC__app__test1: largeValue,
            PUBLIC__app__test2: largeValue,
        };
        expect(() => mergeEnvConfig(env)).toThrow(
            'Consider consolidating configuration using JSON values to reduce the number of variables'
        );
    });

    it('should allow variables at the MRT limit boundaries', () => {
        // Test variable name at exactly 512 characters
        const pathAt512 = 'a'.repeat(512 - 'PUBLIC__'.length);
        const env = {
            [`PUBLIC__${pathAt512}`]: 'value',
        };
        expect(() => mergeEnvConfig(env)).not.toThrow();
    });

    it('should allow total value size just under 32 KB', () => {
        // Test total value size just under the limit
        const value = 'x'.repeat(16 * 1024); // 16 KB each
        const env = {
            PUBLIC__app__test1: value,
            PUBLIC__app__test2: value.substring(0, 16 * 1024 - 1), // Total: just under 32 KB
        };
        expect(() => mergeEnvConfig(env)).not.toThrow();
    });
});

describe('mergeEnvConfig - Specificity and Precedence', () => {
    it('should apply more specific paths over less specific paths', () => {
        const env = {
            PUBLIC__app__pages__cart: '{"maxQuantityPerItem":500,"quantityUpdateDebounce":1000}',
            PUBLIC__app__pages__cart__maxQuantityPerItem: '999',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                pages: {
                    cart: {
                        maxQuantityPerItem: 999, // More specific wins
                        quantityUpdateDebounce: 1000, // From parent JSON
                    },
                },
            },
        });
    });

    it('should handle multiple levels of specificity', () => {
        const env = {
            PUBLIC__app: '{"pages":{"cart":{"maxQuantityPerItem":100}}}',
            PUBLIC__app__pages__cart: '{"maxQuantityPerItem":500,"quantityUpdateDebounce":1000}',
            PUBLIC__app__pages__cart__maxQuantityPerItem: '999',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                pages: {
                    cart: {
                        maxQuantityPerItem: 999, // Most specific wins
                        quantityUpdateDebounce: 1000, // From middle level
                    },
                },
            },
        });
    });

    it('should merge sibling paths at different specificity levels', () => {
        const env = {
            PUBLIC__app__pages: '{"cart":{"maxQuantityPerItem":500},"home":{"featuredProductsCount":12}}',
            PUBLIC__app__pages__cart__quantityUpdateDebounce: '750',
            PUBLIC__app__site__locale: 'en-US',
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                pages: {
                    cart: {
                        maxQuantityPerItem: 500,
                        quantityUpdateDebounce: 750, // More specific
                    },
                    home: {
                        featuredProductsCount: 12,
                    },
                },
                site: {
                    locale: 'en-US',
                },
            },
        });
    });

    it('should preserve non-conflicting values when specificity overlaps', () => {
        const env = {
            PUBLIC__app__site: '{"locale":"fr-FR","currency":"EUR","features":{"guestCheckout":true}}',
            PUBLIC__app__site__locale: 'en-US', // Override locale
            PUBLIC__app__site__features__socialLogin__enabled: 'true', // Add to features
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                site: {
                    locale: 'en-US', // Overridden
                    currency: 'EUR', // Preserved
                    features: {
                        guestCheckout: true, // Preserved
                        socialLogin: {
                            enabled: true, // Added
                        },
                    },
                },
            },
        });
    });

    it('should handle specificity with primitive values overriding objects', () => {
        const env = {
            PUBLIC__app__test: '{"nested":{"value":42}}',
            PUBLIC__app__test__nested: 'simple-string', // Replace object with string
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                test: {
                    nested: 'simple-string', // More specific primitive wins
                },
            },
        });
    });

    it('should handle specificity with objects overriding primitives', () => {
        const env = {
            PUBLIC__app__test__nested: 'simple-string', // Depth 3 - more specific
            PUBLIC__app__test: '{"nested":{"value":42}}', // Depth 2 - less specific, applied first
        };
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            app: {
                test: {
                    nested: 'simple-string', // More specific path (depth 3) wins
                },
            },
        });
    });
});

describe('mergeEnvConfig - Conflict Detection', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
        delete process.env.NODE_ENV;
    });

    it('should warn about conflicting parent and child paths in development', () => {
        const env = {
            PUBLIC__app__pages__cart: '{"maxQuantityPerItem":500}',
            PUBLIC__app__pages__cart__maxQuantityPerItem: '999',
        };
        mergeEnvConfig(env);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[Config Warning] Conflicting environment variables detected')
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining(
                'PUBLIC__app__pages__cart ← overridden by → PUBLIC__app__pages__cart__maxQuantityPerItem'
            )
        );
    });

    it('should warn about multiple conflicts', () => {
        const env = {
            PUBLIC__app: '{"pages":{"cart":{"maxQuantityPerItem":100}}}',
            PUBLIC__app__pages__cart: '{"maxQuantityPerItem":500}',
            PUBLIC__app__pages__cart__maxQuantityPerItem: '999',
        };
        mergeEnvConfig(env);

        expect(consoleWarnSpy).toHaveBeenCalled();
        const warning = consoleWarnSpy.mock.calls[0][0];
        expect(warning).toContain('PUBLIC__app ← overridden by → PUBLIC__app__pages__cart');
        expect(warning).toContain(
            'PUBLIC__app__pages__cart ← overridden by → PUBLIC__app__pages__cart__maxQuantityPerItem'
        );
    });

    it('should not warn when paths do not overlap', () => {
        const env = {
            PUBLIC__app__pages__cart__maxQuantityPerItem: '999',
            PUBLIC__app__site__locale: 'en-US',
            PUBLIC__app__commerce__api__clientId: 'abc123',
        };
        mergeEnvConfig(env);

        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should not warn in production mode even with conflicts', () => {
        process.env.NODE_ENV = 'production';
        const env = {
            PUBLIC__app__pages__cart: '{"maxQuantityPerItem":500}',
            PUBLIC__app__pages__cart__maxQuantityPerItem: '999',
        };
        mergeEnvConfig(env);

        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should detect conflicts across multiple branches', () => {
        const env = {
            PUBLIC__app__site: '{"locale":"en-US","currency":"USD"}',
            PUBLIC__app__site__features: '{"guestCheckout":true}',
            PUBLIC__app__site__features__socialLogin__enabled: 'true',
        };
        mergeEnvConfig(env);

        expect(consoleWarnSpy).toHaveBeenCalled();
        const warning = consoleWarnSpy.mock.calls[0][0];
        expect(warning).toContain('PUBLIC__app__site ← overridden by → PUBLIC__app__site__features');
        expect(warning).toContain(
            'PUBLIC__app__site__features ← overridden by → PUBLIC__app__site__features__socialLogin__enabled'
        );
    });
});

describe('mergeEnvConfig - Protected Paths', () => {
    const baseConfig = {
        app: {
            engagement: {
                adapters: {
                    einstein: {
                        enabled: true,
                        eventToggles: {
                            view_page: true,
                        },
                    },
                },
                analytics: {
                    pageViewsBlocklist: ['/action'],
                },
            },
            site: {
                locale: 'en-US',
            },
        },
    };

    it('should throw error when trying to override engagement config', () => {
        const env = {
            PUBLIC__app__engagement__adapters__einstein__enabled: 'false',
        };

        expect(() => mergeEnvConfig(env, baseConfig)).toThrow('attempts to override protected config path');
    });

    it('should throw error for any path under app__engagement', () => {
        const testCases = [
            'PUBLIC__app__engagement__adapters__einstein__eventToggles__view_page',
            'PUBLIC__app__engagement__analytics__pageViewsBlocklist',
            'PUBLIC__APP__ENGAGEMENT__ADAPTERS__EINSTEIN__ENABLED', // Case insensitive
        ];

        for (const varName of testCases) {
            const env = { [varName]: 'some-value' };
            expect(() => mergeEnvConfig(env, baseConfig)).toThrow(
                'engagement configuration cannot be overridden via environment variables'
            );
        }
    });

    it('should throw error when trying to override entire engagement block', () => {
        const env = {
            PUBLIC__app__engagement: '{"adapters":{}}',
        };

        expect(() => mergeEnvConfig(env, baseConfig)).toThrow('attempts to override protected config path');
    });

    it('should allow overriding non-engagement paths', () => {
        const env = {
            PUBLIC__app__site__locale: 'fr-FR',
        };

        // Should not throw
        const result = mergeEnvConfig(env, baseConfig);
        expect(result.app.site.locale).toBe('fr-FR');
    });

    it('should provide helpful error message for protected paths', () => {
        const env = {
            PUBLIC__app__engagement__adapters__einstein__enabled: 'false',
        };

        expect(() => mergeEnvConfig(env, baseConfig)).toThrow(
            'Update config.server.ts directly to change engagement settings'
        );
    });
});

describe('mergeEnvConfig - Validation and Case Sensitivity', () => {
    const baseConfig = {
        app: {
            site: {
                locale: 'en-US',
                currency: 'USD',
            },
            pages: {
                cart: {
                    quantityUpdateDebounce: 500,
                    maxQuantityPerItem: 10,
                },
            },
            commerce: {
                api: {
                    clientId: '',
                    organizationId: '',
                },
            },
        },
        metadata: {
            projectName: 'Test App',
        },
    };

    it('should normalize case to match baseConfig and merge into single object', () => {
        const env = {
            PUBLIC__APP__SITE__LOCALE: 'fr-FR', // All uppercase - validation passes, normalized to baseConfig case
            PUBLIC__App__Site__Currency: 'EUR', // Mixed case - validation passes, normalized to baseConfig case
            PUBLIC__app__pages__cart__maxQuantityPerItem: '20', // Correct case
        };
        const result = mergeEnvConfig(env, baseConfig);

        // All variables should merge into single 'app' object with normalized casing from baseConfig
        expect(result).toEqual({
            app: {
                site: {
                    locale: 'fr-FR', // Normalized to 'app.site.locale' from baseConfig
                    currency: 'EUR', // Normalized to 'app.site.currency' from baseConfig
                },
                pages: {
                    cart: {
                        maxQuantityPerItem: 20, // Parsed as number via optimistic JSON parsing
                    },
                },
            },
        });
    });

    it('should throw error for invalid config path', () => {
        const env = {
            PUBLIC__app__invalid__path: 'value',
        };

        expect(() => mergeEnvConfig(env, baseConfig)).toThrow(
            'Invalid environment variable "PUBLIC__app__invalid__path": Config path "app__invalid__path" does not exist in config.server.ts'
        );
    });

    it('should throw error for invalid config path with typos', () => {
        const env = {
            PUBLIC__app__site__local: 'en-US', // Typo: "local" instead of "locale"
        };

        expect(() => mergeEnvConfig(env, baseConfig)).toThrow(
            'Invalid environment variable "PUBLIC__app__site__local": Config path "app__site__local" does not exist in config.server.ts'
        );
    });

    it('should throw error for invalid config path', () => {
        const env = {
            PUBLIC__app__pages__carts__maxQuantityPerItem: '20', // Typo: "carts" instead of "cart"
        };

        expect(() => mergeEnvConfig(env, baseConfig)).toThrow(
            'Invalid environment variable "PUBLIC__app__pages__carts__maxQuantityPerItem": Config path "app__pages__carts__maxQuantityPerItem" does not exist in config.server.ts'
        );
    });

    it('should throw error for completely invalid paths', () => {
        const env = {
            PUBLIC__totally__wrong__path: 'value',
        };

        expect(() => mergeEnvConfig(env, baseConfig)).toThrow(
            'Config path "totally__wrong__path" does not exist in config.server.ts'
        );
    });

    it('should allow overriding any valid path regardless of case', () => {
        const env = {
            PUBLIC__METADATA__PROJECTNAME: 'New Name',
            PUBLIC__App__Commerce__API__OrganizationId: 'org123',
        };
        const result = mergeEnvConfig(env, baseConfig);

        // Validation passes (case-insensitive), normalized to baseConfig casing
        expect(result).toEqual({
            metadata: {
                projectName: 'New Name', // Normalized to baseConfig case
            },
            app: {
                commerce: {
                    api: {
                        organizationId: 'org123', // Normalized to baseConfig case
                    },
                },
            },
        });
    });

    it('should work without baseConfig (no validation)', () => {
        const env = {
            PUBLIC__any__path__works: 'value',
            PUBLIC__ANOTHER__PATH: 'value2',
        };

        // Should not throw when baseConfig is not provided
        // Preserves original casing when there's no validation
        const result = mergeEnvConfig(env);
        expect(result).toEqual({
            any: {
                path: {
                    works: 'value',
                },
            },
            ANOTHER: {
                PATH: 'value2',
            },
        });
    });

    it('should validate nested paths correctly', () => {
        const env = {
            PUBLIC__app__pages__cart__invalidField: '100',
        };

        expect(() => mergeEnvConfig(env, baseConfig)).toThrow(
            'Config path "app__pages__cart__invalidField" does not exist'
        );
    });

    it('should allow empty string values to override defaults', () => {
        const env = {
            PUBLIC__app__site__locale: '', // Empty string should be allowed
        };
        const result = mergeEnvConfig(env, baseConfig);

        expect(result).toEqual({
            app: {
                site: {
                    locale: '', // Empty string preserved
                },
            },
        });
    });

    it('should throw error when path depth exceeds maximum', () => {
        const env = {
            // 11 levels deep (exceeds MAX_DEPTH of 10)
            PUBLIC__a__b__c__d__e__f__g__h__i__j__k: 'value',
        };

        expect(() => mergeEnvConfig(env)).toThrow('exceeds maximum path depth of 10');
        expect(() => mergeEnvConfig(env)).toThrow('Current depth: 11');
    });

    it('should allow paths at maximum depth', () => {
        const env = {
            // Exactly 10 levels deep (at MAX_DEPTH limit)
            PUBLIC__a__b__c__d__e__f__g__h__i__j: 'value',
        };

        // Should not throw
        expect(() => mergeEnvConfig(env)).not.toThrow();
        const result = mergeEnvConfig(env);
        expect(result.a.b.c.d.e.f.g.h.i.j).toBe('value');
    });
});
