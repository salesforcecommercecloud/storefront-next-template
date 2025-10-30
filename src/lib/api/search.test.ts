import { describe, it, expect, vi } from 'vitest';
import { fetchSearchSuggestions } from './search';
import createClient from '@/lib/scapi';
import { createTestContext } from '@/lib/test-utils';

vi.mock('@/lib/scapi', () => ({
    default: vi.fn(),
}));

describe('fetchSearchSuggestions', () => {
    const mockClient = {
        ShopperSearch: {
            getSearchSuggestions: vi.fn(),
        },
    };

    const mockContext = createTestContext();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(createClient).mockReturnValue(mockClient as never);
    });

    it('should call getSearchSuggestions with basic parameters', async () => {
        const mockResult = { searchPhrase: 'dress' };
        mockClient.ShopperSearch.getSearchSuggestions.mockResolvedValue(mockResult);

        const result = await fetchSearchSuggestions(mockContext, { q: 'dress' });

        expect(createClient).toHaveBeenCalledWith(mockContext);
        expect(mockClient.ShopperSearch.getSearchSuggestions).toHaveBeenCalledWith({
            parameters: { q: 'dress' },
        });
        expect(result).toBe(mockResult);
    });

    it('should call getSearchSuggestions with all parameters', async () => {
        const mockResult = { searchPhrase: 'shirt' };
        mockClient.ShopperSearch.getSearchSuggestions.mockResolvedValue(mockResult);

        await fetchSearchSuggestions(mockContext, {
            q: 'shirt',
            expand: ['images', 'prices'],
            limit: 10,
            currency: 'EUR',
        });

        expect(mockClient.ShopperSearch.getSearchSuggestions).toHaveBeenCalledWith({
            parameters: {
                q: 'shirt',
                expand: ['images', 'prices'],
                limit: 10,
                currency: 'EUR',
            },
        });
    });

    it('should exclude undefined optional parameters', async () => {
        await fetchSearchSuggestions(mockContext, {
            q: 'jacket',
            expand: undefined,
            limit: undefined,
            currency: undefined,
        });

        expect(mockClient.ShopperSearch.getSearchSuggestions).toHaveBeenCalledWith({
            parameters: { q: 'jacket' },
        });
    });
});
