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
import type { ActionFunctionArgs } from 'react-router';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { AppClients } from '@/scapi/custom-clients';
import type { Logger } from '@/lib/logger';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';

type Basket = ShopperBasketsV2.schemas['Basket'];

/** Enum of all registered basket action operations. */
export enum BasketAction {
    CartItemRemove = 'CartItemRemove',
    CartItemUpdate = 'CartItemUpdate',
    CartItemAdd = 'CartItemAdd',
    CartSetAdd = 'CartSetAdd',
    CartBundleAdd = 'CartBundleAdd',
    CartBundleUpdate = 'CartBundleUpdate',
    PromoCodeAdd = 'PromoCodeAdd',
    PromoCodeRemove = 'PromoCodeRemove',
    BonusProductAdd = 'BonusProductAdd',
}

/** Shared params available to every basket action handler. */
interface BaseHandlerParams {
    /** The current basket ID (guaranteed non-null). */
    basketId: string;
    /** The full hydrated basket object (guaranteed non-null). */
    basket: Basket;
    /** React Router context for accessing middleware state. */
    context: ActionFunctionArgs['context'];
    /** Pre-configured Commerce API clients. */
    clients: AppClients;
    /** Request-scoped logger. */
    logger: Logger;
}

/**
 * Handler params for a registered {@link BasketAction}.
 * The factory parses FormData automatically and passes the typed result as `data`.
 */
export interface TypedBasketActionHandlerParams<TInput> extends BaseHandlerParams {
    /** Typed input data extracted from FormData by the action's registered parser. */
    data: TInput;
}

/**
 * A handler function return type.
 *
 * - `Basket` — The factory calls `updateBasketResource` and wraps it as
 *   `{ success: true, basket }` with status 200.
 * - `Response` — The factory passes it through unchanged. Use this for
 *   validation errors or other custom responses mid-handler.
 * - Throwing — The factory catches the error and returns
 *   `{ success: false, error }` with status 500.
 */
type HandlerResult = Basket | Response;

/**
 * Create a React Router action function with standard basket boilerplate.
 *
 * Handles: logging, method validation, basket hydration, API client creation,
 * basket resource update on success, and error wrapping on failure.
 *
 * The `parse` callback extracts typed input from FormData. TypeScript infers
 * the handler's `data` type from the return type of `parse` — no manual type
 * annotations needed.
 *
 * @example
 * ```ts
 * export const action = createBasketAction(
 *     {
 *         method: 'POST',
 *         action: BasketAction.CartItemRemove,
 *         parse: (fd) => ({ itemId: fd.get('itemId') as string }),
 *     },
 *     async ({ data, basketId, clients }) => {
 *         // data.itemId is string — inferred from parse
 *         const { data: updatedBasket } = await clients.shopperBasketsV2.removeItemFromBasket({
 *             params: { path: { basketId, itemId: data.itemId } },
 *         });
 *         return updatedBasket;
 *     }
 * );
 * ```
 */
export function createBasketAction<TInput>(
    options: { method: 'POST' | 'PATCH'; action: BasketAction; parse: (formData: FormData) => TInput },
    handler: (params: TypedBasketActionHandlerParams<TInput>) => Promise<HandlerResult>
): (args: ActionFunctionArgs) => Promise<Response> {
    const { method, action, parse } = options;

    return async ({ request, context }: ActionFunctionArgs): Promise<Response> => {
        const logger = getLogger(context);
        logger.debug(`${action}: action starting`);

        if (request.method !== method) {
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.METHOD_NOT_ALLOWED,
                        message: `Expected ${method}, got ${request.method}`,
                    }),
                },
                { status: 405 }
            );
        }

        const basketResource = await getBasket(context);
        const basket = basketResource.current;

        if (!basket?.basketId) {
            logger.warn(`${action}: no basket found`);
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'No basket found' }),
                },
                { status: 404 }
            );
        }

        const clients = createApiClients(context);
        const formData = await request.formData();

        let data: TInput;
        try {
            data = parse(formData);
        } catch (error) {
            logger.warn(`${action}: failed to parse form data`, { error });
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.INVALID_INPUT, message: 'Invalid form data' }),
                },
                { status: 400 }
            );
        }

        try {
            const result = await handler({
                basketId: basket.basketId,
                basket,
                context,
                clients,
                logger,
                data,
            });

            if (result instanceof Response) {
                return result;
            }

            updateBasketResource(context, result);
            logger.info(`${action}: succeeded`);
            return Response.json({ success: true, basket: result });
        } catch (error) {
            logger.error(`${action}: failed`, { error });
            return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
        }
    };
}
