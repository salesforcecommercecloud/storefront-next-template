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
import { type ReactElement, useCallback, useMemo, useState } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useProductFetcher } from '@/hooks/product/use-product-fetcher';
import { useModalStateReset } from '@/hooks/use-modal-state-reset';
import { useProductImages } from '@/hooks/product/use-product-images';
import { isProductBundle, isProductSet } from '@/lib/product-utils';
import { CartItemModalView } from './view';
import type { CartItemModalProps } from './types';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { usePickup } from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

interface CartItemModalEditContainerProps extends CartItemModalProps {
    product: ShopperProducts.schemas['Product'];
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
    const [currentProduct, setCurrentProduct] = useState<ShopperProducts.schemas['Product'] | null>(product);
    const [variationValues, setVariationValues] = useState<Record<string, string>>(product.variationValues || {});
    const { t } = useTranslation('editItem');

    useModalStateReset({
        open,
        onReset: useCallback(() => {
            setCurrentProduct(product);
            setVariationValues(product.variationValues || {});
        }, [product]),
        resetOn: 'open',
    });

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const pickupContext = usePickup();
    const pickupInfo = pickupContext?.pickupBasketItems?.get(product.id ?? '');
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    const matchingVariant = useMemo(() => {
        if (!currentProduct) return undefined;
        return currentProduct.variants?.find((variant) =>
            Object.keys(variationValues).every((key) => variant.variationValues?.[key] === variationValues[key])
        );
    }, [currentProduct, variationValues]);

    const variantFetcher = useScapiFetcher('shopperProducts', 'getProduct', {
        params: {
            path: { id: matchingVariant?.productId || '' },
            query: {
                allImages: true,
                // @sfdc-extension-block-start SFDC_EXT_BOPIS
                ...(pickupInfo?.inventoryId ? { inventoryIds: [pickupInfo.inventoryId] } : {}),
                // @sfdc-extension-block-end SFDC_EXT_BOPIS
            },
        },
    });

    useProductFetcher({
        targetProductId: matchingVariant?.productId,
        fetcher: variantFetcher,
        currentProductId: currentProduct?.id,
        onDataReceived: useCallback((p: ShopperProducts.schemas['Product']) => {
            setCurrentProduct((prev) => {
                if (!prev) return p;
                return {
                    ...p,
                    variants: prev.variants || p.variants,
                    variationAttributes: prev.variationAttributes || p.variationAttributes,
                };
            });
        }, []),
        enabled: open,
    });

    const handleAttributeChange = useCallback((attributeId: string, value: string) => {
        setVariationValues((prev) => {
            if (prev[attributeId] === value) return prev;
            return { ...prev, [attributeId]: value };
        });
    }, []);

    const safeProduct = currentProduct ?? ({} as ShopperProducts.schemas['Product']);
    const { galleryImages } = useProductImages({ product: safeProduct, selectedAttributes: variationValues });

    const isProductASet = currentProduct ? isProductSet(currentProduct) : false;
    const isProductABundle = currentProduct ? isProductBundle(currentProduct) : false;

    const handleCloseModal = useCallback(() => {
        onOpenChange?.(false);
    }, [onOpenChange]);

    return (
        <CartItemModalView
            open={open}
            onOpenChange={onOpenChange}
            dialogTitle={t('title')}
            isLoading={false}
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
