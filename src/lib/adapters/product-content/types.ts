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
    ProductDescriptionData,
    ReviewItem,
    ReviewsData,
    ReviewsSummaryData,
    SizeGuideData,
    WriteReviewFormData,
} from './data-types';

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
     * Get product description for PDP (intro paragraph + features)
     */
    getProductDescription?(productId?: string): Promise<ProductDescriptionData>;

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
}
