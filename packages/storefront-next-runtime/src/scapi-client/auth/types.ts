/*
 * Copyright (c) 2024, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Client } from 'openapi-fetch';
import type { ShopperLogin } from '../types';
import type { ProxyClient } from '../proxy-types';
import type { operations as shopperLoginOps } from '../generated/shopper-login-v1.operations';

/**
 * Re-export TokenResponse from the generated SLAS types for convenience.
 * This is the response structure returned by all auth methods.
 */
export type TokenResponse = ShopperLogin.schemas['TokenResponse'];

/**
 * The ShopperLogin client type used internally by auth helpers.
 */
export type ShopperLoginClient = ProxyClient<Client<ShopperLogin.endpoints>, typeof shopperLoginOps>;

/**
 * Configuration required to create auth helpers.
 *
 * These parameters are provided at client creation time and are used
 * by all auth methods automatically.
 */
export interface AuthConfig {
    /** The configured ShopperLogin client instance */
    shopperLoginClient: ShopperLoginClient;
    /** SLAS client ID */
    clientId: string;
    /** SLAS client secret (required for private client operations) */
    clientSecret?: string;
    /** OAuth redirect URI - must be registered in SLAS */
    redirectUri: string;
    /** Commerce Cloud organization ID */
    organizationId: string;
    /** Commerce Cloud site ID (channel ID) */
    siteId: string;
    /** Base URL for Commerce API (e.g., 'https://{shortCode}.api.commercecloud.salesforce.com') */
    baseUrl: string;
}

/**
 * Options for guest login.
 */
export interface LoginAsGuestOptions {
    /** Unique Shopper Identifier to link to a previous session */
    usid?: string;
    /** Enable Do Not Track for the user */
    dnt?: boolean;
}

/**
 * Options for registered user login with credentials.
 */
export interface LoginWithCredentialsOptions {
    /** User's email/username */
    username: string;
    /** User's password */
    password: string;
    /** Unique Shopper Identifier to link to a previous session */
    usid?: string;
    /** Enable Do Not Track for the user */
    dnt?: boolean;
}

/**
 * Options for refreshing an access token.
 */
export interface RefreshTokenOptions {
    /** The refresh token to exchange for a new access token */
    refreshToken: string;
    /** Enable Do Not Track for the user */
    dnt?: boolean;
}

/**
 * Options for logging out a user.
 */
export interface LogoutOptions {
    /** The current access token */
    accessToken: string;
    /** The current refresh token */
    refreshToken: string;
}

/**
 * Options for initiating passwordless login.
 */
export interface PasswordlessAuthorizeOptions {
    /** User identifier (email or phone) */
    userId: string;
    /** Callback URI for the magic link (required for 'callback' mode) */
    callbackUri?: string;
    /** Unique Shopper Identifier to link to a previous session */
    usid?: string;
    /** Login mode: 'callback' for magic link, 'sms' for SMS code */
    mode?: 'callback' | 'sms';
}

/**
 * Options for exchanging a passwordless login token for access tokens.
 */
export interface PasswordlessExchangeTokenOptions {
    /** The passwordless login token from the magic link */
    pwdlessLoginToken: string;
    /** Unique Shopper Identifier to link to a previous session */
    usid?: string;
    /** Enable Do Not Track for the user */
    dnt?: boolean;
}

/**
 * Options for requesting a password reset.
 */
export interface PasswordRequestResetOptions {
    /** User's email address */
    userId: string;
    /** Callback URI for the password reset link */
    callbackUri: string;
}

/**
 * Options for resetting a password with a token.
 */
export interface PasswordResetOptions {
    /** User's email address */
    userId: string;
    /** Password reset token from the magic link */
    token: string;
    /** New password to set */
    newPassword: string;
}

/**
 * Options for getting a social login authorization URL.
 */
export interface SocialGetAuthorizationUrlOptions {
    /**
     * The identity provider hint (e.g., 'google', 'facebook', 'apple').
     * This determines which social login provider to redirect to.
     */
    hint: string;
    /** Override the default redirect URI for this request */
    redirectUri?: string;
    /** Unique Shopper Identifier to link to a previous session */
    usid?: string;
}

/**
 * Result from getAuthorizationUrl containing the redirect URL and code verifier.
 */
