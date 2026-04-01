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
    FaqQuestionsData,
    HtmlContent,
    IngredientsData,
    ProductDescriptionData,
    ReturnsAndWarrantyData,
    ReviewItem,
    ReviewsData,
    ReviewsSummaryData,
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
     * Get FAQ questions for the "Ask assistant" collapsible section on PDP
     */
    getFaqQuestions?(productId?: string): Promise<FaqQuestionsData>;

    /**
     * Get lightweight reviews summary for accordion header (count, rating, distribution, AI summary).
     * Use this on mount so the header can show without loading the full review list.
     */
    getReviewsSummary?(productId?: string): Promise<ReviewsSummaryData>;

    /**
     * Get full customer reviews list for PDP reviews section (cards, filters, pagination).
     * Lazy-load when user expands the accordion.
     */
    getReviews?(productId?: string): Promise<ReviewsData>;

    /**
     * Submit a new review for a product (e.g. from Write a Review modal).
     * Optional; when implemented, getReviews may return the new review on subsequent fetches.
     */
    addReview?(productId?: string, review?: ReviewItem): Promise<void>;

    /**
     * Get Write a Review form config for PDP (submit review modal). Excludes name and email.
     */
    getWriteReviewForm?(productId?: string): Promise<WriteReviewFormData>;

    /**
     * Get shipping estimates for a product to a destination zipcode
     */
    getShippingEstimates?(productId?: string, zipcode?: string): Promise<ShippingEstimate>;
}

/**
 * Union of ProductContentAdapter method names whose return type is Promise<HtmlContent>.
 * Automatically stays in sync as the adapter interface evolves — no manual string union to maintain.
 *
 * Required<> strips the optional ? marker from each property so the extends check matches
 * the function type rather than `functionType | undefined`.
 */
export type HtmlContentAdapterMethod = {
    [K in keyof ProductContentAdapter]-?: Required<ProductContentAdapter>[K] extends (
        productId?: string
    ) => Promise<HtmlContent>
        ? K
        : never;
}[keyof ProductContentAdapter];
