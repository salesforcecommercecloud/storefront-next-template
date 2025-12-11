/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Utility functions for detecting active design/preview modes
 */

/**
 * Get the mode parameter from URL search params
 * @param url - Optional URL string or Request object for server-side usage. If not provided, uses window.location on client-side
 * @returns The mode parameter value or null if not found
 */
export const getUrlMode = (url?: string | URL | Request): string | null => {
    let searchParams: URLSearchParams;

    if (url) {
        // Server-side: extract search params from provided URL or Request
        if (url instanceof Request) {
            searchParams = new URL(url.url).searchParams;
        } else {
            searchParams = new URL(url).searchParams;
        }
    } else {
        // Client-side: use window.location
        if (typeof window === 'undefined') {
            return null;
        }
        searchParams = new URLSearchParams(window.location.search);
    }

    return searchParams.get('mode');
};

/**
 * Check if design mode is active
 * @param url - Optional URL string or Request object for server-side usage
 * @returns True if mode=EDIT is present in URL
 */
export const isDesignModeActive = (url?: string | URL | Request): boolean => getUrlMode(url) === 'EDIT';

/**
 * Check if preview mode is active
 * @param url - Optional URL string or Request object for server-side usage
 * @returns True if mode=PREVIEW is present in URL
 */
export const isPreviewModeActive = (url?: string | URL | Request): boolean => getUrlMode(url) === 'PREVIEW';