export interface SocialAuthorizationUrlResult {
    /** The URL to redirect the user to for social login */
    url: string;
    /**
     * The PKCE code verifier that must be stored and passed to exchangeCode().
     * Store this securely (e.g., in an httpOnly cookie) until the user returns.
     */
    codeVerifier: string;
}

/**
 * Options for exchanging a social login authorization code for tokens.
 */
export interface SocialExchangeCodeOptions {
    /** The authorization code from the social provider callback */
    code: string;
    /** The PKCE code verifier from getAuthorizationUrl() */
    codeVerifier: string;
    /** The redirect URI that was used for authorization (must match) */
    redirectUri: string;
    /** Unique Shopper Identifier to link to a previous session */
    usid?: string;
    /** Enable Do Not Track for the user */
    dnt?: boolean;
}

/**
 * Social/IDP login namespace.
 * Provides methods for social login via identity providers (Google, Facebook, Apple, etc.).
 */
export interface SocialNamespace {
    /**
     * Get the authorization URL for social login.
     *
     * Generates a PKCE code verifier and returns the URL to redirect the user to.
     * The code verifier must be stored securely and passed to exchangeCode() after
     * the user returns from the social provider.
     *
     * @param options - The IDP hint and optional parameters
     * @returns Promise resolving to the authorization URL and code verifier
     *
     * @example
     * ```typescript
     * const { url, codeVerifier } = await clients.auth.social.getAuthorizationUrl({
     *   hint: 'google',
     * });
     * // Store codeVerifier in httpOnly cookie
     * // Redirect user to url
     * ```
     */
    getAuthorizationUrl(options: SocialGetAuthorizationUrlOptions): Promise<SocialAuthorizationUrlResult>;

    /**
     * Exchange an authorization code from a social provider for access tokens.
     *
     * Called after the user returns from the social provider with an authorization code.
     * Requires the code verifier that was returned from getAuthorizationUrl().
     *
     * @param options - The authorization code, code verifier, and redirect URI
     * @returns Promise resolving to TokenResponse with access and refresh tokens
     *
     * @example
     * ```typescript
     * const tokens = await clients.auth.social.exchangeCode({
     *   code: callbackParams.code,
     *   codeVerifier: storedCodeVerifier,
     *   redirectUri: 'https://example.com/social-callback',
     * });
     * ```
     */
    exchangeCode(options: SocialExchangeCodeOptions): Promise<TokenResponse>;
}

/**
 * Passwordless login namespace.
 * Only available when clientSecret is configured (private SLAS client).
 */
export interface PasswordlessNamespace {
    /**
     * Initiate passwordless login by sending a magic link to the user.
     *
     * @param options - User identifier and callback configuration
     * @returns Promise resolving to the API response (inferred from ShopperLogin client)
     */
    authorize(options: PasswordlessAuthorizeOptions): ReturnType<ShopperLoginClient['authorizePasswordlessCustomer']>;

    /**
     * Exchange a passwordless login token for access tokens.
     *
     * Similar to social.exchangeCode(), this returns the unwrapped TokenResponse
     * for direct use with session management (e.g., updateAuth).
     *
     * @param options - The passwordless token and optional parameters
     * @returns Promise resolving to TokenResponse with access and refresh tokens
     */
    exchangeToken(options: PasswordlessExchangeTokenOptions): Promise<TokenResponse>;
}

/**
 * Password management namespace.
 */
export interface PasswordNamespace {
    /**
     * Request a password reset token to be sent to the user's email.
     *
     * @param options - User email and callback URI
     * @returns Promise resolving to the API response (inferred from ShopperLogin client)
     */
    requestReset(options: PasswordRequestResetOptions): ReturnType<ShopperLoginClient['getPasswordResetToken']>;

    /**
     * Reset a user's password using a reset token.
     *
     * @param options - Email, reset token, and new password
     * @returns Promise resolving to the API response (inferred from ShopperLogin client)
     */
    reset(options: PasswordResetOptions): ReturnType<ShopperLoginClient['resetPassword']>;
}

/**
 * Core authentication namespace.
 *
 * Provides methods for authentication operations:
 * - Guest login (public or private client)
 * - Registered user login with credentials
 * - Token refresh
 * - Logout
 * - Passwordless login (via `passwordless` sub-namespace)
 * - Password reset (via `password` sub-namespace)
 *
 * All methods that complete login return a TokenResponse containing access_token, refresh_token, etc.
 */
