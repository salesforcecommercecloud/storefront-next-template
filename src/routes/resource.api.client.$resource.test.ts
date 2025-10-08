import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { encodeBase64Url } from '@/lib/url';
import { clientLoader, loader } from './resource.api.client.$resource';
import { createTestContext } from '@/lib/test-utils';

// Mock dependencies
vi.mock('@/middlewares/auth.server');
vi.mock('@/middlewares/auth.client');

// Type the mocked functions
const mockShopperCustomersGetCustomer = vi.fn();

vi.mock('commerce-sdk-isomorphic', async () => {
    const actual = await vi.importActual('commerce-sdk-isomorphic');
    return {
        ...actual,
        ShopperCustomers: vi.fn(() => ({
            getCustomer: mockShopperCustomersGetCustomer,
        })),
    };
});

describe('Commerce SDK resource', () => {
    const validResource = ['ShopperCustomers', 'getCustomer', [{ parameters: { customerId: 'customer-123' } }]];
    const encodedValidResource = encodeBase64Url(JSON.stringify(validResource));
    const mockResponseData = { customerId: 'customer-123', email: 'test@example.com' };
    let mockContextProvider: ReturnType<typeof createTestContext>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockContextProvider = createTestContext();

        mockShopperCustomersGetCustomer.mockResolvedValue(mockResponseData);
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
            it('should handle invalid resource format - not an array', () => {
                const args = createLoaderArgs('invalid-encoded-resource');
                return expect(() => loader(args)).toThrow(TypeError);
            });

            it('should handle invalid resource format - wrong array length', () => {
                const invalid = encodeBase64Url(JSON.stringify(['ShopperProducts', 'getProducts']));
                const args = createLoaderArgs(invalid);
                expect(() => loader(args)).toThrow(TypeError);
            });

            it('should handle fetch client errors with extractResponseError', async () => {
                const mockError = new Error('API Error');
                const mockExtractedError = {
                    status_code: '400',
                    responseMessage: 'Bad Request: Invalid product ID',
                };
                Reflect.set(mockError, 'response', Response.json(mockExtractedError));

                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);

                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    error: mockExtractedError.responseMessage,
                });
            });

            it('should handle fetch client errors when extractResponseError fails', async () => {
                const mockError = new Error('Network Error');
                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);

                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    error: 'Network Error',
                });
            });

            it('should handle unknown errors without message', async () => {
                const mockError = { someProperty: 'unknown error' };
                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);

                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    error: 'Unknown error',
                });
            });
        });
    });

    describe('clientLoader()', () => {
        const createLoaderArgs = (resource: string): ClientLoaderFunctionArgs => ({
            serverLoader: vi.fn(),
            params: { resource },
            context: mockContextProvider,
            request: new Request('http://localhost/test'),
        });

        describe('successful requests', () => {
            it('should handle successful clientLoader call', async () => {
                const result = await loader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: true,
                    data: mockResponseData,
                });
            });
        });

        describe('error handling', () => {
            it('should handle invalid resource format - not an array', () => {
                const args = createLoaderArgs('invalid-encoded-resource');
                expect(() => clientLoader(args)).toThrow(TypeError);
            });

            it('should handle invalid resource format - wrong array length', () => {
                const invalid = encodeBase64Url(JSON.stringify(['ShopperProducts', 'getProducts']));
                const args = createLoaderArgs(invalid);
                expect(() => clientLoader(args)).toThrow(TypeError);
            });

            it('should handle fetch client errors with extractResponseError', async () => {
                const mockError = new Error('API Error');
                const mockExtractedError = {
                    status_code: '400',
                    responseMessage: 'Bad Request: Invalid product ID',
                };
                Reflect.set(mockError, 'response', Response.json(mockExtractedError));

                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);

                const result = await clientLoader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    error: mockExtractedError.responseMessage,
                });
            });

            it('should handle fetch client errors when extractResponseError fails', async () => {
                const mockError = new Error('Network Error');
                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);

                const result = await clientLoader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    error: 'Network Error',
                });
            });

            it('should handle unknown errors without message', async () => {
                const mockError = { someProperty: 'unknown error' };
                mockShopperCustomersGetCustomer.mockRejectedValue(mockError);

                const result = await clientLoader(createLoaderArgs(encodedValidResource));
                expect(result).toEqual({
                    success: false,
                    error: 'Unknown error',
                });
            });
        });
    });
});
