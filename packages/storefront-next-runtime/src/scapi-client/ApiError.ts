/**
 * Custom error class for API errors
 *
 * This error is thrown when an API request returns a non-2xx status code.
 * It includes comprehensive information about the error including the parsed
 * and raw response bodies, headers, status code, and request details.
 *
 * @typeParam TBody - The type of the error response body (inferred from OpenAPI spec)
 *
 * @example
 * ```typescript
 * try {
 *   const { data } = await client.getProduct({ params: { path: { id: 'invalid' } } });
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(error.status); // 404
 *     console.log(error.statusText); // "Not Found"
 *     console.log(error.body); // Typed error response
 *     console.log(error.rawBody); // Raw response text
 *     console.log(error.headers.get('content-type')); // Access headers
 *     console.log(error.url); // Request URL
 *     console.log(error.method); // HTTP method
 *   }
 * }
 * ```
 */
export class ApiError<TBody = unknown> extends Error {
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
     * Parsed response body
     * Automatically parsed from JSON if possible, otherwise contains the raw text
     */
    readonly body: TBody;

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
     * @param options.body - Parsed response body
     * @param options.rawBody - Raw response body text
     * @param options.url - Request URL
     * @param options.method - HTTP method
     */
    constructor(options: {
        status: number;
        statusText: string;
        headers: Headers;
        body: TBody;
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
