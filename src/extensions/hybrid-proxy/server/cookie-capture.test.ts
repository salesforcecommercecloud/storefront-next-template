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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cookieCaptureMiddleware, _resetForTest } from '../server/cookie-capture';

// Mock the config
vi.mock('../config', () => ({
    HYBRID_PROXY_CONFIG: {
        enabled: true,
    },
}));

describe('cookieCaptureMiddleware', () => {
    let req: any;
    let res: any;
    let next: any;
    let initialFetch: any;

    beforeEach(() => {
        req = {};
        res = {
            writeHead: vi.fn(),
            setHeader: vi.fn(),
            getHeader: vi.fn(),
        };
        next = vi.fn();

        // Reset module state
        _resetForTest();

        // Setup global fetch mock
        initialFetch = vi.fn();
        globalThis.fetch = initialFetch;
    });

    afterEach(() => {
        _resetForTest(); // Cleanup patch
        vi.clearAllMocks();
    });

    it('should call next()', () => {
        cookieCaptureMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('should patch globalThis.fetch', () => {
        cookieCaptureMiddleware(req, res, next);
        expect(globalThis.fetch).not.toBe(initialFetch);
    });

    it('should capture dwsid and dwsecuretoken cookies from fetch response', async () => {
        const mockResponse = {
            headers: {
                getSetCookie: () => ['dwsid=test-session-id; Path=/', 'dwsecuretoken=test-token; Secure'],
                get: () => null,
            },
        };
        initialFetch.mockResolvedValue(mockResponse);

        let fetchPromise: Promise<any> = Promise.resolve();
        next.mockImplementation(() => {
            fetchPromise = globalThis.fetch('https://example.com/api');
        });

        cookieCaptureMiddleware(req, res, next);

        // Wait for fetch to complete
        await fetchPromise;

        res.writeHead(200);

        expect(res.setHeader).toHaveBeenCalledWith(
            'set-cookie',
            expect.arrayContaining([
                expect.stringContaining('dwsid=test-session-id'),
                expect.stringContaining('dwsecuretoken=test-token'),
            ])
        );
    });

    it('should handle cookie headers as strings (older node/browsers)', async () => {
        const mockResponse = {
            headers: {
                getSetCookie: undefined,
                get: (name: string) => (name === 'set-cookie' ? 'dwsid=single-cookie; Path=/' : null),
            },
        };
        initialFetch.mockResolvedValue(mockResponse);

        let fetchPromise: Promise<any> = Promise.resolve();
        next.mockImplementation(() => {
            fetchPromise = globalThis.fetch('https://example.com/api');
        });

        cookieCaptureMiddleware(req, res, next);

        await fetchPromise;

        res.writeHead(200);

        expect(res.setHeader).toHaveBeenCalledWith(
            'set-cookie',
            expect.arrayContaining([expect.stringContaining('dwsid=single-cookie')])
        );
    });

    it('should clear cookies on logout', async () => {
        const mockResponse = { headers: { getSetCookie: () => [], get: () => null } };
        initialFetch.mockResolvedValue(mockResponse);

        let fetchPromise: Promise<any> = Promise.resolve();
        next.mockImplementation(() => {
            fetchPromise = globalThis.fetch('https://example.com/logout');
        });

        cookieCaptureMiddleware(req, res, next);

        await fetchPromise;

        res.writeHead(200);

        expect(res.setHeader).toHaveBeenCalledWith(
            'set-cookie',
            expect.arrayContaining([
                expect.stringContaining('dwsid=; Max-Age=0'),
                expect.stringContaining('dwsecuretoken=; Max-Age=0'),
            ])
        );
    });

    it('should preserve existing set-cookie headers on res', async () => {
        const mockResponse = {
            headers: {
                getSetCookie: () => ['dwsid=new-id'],
                get: () => null,
            },
        };
        initialFetch.mockResolvedValue(mockResponse);

        res.getHeader.mockReturnValue(['existing=cookie']);

        let fetchPromise: Promise<any> = Promise.resolve();
        next.mockImplementation(() => {
            fetchPromise = globalThis.fetch('https://example.com');
        });

        cookieCaptureMiddleware(req, res, next);
        await fetchPromise;
        res.writeHead(200);

        expect(res.setHeader).toHaveBeenCalledWith(
            'set-cookie',
            expect.arrayContaining(['existing=cookie', expect.stringContaining('dwsid=new-id')])
        );
    });
});
