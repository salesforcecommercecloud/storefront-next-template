/**
 * Standard RFC 7807 Problem Details error structure
 * This is the default structure returned by most Salesforce Commerce APIs
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ErrorDetail {
    /** A URI reference that identifies the problem type */
    type: string;
    /** A short, human-readable summary of the problem type */
    title: string;
    /** A human-readable explanation specific to this occurrence of the problem */
    detail: string;
    /** Additional properties that may be included in the error response */
    [key: string]: unknown;
}

/**
 * Custom error class for API errors
 *
 * This error is thrown when an API request returns a non-2xx status code.
 * It includes comprehensive information about the error including the parsed
 * and raw response bodies, headers, status code, and request details.
 *
 * The error body is always typed as ErrorDetail (RFC 7807), which matches
 * the standard error format used by Salesforce Commerce APIs. If the response
 * cannot be parsed as JSON, an empty ErrorDetail object is returned.
 *
 * @example
 * ```typescript
 * try {
 *   const { data } = await client.getProduct({ params: { path: { id: 'invalid' } } });
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(error.status); // 404
 *     console.log(error.statusText); // "Not Found"
 *     console.log(error.body.title); // "Product Not Found" (always typed!)
 *     console.log(error.body.detail); // Detailed error message (always typed!)
 *     console.log(error.rawBody); // Raw response text
 *     console.log(error.headers.get('content-type')); // Access headers
 *     console.log(error.url); // Request URL
 *     console.log(error.method); // HTTP method
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
    /**
     * HTTP status code (e.g., 404, 500)
     */
    readonly status: number;

    /**
     * HTTP status text (e.g., "Not Found", "Internal Server Error")
     */
    readonly statusText: string;

    /**
     * Response headers
     */
    readonly headers: Headers;

    /**
     * Parsed response body as ErrorDetail
     * Automatically parsed from JSON if the response is valid JSON.
     * If parsing fails, returns an empty ErrorDetail object with empty strings.
     */
    readonly body: ErrorDetail;

    /**
     * Raw response body as text
     * Useful for debugging when the body couldn't be parsed as JSON
     */
    readonly rawBody: string;

    /**
     * Request URL that caused the error
     */
    readonly url: string;

    /**
     * HTTP method used for the request (e.g., "GET", "POST")
     */
    readonly method: string;

    /**
     * Creates an ApiError instance
     *
     * @param options - Error details
     * @param options.status - HTTP status code
     * @param options.statusText - HTTP status message
     * @param options.headers - Response headers
     * @param options.body - Parsed response body as ErrorDetail
     * @param options.rawBody - Raw response body text
     * @param options.url - Request URL
     * @param options.method - HTTP method
     */
    constructor(options: {
        status: number;
        statusText: string;
        headers: Headers;
        body: ErrorDetail;
        rawBody: string;
        url: string;
        method: string;
    }) {
        // Create a descriptive error message
        const message = `API Error ${options.status}: ${options.statusText} (${options.method} ${options.url})`;
        super(message);

        this.name = 'ApiError';
        this.status = options.status;
        this.statusText = options.statusText;
        this.headers = options.headers;
        this.body = options.body;
        this.rawBody = options.rawBody;
        this.url = options.url;
        this.method = options.method;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }

    /**
     * Returns a JSON representation of the error
     * Useful for logging and debugging
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            statusText: this.statusText,
            body: this.body,
            rawBody: this.rawBody,
            url: this.url,
            method: this.method,
            // Convert headers to a plain object for JSON serialization
            headers: Object.fromEntries(this.headers.entries()),
        };
    }
}
