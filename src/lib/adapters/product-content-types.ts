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
 * Product Content Adapter Interface
 *
 * All methods are optional to allow separate service implementations later.
 * Data for PDP modals may come from different APIs (e.g. product API).
 * Implementations (e.g. mock or product API) can provide any subset of methods.
 */
export interface ProductContentAdapter {
    /**
     * Get size guide content for PDP modal
     */
    getSizeGuide?(productId?: string): Promise<unknown>;

    /**
     * Get returns and warranty content for PDP modal
     */
    getReturnsAndWarranty?(productId?: string): Promise<unknown>;

    /**
     * Get message content for Buy Now Pay Later (BNPL) component
     */
    getBuyNowPayLaterMessageContent?(productId?: string): Promise<unknown>;

    /**
     * Get learn more section content for Buy Now Pay Later (BNPL) component
     */
    getBuyNowPayLaterLearnMoreContent?(productId?: string): Promise<unknown>;

    /**
     * Get estimated delivery content for PDP
     */
    getEstimatedDelivery?(productId?: string): Promise<unknown>;

    /**
     * Get ingredients data for collapsible content on PDP
     */
    getIngredientsData?(productId?: string): Promise<unknown>;

    /**
     * Get usage instructions for collapsible content on PDP
     */
    getUsageInstructions?(productId?: string): Promise<unknown>;

    /**
     * Get care instructions for collapsible content on PDP
     */
    getCareInstructions?(productId?: string): Promise<unknown>;

    /**
     * Get tech specs for collapsible content on PDP
     */
    getTechSpecs?(productId?: string): Promise<unknown>;

    /**
     * Get shipping estimates content for PDP
     */
    getShippingEstimates?(productId?: string): Promise<unknown>;
}
