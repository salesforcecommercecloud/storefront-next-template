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

/**
 * Type guard to check if value is a plain object (not array, null, or other types)
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Deep merge two objects, with source values overriding target values
 * Arrays are replaced, not merged
 *
 * @param target - The base object
 * @param source - The object with values to merge in
 * @returns A new merged object
 *
 * @example
 * deepMerge(
 *   { a: { b: 1, c: 2 } },
 *   { a: { b: 3, d: 4 } }
 * )
 * // Returns: { a: { b: 3, c: 2, d: 4 } }
 */
export const deepMerge = <T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T => {
    const result: Record<string, unknown> = { ...target };

    for (const key in source) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
            // Both are plain objects, merge recursively
            result[key] = deepMerge(targetValue, sourceValue);
        } else {
            // Otherwise, replace with source value (including arrays, primitives, null, undefined)
            result[key] = sourceValue;
        }
    }

    return result as T;
};

/**
 * Convert a path string with double underscore separators to a nested object
 * Normalizes keys to match baseConfig casing (case-insensitive lookup, preserves baseConfig case)
 *
 * @param path - The path string (e.g., 'app__pages__cart__quantityUpdateDebounce')
 * @param value - The value to set at the path
 * @param baseConfig - Optional base config for case normalization
 * @returns A nested object
 *
 * @example
 * pathToObject('app__pages__cart__maxQuantity', 999)
 * // Returns: { app: { pages: { cart: { maxQuantity: 999 } } } }
 *
 * @example
 * // With baseConfig normalization:
 * pathToObject('APP__SITE__LOCALE', 'en-US', { app: { site: { locale: 'en-US' } } })
 * // Returns: { app: { site: { locale: 'en-US' } } } (normalized to baseConfig casing)
 */
export const pathToObject = (
    path: string,
    value: unknown,
    baseConfig?: Record<string, unknown>
): Record<string, unknown> => {
    const keys = path.split('__');
    const result: Record<string, unknown> = {};

    let current = result;
    let configCurrent: unknown = baseConfig;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];

        // Find actual key in baseConfig (case-insensitive)
        let normalizedKey = key;
        if (configCurrent && typeof configCurrent === 'object' && !Array.isArray(configCurrent)) {
            const actualKey = Object.keys(configCurrent).find((k) => k.toLowerCase() === key.toLowerCase());
            if (actualKey) {
                normalizedKey = actualKey;
                configCurrent = (configCurrent as Record<string, unknown>)[actualKey];
            } else {
                configCurrent = null; // Path diverges from base
            }
        }

        current[normalizedKey] = {};
        current = current[normalizedKey] as Record<string, unknown>;
    }

    // Handle last key
    const lastKey = keys[keys.length - 1];
    let normalizedLastKey = lastKey;
    if (configCurrent && typeof configCurrent === 'object' && !Array.isArray(configCurrent)) {
        const actualKey = Object.keys(configCurrent).find((k) => k.toLowerCase() === lastKey.toLowerCase());
        if (actualKey) {
            normalizedLastKey = actualKey;
        }
    }

    current[normalizedLastKey] = value;
    return result;
};

/**
 * Parse environment variable value with optimistic JSON parsing
 * Tries to parse as JSON first, falls back to string if invalid
 * Supports multi-line formatted JSON by normalizing whitespace before parsing
 *
 * @param varValue - The environment variable value
 * @param varName - Optional variable name for better error messages
 * @returns The parsed value (JSON type if valid JSON, otherwise string)
 *
 * @example
 * // Primitives
 * parseEnvValue('42') // → 42 (number)
 * parseEnvValue('true') // → true (boolean)
 * parseEnvValue('hello') // → 'hello' (string)
 *
 * @example
 * // Single-line JSON
 * parseEnvValue('["Apple","Google"]') // → ['Apple', 'Google'] (array)
 * parseEnvValue('{"key":"value"}') // → {key: 'value'} (object)
 *
 * @example
 * // Multi-line formatted JSON (whitespace normalized automatically)
 * parseEnvValue('[
 *   {"id": "en-US"},
 *   {"id": "fr-FR"}
 * ]') // → [{id: 'en-US'}, {id: 'fr-FR'}] (array)
 */
