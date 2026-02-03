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

import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { ToastType } from '@/components/toast';
import { getTranslation } from '@/lib/i18next';
import { getFirstPickupStoreId } from '@/extensions/bopis/lib/basket-utils';

/**
 * Validates if adding a new item with pickup/delivery option is compatible with existing basket items.
 *
 * This function checks for conflicts when adding items to the cart:
 * - Cannot add pickup item from a different store if basket already has pickup items
 *
 * If validation fails, an error toast is shown and the function returns false.
 *
 * @param basket - Current basket
 * @param newStoreId - Store ID for the new item (null for delivery items)
 * @param addToast - Toast function to show error messages
 * @returns true if validation passes, false if validation fails (toast shown)
 */
export function isSelectedDeliveryOptionValid(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined,
    newStoreId: string | null,
    addToast: (message: string, type: ToastType) => void
): boolean {
    // Skip validation if basket is empty or has no product items
    if (!basket || !basket.productItems) {
        return true;
    }

    const { t } = getTranslation();
    const existingStoreId = getFirstPickupStoreId(basket);

    // Cannot add pickup item from a different store
    if (newStoreId && existingStoreId && newStoreId !== existingStoreId) {
        addToast(t('extBopis:cart.addToCartValidation.changeStoreError'), 'error');
        return false;
    }

    return true;
}
