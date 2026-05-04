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
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useProductImages } from '@/hooks/product/use-product-images';
import { isProductBundle, isProductSet } from '@/lib/product-utils';
import { CartItemModalView } from './view';
import type { CartItemModalProps } from './types';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { usePickup } from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

type Product = ShopperProducts.schemas['Product'];

interface CartItemModalEditContainerProps extends CartItemModalProps {
    product: Product;
    itemId: string;
}

export function CartItemModalEditContainer({
    product,
    itemId,
    onOpenChange,
    initialQuantity = 1,
    onBuyNow,
    open = false,
}: CartItemModalEditContainerProps): ReactElement {
    const { t } = useTranslation('editItem');

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const pickupContext = usePickup();
    const pickupInfo = pickupContext?.pickupBasketItems?.get(product.id ?? '');
    const inventoryIds = pickupInfo?.inventoryId ? [pickupInfo.inventoryId] : undefined;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    const productId = product.id ?? '';

    const [variationValues, setVariationValues] = useState<Record<string, string>>(product.variationValues ?? {});

    useEffect(() => {
        if (open) {
            setVariationValues(product.variationValues ?? {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const fullProductFetcher = useScapiFetcher('shopperProducts', 'getProduct', {
        params: {
            path: { id: productId },
            query: {
                allImages: true,
                expand: [
                    'variations',
                    'availability',
                    'images',
                    'prices',
                    'promotions',
                    'set_products',
                    'bundled_products',
                ],
                // @sfdc-extension-block-start SFDC_EXT_BOPIS
                ...(inventoryIds ? { inventoryIds } : {}),
                // @sfdc-extension-block-end SFDC_EXT_BOPIS
            },
        },
    });

    useEffect(() => {
        if (open && fullProductFetcher.state === 'idle' && !fullProductFetcher.data) {
            void fullProductFetcher.load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, fullProductFetcher.state, fullProductFetcher.data]);

    const fullProduct: Product = fullProductFetcher.data ?? product;

    const matchingVariant = useMemo(() => {
        if (!fullProduct.variants) return undefined;
        return fullProduct.variants.find((variant) =>
            Object.keys(variationValues).every((key) => variant.variationValues?.[key] === variationValues[key])
        );
    }, [fullProduct, variationValues]);

    const variantProductId = matchingVariant?.productId;
    const needsVariantFetch = !!variantProductId && variantProductId !== productId;

    const variantFetcher = useScapiFetcher('shopperProducts', 'getProduct', {
        params: {
            path: { id: needsVariantFetch ? variantProductId : '' },
            query: {
                allImages: true,
                expand: ['availability', 'images', 'prices', 'promotions'],
                // @sfdc-extension-block-start SFDC_EXT_BOPIS
                ...(inventoryIds ? { inventoryIds } : {}),
                // @sfdc-extension-block-end SFDC_EXT_BOPIS
            },
        },
    });

    useEffect(() => {
        if (
            open &&
            needsVariantFetch &&
            variantFetcher.state === 'idle' &&
            variantFetcher.data?.id !== variantProductId
        ) {
            void variantFetcher.load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, needsVariantFetch, variantFetcher.state, variantFetcher.data?.id, variantProductId]);

    const variantData =
        needsVariantFetch && variantFetcher.data?.id === variantProductId ? variantFetcher.data : undefined;

    const currentProduct: Product = useMemo(() => {
        if (!variantData) return fullProduct;
        return {
            ...fullProduct,
            ...variantData,
            id: fullProduct.id,
            variants: fullProduct.variants,
            variationAttributes: fullProduct.variationAttributes,
        };
    }, [fullProduct, variantData]);

    const isLoading = !fullProductFetcher.data && fullProductFetcher.state !== 'idle';

    const handleAttributeChange = useCallback((attributeId: string, value: string) => {
        setVariationValues((prev) => {
            if (prev[attributeId] === value) return prev;
            return { ...prev, [attributeId]: value };
        });
    }, []);

    const { galleryImages } = useProductImages({ product: currentProduct, selectedAttributes: variationValues });

    const isProductASet = isProductSet(currentProduct);
    const isProductABundle = isProductBundle(currentProduct);

    const handleCloseModal = useCallback(() => {
        onOpenChange?.(false);
    }, [onOpenChange]);

    return (
        <CartItemModalView
            open={open}
            onOpenChange={onOpenChange}
            dialogTitle={t('title')}
            isLoading={isLoading}
            hasError={false}
            retryLabel={t('retry')}
            loadingLabel={t('loadingProduct')}
            loadErrorLabel={t('loadError')}
            mode="edit"
            currentProduct={currentProduct}
            initialQuantity={initialQuantity}
            itemId={itemId}
            matchingVariant={matchingVariant}
            variationValues={variationValues}
            onAttributeChange={handleAttributeChange}
            galleryImages={galleryImages}
            isProductASet={isProductASet}
            isProductABundle={isProductABundle}
            onBeforeCartAction={handleCloseModal}
            onBuyNow={onBuyNow}
        />
    );
}
