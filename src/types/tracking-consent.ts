/**
 * TrackingConsent enum for managing user tracking preferences.
 *
 * Values match the cookie format directly ('0' or '1') to minimize conversions.
 * - '0' = Tracking accepted (user allows tracking)
 * - '1' = Tracking declined (user declines tracking, "do not track")
 *
 * This replaces the confusing boolean DNT system where `dnt: false` meant tracking was allowed.
 */
export enum TrackingConsent {
    /** User has accepted tracking (dw_dnt='0', SLAS dnt=false) */
    Accepted = '0',
    /** User has declined tracking (dw_dnt='1', SLAS dnt=true) */
    Declined = '1',
}

/**
 * Convert TrackingConsent enum to boolean for SLAS API calls.
 *
 * The SLAS API expects a boolean `dnt` parameter where:
 * - false = tracking allowed
 * - true = tracking declined (do not track)
 *
 * @param consent - TrackingConsent enum value
 * @returns boolean value for SLAS API (false for Accepted, true for Declined)
 *
 * @example
 * trackingConsentToBoolean(TrackingConsent.Accepted) // Returns false
 * trackingConsentToBoolean(TrackingConsent.Declined) // Returns true
 */
export function trackingConsentToBoolean(consent: TrackingConsent): boolean {
    return consent === TrackingConsent.Declined;
}

/**
 * Convert boolean from JWT token to TrackingConsent enum.
 *
 * JWT tokens contain a boolean `dnt` claim where:
 * - false = tracking allowed
 * - true = tracking declined (do not track)
 *
 * @param value - Boolean value from JWT token
 * @returns TrackingConsent enum value
 *
 * @example
 * booleanToTrackingConsent(false) // Returns TrackingConsent.Accepted
 * booleanToTrackingConsent(true) // Returns TrackingConsent.Declined
 */
export function booleanToTrackingConsent(value: boolean): TrackingConsent {
    return value ? TrackingConsent.Declined : TrackingConsent.Accepted;
}
