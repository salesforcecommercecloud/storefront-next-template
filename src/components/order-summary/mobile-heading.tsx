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
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getOrderSummaryMobileHeading, type OrderSummaryBasket } from './mobile-heading-utils';

interface OrderSummaryMobileAccordionProps {
    basket: OrderSummaryBasket;
    defaultExpanded?: boolean;
    // Keep summary content as children so parent routes retain lazy-loading boundaries.
    children: ReactNode;
}

/**
 * Shared mobile wrapper for order-summary sections (cart + checkout).
 *
 * Responsibilities:
 * - Renders the mobile summary heading trigger with item-count text
 * - Manages collapsed/expanded accordion state
 * - Hosts caller-provided summary content in the accordion body
 *
 * Important design constraint:
 * - This component intentionally does NOT import `OrderSummary` directly.
 *   Parents pass summary content via `children` so route-level lazy-loading
 *   and code-splitting boundaries stay intact (especially on checkout).
 */
export function OrderSummaryMobileAccordion({
    basket,
    // Collapsed by default on mobile unless a caller opts in.
    defaultExpanded = false,
    children,
}: OrderSummaryMobileAccordionProps): ReactElement {
    const { t } = useTranslation('cart');

    return (
        <Accordion
            type="single"
            collapsible
            defaultValue={defaultExpanded ? 'order-summary' : undefined}
            className="w-full border-b border-border">
            <AccordionItem value="order-summary" className="border-b-0">
                <AccordionTrigger className="px-[var(--cart-summary-px)] py-4 hover:no-underline">
                    <span className="flex-1 text-left text-sm font-semibold text-primary">
                        {getOrderSummaryMobileHeading(t, basket)}
                    </span>
                </AccordionTrigger>
                <AccordionContent className="p-0">{children}</AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