const parseEnvValue = (varValue: string, varName?: string): unknown => {
    // Optimistic JSON parsing - try to parse as JSON, fall back to string
    try {
        return JSON.parse(varValue);
    } catch {
        // For JSON-like values, try normalizing whitespace before parsing
        // This allows multi-line formatted JSON in .env files
        const trimmed = varValue.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                // Normalize whitespace: replace newlines and multiple spaces with single space
                // This preserves JSON structure while removing formatting
                const normalized = varValue.replace(/\s+/g, ' ').trim();
                return JSON.parse(normalized);
            } catch {
                // Still failed after normalization
                if (process.env.NODE_ENV === 'development') {
                    const preview = varValue.length > 50 ? `${varValue.substring(0, 50)}...` : varValue;
                    const varInfo = varName ? ` in "${varName}"` : '';
                    // eslint-disable-next-line no-console
                    console.warn(
                        `[Config Warning] Value${varInfo} looks like JSON but failed to parse: "${preview}". ` +
                            `Using as string instead. Check for syntax errors if this was meant to be JSON.`
                    );
                }
            }
        }
        // If it's not valid JSON, return as string
        return varValue;
    }
};

/**
 * Extract all valid paths from a config object (recursively traverses the object structure)
 * Returns paths in lowercase with double underscore separators
 *
 * @param obj - The config object to extract paths from
 * @param prefix - Current path prefix (used for recursion)
 * @returns Array of valid config paths
 *
 * @example
 * extractValidPaths({ app: { site: { locale: 'en-US' } } })
 * // Returns: ['app__site__locale']
 */
const extractValidPaths = (obj: unknown, prefix = ''): string[] => {
    if (!isPlainObject(obj)) {
        return prefix ? [prefix] : [];
    }

    const paths: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        const normalizedKey = key.toLowerCase();
        const currentPath = prefix ? `${prefix}__${normalizedKey}` : normalizedKey;

        if (isPlainObject(value)) {
            // Recursively extract paths from nested objects
            paths.push(...extractValidPaths(value, currentPath));
        } else {
            // Leaf node - this is a valid config path
            paths.push(currentPath);
        }
    }

    return paths;
};

/**
 * Merge environment variables with PUBLIC__ prefix into config
 *
 * Uses double underscore (__) to target nested config paths.
 * All PUBLIC__ prefixed variables are exposed to the client (bundled into window.__APP_CONFIG__).
 *
 * Server-only secrets should NEVER use this - read them directly from process.env in server code.
 *
 * @param env - Environment variables object (defaults to process.env)
 * @returns Object with overrides to merge into base config
 *
 * @example
 * // Environment variables:
 * // PUBLIC__app__commerce__api__clientId=abc123
 * // PUBLIC__app__site__locale=en-US
 * // PUBLIC__app__pages__cart__quantityUpdateDebounce=1000
 * // PUBLIC__app__site__features__socialLogin__providers=["Apple","Google"]
 *
 * mergeEnvConfig()
 * // Returns:
 * // {
 * //   app: {
 * //     commerce: { api: { clientId: 'abc123' } },
 * //     site: { locale: 'en-US' },
 * //     pages: { cart: { quantityUpdateDebounce: 1000 } },
 * //     site: { features: { socialLogin: { providers: ['Apple', 'Google'] } } }
 * //   }
 * // }
 */
interface EnvVar {
    name: string;
    path: string;
    value: string;
    depth: number;
}

