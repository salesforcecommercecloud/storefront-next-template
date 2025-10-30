/**
 * Tests for product features configuration
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_PRODUCT_FEATURES_CONFIG, type ProductFeaturesConfig } from './product-features';

describe('Product Features Config', () => {
    describe('DEFAULT_PRODUCT_FEATURES_CONFIG', () => {
        it('should have correct delimiter', () => {
            expect(DEFAULT_PRODUCT_FEATURES_CONFIG.delimiter).toBe('|');
        });

        it('should have html fragment class name defined', () => {
            expect(DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName).toBeDefined();
            expect(DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName).toContain('text-sm');
            expect(DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName).toContain('text-foreground');
        });

        it('should have styling for list elements', () => {
            const className = DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName;
            expect(className).toContain('[&_ul]');
            expect(className).toContain('[&_li]');
            expect(className).toContain('before:bg-primary');
        });

        it('should conform to ProductFeaturesConfig interface', () => {
            const config: ProductFeaturesConfig = DEFAULT_PRODUCT_FEATURES_CONFIG;
            expect(config).toHaveProperty('delimiter');
            expect(config).toHaveProperty('htmlFragmentClassName');
        });
    });
});
