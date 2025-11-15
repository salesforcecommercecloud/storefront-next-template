'use client';

import { type ReactElement, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { FilterValue } from './types';
import ActiveFilters from './active-filters';
import RefineDefault from './refine-default';
import RefineColor from './refine-color';
import RefineSize from './refine-size';
import RefinePrice from './refine-price';
// @sfdc-extension-line SFDC_EXT_BOPIS
import RefineInventory from '@/extensions/bopis/components/refine-inventory';

export default function CategoryRefinements({
    result,
}: {
    result: ShopperSearch.schemas['ProductSearchResult'];
}): ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const expandedSections = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const refines = params.getAll('refine');
        return refines.map((entry: string) => entry.split('=')[0]);
    }, [location]);
    const refinements = useMemo(() => result?.refinements || [], [result]);

    const toggleFilter = useCallback(
        (attributeId: string, value: string) => {
            const params = new URLSearchParams(location.search);
            const refines = params.getAll('refine');
            const refinePair = `${attributeId}=${value}`;

            if (refines.includes(refinePair)) {
                // Remove this refinement
                params.delete('refine');
                refines.filter((r) => r !== refinePair).forEach((r) => params.append('refine', r));
            } else {
                // Exclusive refinements - only one value can be selected at a time
                const exclusiveRefinements = [
                    'price',
                    // @sfdc-extension-line SFDC_EXT_BOPIS
                    'ilids',
                ];
                if (exclusiveRefinements.includes(attributeId)) {
                    // Remove all refinements for this attribute first
                    params.delete('refine');
                    refines.filter((r) => !r.startsWith(`${attributeId}=`)).forEach((r) => params.append('refine', r));
                }
                params.append('refine', refinePair);
            }

            params.set('offset', '0');
            void navigate({
                ...location,
                search: `?${params.toString()}`,
            });
        },
        [location, navigate]
    );

    // Check if a filter value is selected
    const isFilterSelected = useCallback(
        (attributeId: string, value: string) => {
            const params = new URLSearchParams(location.search);
            const refines = params.getAll('refine');
            return refines.includes(`${attributeId}=${value}`);
        },
        [location]
    );

    // Render the appropriate filter component based on type
    const renderFilterValues = (
        refinement: ShopperSearch.schemas['ProductSearchRefinement'] & { values: FilterValue[] }
    ) => {
        const { attributeId, values } = refinement;
        const refinementProps = {
            values,
            attributeId,
            isFilterSelected,
            toggleFilter,
        };

        switch (attributeId) {
            case 'c_refinementColor':
                return <RefineColor {...refinementProps} />;
            case 'c_size':
                return <RefineSize {...refinementProps} />;
            case 'price':
                return <RefinePrice {...refinementProps} result={result} />;
            default:
                return <RefineDefault {...refinementProps} />;
        }
    };

    // No refinements available
    if (refinements.length === 0) {
        return (
            <div className="border rounded-md p-4">
                <p className="text-muted-foreground text-sm">No filter options available.</p>
            </div>
        );
    }

    return (
        <>
            {/* The currently active filters section */}
            <ActiveFilters result={result} />

            {/*  @sfdc-extension-line SFDC_EXT_BOPIS */}
            <RefineInventory isFilterSelected={isFilterSelected} toggleFilter={toggleFilter} />

            {/* Accordion to display the available refinement categories */}
            <Accordion type="multiple" defaultValue={expandedSections}>
                {refinements.map((refinement) => {
                    const { values, attributeId, label } = refinement;
                    if (!Array.isArray(values) || !values.length) {
                        return null;
                    }

                    return (
                        <AccordionItem key={attributeId} value={attributeId}>
                            <AccordionTrigger>{label}</AccordionTrigger>
                            <AccordionContent>
                                {renderFilterValues(
                                    refinement as ShopperSearch.schemas['ProductSearchRefinement'] & {
                                        values: FilterValue[];
                                    }
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </>
    );
}
