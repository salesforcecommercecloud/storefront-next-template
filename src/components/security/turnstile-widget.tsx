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

'use client';

import { useEffect, useRef } from 'react';

export interface TurnstileWidgetProps {
    siteKey: string;
    onSuccess: (token: string) => void;
    onError?: (error: string) => void;
    onExpire?: () => void;
    enabled?: boolean;
    mode?: 'managed' | 'non-interactive' | 'invisible';
    /** Mutable ref that receives a reset function. Call it to invalidate the current token and start a new challenge. */
    resetRef?: React.MutableRefObject<(() => void) | null>;
    /** Mutable ref that receives an execute function. Call it to explicitly start the challenge (only used when execution='execute'). */
    executeRef?: React.MutableRefObject<(() => void) | null>;
}

export function TurnstileWidget({
    siteKey,
    onSuccess,
    onError,
    onExpire,
    enabled = true,
    mode = 'managed',
    resetRef,
    executeRef,
}: TurnstileWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const isErrorRef = useRef<boolean>(false);
    const hasLoggedErrorRef = useRef<boolean>(false);

    // Expose a reset function so the parent can request a fresh token
    useEffect(() => {
        if (resetRef) {
            resetRef.current = () => {
                if (widgetIdRef.current && window.turnstile) {
                    window.turnstile.reset(widgetIdRef.current);
                }
            };
        }
        return () => {
            if (resetRef) {
                resetRef.current = null;
            }
        };
    }, [resetRef]);

    useEffect(() => {
        if (executeRef) {
            executeRef.current = () => {
                if (widgetIdRef.current && window.turnstile) {
                    window.turnstile.execute(widgetIdRef.current);
                }
            };
        }
        return () => {
            if (executeRef) {
                executeRef.current = null;
            }
        };
    }, [executeRef]);

    useEffect(() => {
        if (!enabled || !siteKey || !containerRef.current) {
            return;
        }

        const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        const TURNSTILE_SCRIPT_ID = 'turnstile-script';

        // Initialize Turnstile widget
        const initializeWidget = () => {
            if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
                return;
            }

            try {
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => {
                        isErrorRef.current = false;
                        onSuccess(token);
                    },
                    'error-callback': () => {
                        isErrorRef.current = true;
                        if (!hasLoggedErrorRef.current) {
                            // eslint-disable-next-line no-console
                            console.warn('[Turnstile] Challenge failed');
                            hasLoggedErrorRef.current = true;
                        }
                        if (onError) {
                            onError('Challenge failed');
                        }
                    },
                    'expired-callback': () => {
                        if (onExpire) {
                            onExpire();
                        }
                    },
                    appearance: 'interaction-only',
                    execution: mode === 'non-interactive' ? 'execute' : 'render',
                    theme: 'auto',
                    size: 'normal',
                });
            } catch (error) {
                isErrorRef.current = true;
                if (!hasLoggedErrorRef.current) {
                    // eslint-disable-next-line no-console
                    console.warn('[Turnstile] Failed to initialize:', error);
                    hasLoggedErrorRef.current = true;
                }
                if (onError) {
                    onError(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        };

        // Check if Turnstile is already loaded
        if (window.turnstile) {
            initializeWidget();
        } else {
            // Load Turnstile script if not already present
            let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement;

            if (!script) {
                script = document.createElement('script');
                script.id = TURNSTILE_SCRIPT_ID;
                script.src = TURNSTILE_SCRIPT_URL;
                script.async = true;
                script.defer = true;

                script.onload = () => {
                    initializeWidget();
                };

                script.onerror = () => {
                    isErrorRef.current = true;
                    if (!hasLoggedErrorRef.current) {
                        // eslint-disable-next-line no-console
                        console.warn('[Turnstile] Failed to load script');
                        hasLoggedErrorRef.current = true;
                    }
                    if (onError) {
                        onError('Failed to load script');
                    }
                };

                document.head.appendChild(script);
            } else {
                // Script exists, wait for it to load
                const checkInterval = setInterval(() => {
                    if (window.turnstile) {
                        clearInterval(checkInterval);
                        initializeWidget();
                    }
                }, 100);

                const timeout = setTimeout(() => {
                    clearInterval(checkInterval);
                    if (!widgetIdRef.current) {
                        isErrorRef.current = true;
                        if (!hasLoggedErrorRef.current) {
                            // eslint-disable-next-line no-console
                            console.warn('[Turnstile] Script load timeout');
                            hasLoggedErrorRef.current = true;
                        }
                        if (onError) {
                            onError('Script load timeout');
                        }
                    }
                }, 10000);

                return () => {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                };
            }
        }

        // Cleanup
        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [enabled, siteKey, onSuccess, onError, onExpire, mode]);

    if (!enabled || !siteKey) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div ref={containerRef} data-testid="turnstile-widget" role="presentation" />
        </div>
    );
}
