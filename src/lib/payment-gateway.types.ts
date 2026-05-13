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

import type { ActionHookContext } from '@/targets/action-hook.server';
import type { ShopperBasketsV2, ShopperOrders } from '@salesforce/storefront-next-runtime/scapi';

export type PaymentFlowType = 'inline' | 'redirect' | 'deferred';

/**
 * formData field names exchanged between client and server. Centralized so a typo on
 * either end is impossible — tests pin both producers and consumers against the same
 * constants.
 */
export const PAYMENT_FRAMEWORK_FIELDS = {
    /** Declares the payment orchestration pattern. Presence == "extension active". */
    PAYMENT_FLOW_TYPE: 'framework_paymentFlowType',
    /** Per-checkout-session UUID forwarded to the PSP to deduplicate retries. */
    IDEMPOTENCY_KEY: 'framework_idempotencyKey',
    /** Optional. Saved-card token preserved across SCAPI's stripping behavior. */
    CREDIT_CARD_TOKEN: 'creditCardToken',
} as const;

// ─── Client-side contracts ─────────────────────────────────────────────────────

/**
 * Context passed to the extension's `onPaymentSubmit` handler.
 */
export interface PaymentSubmitContext {
    submitPlaceOrder: (extraFormData?: Record<string, string>) => void;
    basket?: { basketId: string; orderTotal: number; currency: string };
}

/**
 * Returned by `onPaymentSubmit`. For inline flows, extensions call
 * `submitPlaceOrder()` directly and return void.
 */
export type PaymentSubmitResult =
    | { status: 'ready'; extraFormData: Record<string, string> }
    | { status: 'redirect'; redirectUrl: string; stateToken: string; providerState?: string }
    | { status: 'error'; message: string; recoverable: boolean };

export type PaymentReturnResult =
    | { status: 'success'; extraFormData: Record<string, string> }
    | { status: 'pending'; message: string }
    | { status: 'error'; message: string };

// ─── Server-side hook contracts ─────────────────────────────────────────────────

export interface BeforePlaceOrderHookData {
    basket: ShopperBasketsV2.schemas['Basket'];
    formData: FormData;
}

export type BeforePlaceOrderHookContext = ActionHookContext<BeforePlaceOrderHookData>;

export interface PaymentRedirectReturnHookData {
    basket: ShopperBasketsV2.schemas['Basket'];
    returnParams: URLSearchParams;
    stateToken: string;
    providerState: string;
}

export type PaymentRedirectReturnHookContext = ActionHookContext<PaymentRedirectReturnHookData>;

export interface PaymentWebhookHookData {
    /** Demuxed from `?provider=` query param. Lets a single hook serve multiple PSPs. */
    providerName: string;
    /**
     * Raw request body bytes. Extensions MUST verify the signature against this exact
     * string before parsing or trusting any field — even one whitespace difference
     * invalidates a PSP signature, so re-serialized JSON cannot be used.
     */
    rawBody: string;
    /** All request headers, lowercased keys. Extensions read PSP-specific signature headers. */
    headers: Record<string, string>;
    /** Convenience pull-out of common signature headers; extensions can ignore in favor of `headers`. */
    signature: string;
    /** Order number — populated by extension after signature verification + payload parsing. */
    orderNo: string;
    /** Provider event type — populated by extension after signature verification + payload parsing. */
    providerEventType: string;
    /** Parsed payload — populated by extension after signature verification. Do NOT trust before verification. */
    providerPayload: unknown;
}

export type PaymentWebhookHookContext = ActionHookContext<PaymentWebhookHookData>;

export interface PaymentExpressCompleteHookData {
    basket: ShopperBasketsV2.schemas['Basket'];
    formData: FormData;
}

export type PaymentExpressCompleteHookContext = ActionHookContext<PaymentExpressCompleteHookData>;

export interface AfterPlaceOrderHookData {
    order: ShopperOrders.schemas['Order'];
    basket: ShopperBasketsV2.schemas['Basket'];
    formData: FormData;
}

export type AfterPlaceOrderHookContext = ActionHookContext<AfterPlaceOrderHookData>;

export interface OrderFailureHookData {
    basket: ShopperBasketsV2.schemas['Basket'];
    formData: FormData;
    error: unknown;
}

export type OrderFailureHookContext = ActionHookContext<OrderFailureHookData>;

// ─── Redirect state cookie ──────────────────────────────────────────────────────

/**
 * Serialized into an HMAC-signed, httpOnly, short-lived cookie before redirect.
 */
export interface PaymentRedirectState {
    stateToken: string;
    basketId: string;
    providerName: string;
    idempotencyKey: string;
    expiresAt: string;
    providerState: string;
    shouldCreateAccount: boolean;
    contactPhone: string;
}
