import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSearchSuggestions } from './search';
import { createApiClients } from '@/lib/api-clients';
import { createTestContext } from '@/lib/test-utils';

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

describe('fetchSearchSuggestions', () => {
    const mockGetSearchSuggestions = vi.fn();
    const mockClients = {
        shopperSearch: {
            getSearchSuggestions: mockGetSearchSuggestions,
        },
        use: vi.fn(),
    };

    const mockContext = createTestContext();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(createApiClients).mockReturnValue(mockClients as never);
    });

    it('should call getSearchSuggestions with basic parameters', async () => {
        const mockResult = { searchPhrase: 'dress' };
        mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

        const result = await fetchSearchSuggestions(mockContext, { q: 'dress' });

        expect(createApiClients).toHaveBeenCalledWith(mockContext);
        expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
            params: {
                path: {
                    organizationId: expect.any(String),
                },
                query: {
                    siteId: expect.any(String),
                    q: 'dress',
                },
            },
        });
        expect(result).toBe(mockResult);
    });

    it('should call getSearchSuggestions with all parameters', async () => {
        const mockResult = { searchPhrase: 'shirt' };
        mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

        await fetchSearchSuggestions(mockContext, {
            q: 'shirt',
            expand: ['images', 'prices'],
            limit: 10,
            currency: 'EUR',
        });

        expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
            params: {
                path: {
                    organizationId: expect.any(String),
                },
                query: {
                    siteId: expect.any(String),
                    q: 'shirt',
                    expand: ['images', 'prices'],
                    limit: 10,
                    currency: 'EUR',
                },
            },
        });
    });

    it('should exclude undefined optional parameters', async () => {
        const mockResult = { searchPhrase: 'jacket' };
        mockGetSearchSuggestions.mockResolvedValue({ data: mockResult });

        await fetchSearchSuggestions(mockContext, {
            q: 'jacket',
            expand: undefined,
            limit: undefined,
            currency: undefined,
        });

        expect(mockGetSearchSuggestions).toHaveBeenCalledWith({
            params: {
                path: {
                    organizationId: expect.any(String),
                },
                query: {
                    siteId: expect.any(String),
                    q: 'jacket',
                },
            },
        });
    });
});
