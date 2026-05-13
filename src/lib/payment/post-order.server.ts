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

import { redirect, type RouterContextProvider } from 'react-router';
import { destroyBasket } from '@/middlewares/basket.server';
import { buildUrlFromContext } from '@/lib/url.server';

/**
 * Centralized post-success teardown shared by every place-order entry point
 * (default place-order, redirect-finalize, express-complete). Keeps the three flows in
 * lockstep so any change to the cleanup contract has a single edit site.
 *
 * - Destroys the local basket cache (the basket has auto-converted to an order on the
 *   SCAPI side; this just clears our copy and the basket cookie).
 * - Builds the order-confirmation URL with optional query params (e.g. accountCreated
 *   for register-at-checkout flows).
 * - Returns a 302 with any extra headers the caller needs to set (e.g. Set-Cookie to
 *   clear a redirect cookie).
 */
export interface FinalizeOrderSuccessOptions {
    context: Readonly<RouterContextProvider>;
    orderNo: string;
    /** Appended to the order-confirmation URL as ?key=value pairs. */
    queryParams?: Record<string, string>;
    /** Extra response headers to merge with the redirect (Set-Cookie etc.). */
    extraHeaders?: Record<string, string>;
}

export function finalizeOrderSuccess({
    context,
    orderNo,
    queryParams,
    extraHeaders,
}: FinalizeOrderSuccessOptions): Response {
    destroyBasket(context);

    let target = buildUrlFromContext(`/order-confirmation/${orderNo}`, context);
    if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams(queryParams);
        target += `?${params.toString()}`;
    }

    if (!extraHeaders || Object.keys(extraHeaders).length === 0) {
        return redirect(target);
    }

    return new Response(null, {
        status: 302,
        headers: {
            Location: target,
            ...extraHeaders,
        },
    });
}
