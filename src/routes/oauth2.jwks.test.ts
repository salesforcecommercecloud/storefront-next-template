import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loader } from './oauth2.jwks';
import uiStrings from '@/temp-ui-string';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the config module with inline values
vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({
        commerce: {
            api: {
                clientId: 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
                organizationId: 'f_ecom_zzrf_001',
                shortCode: 'kv7kzm78',
                siteId: 'RefArchGlobal',
            },
        },
    })),
}));

// Create mock context
const mockContext = {
    get: vi.fn(),
    set: vi.fn(),
} as any;

describe('oauth2.jwks loader', () => {
    const mockJWKSResponse = {
        keys: [
            {
                kty: 'RSA',
                use: 'sig',
                kid: 'test-key-id',
                n: 'test-modulus',
                e: 'AQAB',
                alg: 'RS256',
            },
            {
                kty: 'RSA',
                use: 'sig',
                kid: 'test-key-id-2',
                n: 'test-modulus-2',
                e: 'AQAB',
            },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('successful JWKS fetch', () => {
        it('should return Response with JWKS and cache headers', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockJWKSResponse),
            });

            const response = await loader({ context: mockContext } as any);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://kv7kzm78.api.commercecloud.salesforce.com/shopper/auth/v1/organizations/f_ecom_zzrf_001/oauth2/jwks',
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'User-Agent': 'Odyssey-JWKS-Proxy',
                    },
                    signal: expect.any(AbortSignal),
                }
            );

            expect(response).toBeInstanceOf(Response);
            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('application/json');
            expect(response.headers.get('Cache-Control')).toBe('public, max-age=1209600, stale-while-revalidate=86400');

            const responseBody = await response.json();
            expect(responseBody).toEqual(mockJWKSResponse);
        });

        it('should handle minimal valid JWKS response', async () => {
            const minimalJWKS = {
                keys: [
                    {
                        kty: 'RSA',
                        use: 'sig',
                        kid: 'minimal-key',
                        n: 'minimal-modulus',
                        e: 'AQAB',
                    },
                ],
            };

            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(minimalJWKS),
            });

            const response = await loader({ context: mockContext } as any);

            expect(response).toBeInstanceOf(Response);
            const responseBody = await response.json();
            expect(responseBody).toEqual(minimalJWKS);
        });
    });

    describe('upstream fetch failures', () => {
        it('should throw error for upstream errors', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });

            await expect(loader({ context: mockContext } as any)).rejects.toThrow(
                'Upstream JWKS fetch failed: 500 Internal Server Error'
            );
        });
    });

    describe('network and timeout errors', () => {
        it.each([
            ['network failure', 'Network connection failed'],
            ['timeout', 'The operation was aborted due to timeout'],
        ])('should throw error for %s', async (_, errorMessage) => {
            mockFetch.mockRejectedValue(new Error(errorMessage));

            await expect(loader({ context: mockContext } as any)).rejects.toThrow(errorMessage);
        });

        it('should handle fetch rejection without Error object', async () => {
            mockFetch.mockRejectedValue('String error');

            await expect(loader({ context: mockContext } as any)).rejects.toThrow(uiStrings.errors.jwks.unknownError);
        });
    });

    describe('invalid JWKS response validation', () => {
        it.each([
            ['missing keys array', {}],
            ['keys is not an array', { keys: 'not-an-array' }],
            ['keys is null', { keys: null }],
        ])('should throw error when %s', async (_, invalidResponse) => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(invalidResponse),
            });

            await expect(loader({ context: mockContext } as any)).rejects.toThrow(
                uiStrings.errors.jwks.invalidResponse
            );
        });

        it('should accept empty keys array', async () => {
            const emptyKeysJWKS = { keys: [] };

            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(emptyKeysJWKS),
            });

            const response = await loader({ context: mockContext } as any);

            expect(response).toBeInstanceOf(Response);
            const responseBody = await response.json();
            expect(responseBody).toEqual(emptyKeysJWKS);
        });
    });

    describe('JSON parsing errors', () => {
        it('should throw error when upstream returns invalid JSON', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.reject(new SyntaxError('Unexpected token')),
            });

            await expect(loader({ context: mockContext } as any)).rejects.toThrow('Unexpected token');
        });
    });
});
