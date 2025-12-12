/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { ReactElement } from 'react';
import StoreLocator from '@/extensions/store-locator/components/store-locator';

/**
 * StoreLocatorPage
 *
 * Standalone route that renders the Store Locator experience.
 *
 * @returns ReactElement
 */
export default function StoreLocatorPage(): ReactElement {
    return <StoreLocator />;
}
