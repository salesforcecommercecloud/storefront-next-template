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
import type {
    BuyNowPayLaterLearnMoreData,
    BuyNowPayLaterMessageData,
    CareInstructionsData,
    EstimatedDeliveryData,
    IngredientsData,
    ProductDescriptionData,
    ReturnsAndWarrantyData,
    ReviewsData,
    ShippingEstimate,
    SizeGuideData,
    TechSpecsData,
    UsageInstructionsData,
    WriteReviewFormData,
} from './product-content-data-types';

/**
 * Product Content Adapter Interface
 *
 * All methods are optional to allow separate service implementations later.
 * Data for PDP modals may come from different APIs (e.g. product API).
 * Implementations (e.g. mock or product API) can provide any subset of methods.
 *
 * @example
 * ```typescript
 * // Implement only the methods you need
 * export const myAdapter: ProductContentAdapter = {
 *   getSizeGuide: async (productId) => {
 *     const data = await fetchFromAPI(productId);
 *     return transformToSizeGuideData(data);
 *   },
 * };
 * ```
 */
export interface ProductContentAdapter {
    /**
     * Get size guide content for PDP modal
     */
    getSizeGuide?(productId?: string): Promise<SizeGuideData>;

    /**
     * Get returns and warranty content for PDP modal
     */
    getReturnsAndWarranty?(productId?: string): Promise<ReturnsAndWarrantyData>;

    /**
     * Get message content for Buy Now Pay Later (BNPL) component
     */
    getBuyNowPayLaterMessageContent?(productId?: string): Promise<BuyNowPayLaterMessageData>;

    /**
     * Get learn more section content for Buy Now Pay Later (BNPL) component
     */
    getBuyNowPayLaterLearnMoreContent?(productId?: string): Promise<BuyNowPayLaterLearnMoreData>;

    /**
     * Get estimated delivery content for PDP (Fulfillment & Shipping modal)
     */
    getEstimatedDelivery?(productId?: string): Promise<EstimatedDeliveryData>;

    /**
     * Get product description for PDP (intro paragraph + features)
     */
    getProductDescription?(productId?: string): Promise<ProductDescriptionData>;

    /**
     * Get ingredients/materials data for collapsible content on PDP
     */
    getIngredientsData?(productId?: string): Promise<IngredientsData>;

    /**
     * Get usage instructions for collapsible content on PDP
     */
    getUsageInstructions?(productId?: string): Promise<UsageInstructionsData>;

    /**
     * Get care instructions for collapsible content on PDP
     */
    getCareInstructions?(productId?: string): Promise<CareInstructionsData>;

    /**
     * Get tech specs for collapsible content on PDP
     */
    getTechSpecs?(productId?: string): Promise<TechSpecsData>;

    /**
     * Get customer reviews for PDP reviews section
     */
    getReviews?(productId?: string): Promise<ReviewsData>;

    /**
     * Get Write a Review form config for PDP (submit review modal). Excludes name and email.
     */
    getWriteReviewForm?(productId?: string): Promise<WriteReviewFormData>;

    /**
     * Get shipping estimates for a product to a destination zipcode
     */
    getShippingEstimates?(productId?: string, zipcode?: string): Promise<ShippingEstimate>;
}
