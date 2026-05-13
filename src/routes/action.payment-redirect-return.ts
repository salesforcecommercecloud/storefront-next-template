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

import { redirect, type LoaderFunctionArgs } from 'react-router';
import { getLogger } from '@/lib/logger.server';
import { readRedirectCookie, validateStateToken } from '@/lib/payment-redirect.server';
import { buildUrlFromContext } from '@/lib/url.server';
import { frameworkDisabledResponse, isPaymentFrameworkEnabled } from '@/lib/payment/framework-enabled.server';

/**
 * Minimal HTML-attribute escape for values interpolated into double-quoted attributes.
 * Provider return URLs can carry arbitrary query strings, so the action attribute MUST be
 * escaped before interpolation.
 */
function escapeHtmlAttr(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * GET handler for the shopper's return from an external payment provider.
 *
 * This is a `loader` because external providers redirect back via a 302 — i.e. a regular
 * browser navigation. Loaders run on prefetch, revalidation, and back-button navigation,
 * so they must NOT mutate state. The actual order creation lives behind a POST in
 * `action.payment-redirect-finalize.ts`.
 *
 * This handler validates the redirect cookie + stateToken, then renders a small page that
 * auto-submits a POST to the finalize action. If validation fails, redirects to checkout
 * with an error code.
 *
 * The page shows a clear "Completing your payment" message with a spinner and centered
 * brand-neutral styling so a shopper on a slow connection sees something rendered while
 * the form auto-submits. A `<noscript>` fallback shows a "Continue" button for clients
 * without JavaScript.
 */
export function loader({ request, context }: LoaderFunctionArgs): Response {
    if (!isPaymentFrameworkEnabled()) return frameworkDisabledResponse();
    const logger = getLogger(context);
    const url = new URL(request.url);
    const tokenFromUrl = url.searchParams.get('token') || '';

    const state = readRedirectCookie(request);
    if (!state) {
        logger.warn('[Payment] redirect-return: no cookie found or expired');
        return redirect(`${buildUrlFromContext('/checkout', context)}?error=payment_expired`);
    }

    if (!validateStateToken(state, tokenFromUrl)) {
        logger.warn('[Payment] redirect-return: state token mismatch');
        return redirect(`${buildUrlFromContext('/checkout', context)}?error=payment_invalid`);
    }

    // Forward the original query string so the finalize action can read provider-specific
    // return params (e.g., Stripe's `payment_intent`, PayPal's `PayerID`). Escape the
    // entire URL before interpolating into the form's action attribute.
    const finalizeUrl = `${buildUrlFromContext('/action/payment-redirect-finalize', context)}${url.search}`;
    const safeFinalizeUrl = escapeHtmlAttr(finalizeUrl);

    // Visible "completing your payment" message + accessible spinner. Auto-submits via
    // inline script; <noscript> fallback covers no-JS clients. Inline CSS keeps this
    // standalone (no asset pipeline dependency in the time-critical post-redirect window).
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Completing your payment…</title>
<style>
  html,body{margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7f7;color:#222;}
  main{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;}
  .card{background:#fff;border:1px solid #e2e2e2;border-radius:8px;padding:2rem 2.5rem;max-width:28rem;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.04);}
  h1{font-size:1.125rem;margin:0 0 .5rem;font-weight:600;}
  p{margin:.5rem 0 0;color:#555;font-size:.95rem;line-height:1.4;}
  .spinner{width:36px;height:36px;border:3px solid #e2e2e2;border-top-color:#0070d2;border-radius:50%;animation:spin 0.9s linear infinite;margin:0 auto 1rem;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .ns-btn{margin-top:1rem;padding:.6rem 1.2rem;background:#0070d2;color:#fff;border:none;border-radius:4px;font-size:.95rem;cursor:pointer;}
  .ns-btn:hover{background:#005fb2;}
  @media (prefers-color-scheme:dark){body{background:#1a1a1a;color:#eee;}.card{background:#262626;border-color:#3a3a3a;}p{color:#aaa;}.spinner{border-color:#3a3a3a;border-top-color:#5ba0e8;}.ns-btn{background:#1976d2;}.ns-btn:hover{background:#155bb5;}}
</style>
</head>
<body>
<main>
  <div class="card" role="status" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <h1>Completing your payment</h1>
    <p>Please wait — this should only take a moment.</p>
    <p>Don't close this window or use your browser's back button.</p>
    <form id="f" method="post" action="${safeFinalizeUrl}"></form>
    <noscript>
      <p>JavaScript is required to complete this checkout automatically.</p>
      <button form="f" type="submit" class="ns-btn">Continue</button>
    </noscript>
  </div>
</main>
<script>
  // Auto-submit. If submission fails to navigate within ~30s, show an explicit recovery
  // message rather than leaving the shopper with no signal.
  (function () {
    var f = document.getElementById('f');
    try { f.submit(); } catch (_) { /* will fall back to noscript button visibility */ }
    setTimeout(function () {
      var card = document.querySelector('.card');
      if (!card) return;
      var msg = document.createElement('p');
      msg.textContent = "If this is taking longer than expected, please contact support — your payment may still be processing.";
      msg.style.color = '#a04';
      card.appendChild(msg);
    }, 30000);
  })();
</script>
</body>
</html>`;

    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}