export interface AuthNamespace {
    /**
     * Login as a guest user.
     *
     * For public SLAS clients, uses PKCE (Proof Key for Code Exchange) flow.
     * For private SLAS clients (with clientSecret), uses client_credentials grant.
     *
     * @param options - Optional parameters for guest login
     * @returns Promise resolving to TokenResponse with access and refresh tokens
     *
     * @example
     * ```typescript
     * // Simple guest login
     * const tokens = await clients.auth.loginAsGuest();
     *
     * // With session linking
     * const tokens = await clients.auth.loginAsGuest({ usid: 'previous-session-id' });
     * ```
     */
    loginAsGuest(options?: LoginAsGuestOptions): Promise<TokenResponse>;

    /**
     * Login with username and password credentials.
     *
     * Uses the B2C registered user login flow with PKCE.
     * For private SLAS clients, the client secret is used for enhanced security.
     *
     * @param credentials - User credentials and optional parameters
     * @returns Promise resolving to TokenResponse with access and refresh tokens
     *
     * @example
     * ```typescript
     * const tokens = await clients.auth.loginWithCredentials({
     *   username: 'user@example.com',
     *   password: 'password123'
     * });
     * ```
     */
    loginWithCredentials(credentials: LoginWithCredentialsOptions): Promise<TokenResponse>;

    /**
     * Refresh an access token using a refresh token.
     *
     * Use this to obtain a new access token when the current one expires.
     * The refresh token has a longer lifetime (typically 30 days).
     *
     * @param options - The refresh token and optional parameters
     * @returns Promise resolving to TokenResponse with new tokens
     *
     * @example
     * ```typescript
     * const newTokens = await clients.auth.refreshToken({
     *   refreshToken: storedRefreshToken
     * });
     * ```
     */
    refreshToken(options: RefreshTokenOptions): Promise<TokenResponse>;

    /**
     * Logout a shopper and revoke tokens.
     *
     * Revokes both the access token and refresh token.
     * After logout, the tokens can no longer be used.
     *
     * @param options - The access and refresh tokens to revoke
     * @returns Promise resolving to TokenResponse
     *
     * @example
     * ```typescript
     * await clients.auth.logout({
     *   accessToken: currentAccessToken,
     *   refreshToken: currentRefreshToken
     * });
     * ```
     */
    logout(options: LogoutOptions): Promise<TokenResponse>;

    /**
     * Social/IDP login namespace.
     * Provides methods for social login via Google, Facebook, Apple, etc.
     *
     * @example
     * ```typescript
     * // Step 1: Get authorization URL and redirect user
     * const { url, codeVerifier } = await clients.auth.social.getAuthorizationUrl({
     *   hint: 'google',
     * });
     * // Store codeVerifier securely, then redirect user to url
     *
     * // Step 2: After user returns, exchange code for tokens
     * const tokens = await clients.auth.social.exchangeCode({
     *   code: callbackParams.code,
     *   codeVerifier: storedCodeVerifier,
     *   redirectUri: 'https://example.com/social-callback',
     * });
     * ```
     */
    social: SocialNamespace;

    /**
     * Passwordless login namespace.
     * Only available when clientSecret is configured (private SLAS client).
     *
     * @example
     * ```typescript
     * // Send magic link
     * await clients.auth.passwordless.authorize({
     *   userId: 'user@example.com',
     *   callbackUri: 'https://example.com/passwordless-callback',
     *   mode: 'callback'
     * });
     *
     * // Exchange token from magic link
     * const tokens = await clients.auth.passwordless.exchangeToken({
     *   pwdlessLoginToken: tokenFromUrl
     * });
     * ```
     */
    passwordless: PasswordlessNamespace;

    /**
     * Password management namespace.
     *
     * @example
     * ```typescript
     * // Request password reset
     * await clients.auth.password.requestReset({
     *   userId: 'user@example.com',
     *   callbackUri: 'https://example.com/reset-password'
     * });
     *
     * // Reset password with token
     * await clients.auth.password.reset({
     *   userId: 'user@example.com',
     *   token: tokenFromUrl,
     *   newPassword: 'newSecurePassword123'
     * });
     * ```
     */
    password: PasswordNamespace;
}
