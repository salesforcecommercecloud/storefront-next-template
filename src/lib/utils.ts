import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Json } from '+types/lang';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const stringToBase64 =
    typeof window === 'object' && typeof window.document === 'object'
        ? (unencoded: string): string => btoa(unencoded)
        : (unencoded: string): string => Buffer.from(unencoded).toString('base64');

export const isSlasPrivate = import.meta.env.VITE_COMMERCE_API_SLAS_PRIVATE === 'true';

export const validatePassword = (password: string) => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[,!%#@$&*()_+\-=[\]{};':"\\|.<>/?]/.test(password),
});

export const isPasswordValid = (password: string) => {
    const validation = validatePassword(password);
    return Object.values(validation).every(Boolean);
};

/**
 * This method extracts the status and message from a ResponseError that is returned
 * by commerce-sdk-isomorphic.
 *
 * commerce-sdk-isomorphic throws a `ResponseError`, but doesn't export the class.
 * We can't use `instanceof`, so instead we just check for the `response` property
 * and assume it is a `ResponseError` if a response is present
 *
 * Once commerce-sdk-isomorphic exports `ResponseError` we can revisit if this method is
 * still required.
 * @throws error if the error is not a ResponseError
 */
export const extractResponseError = async (
    error: unknown
): Promise<{
    status_code: string | undefined;
    type?: string | undefined;
    responseMessage: string | undefined;
    [key: string]: Json | undefined;
}> => {
    // the regular error.message will return only the generic status code message
    // i.e. 'Bad Request' for 400. We need to drill specifically into the ResponseError
    // to get a more descriptive error message from SLAS
    if (error instanceof Error && 'response' in error) {
        const json = (await (error.response as Response).json()) ?? {};
        const { type, status_code, ...rest } = json;

        // TODO: This sort of anticipation of how the user might want the API response to be interpreted
        //  as error message, isn't necessarily a good idea. It's better to pass all properties to the user
        //  let the user decide how to format the error.
        // Extract error message from various possible fields in the API response
        // Salesforce Commerce Cloud API can return error details in different fields
        const responseMessage = (json.message || json.detail || json.title || error.message) as string;

        return {
            status_code,
            type,
            // If we have a structured error with title and detail, combine them for better UX
            responseMessage:
                json.title && json.detail && json.title !== json.detail
                    ? `${json.title}: ${json.detail}`
                    : responseMessage,
            ...rest,
        };
    }
    throw error;
};

/**
 * Returns the application's origin.
 *
 * This function is isomorphic, it can be used on the client and server.
 *
 * On the server, it will return the origin derived from the process.env.EXTERNAL_DOMAIN_NAME (available on MRT)
 * On the client, it will return the window.location.origin
 */
export const getAppOrigin = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    const { EXTERNAL_DOMAIN_NAME } = process.env;
    if (!EXTERNAL_DOMAIN_NAME) {
        throw new Error('Environment variable: "EXTERNAL_DOMAIN_NAME" is not set.');
    }

    const isLocalhost = EXTERNAL_DOMAIN_NAME?.includes('localhost');
    const protocol = isLocalhost ? 'http' : 'https';
    return `${protocol}://${EXTERNAL_DOMAIN_NAME}`;
};
