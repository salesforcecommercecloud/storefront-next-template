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
