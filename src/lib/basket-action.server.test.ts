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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBasketAction, BasketAction } from './basket-action.server';
import { createFormDataRequest } from '@/test-utils/request-helpers';
import { createActionArgs } from '@/lib/test-utils';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';

vi.mock('@/middlewares/basket.server');
vi.mock('@/lib/api-clients.server');
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

const mockBasket = { basketId: 'basket-123', productItems: [] };
const mockClients = { shopperBasketsV2: {} };

describe('createBasketAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getBasket).mockResolvedValue({ current: mockBasket, snapshot: null } as any);
        vi.mocked(createApiClients).mockReturnValue(mockClients as any);
        vi.mocked(updateBasketResource).mockImplementation(() => {});
    });

    /** Create a POST action with a simple string parser and the given handler. */
    function buildAction(handler: (params: any) => Promise<any>) {
        return createBasketAction(
            {
                method: 'POST',
                action: BasketAction.CartItemRemove,
                parse: (fd) => ({ itemId: fd.get('itemId') as string }),
            },
            handler
        );
    }

    /** Send a POST request to the action with the given form data. */
    function postFormData(action: ReturnType<typeof buildAction>, data: Record<string, string> = { itemId: '123' }) {
        const request = createFormDataRequest('http://localhost/test', 'POST', data);
        return action(createActionArgs(request, {} as any, { unstable_pattern: '/test' }));
    }

    it('returns 405 when request method does not match', async () => {
        const action = buildAction(() => Promise.resolve(mockBasket as any));
        const request = createFormDataRequest('http://localhost/test', 'PATCH', { itemId: '123' });
        const response = await action(createActionArgs(request, {} as any, { unstable_pattern: '/test' }));

        expect(response.status).toBe(405);
        expect((await response.json()).success).toBe(false);
        expect(getBasket).not.toHaveBeenCalled();
    });

    it('returns 404 when no basket is found', async () => {
        vi.mocked(getBasket).mockResolvedValue({ current: null, snapshot: null } as any);
        const response = await postFormData(buildAction(() => Promise.resolve(mockBasket as any)));

        expect(response.status).toBe(404);
        expect((await response.json()).success).toBe(false);
        expect(createApiClients).not.toHaveBeenCalled();
    });

    it('calls updateBasketResource and wraps Basket result as success', async () => {
        const updatedBasket = { basketId: 'basket-123', productItems: [{ itemId: 'item-1' }] };
        const handler = vi.fn(() => Promise.resolve(updatedBasket as any));
        const response = await postFormData(buildAction(handler));

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result).toEqual({ success: true, basket: updatedBasket });
        expect(updateBasketResource).toHaveBeenCalledWith(expect.anything(), updatedBasket);
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({ data: { itemId: '123' }, basketId: 'basket-123' })
        );
    });

    it('passes through Response returned by handler', async () => {
        const response = await postFormData(
            buildAction(() => Promise.resolve(Response.json({ custom: true }, { status: 422 })))
        );

        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ custom: true });
        expect(updateBasketResource).not.toHaveBeenCalled();
    });

    it('returns 500 when handler throws', async () => {
        const response = await postFormData(buildAction(() => Promise.reject(new Error('API failure'))));

        expect(response.status).toBe(500);
        expect((await response.json()).success).toBe(false);
    });

    it('returns 400 when parse throws on malformed input', async () => {
        const action = createBasketAction(
            {
                method: 'POST',
                action: BasketAction.CartItemRemove,
                parse: () => JSON.parse('not valid json'),
            },
            () => Promise.resolve(mockBasket as any)
        );
        const response = await postFormData(action);

        expect(response.status).toBe(400);
        expect((await response.json()).success).toBe(false);
    });
});
