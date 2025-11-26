/**
 * Test utilities for context providers - React components
 *
 * This file provides reusable wrapper components for testing components and hooks
 * that depend on various context providers.
 */

import type { ReactNode } from 'react';
import { ConfigProvider, type AppConfig } from '@/config/context';
// @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
import StoreLocatorProvider from '@/extensions/store-locator/providers/store-locator';
import { mockConfig } from './context-provider-utils';

/**
 * React Testing Library wrapper component that provides ConfigProvider context
 */
export function ConfigWrapper({ children }: { children: ReactNode }) {
    return <ConfigProvider config={mockConfig}>{children}</ConfigProvider>;
}

/**
 * React Testing Library wrapper component that provides StoreLocatorProvider context
 */
export function StoreLocatorWrapper({ children }: { children: ReactNode }) {
    return (
        <>
            {/* @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */}
            <StoreLocatorProvider>
                {children}
                {/* @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */}
            </StoreLocatorProvider>
        </>
    );
}

/**
 * React Testing Library wrapper component that provides both ConfigProvider and StoreLocatorProvider context
 *
 * @param props - Component props
 * @param props.children - React children to wrap
 * @param props.config - Optional custom config. Defaults to mockConfig if not provided
 *
 * @example
 * ```typescript
 * // Use default config
 * <AllProvidersWrapper>
 *   <MyComponent />
 * </AllProvidersWrapper>
 *
 * // Use custom config
 * const customConfig = createAppConfig({ ...mockBuildConfig, ...overrides });
 * <AllProvidersWrapper config={customConfig}>
 *   <MyComponent />
 * </AllProvidersWrapper>
 * ```
 */
export function AllProvidersWrapper({ children, config = mockConfig }: { children: ReactNode; config?: AppConfig }) {
    return <ConfigProvider config={config}>{StoreLocatorWrapper({ children })}</ConfigProvider>;
}
