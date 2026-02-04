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
import { createProductContentMockAdapter } from './product-content-mock';
import { PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME } from '@/lib/adapters/product-content-store';

describe('ProductContentMockAdapter', () => {
    const adapter = createProductContentMockAdapter({ enabled: true, mockDelay: 0 });

    describe('createProductContentMockAdapter', () => {
        it('should export default adapter name', () => {
            expect(PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME).toBe('product-content-mock');
        });

        it('should return adapter with all mock methods', () => {
            expect(adapter).toHaveProperty('getSizeGuide');
            expect(adapter).toHaveProperty('getReturnsAndWarranty');
            expect(adapter).toHaveProperty('getBuyNowPayLaterMessageContent');
            expect(adapter).toHaveProperty('getBuyNowPayLaterLearnMoreContent');
            expect(adapter).toHaveProperty('getEstimatedDelivery');
            expect(adapter).toHaveProperty('getProductDescription');
            expect(adapter).toHaveProperty('getIngredientsData');
            expect(adapter).toHaveProperty('getUsageInstructions');
            expect(adapter).toHaveProperty('getCareInstructions');
            expect(adapter).toHaveProperty('getTechSpecs');
            expect(adapter).toHaveProperty('getReviews');
            expect(adapter).toHaveProperty('getWriteReviewForm');
        });
    });

    describe('getSizeGuide', () => {
        it('should return size guide mock data with chart and howToMeasure', async () => {
            const data = await adapter.getSizeGuide?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.title).toBe('Size Guide');
            expect(data.subtitle).toBe('Find your perfect fit');
            expect(data.chart.columns).toEqual(['Size', 'US', 'EU', 'UK', 'CM']);
            expect(data.chart.rows).toHaveLength(5);
            expect(data.chart.rows[0]).toEqual({ size: 'XS', us: 4, eu: 34, uk: 6, cm: 22 });
            expect(data.howToMeasure).toHaveLength(3);
            expect(data.sizeTips.tips).toHaveLength(4);
        });
    });

    describe('getReturnsAndWarranty', () => {
        it('should return returns and warranty mock data', async () => {
            const data = await adapter.getReturnsAndWarranty?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.title).toBe('Returns & Warranty');
            expect(data.returnsPolicy.heading).toBe('30-Day Returns Policy');
            expect(data.returnsPolicy.conditions).toHaveLength(4);
            expect(data.warranty.heading).toBe('1-Year Warranty');
            expect(data.warranty.whatsCovered).toHaveLength(4);
            expect(data.exchanges.heading).toBe('Exchanges');
            expect(data.needHelp?.email).toBe('support@marketstreet.com');
        });
    });

    describe('getBuyNowPayLaterMessageContent', () => {
        it('should return BNPL message with providerLabel BNPL (no PayPal)', async () => {
            const data = await adapter.getBuyNowPayLaterMessageContent?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.paymentCount).toBe(4);
            expect(data.amountPerPayment).toBe(12.25);
            expect(data.providerLabel).toBe('BNPL');
            expect(data.learnMoreLabel).toBe('Learn more');
        });
    });

    describe('getBuyNowPayLaterLearnMoreContent', () => {
        it('should return BNPL learn more with payment schedule and howItWorks', async () => {
            const data = await adapter.getBuyNowPayLaterLearnMoreContent?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.title).toBe('Pay in 4 interest-free payments');
            expect(data.paymentSchedule.amountPerPayment).toBe(12.25);
            expect(data.paymentSchedule.schedule).toEqual(['Today', '2 weeks', '4 weeks', '6 weeks']);
            expect(data.howItWorks).toHaveLength(3);
            expect(data.howItWorks[0]).toContain('BNPL');
            expect(data.disclosureLinks).toHaveLength(2);
        });
    });

    describe('getEstimatedDelivery', () => {
        it('should return fulfillment & shipping mock data', async () => {
            const data = await adapter.getEstimatedDelivery?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.title).toBe('Fulfillment & Shipping');
            expect(data.estimatedDelivery.options).toHaveLength(3);
            expect(data.shippingOptions).toHaveLength(3);
            expect(data.shippingOptions[0].cost).toBe(5.99);
            expect(data.internationalShipping.points).toHaveLength(4);
            expect(data.orderTracking.points).toHaveLength(3);
        });
    });

    describe('getProductDescription', () => {
        it('should return product description with intro and features', async () => {
            const data = await adapter.getProductDescription?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.heading).toBe('Description');
            expect(data.intro).toContain('premium leather');
            expect(data.features).toHaveLength(5);
        });
    });

    describe('getIngredientsData', () => {
        it('should return ingredients & materials list', async () => {
            const data = await adapter.getIngredientsData?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.heading).toBe('Ingredients & Materials');
            expect(data.items).toHaveLength(4);
        });
    });

    describe('getUsageInstructions', () => {
        it('should return usage instructions content', async () => {
            const data = await adapter.getUsageInstructions?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.heading).toBe('Usage Instructions');
            expect(data.content).toContain('leather');
        });
    });

    describe('getCareInstructions', () => {
        it('should return care instructions list', async () => {
            const data = await adapter.getCareInstructions?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.heading).toBe('Care Instructions');
            expect(data.items).toHaveLength(4);
        });
    });

    describe('getTechSpecs', () => {
        it('should return tech specs key-value pairs', async () => {
            const data = await adapter.getTechSpecs?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.heading).toBe('Technical Specs');
            expect(data.specs).toHaveLength(4);
            expect(data.specs.find((s) => s.key === 'Heel Height')?.value).toBe('1.5 inches');
        });
    });

    describe('getReviews', () => {
        it('should return reviews with summary and 2 review items', async () => {
            const data = await adapter.getReviews?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.heading).toBe('Customer Reviews');
            expect(data.subtitle).toBe('2 reviews for Pure Cube');
            expect(data.summary.averageRating).toBe(4.5);
            expect(data.summary.totalCount).toBe(2);
            expect(data.reviews).toHaveLength(2);
            expect(data.reviews[0].authorName).toBe('Name A.');
            expect(data.reviews[0].headline).toBe('Excellent quality');
        });
    });

    describe('getWriteReviewForm', () => {
        it('should return write review form config without name or email fields', async () => {
            const data = await adapter.getWriteReviewForm?.();
            expect(data).toBeDefined();
            if (!data) return;
            expect(data.title).toBe('Write a Review');
            expect(data.overallRating.label).toBe('Overall Rating');
            expect(data.reviewBody.minCharacters).toBe(50);
            expect(data.recommend.yesLabel).toBe('Yes');
            expect(data.submitLabel).toBe('Submit Review');
            expect(data).not.toHaveProperty('name');
            expect(data).not.toHaveProperty('email');
        });
    });

    describe('mockDelay', () => {
        it('should respect mockDelay configuration', async () => {
            const slowAdapter = createProductContentMockAdapter({ enabled: true, mockDelay: 100 });
            const start = Date.now();
            await slowAdapter.getSizeGuide?.();
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(95); // allow small tolerance for timer precision
        });
    });

    describe('productId parameter', () => {
        it('should return same size guide data with or without productId', async () => {
            const dataWithId = await adapter.getSizeGuide?.('25591227M');
            expect(dataWithId).toBeDefined();
            if (!dataWithId) return;
            expect(dataWithId.subtitle).toBe('Find your perfect fit');

            const dataWithoutId = await adapter.getSizeGuide?.();
            expect(dataWithoutId).toBeDefined();
            if (!dataWithoutId) return;
            expect(dataWithoutId.subtitle).toBe('Find your perfect fit');
        });
    });
});
