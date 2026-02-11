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
import { AsyncLocalStorage } from 'node:async_hooks';
import { HYBRID_PROXY_CONFIG } from '../config';

const HYBRID_COOKIES = ['dwsid', 'dwsecuretoken'] as const;

const cookieStorage = new AsyncLocalStorage<Map<string, string>>();
let isFetchPatched = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let originalFetch: any;

export const _resetForTest = () => {
    if (isFetchPatched && originalFetch) {
        globalThis.fetch = originalFetch;
    }
    isFetchPatched = false;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cookieCaptureMiddleware = (_req: any, res: any, next: any) => {
    if (!HYBRID_PROXY_CONFIG.enabled) return next();

    // Initialize global fetch patch once
    if (!isFetchPatched) {
        originalFetch = globalThis.fetch.bind(globalThis);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newFetch = async (input: any, init: any) => {
            const response = await originalFetch(input, init);
            try {
                const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

                if (url) {
                    const store = cookieStorage.getStore();
                    if (store) {
                        // Capture cookies from response
                        const headerVal =
                            typeof response.headers.getSetCookie === 'function'
                                ? response.headers.getSetCookie()
                                : response.headers.get('set-cookie');

                        if (headerVal) {
                            const cookieStrings = Array.isArray(headerVal) ? headerVal : [headerVal];
                            cookieStrings.forEach((str) => {
                                const [nameVal] = str.split(';'); // Get Name=Value part
                                const [name, ...valParts] = nameVal.split('=');
                                if ((HYBRID_COOKIES as readonly string[]).includes(name.trim())) {
                                    store.set(name.trim(), valParts.join('='));
                                }
                            });
                        }

                        // Explicitly clear on logout
                        if (url.includes('/logout') || url.includes('/revoke')) {
                            HYBRID_COOKIES.forEach((key) => store.set(key, '; Max-Age=0'));
                        }
                    }
                }
            } catch {
                /* ignore capture errors */
            }
            return response;
        };
        globalThis.fetch = newFetch;
        isFetchPatched = true;
    }

    const store = new Map<string, string>();
    cookieStorage.run(store, () => {
        const originalWriteHead = res.writeHead;

        // Hook writeHead to inject cookies before sending response
        res.writeHead = function (statusCode: number, ...args: unknown[]) {
            if (store.size > 0) {
                const existing = res.getHeader('set-cookie');
                const newCookies = Array.isArray(existing) ? [...existing] : existing ? [existing as string] : [];

                store.forEach((val, name) => {
                    // Check if it's a deletion command (starts with ;) or value
                    if (val.startsWith(';')) {
                        newCookies.push(`${name}=${val}; Path=/; SameSite=Lax`);
                    } else {
                        newCookies.push(`${name}=${val}; Path=/; SameSite=Lax`);
                    }
                });

                res.setHeader('set-cookie', newCookies);
            }
            return originalWriteHead.call(this, statusCode, ...args);
        };

        next();
    });
};
