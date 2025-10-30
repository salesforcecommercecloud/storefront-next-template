/**
 * Configuration Utility Tests
 *
 * Tests utility functions used in configuration.
 */

import { describe, it, expect } from 'vitest';
import { parseEnvJson } from './utils';

describe('parseEnvJson', () => {
    it('should parse valid JSON string', () => {
        const result = parseEnvJson('["Apple","Google"]', []);
        expect(result).toEqual(['Apple', 'Google']);
    });

    it('should parse valid JSON object', () => {
        const result = parseEnvJson('{"enabled":true,"providers":["Apple"]}', {});
        expect(result).toEqual({ enabled: true, providers: ['Apple'] });
    });

    it('should return fallback for undefined', () => {
        const fallback = ['Default', 'Value'];
        const result = parseEnvJson(undefined, fallback);
        expect(result).toBe(fallback);
    });

    it('should return fallback for empty string', () => {
        const fallback = ['Default'];
        const result = parseEnvJson('', fallback);
        expect(result).toBe(fallback);
    });

    it('should return fallback for invalid JSON', () => {
        const fallback = ['Default'];
        const result = parseEnvJson('not valid json', fallback);
        expect(result).toBe(fallback);
    });

    it('should return fallback for malformed JSON array', () => {
        const fallback = ['Default'];
        const result = parseEnvJson('["Apple","Google"', fallback);
        expect(result).toBe(fallback);
    });

    it('should handle boolean values', () => {
        const result = parseEnvJson('true', false);
        expect(result).toBe(true);
    });

    it('should handle number values', () => {
        const result = parseEnvJson('42', 0);
        expect(result).toBe(42);
    });

    it('should handle null value', () => {
        const result = parseEnvJson('null', 'fallback');
        expect(result).toBe(null);
    });
});
