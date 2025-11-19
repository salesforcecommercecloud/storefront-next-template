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
