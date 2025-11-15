/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Converts a ShopperProducts.schemas['Product'] to ShopperSearch.schemas['ProductSearchHit'] format
 * This allows ProductTile and ProductGrid components to work with Product objects from wishlist
 */
export function convertProductToProductSearchHit(
    product: ShopperProducts.schemas['Product']
): ShopperSearch.schemas['ProductSearchHit'] {
    // Get the first image group's first image for the main image
    const firstImageGroup = product.imageGroups?.[0];
    const firstImage = firstImageGroup?.images?.[0];

    return {
        productId: product.id || product.productId || '',
        productName: product.name || product.productName || '',
        price: product.price || product.priceMax || 0,
        currency: product.currency || 'USD',
        image: firstImage
            ? {
                  disBaseLink: firstImage.disBaseLink,
                  link: firstImage.link,
                  alt: firstImage.alt || product.name || '',
              }
            : undefined,
        imageGroups: product.imageGroups,
        variationAttributes: product.variationAttributes,
        variants: product.variationAttributes
            ? product.variationAttributes.map((attr) => ({
                  productId: product.id || '',
                  variationValues: attr.values?.reduce(
                      (acc, val) => {
                          if (attr.id && val.value) {
                              acc[attr.id] = val.value;
                          }
                          return acc;
                      },
                      {} as Record<string, string>
                  ),
              }))
            : undefined,
        inStock: product.inventory?.available !== undefined ? product.inventory.available > 0 : true,
        // Additional properties that ProductSearchHit might have
        promotions: [],
        customProperties: product.customProperties,
    };
}
