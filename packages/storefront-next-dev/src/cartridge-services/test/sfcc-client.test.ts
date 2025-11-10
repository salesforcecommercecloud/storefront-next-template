// @ts-check
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { getWebdavOptions, checkAuthenticationError, makeRequest } from '../sfcc-client.js';

// Mock fetch globally
const mockFetch = (response: any, status = 200) => {
    const statusMessages: Record<number, string> = {
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Internal Server Error',
    };

    global.fetch = vi.fn().mockResolvedValue({
        status,
        statusText: statusMessages[status] || 'Error',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(response),
        text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    }) as any;
};

// Mock fetch with request capture for validation
let capturedRequest: RequestInit | null = null;
const mockFetchWithCapture = (response: any, status = 200) => {
    const statusMessages: Record<number, string> = {
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Internal Server Error',
    };

    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = init || {};
        return {
            status,
            statusText: statusMessages[status] || 'Error',
            headers: new Map([['content-type', 'application/json']]),
            json: vi.fn().mockResolvedValue(response),
            text: vi.fn().mockResolvedValue(JSON.stringify(response)),
        } as any;
    });
};

// Mock fetch that throws errors
const mockFetchError = (errorMessage: string) => {
    global.fetch = vi.fn().mockRejectedValue(new Error(errorMessage));
};

// Mock fetch with malformed response
const mockFetchMalformed = () => {
    global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('invalid json {'),
    }) as any;
};

