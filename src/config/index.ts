/**
 * Configuration
 *
 * - `getConfig()` - For loaders, actions, and utilities
 * - `useConfig()` - For React components
 */

export { ConfigProvider, createAppConfig, appConfigContext } from './context';
export { getConfig, useConfig } from './get-config';

export type { Config, BadgeDetail } from './schema';
export type { AppConfig } from './context';
