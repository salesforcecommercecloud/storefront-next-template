/**
 * Test utilities for context providers - React components
 *
 * This file provides reusable wrapper components for testing components and hooks
 * that depend on various context providers.
 */

import type { ReactNode } from 'react';
import { ConfigProvider, type AppConfig } from '@/config/context';
import { mockConfig } from './context-provider-utils';
import { PluginProviders } from '@/plugins/plugin-providers';
import { CurrencyProvider } from '@/providers/currency';
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
                <StoreLocatorProvider>
                    <PluginProviders>{children}</PluginProviders>
                </StoreLocatorProvider>
            </CurrencyWrapper>
        </ConfigProvider>
    );
}
