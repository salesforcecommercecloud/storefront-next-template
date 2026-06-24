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
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { CHECKOUT_ACTION_INTENTS } from '@/components/checkout/utils/checkout-context-types';

/**
 * Opt-in flag on a 200 + JSON action response body that suppresses checkout-loader revalidation. Used by extension
 * actions that consume the basket via `createOrder` but do not redirect; without it the loader would re-run against
 * the empty basket and unmount the extension's in-flight UI. Stable framework API: renaming is a breaking change.
 */
export const FRAMEWORK_SKIP_REVALIDATION = 'framework_skipRevalidation' as const;

// Derived from CHECKOUT_ACTION_INTENTS so a new step intent automatically participates in the skip.
const CHECKOUT_REVALIDATE_SKIP_INTENTS = new Set<string>(Object.values(CHECKOUT_ACTION_INTENTS));

/**
 * Skip checkout-loader revalidation when:
 *   1. The action returned a 3xx redirect (place-order destroys the basket then 302s to confirmation).
 *   2. The action returned 200 + JSON with `[FRAMEWORK_SKIP_REVALIDATION]: true` (extension opt-in).
 *   3. The submitting form's `intent` is a checkout step intent. Step actions return the updated basket in their
 *      response and the form page applies it directly, so the loader re-run is redundant.
 *
 * Denylist, not allowlist: the checkout loader carries shopper-scoped state that genuinely changes during checkout,
 * so a forgotten skip only wastes a payload but a wrong skip would render against stale data.
 *
 * @see https://reactrouter.com/start/framework/route-module#shouldrevalidate
 */
export function shouldRevalidate({
    actionStatus,
    actionResult,
    formData,
    defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
    if (actionStatus !== undefined && actionStatus >= 300 && actionStatus < 400) {
        return false;
    }
    if (
        actionResult &&
        typeof actionResult === 'object' &&
        !Array.isArray(actionResult) &&
        (actionResult as Record<string, unknown>)[FRAMEWORK_SKIP_REVALIDATION] === true
    ) {
        return false;
    }
    const intent = formData?.get('intent');
    if (typeof intent === 'string' && CHECKOUT_REVALIDATE_SKIP_INTENTS.has(intent)) {
        return false;
    }
    return defaultShouldRevalidate;
}
