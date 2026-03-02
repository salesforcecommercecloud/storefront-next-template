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
 * @fileoverview Shipping Multi-Address Component
 *
 * This component provides a checkout step that allows customers to assign different
 * shipping addresses to individual items in their basket. It displays each product
 * item with its details (image, name, variations, quantity, price) and provides
 * a dropdown to select a shipping address for each item.
 *
 * Features:
 * - Displays enriched product items with catalog data (images, variations)
 * - Allows per-item shipping address selection
 * - Consolidates available addresses from basket shipments and customer profile
 * - Supports toggling between multi-address and single-address shipping modes
 * - Integrates with the checkout flow via ToggleCard component
 *
 * @module ShippingMultiAddress
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { ShopperBasketsV2, ShopperCustomers, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import {
    getDisplayVariationValues,
    getEnrichedProducts,
    convertProductsByItemIdToProductId,
    type EnrichedProductItem,
} from '@/lib/product-utils';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { useBasket } from '@/providers/basket';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import { NativeSelect } from '@/components/ui/native-select';
import CurrentPrice from '@/components/product-price/current-price';
import { getPriceData } from '@/components/product-price/utils';
import { ProductItemVariantImage } from '@/components/product-item';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/providers/currency';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import {
    consolidateAddresses,
    updateItemAddresses,
    initializeItemAddresses,
} from '@/extensions/multiship/lib/multi-address';
import { getAddressKey } from '@/extensions/multiship/lib/address-utils';
import { formatAddress } from '@/lib/address-utils';
import { AddAddressDialog } from '@/extensions/multiship/components/checkout/add-address-dialog';
import { useCheckoutContext } from '@/hooks/use-checkout';
import type { CheckoutActionData } from '@/components/checkout/types';
import CheckoutErrorBanner from '@/components/checkout/components/checkout-error-banner';
import { getCheckoutDisplayError } from '@/components/checkout/components/checkout-display-error';

/**
 * Props for the ShippingMultiAddress component.
 *
 * @interface ShippingMultiAddressProps
 * @property {boolean} isLoading - Whether the component is currently loading
 * @property {boolean} isEditing - Whether the component is currently in editing mode
 * @property {Record<string, ShopperProducts.schemas['Product']>} [productMap] - Map of item IDs to full product catalog data for enriching display
 * @property {(item: ShopperBasketsV2.schemas['ProductItem']) => boolean} isDeliveryProductItem - Filter function to determine which product items should be included
 * @property {ShopperBasketsV2.schemas['Shipment'][]} deliveryShipments - Array of delivery shipments
 * @property {() => void} handleToggleShippingAddressMode - Callback function to toggle between multi-address and single-address shipping modes
 * @property {() => void} onEdit - Callback function invoked when the user clicks to edit the shipping addresses
 * @property {(formData: FormData) => void} onSubmit - Callback function to submit the form data
 */
interface ShippingMultiAddressProps {
    /** Whether the component is currently loading */
    isLoading: boolean;
    /** Whether the component is currently in editing mode */
    isEditing: boolean;
    /** Action data containing form errors or validation results from the server */
    actionData?: CheckoutActionData;
    /** Map of item IDs to full product catalog data for enriching display */
    productMap?: Record<string, ShopperProducts.schemas['Product']>;
    /** Filter function to determine which product items should be included */
    isDeliveryProductItem: (item: ShopperBasketsV2.schemas['ProductItem']) => boolean;
    /** Array of delivery shipments */
    deliveryShipments: ShopperBasketsV2.schemas['Shipment'][];
    /** Callback function to toggle between multi-address and single-address shipping modes */
    handleToggleShippingAddressMode: () => void;
    /** Callback function invoked when the user clicks to edit the shipping addresses */
    onEdit: () => void;
    /** Callback function to submit the form data */
    onSubmit: (formData: FormData) => void;
    /** Whether this checkout step has been completed (step state managed by container) */
    isCompleted?: boolean;
    /** Whether there are multiple unique delivery addresses (computed by parent from distribution) */
    hasMultipleDeliveryAddresses?: boolean;
}

/**
 * Determines if multiship summary message to be displayed.
 * Only shows when:
 * 1. There are multiple shipments with addresses
 * 2. Step is completed
 * 3. There are multiple unique addresses assigned
 */
function showMultipleLocationsMessage(
    deliveryShipments: ShopperBasketsV2.schemas['Shipment'][],
    isCompleted: boolean | undefined,
    hasMultipleDeliveryAddresses: boolean | undefined
): boolean {
    if (!deliveryShipments || deliveryShipments.length <= 1) {
        return false;
    }
    // i.e addresses assigned
    if (!isCompleted) {
        return false;
    }
    return hasMultipleDeliveryAddresses === true;
}

