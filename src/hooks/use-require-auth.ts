/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/providers/auth';
import { useToast } from '@/components/toast';
import uiStrings from '@/temp-ui-string';

export interface RequireAuthOptions {
    actionName: string;
    getActionParams?: (...args: unknown[]) => Record<string, unknown>;
    getReturnUrl?: () => string;
    toastMessage?: string;
}

/**
 * Hook that wraps an action function to require authentication.
 * If the user is not authenticated, shows a toast with Sign In and Sign Up buttons,
 * preserves the action metadata, and redirects to auth pages with returnUrl.
 *
 * After authentication, the action will be automatically executed.
 *
 * @example
 * ```tsx
 * const handleAddToWishlist = useRequireAuth(
 *   async (productId: string) => {
 *     await addToWishlist(productId);
 *   },
 *   {
 *     actionName: 'addToWishlist',
 *     getActionParams: (productId) => ({ productId }),
 *     getReturnUrl: () => window.location.pathname,
 *     toastMessage: 'Sign in to add items to your wishlist'
 *   }
 * );
 * ```
 */
export function useRequireAuth<T extends (...args: unknown[]) => Promise<unknown>>(
    action: T,
    options: RequireAuthOptions
): T {
    const session = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();

    return useCallback(
        async (...args: Parameters<T>) => {
            // Re-check auth state in case it changed (e.g., after signup/login)
            const currentIsAuthenticated = Boolean(
                session?.userType === 'registered' && session?.customer_id && session?.access_token
            );

            // If authenticated, execute action immediately
            if (currentIsAuthenticated) {
                return action(...args);
            }

            // Preserve action metadata - encode in returnUrl (URL-based approach)
            const actionParams = options.getActionParams?.(...args) || {};
            const baseReturnUrl = options.getReturnUrl?.() || window.location.pathname;

            // Build returnUrl with action params embedded (URL-based approach)
            const returnUrlWithAction = new URL(baseReturnUrl, window.location.origin);
            returnUrlWithAction.searchParams.set('action', options.actionName);
            if (Object.keys(actionParams).length > 0) {
                returnUrlWithAction.searchParams.set('actionParams', JSON.stringify(actionParams));
            }
            const encodedReturnUrl = returnUrlWithAction.pathname + returnUrlWithAction.search;

            // Build auth URLs with encoded returnUrl
            const baseAuthUrl = (path: string) => {
                const url = new URL(path, window.location.origin);
                url.searchParams.set('returnUrl', encodedReturnUrl);
                return url.pathname + url.search;
            };

            const loginUrl = baseAuthUrl('/login');
            const signupUrl = baseAuthUrl('/signup');

            // Show toast with Sign In and Sign Up buttons
            addToast(options.toastMessage || uiStrings.product.signInToContinue, 'info', {
                duration: 8000, // Longer duration for actionable toast
                action: {
                    label: uiStrings.header.signIn,
                    onClick: () => {
                        void navigate(loginUrl);
                    },
                },
                cancel: {
                    label: uiStrings.login.signUp || 'Sign Up',
                    onClick: () => {
                        void navigate(signupUrl);
                    },
                },
            });

            // Return a rejected promise to indicate action was intercepted
            // Note: This error is internal and won't be displayed to users
            return Promise.reject(new Error('Authentication required'));
        },
        [session, action, options, navigate, addToast]
    ) as T;
}
