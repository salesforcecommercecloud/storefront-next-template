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
 * Normalize a file path to use forward slashes.
 * On Windows, Node APIs return backslash-separated paths, but ESM import
 * specifiers and Vite module IDs require forward slashes.
 */
export function toPosixPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

/**
 * Get the Commerce Cloud API URL from a short code
 */
export function getCommerceCloudApiUrl(shortCode: string): string {
    return `https://${shortCode}.api.commercecloud.salesforce.com`;
}

/**
 * Get the bundle path for static assets
 */
export function getBundlePath(bundleId: string): string {
    return `/mobify/bundle/${bundleId}/client/`;
}
