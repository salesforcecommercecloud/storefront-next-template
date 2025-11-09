/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { useToast } from '@/components/toast';
import uiStrings from '@/temp-ui-string';

/**
 * Type definition for action response
 */
export type ActionResponse = {
    success: boolean;
    error?: string;
    [key: string]: unknown;
};

/**
 * Action handler configuration
 */
export interface ActionHandler {
    /** Action route URL */
    actionRoute: string;
    /** Build FormData from action parameters */
    buildFormData: (params: Record<string, unknown>) => FormData;
    /** Handle successful response */
    handleSuccess: (
        result: ActionResponse,
        params: Record<string, unknown>,
        addToast: ReturnType<typeof useToast>['addToast']
    ) => void;
    /** Handle error response */
    handleError: (
        result: ActionResponse,
        params: Record<string, unknown>,
        addToast: ReturnType<typeof useToast>['addToast']
    ) => void;
}

/**
 * Action registry - maps action names to their handlers
 * Extend this to support new actions (e.g., addToCart, etc.)
 *
 * This registry is lazy-loaded to avoid bundling it in the initial page load.
 * It's only loaded when there's actually a pending action to execute.
 */
export const actionRegistry: Record<string, ActionHandler> = {
    addToWishlist: {
        actionRoute: '/action/wishlist-add',
        buildFormData: (params) => {
            const formData = new FormData();
            if (params.productId) {
                formData.append('productId', String(params.productId));
            }
            return formData;
        },
        handleSuccess: (result, _params, addToast) => {
            if ((result as { alreadyInWishlist?: boolean }).alreadyInWishlist) {
                addToast(uiStrings.product.itemAlreadyInWishlist, 'info');
            } else {
                addToast(uiStrings.product.addedToWishlistGeneric, 'success');
            }
        },
        handleError: (result, _params, addToast) => {
            if (result.error) {
                addToast(result.error, 'error');
            }
        },
    },
    // Add more actions here, e.g.:
    // addToCart: { ... },
};
