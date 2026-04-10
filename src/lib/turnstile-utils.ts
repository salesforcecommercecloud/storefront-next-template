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
 * Turnstile Utility Functions
 * Feature Spec: e2e/feature-specs/checkout/turnstile-protection.spec.md
 */

import type { AppConfig } from '@/types/config';

/**
 * Get Turnstile site key for the current store URL
 *
 * Looks up the site key from config.security.turnstile.siteKeys using the provided base URL.
 * Tries exact match first, then falls back to protocol-agnostic match.
 *
 * @param config - Application configuration
 * @param baseUrl - Current store base URL (e.g., 'https://store1.example.com' or 'http://localhost:5173')
 * @returns Site key string if found, null otherwise
 */
export function getTurnstileSiteKey(config: AppConfig, baseUrl: string): string | null {
    const siteKeys = config.security?.turnstile?.siteKeys || {};

    // Try exact match first
    if (siteKeys[baseUrl]) {
        return siteKeys[baseUrl];
    }

    // Try without protocol (http:// or https://)
    const urlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '');
    for (const [key, value] of Object.entries(siteKeys)) {
        if (key.replace(/^https?:\/\//, '') === urlWithoutProtocol) {
            return value;
        }
    }

    // No match found
    return null;
}

/**
 * Check if Turnstile is enabled in config
 *
 * @param config - Application configuration
 * @returns true if Turnstile is enabled, false otherwise
 */
export function isTurnstileEnabled(config: AppConfig): boolean {
    return config.security?.turnstile?.enabled ?? true;
}

/**
 * Get Turnstile mode from config
 *
 * @param config - Application configuration
 * @returns 'invisible' or 'visible' mode
 */
export function getTurnstileMode(config: AppConfig): 'invisible' | 'visible' {
    return config.security?.turnstile?.mode || 'invisible';
}
