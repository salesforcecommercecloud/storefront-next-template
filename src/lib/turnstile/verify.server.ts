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

/**
 * Server-side Turnstile token verification via Cloudflare's siteverify API.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

export interface TurnstileVerifyResult {
    success: boolean;
    challengeTs?: string;
    hostname?: string;
    errorCodes: string[];
    action?: string;
}

export interface VerifyTurnstileOptions {
    token: string;
    secretKey: string;
    remoteIp?: string;
}

export async function verifyTurnstileToken(options: VerifyTurnstileOptions): Promise<TurnstileVerifyResult> {
    const { token, secretKey, remoteIp } = options;

    if (!token || !secretKey) {
        return {
            success: false,
            errorCodes: [!token ? 'missing-input-response' : 'missing-input-secret'],
        };
    }

    const body = new URLSearchParams({
        secret: secretKey,
        response: token,
    });

    if (remoteIp) {
        body.set('remoteip', remoteIp);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

        const response = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                success: false,
                errorCodes: [`http-error-${response.status}`],
            };
        }

        const data = await response.json();

        return {
            success: data.success === true,
            challengeTs: data.challenge_ts,
            hostname: data.hostname,
            errorCodes: data['error-codes'] || [],
            action: data.action,
        };
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                errorCodes: ['timeout-or-duplicate'],
            };
        }

        return {
            success: false,
            errorCodes: ['internal-error'],
        };
    }
}
