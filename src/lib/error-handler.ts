import { extractResponseError } from '@/lib/utils';

/**
 * Extracts error details from Commerce Cloud API responses
 * Uses the existing extractResponseError utility for consistent error parsing
 */
export async function extractApiErrorDetails(error: unknown): Promise<{
    responseMessage?: string;
    status_code?: string;
    type?: string;
    [key: string]: unknown;
}> {
    try {
        // Use the existing utility to extract error details - matches project pattern
        return await extractResponseError(error);
    } catch {
        // Fallback if extractResponseError fails (non-ResponseError)
        return {
            responseMessage: error instanceof Error ? error.message : 'An unexpected error occurred',
            status_code: undefined,
            type: undefined,
        };
    }
}

/**
 * Creates a standardized error response for API actions
 * Uses extractResponseError directly following project patterns
 */
export async function createErrorResponse(error: unknown, step?: string, status: number = 500): Promise<Response> {
    try {
        const { responseMessage } = await extractResponseError(error);
        return Response.json(
            {
                success: false,
                error: responseMessage || 'An unexpected error occurred',
                step,
            },
            { status }
        );
    } catch {
        // Fallback for non-ResponseError cases
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return Response.json(
            {
                success: false,
                error: errorMessage,
                step,
            },
            { status }
        );
    }
}

// Note: Form validation is now handled by Zod schemas in checkout-schemas.ts
// This provides better type safety and more robust validation than custom regex patterns
