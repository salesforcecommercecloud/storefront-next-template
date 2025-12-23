/**
 * JWKS proxy route that serves JSON Web Key Sets for JWT validation.
 *
 * This route acts as a proxy between the application and the upstream
 * SLAS JWKS endpoint, reducing network latency and server load.
 *
 */
import type { LoaderFunctionArgs } from 'react-router';
import { getConfig } from '@/config';
import { getTranslation } from '@/lib/i18next';

interface JWKSResponse {
    keys: Array<{
        kty: string;
        use?: string;
        kid: string;
        alg?: string;
        // RSA key properties
        n?: string;
        e?: string;
        // EC key properties
        crv?: string;
        x?: string;
        y?: string;
    }>;
}

/**
 * Fetch JWKS from upstream SLAS server
 */
async function fetchUpstreamJWKS(context: LoaderFunctionArgs['context']): Promise<JWKSResponse> {
    const { t } = getTranslation(context);
    const config = getConfig(context);
    if (!config) {
        throw new Error('App configuration not found in context');
    }

    const shortCode = config.commerce.api.shortCode;
    const organizationId = config.commerce.api.organizationId;

    if (!shortCode || !organizationId) {
        throw new Error(t('errors:jwks.missingEnvironmentVariables'));
    }

    const upstreamUrl = `https://${shortCode}.api.commercecloud.salesforce.com/shopper/auth/v1/organizations/${organizationId}/oauth2/jwks`;

    const response = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Odyssey-JWKS-Proxy',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
        throw new Error(`Upstream JWKS fetch failed: ${response.status} ${response.statusText}`);
    }

    const jwks = (await response.json()) as JWKSResponse;

    // Validate JWKS structure
    if (!jwks.keys || !Array.isArray(jwks.keys)) {
        throw new Error(t('errors:jwks.invalidResponse'));
    }

    return jwks;
}

/**
 * JWKS proxy loader - serves JWKS in standard format for jose library compatibility
 */
// eslint-disable-next-line custom/no-async-page-loader -- Resource route for JWKS proxy serving
export async function loader({ context }: LoaderFunctionArgs) {
    const { t } = getTranslation(context);

    try {
        // Fetch JWKS from upstream
        const jwks = await fetchUpstreamJWKS(context);

        // Return raw JWKS format for jose library compatibility with proper cache headers
        // The jose library's createRemoteJWKSet expects this exact format
        // The jose library caches response respecting the cache headers
        return new Response(JSON.stringify(jwks), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // JWKS rotate every 30 days. For now, cache response for 14 days so that
                // fetches only need to happen twice a month
                'Cache-Control': 'public, max-age=1209600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        // For errors, we need to throw to trigger proper HTTP error responses
        // since JWKS consumers expect either valid JWKS or HTTP errors
        const errorMessage = error instanceof Error ? error.message : t('errors:jwks.unknownError');
        throw new Error(errorMessage);
    }
}
