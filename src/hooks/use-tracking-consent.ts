import { useMemo, useState, useEffect } from 'react';
import { useConfig } from '@/config/get-config';
import { useAuth } from '@/providers/auth';
import { getAuthDataFromCookies, handleRefreshToken } from '@/middlewares/auth.client';
import { TrackingConsent } from '@/types/tracking-consent';

/**
 * Hook for managing tracking consent functionality.
 * Provides utilities for reading and setting tracking consent values, checking if banner should be shown,
 * and managing the consent flow.
 *
 * ⚠️ **Client-only hook**: This hook uses React Context (`useConfig`, `useAuth`) and browser APIs
 * (`document.cookie`), so it can only be used in client components. Mark your component with
 * `'use client'` directive.
 *
 * @returns Object containing tracking consent state and utility functions
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * export function MyComponent() {
 *   const { trackingConsent, isTrackingConsentEnabled, shouldShowBanner, setTrackingConsent } = useTrackingConsent();
 *
 *   if (shouldShowBanner) {
 *     // Show consent banner
 *   }
 *
 *   const handleAccept = () => {
 *     setTrackingConsent(TrackingConsent.Accepted); // User accepts tracking
 *   };
 * }
 * ```
 */
export function useTrackingConsent() {
    const config = useConfig();
    const auth = useAuth();

    // Extract tracking consent config to avoid repeated property access
    const trackingConsentConfig = useMemo(
        () => config.engagement?.analytics?.trackingConsent,
        [config.engagement?.analytics?.trackingConsent]
    );

    // Check if tracking consent is enabled (use config from hook, not getConfig() which doesn't work in React components)
    const isTrackingConsentEnabled = useMemo(() => {
        return trackingConsentConfig?.enabled ?? false;
    }, [trackingConsentConfig?.enabled]);

    // Track if user has responded in this session (for immediate banner dismissal)
    const [hasResponded, setHasResponded] = useState(false);

    // Read tracking consent value from auth context (source of truth for showing banner)
    // Auth context is synced with cookies by middleware, so this reflects current cookie state
    // SessionData.trackingConsent is already TrackingConsent enum (read at cookie boundary)
    const trackingConsent = useMemo(() => {
        if (!isTrackingConsentEnabled) {
            return undefined;
        }
        return auth?.trackingConsent;
    }, [auth?.trackingConsent, isTrackingConsentEnabled]);

    // Reset hasResponded when auth context shows no tracking consent value (e.g., after logout/login)
    // This allows banner to show again if needed
    useEffect(() => {
        if (!isTrackingConsentEnabled) {
            setHasResponded(false);
            return;
        }
        // If auth context shows no tracking consent value, reset hasResponded so banner can show again
        if (trackingConsent === undefined) {
            setHasResponded(false);
        }
    }, [trackingConsent, isTrackingConsentEnabled]);

    // Determine if banner should be shown
    // Banner shows if: feature is enabled AND user hasn't responded (no tracking consent value in auth context)
    // We hide immediately when user responds (hasResponded), but rely on auth context to show it
    const shouldShowBanner = useMemo(() => {
        if (!isTrackingConsentEnabled) {
            return false;
        }
        // Show banner if no tracking consent value exists in auth context AND user hasn't responded in this session
        return trackingConsent === undefined && !hasResponded;
    }, [isTrackingConsentEnabled, trackingConsent, hasResponded]);

    // Get default tracking consent value from config
    const defaultTrackingConsent = useMemo(() => {
        return trackingConsentConfig?.defaultTrackingConsent ?? TrackingConsent.Declined;
    }, [trackingConsentConfig?.defaultTrackingConsent]);

    /**
     * Set tracking consent value by refreshing the SLAS token with the new tracking consent preference.
     * This updates the server-side token and cookie.
     * Hides banner immediately when user responds, then relies on auth context to show it again if needed.
     *
     * @param consent - TrackingConsent.Accepted if user accepts tracking, TrackingConsent.Declined if declined
     * @returns Promise that resolves when token refresh completes
     */
    const setTrackingConsent = async (consent: TrackingConsent): Promise<void> => {
        if (!isTrackingConsentEnabled) {
            return;
        }

        // Get refresh token from auth data
        // Auth is always initialized before page becomes interactive, so refresh token will always exist
        const authData = getAuthDataFromCookies();
        const refreshToken = authData?.refresh_token;

        if (!refreshToken) {
            throw new Error('No refresh token available. User must be authenticated.');
        }

        // Hide banner when user responds
        setHasResponded(true);

        // Server will set dw_dnt cookie via Set-Cookie header (server is source of truth)
        // Auth context will update on next navigation/revalidation, but we don't need to wait
        await handleRefreshToken(refreshToken, consent);
    };

    return {
        trackingConsent,
        isTrackingConsentEnabled,
        shouldShowBanner,
        setTrackingConsent,
        defaultTrackingConsent,
    };
}
