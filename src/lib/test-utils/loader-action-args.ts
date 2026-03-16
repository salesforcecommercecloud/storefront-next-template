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
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

/**
 * Options for creating loader or action function args in tests.
 */
export interface LoaderActionArgsOptions {
    /** Route params (e.g. { productId: '123' }). Defaults to {}. */
    params?: Record<string, string | undefined>;
    /** The route pattern (unstable_pattern). Required for React Router v7 type compatibility. */
    unstable_pattern: string;
}

/**
 * Creates a LoaderFunctionArgs object for testing route loaders.
 * Reduces duplication and ensures unstable_pattern is always set.
 *
 * @param request - The request object
 * @param context - The router context (e.g. from createTestContext())
 * @param options - Options including params and unstable_pattern
 * @returns A complete LoaderFunctionArgs object
 *
 * @example
 * ```ts
 * const args = createLoaderArgs(mockRequest, mockContext, {
 *   unstable_pattern: '/login',
 * });
 * const result = await loader(args);
 * ```
 */
export function createLoaderArgs(
    request: Request,
    context: LoaderFunctionArgs['context'],
    options: LoaderActionArgsOptions
): LoaderFunctionArgs {
    return {
        request,
        context,
        params: options.params ?? {},
        unstable_pattern: options.unstable_pattern,
    };
}

/**
 * Creates an ActionFunctionArgs object for testing route actions.
 * Reduces duplication and ensures unstable_pattern is always set.
 *
 * @param request - The request object
 * @param context - The router context (e.g. from createTestContext())
 * @param options - Options including params and unstable_pattern
 * @returns A complete ActionFunctionArgs object
 *
 * @example
 * ```ts
 * const args = createActionArgs(mockRequest, mockContext, {
 *   unstable_pattern: '/action/update-marketing-consent',
 * });
 * const result = await action(args);
 * ```
 */
export function createActionArgs(
    request: Request,
    context: ActionFunctionArgs['context'],
    options: LoaderActionArgsOptions
): ActionFunctionArgs {
    return {
        request,
        context,
        params: options.params ?? {},
        unstable_pattern: options.unstable_pattern,
    };
}