export const mergeEnvConfig = (
    env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {},
    baseConfig?: Record<string, unknown>
): Record<string, unknown> => {
    const PUBLIC_PREFIX = 'PUBLIC__';
    const MAX_VAR_NAME_LENGTH = 512; // MRT limit: 512 characters
    const MAX_TOTAL_VALUE_SIZE = 32 * 1024; // MRT limit: 32 KB
    const MAX_DEPTH = 10; // Maximum nesting depth to prevent stack overflow

    // Extract valid paths from base config for validation
    const validPaths = baseConfig ? extractValidPaths(baseConfig) : [];

    // Step 1: Collect and validate all PUBLIC__ environment variables
    const envVars: EnvVar[] = [];
    let totalValueSize = 0;

    for (const [varName, varValue] of Object.entries(env)) {
        // Allow empty strings, but skip undefined/null values
        if (varValue === undefined || varValue === null || !varName.startsWith(PUBLIC_PREFIX)) continue;

        // Validate variable name length (MRT requirement)
        if (varName.length > MAX_VAR_NAME_LENGTH) {
            throw new Error(
                `Environment variable name "${varName}" exceeds MRT limit of ${MAX_VAR_NAME_LENGTH} characters. ` +
                    `Current length: ${varName.length} characters. ` +
                    `Consider using shorter paths or consolidating configuration using JSON values.`
            );
        }

        const path = varName.substring(PUBLIC_PREFIX.length);

        // Validate path is not empty
        if (!path) {
            throw new Error(
                `Invalid environment variable "${varName}": Path cannot be empty after PUBLIC__ prefix. ` +
                    `Expected format: PUBLIC__path__to__value (e.g., PUBLIC__app__site__locale)`
            );
        }

        // Validate path depth to prevent stack overflow
        const depth = path.split('__').length;
        if (depth > MAX_DEPTH) {
            throw new Error(
                `Environment variable "${varName}" exceeds maximum path depth of ${MAX_DEPTH}. ` +
                    `Current depth: ${depth}. ` +
                    `Consider consolidating with JSON values or reducing nesting levels.`
            );
        }

        // Protected paths that cannot be overridden by environment variables
        // The engagement config must be set in config.server.ts for build-time validation
        const PROTECTED_PATHS = ['app__engagement'];
        const normalizedPath = path.toLowerCase();
        const isProtected = PROTECTED_PATHS.some(
            (protectedPath) => normalizedPath === protectedPath || normalizedPath.startsWith(`${protectedPath}__`)
        );

        if (isProtected) {
            throw new Error(
                `Environment variable "${varName}" attempts to override protected config path "${path}".\n\n` +
                    `The engagement configuration cannot be overridden via environment variables. ` +
                    `Update config.server.ts directly to change engagement settings.`
            );
        }

        // Validate path exists in base config (strict mode)
        if (baseConfig && validPaths.length > 0) {
            if (!validPaths.includes(normalizedPath)) {
                throw new Error(
                    `Invalid environment variable "${varName}": Config path "${path}" does not exist in config.server.ts.\n\n` +
                        `Check your config.server.ts for available configuration paths, or add this path to your base configuration.`
                );
            }
        }

        // Track total size of PUBLIC__ variable values (MRT requirement)
        totalValueSize += varValue.length;

        envVars.push({
            name: varName,
            path,
            value: varValue,
            depth: path.split('__').length,
        });
    }

    // Validate total size of all PUBLIC__ variable values (MRT requirement)
    if (totalValueSize > MAX_TOTAL_VALUE_SIZE) {
        throw new Error(
            `Total size of PUBLIC__ environment variable values exceeds MRT limit of ${MAX_TOTAL_VALUE_SIZE} bytes (32 KB). ` +
                `Current size: ${totalValueSize} bytes. ` +
                `Consider consolidating configuration using JSON values to reduce the number of variables, ` +
                `or move non-essential configuration to defaults in config.server.ts.`
        );
    }

    // Step 2: Sort by specificity (depth) - less specific first, more specific last
    // This ensures more specific paths override less specific ones
    envVars.sort((a, b) => a.depth - b.depth);

    // Step 3: Detect conflicts (overlapping paths)
    const conflicts: Array<{ parent: string; child: string }> = [];
    for (let i = 0; i < envVars.length; i++) {
        for (let j = i + 1; j < envVars.length; j++) {
            const shorter = envVars[i].path;
            const longer = envVars[j].path;
            // Check if longer path starts with shorter path followed by __
            if (longer.startsWith(`${shorter}__`)) {
                conflicts.push({
                    parent: envVars[i].name,
                    child: envVars[j].name,
                });
            }
        }
    }

    // Step 4: Warn about conflicts in development mode
    if (conflicts.length > 0 && process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(
            `[Config Warning] Conflicting environment variables detected. More specific paths will override parent paths:\n${conflicts
                .map((c) => `  ${c.parent} ← overridden by → ${c.child}`)
                .join('\n')}`
        );
    }

    // Step 5: Merge in specificity order (more specific wins)
    let merged: Record<string, unknown> = {};

    for (const envVar of envVars) {
        try {
            const parsedValue = parseEnvValue(envVar.value, envVar.name);
            const pathObject = pathToObject(envVar.path, parsedValue, baseConfig);
            merged = deepMerge(merged, pathObject);
        } catch (error) {
            throw new Error(
                `Failed to process environment variable "${envVar.name}" with value "${envVar.value}": ` +
                    `${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    return merged;
};
