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
import type { AppConfig } from '@/config';
import { createEinsteinAdapter } from './einstein';
import { addAdapter } from '@/lib/adapters';
import { createActiveDataAdapter } from './active-data';

/**
 * Initialize engagement adapters.
 *
 * Uses properties defined in appConfig.engagement.adapters to set up default adapters.
 *
 * This is the place to modify when adding new engagement adapters to the system.
 */
export function initializeEngagementAdapters(appConfig: AppConfig): void {
    const engagementAdapterConfigs = appConfig?.engagement?.adapters;

    // Register default adapters
    // Comment these out to disable the default adapters
    if (engagementAdapterConfigs?.einstein?.enabled) {
        try {
            addAdapter(
                'einstein',
                createEinsteinAdapter({
                    host: engagementAdapterConfigs.einstein.host || '',
                    einsteinId: engagementAdapterConfigs.einstein.einsteinId || '',
                    realm: engagementAdapterConfigs.einstein.realm || '',
                    siteId: engagementAdapterConfigs.einstein.siteId || appConfig.commerce.api.siteId,
                    isProduction: engagementAdapterConfigs.einstein.isProduction || false,
                    eventToggles: engagementAdapterConfigs.einstein.eventToggles || {},
                })
            );
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to initialize Einstein adapter:', (error as Error).message);
        }
    }

    if (engagementAdapterConfigs.activeData.enabled) {
        try {
            addAdapter(
                'active-data',
                createActiveDataAdapter({
                    host: engagementAdapterConfigs.activeData.host || '',
                    siteId: engagementAdapterConfigs.activeData.siteId || appConfig.commerce.api.siteId,
                    locale: engagementAdapterConfigs.activeData.locale || appConfig.site.locale,
                    siteUUID: engagementAdapterConfigs.activeData.siteUUID || '',
                    eventToggles: engagementAdapterConfigs.activeData.eventToggles || {},
                })
            );
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to initialize Active Data adapter:', (error as Error).message);
        }
    }
}
