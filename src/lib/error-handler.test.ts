import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractApiErrorDetails, createErrorResponse } from './error-handler';
import { extractResponseError } from '@/lib/utils';

vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        extractResponseError: vi.fn(),
    };
});

describe('error-handler', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('extractApiErrorDetails uses extractResponseError result', async () => {
        vi.mocked(extractResponseError).mockResolvedValue({ responseMessage: 'Bad Request' } as any);
        await expect(extractApiErrorDetails(new Error('x'))).resolves.toEqual(
            expect.objectContaining({ responseMessage: 'Bad Request' })
        );
    });

    it('extractApiErrorDetails falls back on extractor failure', async () => {
        vi.mocked(extractResponseError).mockRejectedValue(new Error('error'));
        await expect(extractApiErrorDetails(new Error('Error Message'))).resolves.toEqual(
            expect.objectContaining({ responseMessage: 'Error Message' })
        );
    });

    it('createErrorResponse uses extractor message', async () => {
        vi.mocked(extractResponseError).mockResolvedValue({ responseMessage: 'Error' } as any);
        const res = await createErrorResponse(new Error('x'), 'step', 418);
        const body = await res.json();
        expect(res.status).toBe(418);
        expect(body).toMatchObject({ success: false, error: 'Error', step: 'step' });
    });

    it('createErrorResponse falls back on extractor failure', async () => {
        vi.mocked(extractResponseError).mockRejectedValue(new Error('error'));
        const res = await createErrorResponse(new Error('Error Message'));
        const body = await res.json();
        expect(body).toMatchObject({ success: false, error: 'Error Message' });
    });
});
