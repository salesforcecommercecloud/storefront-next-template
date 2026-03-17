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

/**
 * Configuration Context and Provider
 *
 * Provides configuration access throughout the application using React Router's
 * context system. Supports both server and client rendering with proper hydration.
 */

import { createContext, type ReactNode } from 'react';
import { createContext as createRouterContext } from 'react-router';
import type { Config } from './schema';

/**
 * Application configuration type
 *
 * Contains only the 'app' section from Config.
 * The 'runtime' section is build/deployment config and not needed by the running app.
 * The 'metadata' section is project info and not needed at runtime.
 */
export type AppConfig = Config['app'];

/**
 * Router context for application configuration
 *
 * This is populated by middleware with AppConfig from process.env (via config.server.ts)
 * and can be accessed by any code that has access to the router context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const appConfigContext = createRouterContext<AppConfig>();

// eslint-disable-next-line react-refresh/only-export-components
export const ConfigContext = createContext<AppConfig | null>(null);

/**
 * Create application configuration from config.server.ts
 *
 * Returns the app configuration directly from config.server.ts.
 * All defaults are handled in config.server.ts, which reads from process.env at module load time.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function createAppConfig(staticConfig: Config): AppConfig {
    return staticConfig.app;
}

interface ConfigProviderProps {
    config: AppConfig;
    children: ReactNode;
}

export function ConfigProvider({ config, children }: ConfigProviderProps) {
    return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}
