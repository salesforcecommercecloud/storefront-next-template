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
import { useState, type ReactElement } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AddressBookItem } from '@/lib/customer-profile-utils';
import ShippingAddressDisplay from './shipping-address-display';
import { useTranslation } from 'react-i18next';

const DEFAULT_MAX_VISIBLE = 3;

export type SavedAddressesListProps = {
    /** List of saved addresses to display */
    addresses: AddressBookItem[];
    /** Max number of addresses shown before "View All" (default 3) */
    maxVisible?: number;
    /** Currently selected address id (controlled) */
    value?: string;
    /** Callback when selection changes */
    onValueChange?: (value: string) => void;
    /** Accessible label for the radio group */
    'aria-label'?: string;
};

/**
 * Displays multiple saved addresses as selectable cards in the Shipping Address checkout stage.
 * Shows up to maxVisible (default 3) with a "View All" control to expand. Default selection is the preferred address.
 */
export function SavedAddressesList({
    addresses,
    maxVisible = DEFAULT_MAX_VISIBLE,
    value,
    onValueChange,
    'aria-label': ariaLabel,
}: SavedAddressesListProps): ReactElement {
    const { t } = useTranslation('checkout');
    const [showAll, setShowAll] = useState(false);

    if (addresses.length === 0) {
        return <></>;
    }

    const defaultSelected = value ?? addresses.find((a) => a.preferred)?.id ?? addresses[0]?.id ?? '';
    const selectedId = value ?? defaultSelected;
    const visibleAddresses = showAll ? addresses : addresses.slice(0, maxVisible);
    const hasMore = addresses.length > maxVisible;
    const moreCount = hasMore ? addresses.length - maxVisible : 0;

    return (
        <div className="space-y-4">
            <RadioGroup
                value={selectedId}
                onValueChange={onValueChange}
                className="space-y-2"
                aria-label={ariaLabel ?? t('shippingAddress.selectSavedAddress')}>
                {visibleAddresses.map((addr) => {
                    const isSelected = selectedId === addr.id;
                    return (
                        <div
                            key={addr.id}
                            className={cn(
                                'group flex items-start gap-4 rounded-lg border-2 bg-card p-4 transition-all duration-200',
                                isSelected ? 'border-primary' : 'border-transparent'
                            )}>
                            <RadioGroupItem
                                value={addr.id}
                                id={`saved-address-${addr.id}`}
                                className="mt-0.5 w-5 h-5 shrink-0"
                            />
                            <Label
                                htmlFor={`saved-address-${addr.id}`}
                                className={cn('flex-1 cursor-pointer min-w-0', isSelected && 'text-foreground')}>
                                <div className="space-y-2">
                                    <ShippingAddressDisplay address={addr} variant="card" />
                                </div>
                            </Label>
                        </div>
                    );
                })}
            </RadioGroup>
            {hasMore && !showAll && (
                <Button
                    type="button"
                    variant="ghost"
                    size="default"
                    className="text-foreground"
                    onClick={() => setShowAll(true)}
                    aria-expanded={false}
                    aria-label={t('shippingAddress.viewAllLink')}>
                    {t('shippingAddress.viewAllLink')} {t('shippingAddress.viewAllMore', { count: moreCount })}
                </Button>
            )}
            {hasMore && showAll && (
                <Button
                    type="button"
                    variant="ghost"
                    size="default"
                    className="text-foreground"
                    onClick={() => setShowAll(false)}
                    aria-expanded={true}>
                    {t('shippingAddress.viewLessAddresses')}
                </Button>
            )}
        </div>
    );
}

export default SavedAddressesList;