describe('SFCC Client Functions', () => {
    beforeEach(() => {
        capturedRequest = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getWebdavOptions', () => {
        test('valid parameters', () => {
            const result = getWebdavOptions('test-instance', 'version1', 'dXNlcm5hbWU6cGFzc3dvcmQ=', 'PUT');

            expect(result.baseUrl).toBe('https://test-instance');
            expect(result.uri).toBe('/on/demandware.servlet/webdav/Sites/version1');
            expect(result.method).toBe('PUT');
            expect(result.auth).toEqual({ basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' });
        });

        test('with form data', () => {
            const result = getWebdavOptions('test-instance', 'version1', 'dXNlcm5hbWU6cGFzc3dvcmQ=', 'POST', {
                method: 'UNZIP',
                target: '/cartridges/local_metadata',
            });

            expect(result.baseUrl).toBe('https://test-instance');
            expect(result.uri).toBe('/on/demandware.servlet/webdav/Sites/version1');
            expect(result.method).toBe('POST');
            expect(result.form).toEqual({ method: 'UNZIP', target: '/cartridges/local_metadata' });
        });

        test('with empty options', () => {
            const result = getWebdavOptions('test-instance', 'version1', 'dXNlcm5hbWU6cGFzc3dvcmQ=', 'PUT');

            expect(result.baseUrl).toBe('https://test-instance');
            expect(result.uri).toBe('/on/demandware.servlet/webdav/Sites/version1');
            expect(result.method).toBe('PUT');
        });

        test('different HTTP methods', () => {
            const putResult = getWebdavOptions('test-instance', 'version1', 'dXNlcm5hbWU6cGFzc3dvcmQ=', 'PUT');
            const postResult = getWebdavOptions('test-instance', 'version1', 'dXNlcm5hbWU6cGFzc3dvcmQ=', 'POST');
            const deleteResult = getWebdavOptions('test-instance', 'version1', 'dXNlcm5hbWU6cGFzc3dvcmQ=', 'DELETE');

            expect(putResult.method).toBe('PUT');
            expect(postResult.method).toBe('POST');
            expect(deleteResult.method).toBe('DELETE');
        });

        test('different paths', () => {
            const result1 = getWebdavOptions(
                'test-instance',
                'version1/cartridges/local_metadata',
                'dXNlcm5hbWU6cGFzc3dvcmQ=',
                'PUT'
            );
            const result2 = getWebdavOptions(
                'test-instance',
                'version1/cartridges/custom',
                'dXNlcm5hbWU6cGFzc3dvcmQ=',
                'PUT'
            );

            expect(result1.uri).toBe('/on/demandware.servlet/webdav/Sites/version1/cartridges/local_metadata');
            expect(result2.uri).toBe('/on/demandware.servlet/webdav/Sites/version1/cartridges/custom');
        });

        test('different instances', () => {
            const result1 = getWebdavOptions(
                'instance1.dx.commercecloud.salesforce.com',
                'version1',
                'dXNlcm5hbWU6cGFzc3dvcmQ=',
                'PUT'
            );
            const result2 = getWebdavOptions(
                'instance2.dx.commercecloud.salesforce.com',
                'version1',
                'dXNlcm5hbWU6cGFzc3dvcmQ=',
                'PUT'
            );

            expect(result1.baseUrl).toBe('https://instance1.dx.commercecloud.salesforce.com');
            expect(result2.baseUrl).toBe('https://instance2.dx.commercecloud.salesforce.com');
        });
    });

    describe('checkAuthenticationError', () => {
        test('no error for 200', () => {
            expect(() => checkAuthenticationError({ statusCode: 200 } as any)).not.toThrow();
        });

        test('no error for 201', () => {
            expect(() => checkAuthenticationError({ statusCode: 201 } as any)).not.toThrow();
        });

        test('no error for 202', () => {
            expect(() => checkAuthenticationError({ statusCode: 202 } as any)).not.toThrow();
        });

        test('no error for 204', () => {
            expect(() => checkAuthenticationError({ statusCode: 204 } as any)).not.toThrow();
        });

        test('throws for 401', () => {
            expect(() => checkAuthenticationError({ statusCode: 401 } as any)).toThrow('Authentication failed');
        });

        test('no error for 403', () => {
            expect(() => checkAuthenticationError({ statusCode: 403 } as any)).not.toThrow();
        });

        test('no error for 404', () => {
            expect(() => checkAuthenticationError({ statusCode: 404 } as any)).not.toThrow();
        });

        test('no error for 500', () => {
            expect(() => checkAuthenticationError({ statusCode: 500 } as any)).not.toThrow();
        });
    });

    describe('makeRequest', () => {
        test('successful response', async () => {
            mockFetch({ success: true }, 200);

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.response.statusCode).toBe(200);
            expect(result.body).toEqual({ success: true });
        });

        test('error response', async () => {
            mockFetch({ error: 'Not found' }, 404);

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.response.statusCode).toBe(404);
            expect(result.body).toEqual({ error: 'Not found' });
        });

        test('with form data', async () => {
            mockFetch({ success: true }, 201);

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'POST',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                form: { method: 'UNZIP', target: '/cartridges/local_metadata' },
            });

            expect(result.response.statusCode).toBe(201);
            expect(result.body).toEqual({ success: true });
        });

        test('header validation and authentication', async () => {
            mockFetchWithCapture({ success: true }, 200);

            await makeRequest({
                uri: 'https://test-instance/test',
                method: 'POST',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                headers: { 'Custom-Header': 'test-value' },
            });

            expect(capturedRequest).toBeTruthy();
            const headers = capturedRequest!.headers as Record<string, string>;
            expect(headers.Authorization).toBe('Basic dXNlcm5hbWU6cGFzc3dvcmQ=');
            expect(headers['Custom-Header']).toBe('test-value');
        });

        test('request body validation', async () => {
            mockFetchWithCapture({ success: true }, 201);

            await makeRequest({
                uri: 'https://test-instance/test',
                method: 'POST',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                form: { method: 'UNZIP', target: '/cartridges/local_metadata' },
            });

            expect(capturedRequest).toBeTruthy();
            expect(capturedRequest!.body).toBeInstanceOf(URLSearchParams);
            const body = capturedRequest!.body as URLSearchParams;
            expect(body.get('method')).toBe('UNZIP');
            expect(body.get('target')).toBe('/cartridges/local_metadata');
        });

        test('malformed response handling', async () => {
            mockFetchMalformed();

            await expect(
                makeRequest({
                    uri: 'https://test-instance/test',
                    method: 'GET',
                    auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                })
            ).rejects.toThrow('HTTP request failed: Invalid JSON');
        });

        test('network error handling', async () => {
            mockFetchError('Network error');

            await expect(
                makeRequest({
                    uri: 'https://test-instance/test',
                    method: 'GET',
                    auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                })
            ).rejects.toThrow('HTTP request failed: Network error');
        });

        test('successful request with default SSL', async () => {
            mockFetch({ success: true }, 200);

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.response.statusCode).toBe(200);
        });

        test('text response (non-JSON content-type)', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'text/plain']]),
                text: vi.fn().mockResolvedValue('Plain text response'),
                json: vi.fn().mockResolvedValue({}),
            }) as any;

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.body).toBe('Plain text response');
            expect(result.response.statusCode).toBe(200);
        });

        test('response with no content-type header', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                status: 200,
                statusText: 'OK',
                headers: new Map(),
                text: vi.fn().mockResolvedValue('No content type'),
                json: vi.fn().mockResolvedValue({}),
            }) as any;

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.body).toBe('No content type');
        });

        test('response with null content-type header', async () => {
            const headers = new Map();
            headers.set('content-type', null as any);

            global.fetch = vi.fn().mockResolvedValue({
                status: 200,
                statusText: 'OK',
                headers,
                text: vi.fn().mockResolvedValue('Null content type'),
                json: vi.fn().mockResolvedValue({}),
            }) as any;

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.body).toBe('Null content type');
        });

        test('response with multiple headers', async () => {
            const headers = new Map([
                ['content-type', 'application/json'],
                ['x-custom-header', 'custom-value'],
                ['authorization', 'Bearer token'],
            ]);

            global.fetch = vi.fn().mockResolvedValue({
                status: 200,
                statusText: 'OK',
                headers,
                json: vi.fn().mockResolvedValue({ success: true }),
                text: vi.fn().mockResolvedValue(''),
            }) as any;

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.response.headers).toEqual({
                'content-type': 'application/json',
                'x-custom-header': 'custom-value',
                authorization: 'Bearer token',
            });
        });

        test('response with empty headers', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                status: 200,
                statusText: 'OK',
                headers: new Map(),
                json: vi.fn().mockResolvedValue({ success: true }),
                text: vi.fn().mockResolvedValue(''),
            }) as any;

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.response.headers).toEqual({});
        });

        test('error handling with non-Error object', async () => {
            global.fetch = vi.fn().mockRejectedValue('String error');

            await expect(
                makeRequest({
                    uri: 'https://test-instance/test',
                    method: 'GET',
                    auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                })
            ).rejects.toThrow('HTTP request failed: String error');
        });

        test('error handling with null error', async () => {
            global.fetch = vi.fn().mockRejectedValue(null);

            await expect(
                makeRequest({
                    uri: 'https://test-instance/test',
                    method: 'GET',
                    auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                })
            ).rejects.toThrow('HTTP request failed: null');
        });

        test('form data with different value types', async () => {
            mockFetchWithCapture({ success: true }, 201);

            await makeRequest({
                uri: 'https://test-instance/test',
                method: 'POST',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                form: {
                    method: 'UNZIP',
                    target: '/cartridges/local_metadata',
                    number: 123,
                    boolean: true,
                    nullValue: null,
                    undefinedValue: undefined,
                },
            });

            expect(capturedRequest).toBeTruthy();
            const body = capturedRequest!.body as URLSearchParams;
            expect(body.get('method')).toBe('UNZIP');
            expect(body.get('target')).toBe('/cartridges/local_metadata');
            expect(body.get('number')).toBe('123');
            expect(body.get('boolean')).toBe('true');
            expect(body.get('nullValue')).toBe('null');
            expect(body.get('undefinedValue')).toBe('undefined');
        });

        test('form data with empty object', async () => {
            mockFetchWithCapture({ success: true }, 201);

            await makeRequest({
                uri: 'https://test-instance/test',
                method: 'POST',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                form: {},
            });

            expect(capturedRequest).toBeTruthy();
            expect(capturedRequest!.body).toBeInstanceOf(URLSearchParams);
        });

        test('response with HTML content-type', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'text/html']]),
                text: vi.fn().mockResolvedValue('<html><body>Hello</body></html>'),
                json: vi.fn().mockResolvedValue({}),
            }) as any;

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.body).toBe('<html><body>Hello</body></html>');
        });

        test('response with XML content-type', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/xml']]),
                text: vi.fn().mockResolvedValue('<root><item>value</item></root>'),
                json: vi.fn().mockResolvedValue({}),
            }) as any;

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.body).toBe('<root><item>value</item></root>');
        });

        test('response with JSON content-type but different charset', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json; charset=utf-8']]),
                json: vi.fn().mockResolvedValue({ success: true }),
                text: vi.fn().mockResolvedValue(''),
            }) as any;

            const result = await makeRequest({
                uri: 'https://test-instance/test',
                method: 'GET',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
            });

            expect(result.body).toEqual({ success: true });
        });

        test('makeRequest with body and form data (form takes precedence)', async () => {
            mockFetchWithCapture({ success: true }, 201);

            await makeRequest({
                uri: 'https://test-instance/test',
                method: 'POST',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                body: 'raw body',
                form: { method: 'UNZIP' },
            });

            expect(capturedRequest).toBeTruthy();
            expect(capturedRequest!.body).toBeInstanceOf(URLSearchParams);
            const headers = capturedRequest!.headers as Record<string, string>;
            expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
        });

        test('makeRequest with custom headers', async () => {
            mockFetchWithCapture({ success: true }, 200);

            await makeRequest({
                uri: 'https://test-instance/test',
                method: 'PUT',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                headers: {
                    'X-Custom-Header': 'custom-value',
                    Accept: 'application/json',
                },
            });

            expect(capturedRequest).toBeTruthy();
            const headers = capturedRequest!.headers as Record<string, string>;
            expect(headers.Authorization).toBe('Basic dXNlcm5hbWU6cGFzc3dvcmQ=');
            expect(headers['X-Custom-Header']).toBe('custom-value');
            expect(headers.Accept).toBe('application/json');
        });

        test('makeRequest with body stream', async () => {
            const stream = new ReadableStream();
            mockFetchWithCapture({ success: true }, 200);

            await makeRequest({
                uri: 'https://test-instance/test',
                method: 'PUT',
                auth: { basic: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
                body: stream as any,
            });

            expect(capturedRequest).toBeTruthy();
            expect(capturedRequest!.body).toBe(stream);
        });
    });
});
