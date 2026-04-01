/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { extractResponseError, getErrorMessage } from '@/lib/utils';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

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
        // ApiError from SCAPI client has body/rawBody, not response - use getErrorMessage
        if (error instanceof ApiError) {
            const message = getErrorMessage(error);
            return {
                responseMessage: message,
                status_code: String(error.status),
                type: error.body?.type,
            };
        }
        return await extractResponseError(error);
    } catch {
        return {
            responseMessage: error instanceof Error ? error.message : 'An unexpected error occurred',
            status_code: undefined,
            type: undefined,
        };
    }
}

/**
 * Creates a standardized error response for API actions
 * Handles ApiError (SCAPI client) and legacy ResponseError
 */
export async function createErrorResponse(error: unknown, step?: string, status: number = 500): Promise<Response> {
    // ApiError from SCAPI client - extract user-friendly message from body/rawBody
    if (error instanceof ApiError) {
        const message = getErrorMessage(error);
        const httpStatus = error.status >= 400 && error.status < 600 ? error.status : status;
        return Response.json(
            {
                success: false,
                error: message || 'An unexpected error occurred',
                step,
            },
            { status: httpStatus }
        );
    }

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
