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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { encodeBase64Url } from '@/lib/url';
import { action, loader, type ApiResponse } from './resource.api.client.$resource';
import { createTestContext } from '@/lib/test-utils';
import { extractResponseError, getErrorMessage } from '@/lib/utils';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

// Mock dependencies
vi.mock('@/middlewares/auth.server');
vi.mock('@/middlewares/auth.client');
vi.mock('@/lib/utils', () => ({
    extractResponseError: vi.fn(),
    getErrorMessage: vi.fn(),
    getAppOrigin: vi.fn(() => 'https://example.com'),
}));

// Type the mocked functions
const mockShopperCustomersGetCustomer = vi.fn();
const mockShopperCustomersUpdateCustomer = vi.fn();
const mockShopperBasketsAddItemToBasket = vi.fn();
const mockExtractResponseError = vi.mocked(extractResponseError);
const mockGetErrorMessage = vi.mocked(getErrorMessage);

// Mock the createApiClients function
vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(() => ({
        shopperCustomers: {
            getCustomer: mockShopperCustomersGetCustomer,
            updateCustomer: mockShopperCustomersUpdateCustomer,
        },
        shopperBasketsV2: {
            addItemToBasket: mockShopperBasketsAddItemToBasket,
        },
    })),
}));

describe('Commerce SDK resource', () => {
    const validResource = [
        'shopperCustomers',
        'getCustomer',
        {
            params: {
                path: { customerId: 'customer-123' },
            },
        },
    ];
    const encodedValidResource = encodeBase64Url(JSON.stringify(validResource));
    const mockResponseData = { customerId: 'customer-123', email: 'test@example.com' };
    let mockContextProvider: ReturnType<typeof createTestContext>;

    beforeEach(() => {
        mockShopperCustomersGetCustomer.mockClear();
        mockShopperCustomersUpdateCustomer.mockClear();
        mockShopperBasketsAddItemToBasket.mockClear();
        mockExtractResponseError.mockClear();
        mockGetErrorMessage.mockClear();

        mockContextProvider = createTestContext();

        // New API returns { data, response } format
        mockShopperCustomersGetCustomer.mockResolvedValue({ data: mockResponseData });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('loader()', () => {
        const createLoaderArgs = (resource: string): LoaderFunctionArgs => ({
            params: { resource },
            context: mockContextProvider,
            request: new Request('http://localhost/test'),
        });

        describe('successful requests', () => {
            it('should handle successful loader call', async () => {
                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: true,
                    data: mockResponseData,
                });
            });
        });

        describe('error handling', () => {
            it('should handle invalid resource format - not an array', async () => {
                const args = createLoaderArgs('invalid-encoded-resource');
                const result = await loader(args);
                expect(result).toEqual({
                    success: false,
                    errors: ['The encoded data was not valid for encoding utf-8'],
                });
            });

            it('should handle invalid resource format - wrong array length', async () => {
                const invalid = encodeBase64Url(JSON.stringify(['shopperProducts', 'getProducts']));
                const args = createLoaderArgs(invalid);
                const result = await loader(args);
                expect(result).toEqual({
                    success: false,
                    errors: ['Unexpected resource format'],
                });
            });

            it('should handle ApiError using getErrorMessage', async () => {
                const mockApiError = new ApiError({
                    url: 'https://api.example.com/test',
                    method: 'PUT',
                    status: 400,
                    statusText: 'Bad Request',
                    headers: new Headers(),
                    body: {
                        type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/invalid-customer',
                        title: 'Invalid Customer',
                        detail: 'The current password is incorrect.',
                    },
                    rawBody: JSON.stringify({ message: 'The current password is incorrect.' }),
                });

                mockShopperCustomersGetCustomer.mockRejectedValue(mockApiError);
                mockGetErrorMessage.mockReturnValue('The current password is incorrect.');

                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    errors: ['The current password is incorrect.'],
                });

                expect(mockGetErrorMessage).toHaveBeenCalledWith(mockApiError);
                // extractResponseError should NOT be called for ApiError instances
                expect(mockExtractResponseError).not.toHaveBeenCalled();
            });

            it('should handle fetch client errors with extractResponseError', async () => {
                const mockError = new Error('API Error');
                const mockExtractedError = {
                    status_code: '400',
                    responseMessage: 'Bad Request: Invalid product ID',
                };
                Reflect.set(mockError, 'response', Response.json(mockExtractedError));

                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);
                mockExtractResponseError.mockImplementationOnce(() => Promise.resolve(mockExtractedError));

                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    errors: [mockExtractedError.responseMessage],
                });

                expect(mockExtractResponseError).toHaveBeenCalledWith(mockError);
            });

            it('should handle fetch client errors when extractResponseError fails', async () => {
                const mockError = new Error('Network Error');
                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);
                mockExtractResponseError.mockRejectedValue(new Error('Extract failed'));

                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    errors: ['Network Error'],
                });
            });

            it('should handle unknown errors without message', async () => {
                const mockError = { someProperty: 'unknown error' };
                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);

                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    errors: ['Unknown error'],
                });
            });

            it('should handle loader with null resource parameter', async () => {
                const createLoaderArgsWithNullResource = (): LoaderFunctionArgs => ({
                    params: { resource: null as any },
                    context: mockContextProvider,
                    request: new Request('http://localhost/test'),
                });

                const result = await loader(createLoaderArgsWithNullResource());
                expect(result).toEqual({
                    success: false,
                    errors: ['Unexpected resource format'],
                });
            });

            it('should handle loader with undefined resource parameter', async () => {
                const createLoaderArgsWithUndefinedResource = (): LoaderFunctionArgs => ({
                    params: { resource: undefined as any },
                    context: mockContextProvider,
                    request: new Request('http://localhost/test'),
                });

                const result = await loader(createLoaderArgsWithUndefinedResource());
                expect(result).toEqual({
                    success: false,
                    errors: ['Unexpected resource format'],
                });
            });

            it('should handle loader errors when reason is falsy', async () => {
                // Mock a falsy reason (null, undefined, false, 0, empty string)
                mockShopperCustomersGetCustomer.mockRejectedValue(null);

                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    errors: ['Unknown error'],
                });
            });
        });
    });

    describe('action()', () => {
        const validActionResource = [
            'shopperCustomers',
            'updateCustomer',
            {
                params: {
                    path: { customerId: 'customer-123' },
                },
            },
        ];
        const encodedValidActionResource = encodeBase64Url(JSON.stringify(validActionResource));
        const mockActionResponseData = { customerId: 'customer-123', email: 'updated@example.com' };

        const createActionArgs = (resource: string, formData?: Record<string, string>): ActionFunctionArgs => {
            const body = new URLSearchParams(formData || {}).toString();

            const request = new Request('http://localhost/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            });

            return {
                params: { resource },
                context: mockContextProvider,
                request,
            };
        };

        beforeEach(() => {
            mockShopperCustomersUpdateCustomer.mockResolvedValue({ data: mockActionResponseData });
        });

        describe('successful requests', () => {
            it('should handle successful action call with form data', async () => {
                const formData = { email: 'updated@example.com', firstName: 'John' };
                const result = await action(createActionArgs(encodedValidActionResource, formData));

                expect(result).toEqual({
                    success: true,
                    data: mockActionResponseData,
                });

                // Verify the method was called with merged parameters (new API format)
                expect(mockShopperCustomersUpdateCustomer).toHaveBeenCalledWith({
                    params: {
                        path: { customerId: 'customer-123' },
                    },
                    body: formData,
                });
            });

            it('should handle successful action call without form data', async () => {
                const result = await action(createActionArgs(encodedValidActionResource));

                expect(result).toEqual({
                    success: true,
                    data: mockActionResponseData,
                });

                // Verify the method was called with empty body (new API format)
                expect(mockShopperCustomersUpdateCustomer).toHaveBeenCalledWith({
                    params: {
                        path: { customerId: 'customer-123' },
                    },
                    body: {},
                });
            });

            it('should handle action call with existing body parameter', async () => {
                const resourceWithBody = [
                    'shopperCustomers',
                    'updateCustomer',
                    {
                        params: {
                            path: { customerId: 'customer-123' },
                        },
                        body: { existingData: 'test' },
                    },
                ];
                const encodedResourceWithBody = encodeBase64Url(JSON.stringify(resourceWithBody));
                const formData = { email: 'updated@example.com' };

                const result = await action(createActionArgs(encodedResourceWithBody, formData));

                expect(result).toEqual({
                    success: true,
                    data: mockActionResponseData,
                });

                // Verify the method was called with merged body (new API format)
                // FormData should merge with existing body
                expect(mockShopperCustomersUpdateCustomer).toHaveBeenCalledWith({
                    params: {
                        path: { customerId: 'customer-123' },
                    },
                    body: {
                        existingData: 'test',
                        ...formData,
                    },
                });
            });

            it('should add body parameter when no parameters exist', async () => {
                const resourceWithNoParams = ['shopperCustomers', 'updateCustomer', {}];
                const encodedResourceWithNoParams = encodeBase64Url(JSON.stringify(resourceWithNoParams));
                const formData = { email: 'updated@example.com' };

                const result = await action(createActionArgs(encodedResourceWithNoParams, formData));

                expect(result).toEqual({
                    success: true,
                    data: mockActionResponseData,
                });

                // Verify the method was called with only the body parameter
                expect(mockShopperCustomersUpdateCustomer).toHaveBeenCalledWith({ body: formData });
            });

            it('should add body parameter when last parameter has no body property', async () => {
                const resourceWithNoBody = [
                    'shopperCustomers',
                    'updateCustomer',
                    {
                        params: {
                            path: { customerId: 'customer-123' },
                        },
                    },
                ];
                const encodedResourceWithNoBody = encodeBase64Url(JSON.stringify(resourceWithNoBody));
                const formData = { email: 'updated@example.com' };

                const result = await action(createActionArgs(encodedResourceWithNoBody, formData));

                expect(result).toEqual({
                    success: true,
                    data: mockActionResponseData,
                });

                // Verify the method was called with parameters and added body (new API format)
                expect(mockShopperCustomersUpdateCustomer).toHaveBeenCalledWith({
                    params: {
                        path: { customerId: 'customer-123' },
                    },
                    body: formData,
                });
            });
        });

        describe('error handling', () => {
            it('should handle invalid resource format - not an array', async () => {
                const args = createActionArgs('invalid-encoded-resource');
                const result = await action(args);
                expect(result).toEqual({
                    success: false,
                    errors: ['The encoded data was not valid for encoding utf-8'],
                });
            });

            it('should handle invalid resource format - wrong array length', async () => {
                const invalid = encodeBase64Url(JSON.stringify(['shopperCustomers', 'updateCustomer']));
                const args = createActionArgs(invalid);
                const result = await action(args);
                expect(result).toEqual({
                    success: false,
                    errors: ['Unexpected resource format'],
                });
            });

            it('should handle ApiError using getErrorMessage for password update errors', async () => {
                const mockApiError = new ApiError({
                    url: 'https://api.example.com/test',
                    method: 'PUT',
                    status: 400,
                    statusText: 'Bad Request',
                    headers: new Headers(),
                    body: {
                        type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/invalid-customer',
                        title: 'Invalid Customer',
                        detail: 'The customer is invalid.',
                    },
                    rawBody: JSON.stringify({ message: 'The current password is incorrect.' }),
                });

                mockShopperCustomersUpdateCustomer.mockRejectedValue(mockApiError);
                mockGetErrorMessage.mockReturnValue('The current password is incorrect.');

                const result = await action(createActionArgs(encodedValidActionResource));
                expect(result).toEqual({
                    success: false,
                    errors: ['The current password is incorrect.'],
                });

                expect(mockGetErrorMessage).toHaveBeenCalledWith(mockApiError);
                // extractResponseError should NOT be called for ApiError instances
                expect(mockExtractResponseError).not.toHaveBeenCalled();
            });

            it('should handle action errors with extractResponseError', async () => {
                const mockError = new Error('API Error');
                const mockExtractedError = {
                    status_code: '400',
                    responseMessage: 'Bad Request: Invalid customer data',
                };
                Reflect.set(mockError, 'response', Response.json(mockExtractedError));

                mockShopperCustomersUpdateCustomer.mockRejectedValue(mockError);
                mockExtractResponseError.mockImplementationOnce(() => Promise.resolve(mockExtractedError));

                const result = await action(createActionArgs(encodedValidActionResource));
                expect(result).toEqual({
                    success: false,
                    errors: [mockExtractedError.responseMessage],
                });

                expect(mockExtractResponseError).toHaveBeenCalledWith(mockError);
            });

            it('should handle action errors when extractResponseError fails', async () => {
                const mockError = new Error('Network Error');
                mockShopperCustomersUpdateCustomer.mockRejectedValue(mockError);
                mockExtractResponseError.mockRejectedValue(new Error('Extract failed'));

                const result = await action(createActionArgs(encodedValidActionResource));
                expect(result).toEqual({
                    success: false,
                    errors: ['Network Error'],
                });
            });

            it('should handle unknown errors without message', async () => {
                const mockError = { someProperty: 'unknown error' };
                mockShopperCustomersUpdateCustomer.mockRejectedValue(mockError);

                const result = await action(createActionArgs(encodedValidActionResource));
                expect(result).toEqual({
                    success: false,
                    errors: ['Unknown error'],
                });
            });

            it('should handle action with null resource parameter', async () => {
                const createActionArgsWithNullResource = (): ActionFunctionArgs => {
                    const request = new Request('http://localhost/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ email: 'test@example.com' }).toString(),
                    });

                    return {
                        params: { resource: null as any },
                        context: mockContextProvider,
                        request,
                    };
                };

                const result = await action(createActionArgsWithNullResource());
                expect(result).toEqual({
                    success: false,
                    errors: ['Unexpected resource format'],
                });
            });

            it('should handle action with undefined resource parameter', async () => {
                const createActionArgsWithUndefinedResource = (): ActionFunctionArgs => {
                    const request = new Request('http://localhost/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ email: 'test@example.com' }).toString(),
                    });

                    return {
                        params: { resource: undefined as any },
                        context: mockContextProvider,
                        request,
                    };
                };

                const result = await action(createActionArgsWithUndefinedResource());
                expect(result).toEqual({
                    success: false,
                    errors: ['Unexpected resource format'],
                });
            });

            it('should handle action errors when reason is falsy', async () => {
                // Mock a falsy reason (null, undefined, false, 0, empty string)
                mockShopperCustomersUpdateCustomer.mockRejectedValue(null);

                const result = await action(createActionArgs(encodedValidActionResource));
                expect(result).toEqual({
                    success: false,
                    errors: ['Unknown error'],
                });
            });
        });
    });

    describe('ApiResponse interface', () => {
        it('should have correct structure for success response', () => {
            const successResponse: ApiResponse<{ id: string }> = {
                success: true,
                data: { id: 'test-123' },
            };

            expect(successResponse.success).toBe(true);
            expect(successResponse.data).toEqual({ id: 'test-123' });
            expect(successResponse.errors).toBeUndefined();
        });

        it('should have correct structure for error response', () => {
            const errorResponse: ApiResponse = {
                success: false,
                errors: ['Error message'],
            };

            expect(errorResponse.success).toBe(false);
            expect(errorResponse.errors).toEqual(['Error message']);
            expect(errorResponse.data).toBeUndefined();
        });

        it('should support optional properties', () => {
            const minimalSuccess: ApiResponse = {
                success: true,
            };

            expect(minimalSuccess.success).toBe(true);
            expect(minimalSuccess.data).toBeUndefined();
            expect(minimalSuccess.errors).toBeUndefined();
        });
    });

    describe('Edge cases and comprehensive coverage', () => {
        const createLoaderArgs = (resource: string): LoaderFunctionArgs => ({
            params: { resource },
            context: mockContextProvider,
            request: new Request('http://localhost/test'),
        });

        it('should handle empty form data in action', async () => {
            const validActionResource = [
                'shopperCustomers',
                'updateCustomer',
                {
                    params: {
                        path: { customerId: 'customer-123' },
                    },
                },
            ];
            const encodedValidActionResource = encodeBase64Url(JSON.stringify(validActionResource));

            // Set up the mock for this specific test
            mockShopperCustomersUpdateCustomer.mockResolvedValue({ data: mockResponseData });

            const createActionArgsWithEmptyForm = (): ActionFunctionArgs => {
                const request = new Request('http://localhost/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: '',
                });

                return {
                    params: { resource: encodedValidActionResource },
                    context: mockContextProvider,
                    request,
                };
            };

            const result = await action(createActionArgsWithEmptyForm());
            expect(result).toEqual({
                success: true,
                data: mockResponseData,
            });

            // Verify the method was called with empty body (new API format)
            expect(mockShopperCustomersUpdateCustomer).toHaveBeenCalledWith({
                params: {
                    path: { customerId: 'customer-123' },
                },
                body: {},
            });
        });

        it('should handle malformed JSON in resource parameter', async () => {
            const malformedResource = 'not-valid-json';
            const args = createLoaderArgs(malformedResource);
            const result = await loader(args);
            expect(result).toEqual({
                success: false,
                errors: ['The encoded data was not valid for encoding utf-8'],
            });
        });

        it('should handle extractResponseError returning null responseMessage', async () => {
            const mockError = new Error('API Error');
            const mockExtractedError = {
                status_code: '400',
                responseMessage: null as any,
            };
            Reflect.set(mockError, 'response', Response.json(mockExtractedError));

            mockShopperCustomersGetCustomer.mockRejectedValue(mockError);
            mockExtractResponseError.mockImplementationOnce(() => Promise.resolve(mockExtractedError));

            const result = await loader(createLoaderArgs(encodedValidResource));
            expect(result).toEqual({
                success: false,
                errors: ['Unknown error'],
            });
        });

        it('should handle extractResponseError returning undefined responseMessage', async () => {
            const mockError = new Error('API Error');
            const mockExtractedError = {
                status_code: '400',
                responseMessage: undefined,
            };
            Reflect.set(mockError, 'response', Response.json(mockExtractedError));

            mockShopperCustomersGetCustomer.mockRejectedValue(mockError);
            mockExtractResponseError.mockImplementationOnce(() => Promise.resolve(mockExtractedError));

            const result = await loader(createLoaderArgs(encodedValidResource));
            expect(result).toEqual({
                success: false,
                errors: ['Unknown error'],
            });
        });

        it('should handle extractResponseError returning empty string responseMessage', async () => {
            const mockError = new Error('API Error');
            const mockExtractedError = {
                status_code: '400',
                responseMessage: '',
            };
            Reflect.set(mockError, 'response', Response.json(mockExtractedError));

            mockShopperCustomersGetCustomer.mockRejectedValue(mockError);
            mockExtractResponseError.mockImplementationOnce(() => Promise.resolve(mockExtractedError));

            const result = await loader(createLoaderArgs(encodedValidResource));
            expect(result).toEqual({
                success: false,
                errors: ['Unknown error'],
            });
        });

        it('should handle non-Error objects thrown', async () => {
            const nonErrorObject = { message: 'Custom error', code: 500 };
            mockShopperCustomersGetCustomer.mockRejectedValue(nonErrorObject);

            const result = await loader(createLoaderArgs(encodedValidResource));
            expect(result).toEqual({
                success: false,
                errors: ['Unknown error'],
            });
        });

        it('should handle string errors', async () => {
            const stringError = 'String error message';
            mockShopperCustomersGetCustomer.mockRejectedValue(stringError);

            const result = await loader(createLoaderArgs(encodedValidResource));
            expect(result).toEqual({
                success: false,
                errors: ['Unknown error'],
            });
        });

        it('should handle number errors', async () => {
            const numberError = 404;
            mockShopperCustomersGetCustomer.mockRejectedValue(numberError);

            const result = await loader(createLoaderArgs(encodedValidResource));
            expect(result).toEqual({
                success: false,
                errors: ['Unknown error'],
            });
        });

        it('should handle boolean errors', async () => {
            const booleanError = false;
            mockShopperCustomersGetCustomer.mockRejectedValue(booleanError);

            const result = await loader(createLoaderArgs(encodedValidResource));
            expect(result).toEqual({
                success: false,
                errors: ['Unknown error'],
            });
        });
    });
});
