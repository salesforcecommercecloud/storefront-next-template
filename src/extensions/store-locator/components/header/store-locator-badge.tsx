/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { lazy, Suspense, useState, useEffect, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import { useStoreLocator } from '../../providers/store-locator';
import uiStringsSL from '@/extensions/store-locator/temp-ui-string-store-locator';

const StoreLocatorSheet = lazy(() => import('@/extensions/store-locator/components/header/store-locator-sheet'));

/**
 * StoreLocatorBadge
 *
 * Defers loading of the store locator UI until the shopper first interacts with the
 * badge button. This keeps initial bundles small and improves first-load performance.
 *
 * The sheet is lazy-loaded on demand via React.lazy (cached after first load) and wrapped with Suspense.
 * Uses isOpen state to control both lazy loading trigger and sheet visibility.
 *
 * @returns ReactElement
 *
 * @example
 * // Render in the site header
 * import StoreLocatorBadge from '@/extensions/store-locator/components/header/store-locator-badge';
 *
 * export function HeaderRightActions() {
 *     return (
 *         <nav>
 *             <StoreLocatorBadge />
 *         </nav>
 *     );
 * }
 */
export default function StoreLocatorBadge(): ReactElement {
    const [clicked, setClicked] = useState<boolean>(false);
    const globalIsOpen = useStoreLocator((state) => state.isOpen);
    const closeStoreLocator = useStoreLocator((state) => state.close);

    // Sync with global state - if global state says open, trigger local state
    useEffect(() => {
        if (globalIsOpen && !clicked) {
            setClicked(true);
        }
    }, [globalIsOpen, clicked]);

    // Handle closing - update both local and global state
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setClicked(false);
            closeStoreLocator();
        }
    };

    if (clicked) {
        return (
            <Suspense
                fallback={
                    <Button
                        variant="ghost"
                        className="pointer-events-none"
                        aria-label={uiStringsSL.storeLocator.trigger.ariaLabel}>
                        <Store className="size-6" />
                    </Button>
                }>
                <StoreLocatorSheet open={true} onOpenChange={handleOpenChange}>
                    <Button variant="ghost" aria-label={uiStringsSL.storeLocator.trigger.openAriaLabel}>
                        <Store className="size-6" />
                    </Button>
                </StoreLocatorSheet>
            </Suspense>
        );
    }

    return (
        <Button
            variant="ghost"
            onClick={() => setClicked(true)}
            aria-label={uiStringsSL.storeLocator.trigger.ariaLabel}>
            <Store className="size-6" />
        </Button>
    );
}
