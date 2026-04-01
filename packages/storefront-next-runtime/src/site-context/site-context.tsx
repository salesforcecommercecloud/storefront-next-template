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
import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Site } from './types';

const SiteContext = createContext<Site | undefined>(undefined);

/**
 * Provides the current site to the component tree.
 * Follows the same pattern as CurrencyProvider.
 *
 * Mounted in the template (e.g., app-wrapper.tsx or root.tsx) with the resolved
 * site value from the loader/middleware.
 */
export function SiteProvider({ value, children }: PropsWithChildren<{ value: Site }>) {
    return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

/**
 * React hook to get the current site.
 * Returns undefined when no SiteProvider is mounted.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSite(): Site | undefined {
    return useContext(SiteContext);
}
