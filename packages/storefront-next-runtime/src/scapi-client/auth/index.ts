/*
 * Copyright (c) 2024, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
    AuthConfig,
    AuthNamespace,
    TokenResponse,
    LoginAsGuestOptions,
    LoginWithCredentialsOptions,
    RefreshTokenOptions,
    LogoutOptions,
    PasswordlessAuthorizeOptions,
    PasswordlessExchangeTokenOptions,
    PasswordRequestResetOptions,
    PasswordResetOptions,
    SocialGetAuthorizationUrlOptions,
    SocialAuthorizationUrlResult,
    SocialExchangeCodeOptions,
} from './types';
import { createCodeVerifier, generateCodeChallenge, getCodeAndUsidFromUrl, createBasicAuthHeader } from './utils';

// Content-Type header for form-urlencoded endpoints (required by openapi-fetch for proper serialization)
const FORM_URLENCODED_HEADER = { 'Content-Type': 'application/x-www-form-urlencoded' };

// Re-export types for convenience
export type { AuthConfig, AuthNamespace, TokenResponse } from './types';
export type { LoginAsGuestOptions, LoginWithCredentialsOptions, RefreshTokenOptions, LogoutOptions } from './types';
export type { PasswordlessAuthorizeOptions, PasswordlessExchangeTokenOptions } from './types';
export type { PasswordRequestResetOptions, PasswordResetOptions } from './types';
export type {
    SocialGetAuthorizationUrlOptions,
    SocialAuthorizationUrlResult,
    SocialExchangeCodeOptions,
} from './types';

/**
 * Creates the auth helpers namespace.
 *
 * This factory function creates an auth namespace with methods for:
 * - Guest login (public or private SLAS client)
 * - Registered user login with credentials
 * - Token refresh
 * - Logout
 *
 * @param config - Configuration containing the ShopperLogin client and auth parameters
 * @returns The auth namespace with all authentication methods
 *
 * @example
 * ```typescript
 * const auth = createAuthHelpers({
 *   shopperLoginClient: clients.shopperLogin,
 *   clientId: 'your-client-id',
 *   clientSecret: process.env.SLAS_SECRET, // optional, for private client
 *   redirectUri: 'https://example.com/callback',
 *   organizationId: 'f_ecom_xxx',
 *   siteId: 'RefArch',
 * });
 *
 * const tokens = await auth.loginAsGuest();
 * ```
 */
