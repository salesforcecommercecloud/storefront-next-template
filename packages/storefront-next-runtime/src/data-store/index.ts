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

export { createDataStoreMiddleware } from './utils';
export { createLazyDataStoreMiddleware, readLazyDataStoreEntry } from './utils';
export { createDataStoreContext } from './utils';
export { getDataStoreEntry } from './utils';
export { dataStoreLoggerContext, getDataStoreLogger } from './logger-context';
export type { DataStoreLogger } from './logger-context';
export { getSitePreferences } from './middleware/custom-site-preferences';
export { getCustomGlobalPreferences } from './middleware/custom-global-preferences';
export { getGcpApiKey, getGcpPreferences } from './middleware/gcp-preferences';
export type { DataStoreMiddlewareOptions } from './utils';
export type { SitePreferences } from './middleware/custom-site-preferences';
export type { DataStoreContextKey, DataStoreEntryKey } from './utils';
export type { DataStoreEntry } from './utils';
export type { CustomGlobalPreferences } from './middleware/custom-global-preferences';
export { getLoginPreferences } from './middleware/login-preferences';
export type { LoginPreferences } from './middleware/login-preferences';
export type { GcpPreferences } from './middleware/gcp-preferences';
export { DataStore } from '@salesforce/mrt-utilities/data-store';
export {
    DataStoreNotFoundError,
    DataStoreServiceError,
    DataStoreUnavailableError,
} from '@salesforce/mrt-utilities/data-store';

import { customSitePreferencesMiddleware } from './middleware/custom-site-preferences';
import { customGlobalPreferencesMiddleware } from './middleware/custom-global-preferences';
import { gcpPreferencesMiddleware } from './middleware/gcp-preferences';
import { loginPreferencesMiddleware } from './middleware/login-preferences';

export const dataStoreMiddleware = [
    customSitePreferencesMiddleware,
    customGlobalPreferencesMiddleware,
    gcpPreferencesMiddleware,
    loginPreferencesMiddleware,
];
