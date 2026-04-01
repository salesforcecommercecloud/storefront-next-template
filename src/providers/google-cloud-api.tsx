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
'use client';

import type { PropsWithChildren } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';

/**
 * Resolve the Google Cloud API key from the configuration
 *
 * The API key is loaded from the environment variable:
 * PUBLIC__app__site__features__googleCloudAPI__apiKey
 *
 * @returns The Google Cloud API key if configured, undefined otherwise
 */
function useGoogleCloudAPIKey(): string {
    const config = useConfig<AppConfig>();
    const apiKey = config.features.googleCloudAPI.apiKey;

    return apiKey;
}

/**
 * Provider component that wraps children with Google Maps API context.
 *
 * Conditionally renders the Google Maps APIProvider only when an API key is configured.
 * If no API key is set, children are rendered without the Maps API context.
 *
 * @example
 * ```tsx
 * <GoogleCloudApiProvider>
 *   <MapComponent />
 * </GoogleCloudApiProvider>
 * ```
 */
export default function GoogleCloudApiProvider({ children }: PropsWithChildren) {
    const googleCloudAPIKey = useGoogleCloudAPIKey();

    if (!googleCloudAPIKey) {
        return <>{children}</>;
    }

    return <APIProvider apiKey={googleCloudAPIKey}>{children}</APIProvider>;
}
