import { describe, expect, it } from 'vitest';
import { getBundlePath, getCommerceCloudApiUrl } from './paths';

describe('getCommerceCloudApiUrl', () => {
    it('should construct correct API URL', () => {
        const url = getCommerceCloudApiUrl('test-code');

        expect(url).toBe('https://test-code.api.commercecloud.salesforce.com');
    });

    it('should handle different short codes', () => {
        const url = getCommerceCloudApiUrl('production-123');

        expect(url).toBe('https://production-123.api.commercecloud.salesforce.com');
    });
});

describe('getBundlePath', () => {
    it('should construct correct bundle path', () => {
        const bundleId = 'test-bundle-123';
        const path = getBundlePath(bundleId);

        expect(path).toBe('/mobify/bundle/test-bundle-123/client/');
    });

    it('should handle different bundle IDs', () => {
        const bundleId = 'production-bundle-456';
        const path = getBundlePath(bundleId);

        expect(path).toBe('/mobify/bundle/production-bundle-456/client/');
    });

    it('should handle bundle IDs with special characters', () => {
        const bundleId = 'bundle-v1.2.3-beta';
        const path = getBundlePath(bundleId);

        expect(path).toBe('/mobify/bundle/bundle-v1.2.3-beta/client/');
    });
});