export function createAuthHelpers(config: AuthConfig): AuthNamespace {
    const { shopperLoginClient, clientId, clientSecret, redirectUri, siteId, baseUrl, organizationId } = config;

    const isPrivateClient = !!clientSecret;

    /**
     * Guest login for private SLAS client using client_credentials grant.
     */
    async function loginGuestPrivate(options: LoginAsGuestOptions = {}): Promise<TokenResponse> {
        const { usid, dnt } = options;

        if (!clientSecret) {
            throw new Error('Client secret is required for private client guest login');
        }

        const result = await shopperLoginClient.getAccessToken({
            params: {
                header: {
                    Authorization: createBasicAuthHeader(clientId, clientSecret),
                },
            },
            headers: FORM_URLENCODED_HEADER,
            body: {
                grant_type: 'client_credentials',
                channel_id: siteId,
                ...(usid && { usid }),
                ...(dnt !== undefined && { dnt: dnt.toString() }),
            },
        });

        return result.data;
    }

    /**
     * Guest login for public SLAS client using PKCE flow.
     */
    async function loginGuestPublic(options: LoginAsGuestOptions = {}): Promise<TokenResponse> {
        const { usid, dnt } = options;

        // Step 1: Generate PKCE code verifier and challenge
        const codeVerifier = createCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // Step 2: Call authorize endpoint to get authorization code
        // The authorizeCustomer endpoint returns a 303 redirect with code and usid
        // IMPORTANT: Use redirect: 'manual' to prevent fetch from following the redirect
        // Otherwise, fetch would follow the redirect to our callback URL, triggering
        // the auth middleware again and causing an infinite loop
        const authorizeResult = await shopperLoginClient.authorizeCustomer({
            params: {
                query: {
                    client_id: clientId,
                    channel_id: siteId,
                    redirect_uri: redirectUri,
                    response_type: 'code',
                    hint: 'guest',
                    code_challenge: codeChallenge,
                    ...(usid && { usid }),
                },
            },
            redirect: 'manual',
        });

        // Extract code and usid from the Location header (since we used redirect: 'manual')
        const redirectUrl = authorizeResult.response.headers.get('location') || '';
        const { code, usid: returnedUsid } = getCodeAndUsidFromUrl(redirectUrl);

        if (!code) {
            throw new Error('Failed to get authorization code from guest login');
        }

        // Step 3: Exchange authorization code for tokens
        const tokenResult = await shopperLoginClient.getAccessToken({
            params: {},
            headers: FORM_URLENCODED_HEADER,
            body: {
                grant_type: 'authorization_code_pkce',
                client_id: clientId,
                channel_id: siteId,
                code,
                code_verifier: codeVerifier,
                redirect_uri: redirectUri,
                usid: returnedUsid,
                ...(dnt !== undefined && { dnt: dnt.toString() }),
            },
        });

        return tokenResult.data;
    }

    return {
        /**
         * Login as a guest user.
         * Automatically uses the appropriate flow based on whether a client secret is configured.
         */
        async loginAsGuest(options: LoginAsGuestOptions = {}): Promise<TokenResponse> {
            if (isPrivateClient) {
                return loginGuestPrivate(options);
            }
            return loginGuestPublic(options);
        },

        /**
         * Login with username and password credentials.
         * Uses the B2C registered user login flow with PKCE.
         */
        async loginWithCredentials(credentials: LoginWithCredentialsOptions): Promise<TokenResponse> {
            const { username, password, usid, dnt } = credentials;

            // Step 1: Generate PKCE code verifier and challenge
            const codeVerifier = createCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);

            // Step 2: Authenticate customer with username/password
            // This returns a 303 redirect with authorization code
            // IMPORTANT: Use redirect: 'manual' to prevent fetch from following the redirect
            // Note: Authorization goes in params.header (OpenAPI-defined), Content-Type in headers (request-level)
            const authResult = await shopperLoginClient.authenticateCustomer({
                params: {
                    header: {
                        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
                    },
                },
                headers: FORM_URLENCODED_HEADER,
                body: {
                    client_id: clientId,
                    channel_id: siteId,
                    redirect_uri: redirectUri,
                    response_type: 'code',
                    code_challenge: codeChallenge,
                    ...(usid && { usid }),
                },
                redirect: 'manual',
            });

            // Extract code and usid from the Location header (since we used redirect: 'manual')
            const redirectUrl = authResult.response.headers.get('location') || '';
            const { code, usid: returnedUsid } = getCodeAndUsidFromUrl(redirectUrl);

            if (!code) {
                throw new Error('Failed to get authorization code from credentials login');
            }

            // Step 3: Exchange authorization code for tokens
            const tokenBody = {
                grant_type: 'authorization_code_pkce' as const,
                client_id: clientId,
                channel_id: siteId,
                code,
                code_verifier: codeVerifier,
                redirect_uri: redirectUri,
                usid: returnedUsid,
                ...(dnt !== undefined && { dnt: dnt.toString() }),
            };

            // For private client, include client secret in auth header
            if (isPrivateClient && clientSecret) {
                const tokenResult = await shopperLoginClient.getAccessToken({
                    params: {
                        header: {
                            Authorization: createBasicAuthHeader(clientId, clientSecret),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: tokenBody,
                });
                return tokenResult.data;
            }

            // For public client, no auth header needed
            const tokenResult = await shopperLoginClient.getAccessToken({
                params: {},
                headers: FORM_URLENCODED_HEADER,
                body: tokenBody,
            });
            return tokenResult.data;
        },

        /**
         * Refresh an access token using a refresh token.
         */
        async refreshToken(options: RefreshTokenOptions): Promise<TokenResponse> {
            const { refreshToken, dnt } = options;

            const body = {
                grant_type: 'refresh_token' as const,
                refresh_token: refreshToken,
                client_id: clientId,
                channel_id: siteId,
                ...(dnt !== undefined && { dnt: dnt.toString() }),
            };

            // For private client, include client secret in auth header
            if (isPrivateClient && clientSecret) {
                const result = await shopperLoginClient.getAccessToken({
                    params: {
                        header: {
                            Authorization: createBasicAuthHeader(clientId, clientSecret),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body,
                });
                return result.data;
            }

            // For public client, no auth header needed
            const result = await shopperLoginClient.getAccessToken({
                params: {},
                headers: FORM_URLENCODED_HEADER,
                body,
            });
            return result.data;
        },

        /**
         * Logout a shopper and revoke tokens.
         */
        async logout(options: LogoutOptions): Promise<TokenResponse> {
            const { accessToken, refreshToken } = options;

            const result = await shopperLoginClient.logoutCustomer({
                params: {
                    header: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    query: {
                        client_id: clientId,
                        channel_id: siteId,
                        refresh_token: refreshToken,
                    },
                },
            });

            return result.data;
        },

        /**
         * Social/IDP login namespace.
         * Provides methods for social login via Google, Facebook, Apple, etc.
         */
        social: {
            async getAuthorizationUrl(
                options: SocialGetAuthorizationUrlOptions
            ): Promise<SocialAuthorizationUrlResult> {
                const { hint, redirectUri: overrideRedirectUri, usid } = options;

                // Generate PKCE code verifier and challenge
                const codeVerifier = createCodeVerifier();
                const codeChallenge = await generateCodeChallenge(codeVerifier);

                const effectiveRedirectUri = overrideRedirectUri || redirectUri;

                // Construct the full authorization URL by appending to the baseUrl.
                // The baseUrl may include a proxy path (e.g., '/mobify/proxy/api'), so we use
                // a relative path (no leading /) to ensure proper concatenation.
                const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
                const authorizePath = `shopper/auth/v1/organizations/${organizationId}/oauth2/authorize`;
                const authorizeUrl = new URL(authorizePath, normalizedBaseUrl);

                authorizeUrl.searchParams.set('client_id', clientId);
                authorizeUrl.searchParams.set('channel_id', siteId);
                authorizeUrl.searchParams.set('redirect_uri', effectiveRedirectUri);
                authorizeUrl.searchParams.set('response_type', 'code');
                authorizeUrl.searchParams.set('hint', hint);
                authorizeUrl.searchParams.set('code_challenge', codeChallenge);
                if (usid) {
                    authorizeUrl.searchParams.set('usid', usid);
                }

                return {
                    url: authorizeUrl.toString(),
                    codeVerifier,
                };
            },

            async exchangeCode(options: SocialExchangeCodeOptions): Promise<TokenResponse> {
                const { code, codeVerifier, redirectUri: callbackRedirectUri, usid, dnt } = options;

                const tokenBody = {
                    grant_type: 'authorization_code_pkce' as const,
                    client_id: clientId,
                    channel_id: siteId,
                    code,
                    code_verifier: codeVerifier,
                    redirect_uri: callbackRedirectUri,
                    ...(usid && { usid }),
                    ...(dnt !== undefined && { dnt: dnt.toString() }),
                };

                // For private client, include client secret in auth header
                if (isPrivateClient && clientSecret) {
                    const tokenResult = await shopperLoginClient.getAccessToken({
                        params: {
                            header: {
                                Authorization: createBasicAuthHeader(clientId, clientSecret),
                            },
                        },
                        headers: FORM_URLENCODED_HEADER,
                        body: tokenBody,
                    });
                    return tokenResult.data;
                }

                // For public client, no auth header needed
                const tokenResult = await shopperLoginClient.getAccessToken({
                    params: {},
                    headers: FORM_URLENCODED_HEADER,
                    body: tokenBody,
                });
                return tokenResult.data;
            },
        },

        /**
         * Passwordless login namespace.
         * Only available when clientSecret is configured (private SLAS client).
         */
        passwordless: {
            async authorize(options: PasswordlessAuthorizeOptions) {
                const { userId, callbackUri, usid, mode = 'callback' } = options;

                if (!clientSecret) {
                    throw new Error('Client secret is required for passwordless login');
                }

                return shopperLoginClient.authorizePasswordlessCustomer({
                    params: {
                        header: {
                            Authorization: createBasicAuthHeader(clientId, clientSecret),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        user_id: userId,
                        mode,
                        channel_id: siteId,
                        ...(callbackUri && { callback_uri: callbackUri }),
                        ...(usid && { usid }),
                    },
                });
            },

            async exchangeToken(options: PasswordlessExchangeTokenOptions) {
                const { pwdlessLoginToken, usid, dnt } = options;

                if (!clientSecret) {
                    throw new Error('Client secret is required for passwordless token exchange');
                }

                const codeVerifier = createCodeVerifier();

                const result = await shopperLoginClient.getPasswordLessAccessToken({
                    params: {
                        header: {
                            Authorization: createBasicAuthHeader(clientId, clientSecret),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        grant_type: 'client_credentials' as const,
                        hint: 'pwdless_login',
                        pwdless_login_token: pwdlessLoginToken,
                        code_verifier: codeVerifier,
                        ...(usid && { usid }),
                        ...(dnt !== undefined && { dnt: dnt.toString() }),
                    },
                });

                return result.data;
            },
        },

        /**
         * Password management namespace.
         */
        password: {
            async requestReset(options: PasswordRequestResetOptions) {
                const { userId, callbackUri } = options;

                const headers: Record<string, string> = {
                    ...FORM_URLENCODED_HEADER,
                };

                // For private client, include client secret in auth header
                if (isPrivateClient && clientSecret) {
                    headers.Authorization = createBasicAuthHeader(clientId, clientSecret);
                }

                return shopperLoginClient.getPasswordResetToken({
                    params: {},
                    headers,
                    body: {
                        user_id: userId,
                        mode: 'callback',
                        channel_id: siteId,
                        client_id: clientId,
                        callback_uri: callbackUri,
                        hint: 'cross_device',
                    },
                });
            },

            async reset(options: PasswordResetOptions) {
                const { userId, token, newPassword } = options;

                // The OpenAPI spec for SLAS resetPassword is inaccurate:
                // 1. code_verifier is marked as required, but it's NOT needed when the token was
                //    generated with hint: 'cross_device' (which is what requestReset uses)
                // 2. user_id is NOT in the spec, but it IS required for the API call to succeed
                // We create a custom type to match the actual API requirements.
                type ResetPasswordBody = NonNullable<Parameters<typeof shopperLoginClient.resetPassword>[0]>['body'];
                type ResetPasswordBodyWithUserIdNoCodeVerifier = Omit<ResetPasswordBody, 'code_verifier'> & {
                    user_id: string;
                };

                const body: ResetPasswordBodyWithUserIdNoCodeVerifier = {
                    client_id: clientId,
                    user_id: userId,
                    pwd_action_token: token,
                    new_password: newPassword,
                    channel_id: siteId,
                };

                // For private client, include client secret in auth header
                if (isPrivateClient && clientSecret) {
                    return shopperLoginClient.resetPassword({
                        params: {
                            header: {
                                Authorization: createBasicAuthHeader(clientId, clientSecret),
                            },
                        },
                        headers: FORM_URLENCODED_HEADER,
                        // Use type assertion to bypass SDK's code_verifier requirement since we're using cross_device hint
                        body: body as unknown as ResetPasswordBody,
                    });
                }

                return shopperLoginClient.resetPassword({
                    params: {},
                    headers: FORM_URLENCODED_HEADER,
                    // Use type assertion to bypass SDK's code_verifier requirement since we're using cross_device hint
                    body: body as unknown as ResetPasswordBody,
                });
            },
        },
    };
}
