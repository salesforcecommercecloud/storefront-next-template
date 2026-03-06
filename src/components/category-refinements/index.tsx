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
'use client';

import { type ReactElement, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useNavigation } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { FilterValue, RefinementProps } from './types';
import RefineDefault from './refine-default';
import RefineColor from './refine-color';
import RefineSize from './refine-size';
import RefinePrice from './refine-price';
// @sfdc-extension-line SFDC_EXT_BOPIS
import RefineInventory from '@/extensions/bopis/components/refine-inventory';
import RefineCategory from '@/components/category-refinements/refine-cgid';

export default function CategoryRefinements({
    result,
    refine = [],
}: {
    result: ShopperSearch.schemas['ProductSearchResult'];
    refine: string[];
}): ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const navigation = useNavigation();
    const isPending = navigation.state !== 'idle';

    /**
     * Optimistic refinements derived from the in-flight navigation target.
     *
     * When a user toggles a filter, `navigate()` updates the URL which triggers a loader call. While that navigation
     * is pending, `navigation.location` holds the target location, allowing us to read the intended refine params
     * immediately.
     *
     * Note: `navigation.location` is inherently tied to the pending state — it's only defined while
     * `navigation.state !== 'idle'`, and both reset in the same render cycle once the navigation completes. An
     * additional `isPending` guard is therefore not needed here.
     *
     * Minor trade-off: `useNavigation()` is global — it reflects any in-flight navigation, not just filter toggles.
     * In practice this is acceptable because if a different navigation starts, the entire page is about to change
     * anyway.
     */
    const effectiveRefines = navigation.location
        ? new URLSearchParams(navigation.location.search).getAll('refine')
        : refine;

    // Expand all sections, except category (attribute ID = cgid)
    const expandedSections = useMemo(
        () =>
            effectiveRefines.reduce((acc: string[], entry: string) => {
                const attributeId = entry.split('=')[0];
                if (attributeId !== 'cgid') {
                    acc.push(attributeId);
                }
                return acc;
            }, []),
        [effectiveRefines]
    );
    const refinements = useMemo(() => result?.refinements || [], [result]);

    const toggleFilter = useCallback(
        (attributeId: string, value: string) => {
            const params = new URLSearchParams(location.search);
            const refines = params.getAll('refine');
            const refinePair = `${attributeId}=${value}`;

            let nextRefines: string[];
            let pathname: string | undefined;

            if (attributeId === 'cgid') {
                // Navigate to the new category while preserving non-cgid refinements
                nextRefines = refines.filter((r) => !r.startsWith('cgid='));
                pathname = `/category/${value}`;
            } else if (refines.includes(refinePair)) {
                // Remove this refinement
                nextRefines = refines.filter((r) => r !== refinePair);
            } else {
                // Exclusive refinements - only one value can be selected at a time
                const exclusiveRefinements = [
                    'price',
                    // @sfdc-extension-line SFDC_EXT_BOPIS
                    'ilids',
                ];
                if (exclusiveRefinements.includes(attributeId)) {
                    // Remove all refinements for this attribute first
                    nextRefines = [...refines.filter((r) => !r.startsWith(`${attributeId}=`)), refinePair];
                } else {
                    nextRefines = [...refines, refinePair];
                }
            }

            // Rebuild search params with the new refines
            params.delete('refine');
            nextRefines.forEach((r) => params.append('refine', r));
            params.set('offset', '0');

            const nextSearch = `?${params.toString()}`;

            void navigate({
                pathname: pathname ?? location.pathname,
                search: nextSearch,
            });
        },
        [location, navigate]
    );

    // Check if a filter value is selected (uses optimistic state)
    const isFilterSelected = useCallback(
        (attributeId: string, value: string) => {
            return effectiveRefines.includes(`${attributeId}=${value}`);
        },
        [effectiveRefines]
    );

    // Render the appropriate filter component based on type
    const renderFilterValues = (
        refinement: ShopperSearch.schemas['ProductSearchRefinement'] & { values: FilterValue[] }
    ) => {
        const { attributeId, values } = refinement;
        const refinementProps: RefinementProps = {
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
            case 'cgid':
                return <RefineCategory {...refinementProps} />;
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
            {/*  @sfdc-extension-line SFDC_EXT_BOPIS */}
            <RefineInventory isFilterSelected={isFilterSelected} toggleFilter={toggleFilter} />

            {/* Accordion to display the available refinement categories */}
            <Accordion
                type="multiple"
                defaultValue={expandedSections}
                {...(isPending && { className: 'pointer-events-none opacity-50 transition-opacity' })}>
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
