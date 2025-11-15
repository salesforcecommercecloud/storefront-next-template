'use client';

import { useCallback, useMemo, type JSX } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { Button } from '@/components/ui/button';
import { X as Close } from 'lucide-react';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import uiStringsBopis from '@/extensions/bopis/temp-ui-string-bopis';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

// Get human-readable label for a specific value
const getValueLabel = (
    attributeId: string,
    value: string,
    refinements: ShopperSearch.schemas['ProductSearchRefinement'][],
    // @sfdc-extension-line SFDC_EXT_BOPIS
    selectedStoreInfo: { inventoryId?: string; name?: string } | null
): string => {
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    if (attributeId === 'ilids') {
        // If the filter value matches the selected store's inventory ID and we have a store name
        if (selectedStoreInfo?.name) {
            return uiStringsBopis.storeInventoryFilter.label.replace('{storeName}', selectedStoreInfo.name);
        }
        return uiStringsBopis.storeInventoryFilter.inStock;
    }
    // @sfdc-extension-block-end SFDC_EXT_BOPIS
    const refinement = refinements.find((r) => r.attributeId === attributeId);
    const valueObj = refinement?.values?.find((v) => v.value === value);
    return valueObj?.label || value;
};

export default function CategoryFilters({
    result,
}: {
    result: ShopperSearch.schemas['ProductSearchResult'];
}): JSX.Element | null {
    const navigate = useNavigate();
    const location = useLocation();
    const refinements = useMemo(() => result?.refinements || [], [result]);
    // @sfdc-extension-line SFDC_EXT_BOPIS
    const selectedStoreInfo = useStoreLocator((s) => s.selectedStoreInfo);

    const activeFilters = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const refines = params.getAll('refine');
        const filters: Array<{
            attributeId: string;
            value: string;
            valueLabel: string;
        }> = [];

        for (const refine of refines) {
            const separatorIndex = refine.indexOf('=');
            if (separatorIndex === -1) continue;

            const attributeId = refine.substring(0, separatorIndex);
            const value = refine.substring(separatorIndex + 1);

            const valueLabel = getValueLabel(
                attributeId,
                value,
                refinements,
                // @sfdc-extension-line SFDC_EXT_BOPIS
                selectedStoreInfo
            );
            filters.push({
                attributeId,
                value,
                valueLabel,
            });
        }
        return filters;
    }, [
        location,
        refinements,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        selectedStoreInfo,
    ]);

    // Remove a specific filter
    const removeFilter = useCallback(
        (attributeId: string, value: string) => {
            const params = new URLSearchParams(location.search);
            const refines = params.getAll('refine');
            const refinePair = `${attributeId}=${value}`;

            // Remove this specific refinement
            params.delete('refine');
            refines.filter((r) => r !== refinePair).forEach((r) => params.append('refine', r));

            params.set('offset', '0');
            return navigate({
                ...location,
                search: `?${params.toString()}`,
            });
        },
        [location, navigate]
    );

    // Clear all filters
    const clearAllFilters = useCallback(() => {
        const params = new URLSearchParams(location.search);
        params.delete('refine');
        params.set('offset', '0');

        void navigate({
            ...location,
            search: `?${params.toString()}`,
        });
    }, [location, navigate]);

    // Don't render if no active filters
    if (activeFilters.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 border-b">
            <p className="mb-2 font-medium">Active filters:</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
                {activeFilters.map(({ attributeId, value, valueLabel }) => (
                    <Button
                        key={`${attributeId}:${value}`}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => void removeFilter(attributeId, value)}>
                        <Close className="size-3" />
                        <span className="ml-1">{valueLabel}</span>
                    </Button>
                ))}
            </div>

            <div className="mb-4">
                <Button
                    variant="link"
                    className="m-0 p-0 cursor-pointer underline text-sm text-destructive hover:text-destructive/75"
                    onClick={clearAllFilters}>
                    Clear all
                </Button>
            </div>
        </div>
    );
}