/**
 * ShippingMultiAddress Component
 *
 * A checkout step component that enables customers to assign different shipping
 * addresses to individual items in their basket. Each product item is displayed
 * with its image, name, variation attributes, quantity, and price, along with
 * a dropdown to select a shipping address.
 *
 * The component manages the state of address assignments per item and provides
 * functionality to:
 * - Initialize addresses from existing basket shipments
 * - Consolidate available addresses from basket and customer profile
 * - Allow users to select different addresses for each item
 * - Toggle between multi-address and single-address shipping modes
 *
 * @param {ShippingMultiAddressProps} props - Component props
 * @param {boolean} props.isLoading - Whether the component is currently loading
 * @param {boolean} props.isEditing - Whether the component is in editing mode
 * @param {CheckoutActionData} [props.actionData] - Action data containing form errors or validation results from the server
 * @param {Record<string, ShopperProducts.schemas['Product']>} [props.productMap] - Map of item IDs to product catalog data
 * @param {(item: ShopperBasketsV2.schemas['ProductItem']) => boolean} props.isDeliveryProductItem - Filter function to determine which product items should be included
 * @param {ShopperBasketsV2.schemas['Shipment'][]} props.deliveryShipments - Array of delivery shipments
 * @param {() => void} props.handleToggleShippingAddressMode - Callback to toggle shipping address mode
 * @param {() => void} props.onEdit - Callback when edit is triggered
 * @param {(formData: FormData) => void} props.onSubmit - Callback function to submit the form data
 *
 * @returns {React.JSX.Element} The rendered ShippingMultiAddress component
 *
 * @example
 * ```tsx
 * <ShippingMultiAddress
 *   isLoading={false}
 *   isEditing={true}
 *   actionData={actionData}
 *   isDeliveryProductItem={(item) => item.shipmentId !== undefined}
 *   deliveryShipments={deliveryShipments}
 *   productMap={productCatalogMap}
 *   handleToggleShippingAddressMode={() => setMode('single')}
 *   onEdit={() => setEditing(true)}
 *   onSubmit={(formData) => handleSubmit(formData)}
 * />
 * ```
 */
