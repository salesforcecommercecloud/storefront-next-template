/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { type ReactElement } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/spinner';
import AddressDisplay from '@/components/address-display';
import type { ShopperCustomersTypes } from 'commerce-sdk-isomorphic';
import uiStrings from '@/temp-ui-string';

interface AddressCardProps {
    /** The address data to display */
    address: ShopperCustomersTypes.CustomerAddress;
    /** Callback function called when the edit button is clicked */
    onEdit?: () => void;
    /** Callback function called when the remove button is clicked */
    onRemove?: () => void;
    /** Whether this address is the preferred address */
    isPreferred?: boolean;
    /** Whether the remove action is in progress */
    isRemoving?: boolean;
}

/**
 * AddressCard component displays a single customer address with edit and remove actions.
 *
 * This component provides a card-based layout for displaying address information
 * with optional edit and remove handlers. It uses the AddressDisplay component
 * for consistent address formatting and shadcn/ui components for styling.
 *
 * @param props - Component props
 * @returns JSX element representing the address card
 *
 * @example
 * ```tsx
 * <AddressCard
 *   address={customerAddress}
 *   onEdit={() => handleEdit(address.addressId)}
 *   onRemove={() => handleRemove(address.addressId)}
 *   isPreferred={address.preferred}
 * />
 * ```
 */
export default function AddressCard({
    address,
    onEdit,
    onRemove,
    isPreferred = false,
    isRemoving = false,
}: AddressCardProps): ReactElement {
    return (
        <Card className="border-border gap-0 py-4 relative">
            <CardHeader>
                <CardTitle className="text-left">{address.addressId}</CardTitle>
                <CardAction>
                    {isPreferred && (
                        <Badge variant="default" className="text-xs">
                            {uiStrings.account.addresses.preferred}
                        </Badge>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent className="p-6">
                <AddressDisplay address={address} />
            </CardContent>
            {(onEdit || onRemove) && (
                <CardFooter className="gap-2 px-4">
                    {onEdit && (
                        <Button onClick={onEdit} variant="link" size="sm" aria-label={uiStrings.actionCard.edit}>
                            {uiStrings.actionCard.edit}
                        </Button>
                    )}
                    {onRemove && (
                        <Button
                            onClick={onRemove}
                            variant="link"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            aria-label={uiStrings.actionCard.remove}
                            disabled={isRemoving}>
                            {uiStrings.actionCard.remove}
                        </Button>
                    )}
                </CardFooter>
            )}
            {/* Loading Spinner Overlay */}
            {isRemoving && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 pointer-events-none flex items-center justify-center rounded-lg">
                    <Spinner size="lg" />
                </div>
            )}
        </Card>
    );
}
