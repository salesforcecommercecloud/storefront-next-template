/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';

interface RefineInventoryProps {
    isFilterSelected: (attributeId: string, value: string) => boolean;
    toggleFilter: (attributeId: string, value: string) => void;
}

/**
 * RefineInventory Component
 *
 * Displays a "Shop by Availability" filter that allows users to filter products
 * by availability at a selected store. Integrates with the store locator feature.
 *
 * @param isFilterSelected - Function to check if a filter is currently selected
 * @param toggleFilter - Function to toggle a filter on/off
 * @returns ReactElement
 */
export default function RefineInventory({ isFilterSelected, toggleFilter }: RefineInventoryProps) {
    const { t } = useTranslation('extBopis');

    // Get selected store info to display name and use inventoryId for filtering
    const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);
    const openStoreLocator = useStoreLocator((state) => state.open);
    const openedFromHereRef = useRef(false);

    const inventoryId = selectedStoreInfo?.inventoryId || '';
    const inventoryIdRef = useRef<string>(inventoryId);
    const isChecked = isFilterSelected('ilids', inventoryIdRef.current);

    // Update the inventory filter when the selected store changes
    useEffect(() => {
        const storeChanged = inventoryIdRef.current !== inventoryId;
        if (isChecked && storeChanged) {
            toggleFilter('ilids', inventoryId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inventoryId]);

    // Auto-apply filter when store locator closes after being opened from this component
    // Only apply if the store has actually changed
    useEffect(() => {
        // If modal was opened from here and is now closed
        if (openedFromHereRef.current) {
            openedFromHereRef.current = false;

            // Only apply filter if store changed and a store is selected
            const storeChanged = inventoryIdRef.current !== inventoryId;
            if (inventoryId && !isChecked && storeChanged) {
                toggleFilter('ilids', inventoryId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inventoryId]);

    const handleCheckboxChange = () => {
        if (inventoryId) {
            // Store is selected, toggle the filter
            toggleFilter('ilids', inventoryId);
        } else {
            // No store selected, open the store locator
            openedFromHereRef.current = true;
            openStoreLocator();
        }
    };

    const handleStoreNameClick = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openedFromHereRef.current = true;
        openStoreLocator();
    };

    const storeLinkText = selectedStoreInfo?.name || t('storeInventoryFilter.selectStore');

    return (
        <>
            <Accordion type="multiple" defaultValue={['inventory']}>
                <AccordionItem value="inventory" className="!border-b" data-testid="sf-store-inventory-filter">
                    <AccordionTrigger>{t('storeInventoryFilter.heading')}</AccordionTrigger>
                    <AccordionContent>
                        <div className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/30">
                            <Checkbox
                                id="inventory-filter"
                                checked={isChecked}
                                onCheckedChange={handleCheckboxChange}
                                aria-label={t('storeInventoryFilter.checkboxAriaLabel', { storeName: storeLinkText })}
                                data-testid="sf-store-inventory-filter-checkbox"
                                className="size-4"
                            />
                            <label
                                htmlFor="inventory-filter"
                                className="text-sm font-medium leading-none cursor-pointer">
                                {t('storeInventoryFilter.label', { storeName: ' ' })}
                                <span
                                    className="underline cursor-pointer hover:opacity-70"
                                    onClick={handleStoreNameClick}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleStoreNameClick(e);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={
                                        selectedStoreInfo
                                            ? t('storeInventoryFilter.changeStore')
                                            : t('storeInventoryFilter.selectStore')
                                    }>
                                    {storeLinkText}
                                </span>
                            </label>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </>
    );
}
