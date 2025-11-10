/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { type PropsWithChildren, type ReactElement } from 'react';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from '@/components/ui/sheet';
import StoreLocator from '@/extensions/store-locator/components/store-locator';
import { StoreLocatorLayoutProvider } from '@/extensions/store-locator/context/layout';
import uiStringsSL from '@/extensions/store-locator/temp-ui-string-store-locator';

interface StoreLocatorSheetProps extends PropsWithChildren {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * StoreLocatorSheet
 *
 * Controlled sheet container that hosts the store locator experience.
 * Parent component must manage the open state.
 *
 * @param children - Trigger element rendered with `SheetTrigger asChild`
 * @param open - Controlled open state (required)
 * @param onOpenChange - Callback when open state changes (required)
 * @returns ReactElement
 *
 * @example
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <StoreLocatorSheet open={isOpen} onOpenChange={setIsOpen}>
 *   <Button variant="ghost">Open Store Locator</Button>
 * </StoreLocatorSheet>
 */
export default function StoreLocatorSheet({ children, open, onOpenChange }: StoreLocatorSheetProps): ReactElement {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="md:w-1/3 md:max-w-1/3 p-0">
                <SheetHeader>
                    <SheetTitle>{uiStringsSL.storeLocator.title}</SheetTitle>
                    <SheetDescription>{uiStringsSL.storeLocator.description}</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    <StoreLocatorLayoutProvider forceMobile>
                        <StoreLocator />
                    </StoreLocatorLayoutProvider>
                </div>
                <SheetClose />
            </SheetContent>
        </Sheet>
    );
}
