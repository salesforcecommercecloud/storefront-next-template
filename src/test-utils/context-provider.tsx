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

import type { ReactNode } from 'react';
import { ConfigProvider, type AppConfig } from '@/config/context';
import { mockConfig } from './context-provider-utils';
import { TargetProviders } from '@/targets/target-providers';
import { CurrencyProvider } from '@/providers/currency';
// @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
import StoreLocatorProvider from '@/extensions/store-locator/providers/store-locator';

/**
 * React Testing Library wrapper component that provides ConfigProvider context
 */
export function ConfigWrapper({ children }: { children: ReactNode }) {
    return <ConfigProvider config={mockConfig}>{children}</ConfigProvider>;
}

/**
 * React Testing Library wrapper component that provides CurrencyProvider context
 */
export function CurrencyWrapper({ children, currency = 'USD' }: { children: ReactNode; currency?: string }) {
    return <CurrencyProvider value={currency}>{children}</CurrencyProvider>;
}
/**
 * React Testing Library wrapper component that provides all providers context
 *
 * @param props - Component props
 * @param props.children - React children to wrap
 * @param props.config - Optional custom config. Defaults to mockConfig if not provided
 * @param props.currency - Optional currency. Defaults to 'USD' if not provided
 *
 * @example
 * ```typescript
 * // Use default config and currency
 * <AllProvidersWrapper>
 *   <MyComponent />
 * </AllProvidersWrapper>
 *
 * // Use custom config
 * const customConfig = createAppConfig({ ...mockBuildConfig, ...overrides });
 * <AllProvidersWrapper config={customConfig}>
 *   <MyComponent />
 * </AllProvidersWrapper>
 *
 * // Use custom currency
 * <AllProvidersWrapper currency="EUR">
 *   <MyComponent />
 * </AllProvidersWrapper>
 * ```
 */
export function AllProvidersWrapper({
    children,
    config = mockConfig,
    currency = 'USD',
}: {
    children: ReactNode;
    config?: AppConfig;
    currency?: string;
}) {
    return (
        <ConfigProvider config={config}>
            <CurrencyWrapper currency={currency}>
                {/* @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */}
                <StoreLocatorProvider>
                    <TargetProviders>{children}</TargetProviders>
                    {/* @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */}
                </StoreLocatorProvider>
            </CurrencyWrapper>
        </ConfigProvider>
    );
}
