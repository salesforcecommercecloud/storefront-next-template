/**
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { useEffect } from 'react';
import { useDesignContext } from '../context/DesignContext';
import { usePageDesignerMode } from '../core/PageDesignerProvider';
import type { ShopperExperience } from '@/scapi-client/types';

/**
 * Wraps page designer page content and communicates page data back up to the host Page Designer.
 * @param props.page - The page data to communicate back to the host Page Designer.
 */
export function PageRegistration({
    page,
    children,
}: React.PropsWithChildren<{ page: ShopperExperience.schemas['Page'] }>) {
    const { clientApi, setClientPage } = useDesignContext();
    const { isDesignMode } = usePageDesignerMode();

    useEffect(() => {
        if (isDesignMode) {
            setClientPage(page);
        }
    }, [clientApi, page, isDesignMode, setClientPage]);

    return <>{children}</>;
}
