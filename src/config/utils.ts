/**
 * Configuration utility functions
 */

/**
 * Parse JSON from environment variable with fallback
 * Used for complex values like arrays that need to be passed as JSON strings
 *
 * @example
 * parseEnvJson(process.env.PUBLIC_SOCIAL_IDPS, ['Apple', 'Google'])
 */
export const parseEnvJson = <T>(envVar: string | undefined, fallback: T): T => {
    if (!envVar) return fallback;
    try {
        return JSON.parse(envVar);
    } catch {
        return fallback;
    }
};
