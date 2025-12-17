/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { useRef, useCallback } from 'react';

export function useDebouncedCallback<TArgs extends unknown[], TReturn>(
    callback: (...args: TArgs) => TReturn,
    interval: number,
    deps: unknown[] = []
): (...args: TArgs) => TReturn | void {
    const timeoutRef = useRef<number | null>(null);

    return useCallback(
        (...args: TArgs): TReturn | void => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            timeoutRef.current = setTimeout(() => {
                callback(...args);
                timeoutRef.current = null;
            }, interval) as unknown as number;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [callback, interval, ...deps]
    );
}