export default function ShippingMultiAddress({
    isLoading,
    isEditing,
    actionData,
    productMap,
    isDeliveryProductItem,
    deliveryShipments,
    handleToggleShippingAddressMode,
    onEdit,
    onSubmit,
    isCompleted,
    hasMultipleDeliveryAddresses,
}: ShippingMultiAddressProps) {
    const cart = useBasket();
    // Get currency from context (automatically derived from locale)
    const currency = useCurrency();
    const { t: tMultiship } = useTranslation('extMultiship');
    const customerProfile = useCustomerProfile();
    const { savedAddresses, setSavedAddresses, productItemAddresses, setProductItemAddresses } = useCheckoutContext();
    const shippingFormError = getCheckoutDisplayError(actionData, 'shippingAddress');

    // Skip expensive computation when not editing
    const productItems = useMemo(() => {
        if (!isEditing) return [];
        return cart?.productItems?.filter(isDeliveryProductItem);
    }, [isEditing, cart?.productItems, isDeliveryProductItem]);

    // Get consolidated addresses first
    const consolidatedAddresses = useMemo(() => {
        if (!isEditing) return [];
        return consolidateAddresses({
            basket: cart,
            customerProfile,
            deliveryShipments,
            savedAddresses,
        });
    }, [isEditing, cart, customerProfile, deliveryShipments, savedAddresses]);

    // Initialize item addresses from basket shipments and checkout context
    const initialItemAddresses = useMemo(() => {
        if (!isEditing) return new Map();
        return initializeItemAddresses(consolidatedAddresses, productItems, deliveryShipments, productItemAddresses);
    }, [isEditing, consolidatedAddresses, productItems, deliveryShipments, productItemAddresses]);

    // Track selected addresses for each item
    const [itemAddresses, setItemAddresses] =
        useState<Map<string, ShopperCustomers.schemas['CustomerAddress']>>(initialItemAddresses);

    // Update item addresses when basket or customer profile changes
    useEffect(() => {
        setItemAddresses(initialItemAddresses);
    }, [initialItemAddresses]);

    const [addAddressDialogOpen, setAddAddressDialogOpen] = useState(false);
    const [currentItemId, setCurrentItemId] = useState<string | undefined>(undefined);

    // Enrich items with imageGroups from product catalog data using productMap
    const itemsToDisplay: EnrichedProductItem[] = useMemo(() => {
        if (!isEditing) return [];
        if (productMap && productItems) {
            // Convert productMap from itemId-keyed to productId-keyed
            const productsByProductId = convertProductsByItemIdToProductId(productMap);
            return getEnrichedProducts(productsByProductId, productItems);
        }
        return productItems || [];
    }, [isEditing, productMap, productItems]);

    // Remember all addresses that have ever been in itemAddresses
    const rememberedAddresses = useRef<Map<string, ShopperCustomers.schemas['CustomerAddress']>>(new Map());

    // Get consolidated addresses for selection
    const availableAddresses = useMemo(() => {
        if (!isEditing) return [];

        // Include remembered addresses with consolidated addresses
        const rememberedAddressesArray = Array.from(rememberedAddresses.current.values());
        const allAddresses = [...consolidatedAddresses, ...rememberedAddressesArray];

        return updateItemAddresses({
            itemAddresses,
            consolidatedAddresses: allAddresses,
        });
    }, [isEditing, itemAddresses, consolidatedAddresses]);

    const handleAddressSelect = (itemId: string, addressId: string) => {
        const selectedAddress = availableAddresses.find((addr) => addr.addressId === addressId);
        if (selectedAddress) {
            setItemAddresses((prev) => {
                const newMap = new Map(prev);
                newMap.set(itemId, selectedAddress);
                return newMap;
            });
        }
    };

    // Handle form submission
    const handleSubmitShippingMultiAddress = (e: React.FormEvent) => {
        e.preventDefault();

        // Save addresses and product item addresses to checkout context
        setSavedAddresses(availableAddresses);
        setProductItemAddresses?.(new Map(itemAddresses));

        // Validate that all items have addresses selected
        const hasMissingAddresses = itemsToDisplay.some((item) => item.itemId && !itemAddresses.has(item.itemId));

        if (hasMissingAddresses) {
            toast.error(tMultiship('checkout.missingAddresses'));
            return;
        }

        // Group items by address (address -> items map)
        const addressToItemsMap = new Map<
            string,
            { address: ShopperCustomers.schemas['CustomerAddress']; itemIds: string[] }
        >();

        itemAddresses.forEach((customerAddress, itemId) => {
            // Create address key for grouping by address
            const addressKey = getAddressKey(customerAddress);

            // Get or create address group
            let addressGroup = addressToItemsMap.get(addressKey);
            if (!addressGroup) {
                addressGroup = {
                    address: customerAddress, // Keep as CustomerAddress
                    itemIds: [],
                };
                addressToItemsMap.set(addressKey, addressGroup);
            }
            addressGroup.itemIds.push(itemId);
        });

        // Convert Map to object for JSON serialization
        const addressToItems: Record<
            string,
            { address: ShopperCustomers.schemas['CustomerAddress']; itemIds: string[] }
        > = {};
        addressToItemsMap.forEach((value, addressKey) => {
            addressToItems[addressKey] = value;
        });

        // Extract shipment IDs from deliveryShipments
        const deliveryShipmentIds = deliveryShipments.map((shipment) => shipment.shipmentId);

        // Create FormData with JSON payload
        const formData = new FormData();
        formData.append('isMultiShip', 'true');
        formData.append('addresses', JSON.stringify(addressToItems));
        formData.append('deliveryShipmentIds', JSON.stringify(deliveryShipmentIds));

        // Submit the form
        onSubmit(formData);
    };

    // Handle adding new address to each product item
    const handleAddAddress = (newAddress: ShopperCustomers.schemas['CustomerAddress']) => {
        // Remember the new address
        const addressKey = getAddressKey(newAddress);
        rememberedAddresses.current.set(addressKey, newAddress);

        // If currentItemId is set, assign the address to that item
        if (currentItemId) {
            setItemAddresses((prev) => {
                const newMap = new Map(prev);
                newMap.set(currentItemId, newAddress);
                return newMap;
            });

            // Update all items to have the new address if item is not assigned to any addresses yet
            itemsToDisplay.forEach((item) => {
                const itemId = item.itemId;
                if (itemId && !itemAddresses.has(itemId)) {
                    setItemAddresses((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(itemId, newAddress);
                        return newMap;
                    });
                }
            });

            setCurrentItemId(undefined);
        }
    };

    // Handle opening AddAddressDialog for a specific item
    const handleOpenAddAddressDialog = (itemId: string) => () => {
        if (!itemId) return;
        setCurrentItemId(itemId);
        setAddAddressDialogOpen(true);
    };

    // Handle saving addresses to context before toggling to single-address mode
    const handleToggleShippingAddressModeToSingleAddress = () => {
        // Save addresses and product item addresses to checkout context
        setSavedAddresses(availableAddresses);
        setProductItemAddresses?.(new Map(itemAddresses));

        handleToggleShippingAddressMode();
    };

    const stepTitle = (
        <span className="text-lg font-semibold text-foreground">
            {tMultiship('checkout.shippingMultiAddressTitle')}
        </span>
    );

    return (
        <>
            <ToggleCard
                id="shipping-multi-address"
                // @ts-expect-error - ToggleCard title prop type issue
                title={stepTitle}
                editing={isEditing}
                onEdit={onEdit}
                editLabel={tMultiship('checkout.edit')}
                editAction={tMultiship('checkout.shipItemsToOneAddress')}
                onEditActionClick={handleToggleShippingAddressModeToSingleAddress}>
                <ToggleCardEdit>
                    <form onSubmit={handleSubmitShippingMultiAddress} className="space-y-4">
                        {shippingFormError && <CheckoutErrorBanner message={shippingFormError} />}
                        {actionData?.fieldErrors && (
                            <div className="space-y-2">
                                {Object.entries(actionData.fieldErrors).map(([field, error]) => (
                                    <CheckoutErrorBanner key={field} message={error} />
                                ))}
                            </div>
                        )}
                        {itemsToDisplay.map((productItem, index) => {
                            const quantity = productItem.quantity ?? 1;
                            const displayVariationValues = getDisplayVariationValues(
                                productItem?.variationAttributes,
                                productItem?.variationValues
                            );
                            const priceData = getPriceData(productItem as ShopperProducts.schemas['Product'], {
                                quantity,
                            });
                            const currentPrice = priceData.currentPrice;

                            return (
                                <div
                                    key={productItem?.itemId || `item-${index}`}
                                    className="flex flex-col gap-6 p-6 border rounded-xl" // Added padding and border to match the card look
                                    data-testid={`sf-product-item-summary-${productItem?.productId || productItem?.id}`}>
                                    <div className="flex gap-4 items-start">
                                        <ProductItemVariantImage
                                            productItem={productItem}
                                            className="w-24 h-24 rounded-lg bg-muted"
                                        />

                                        <div className="flex-1">
                                            <Typography variant="h3" className="font-bold text-lg mb-1">
                                                {productItem?.productName}
                                            </Typography>
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                {Object.entries(displayVariationValues).map(([name, value]) => (
                                                    <div key={name}>
                                                        {name}: {value}
                                                    </div>
                                                ))}
                                                <div>
                                                    {tMultiship('checkout.quantity')}: {quantity}
                                                </div>
                                            </div>
                                        </div>

                                        <Typography variant="h3" className="font-bold text-lg">
                                            <CurrentPrice
                                                price={currentPrice}
                                                currency={currency as string}
                                                className="text-foreground text-lg font-bold"
                                            />
                                        </Typography>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Typography
                                            variant="small"
                                            className="text-sm font-medium text-foreground"
                                            id={`delivery-address-label-${productItem?.itemId || index}`}>
                                            {tMultiship('checkout.deliveryAddressLabel')}*
                                        </Typography>

                                        <NativeSelect
                                            className="w-full h-9 text-sm"
                                            value={
                                                productItem?.itemId
                                                    ? itemAddresses.get(productItem.itemId)?.addressId || ''
                                                    : ''
                                            }
                                            onChange={(e) => {
                                                if (productItem?.itemId) {
                                                    handleAddressSelect(productItem.itemId, e.target.value);
                                                }
                                            }}
                                            id={`delivery-address-select-${productItem?.itemId || index}`}
                                            data-testid={`delivery-address-select-${productItem?.itemId || index}`}>
                                            <option value="" disabled>
                                                {availableAddresses.length > 0
                                                    ? tMultiship('checkout.selectAddress')
                                                    : tMultiship('checkout.noAddressAvailable')}
                                            </option>
                                            {availableAddresses.map((address) => (
                                                <option key={address.addressId} value={address.addressId}>
                                                    {formatAddress(address).fullAddress}
                                                </option>
                                            ))}
                                        </NativeSelect>

                                        <button
                                            type="button"
                                            onClick={handleOpenAddAddressDialog(productItem?.itemId ?? '')}
                                            className="flex items-center gap-1 text-primary font-semibold text-sm mt-1 hover:underline text-left w-fit">
                                            + {tMultiship('checkout.addNewAddress')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                size="lg"
                                className="min-w-56 h-12 text-base font-semibold">
                                {isLoading ? tMultiship('checkout.submitting') : tMultiship('checkout.continue')}
                            </Button>
                        </div>
                    </form>
                </ToggleCardEdit>
                <ToggleCardSummary>
                    <div className="space-y-2">
                        {showMultipleLocationsMessage(deliveryShipments, isCompleted, hasMultipleDeliveryAddresses) && (
                            <Typography variant="small" className="text-muted-foreground">
                                {tMultiship('checkout.shippingToMultipleLocations')}
                            </Typography>
                        )}
                    </div>
                </ToggleCardSummary>
            </ToggleCard>

            <AddAddressDialog
                open={addAddressDialogOpen}
                onOpenChange={setAddAddressDialogOpen}
                onSave={handleAddAddress}
                hideAddressId={!customerProfile?.customer?.customerId}
            />
        </>
    );
}
