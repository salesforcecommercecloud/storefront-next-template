/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { useInteraction } from './useInteraction';

export interface ScrollInteraction {
    notifyWindowScrollChange: (x: number, y: number) => void;
}

/**
 * Custom hook that manages component hover state and handles
 * client-host communication for hover events.
 *
 * @returns Hover state and interaction methods
 */
export function useScrollInteraction(): ScrollInteraction {
    const { notifyWindowScrollChange } = useInteraction({
        initialState: null,
        eventHandlers: {
            WindowScrollChanged: {
                handler: (event) => {
                    if (event.scrollY != null) {
                        window.scrollTo({
                            behavior: 'instant',
                            top: event.scrollY,
                        });
                    }
                },
            },
        },
        actions: (_state, _setState, clientApi) => ({
            notifyWindowScrollChange: (x: number, y: number) => {
                clientApi?.notifyWindowScrollChanged({
                    scrollX: x,
                    scrollY: y,
                });
            },
        }),
    });

    return { notifyWindowScrollChange };
}
