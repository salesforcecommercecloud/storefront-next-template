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

import config from '@/config/server';

/**
 * Single source of truth for whether the payment integration framework is active.
 *
 * Returns true only when `config.app.payment.frameworkEnabled` is explicitly true.
 * When false (default), all framework-specific code paths short-circuit:
 *   - `place-order` ignores `framework_paymentFlowType` formData
 *   - `payment-redirect-init` / `-return` / `-finalize` return 404
 *   - `payment-webhook` returns 404
 *   - `payment-express-complete` returns 404
 *
 * Merchants opt in by setting `PUBLIC__app__payment__frameworkEnabled=true` in their
 * MRT environment after installing a payment extension. Until then, the framework
 * behaves as if it does not exist — built-in checkout payment flow is unchanged.
 *
 * Why a config flag instead of "are any payment hooks registered?": the action-hook
 * virtual module (`virtual:action-hooks`) exposes `runHook(id, ctx)` but no
 * introspection API for "is any handler registered for this hookId?". Auto-detection
 * would require the SDK to scan all target-config.json files at build time and emit
 * a registered-hooks manifest. An explicit opt-in flag is a smaller, clearer
 * alternative: merchants set it after installing a payment extension, and framework
 * code paths short-circuit until they do.
 */
export function isPaymentFrameworkEnabled(): boolean {
    return config.app.payment?.frameworkEnabled === true;
}

/** Standard 404 response used by framework routes when not enabled. */
export function frameworkDisabledResponse(): Response {
    return new Response('Not Found', { status: 404 });
}
