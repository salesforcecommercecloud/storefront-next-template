/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastOptions {
    duration?: number;
    action?: ToastAction;
    cancel?: ToastAction;
    description?: ReactNode;
}

/**
 * Custom hook for toast notifications using sonner
 */
export function useToast() {
    const addToast = useCallback((message: string, type: ToastType = 'info', options?: ToastOptions | number) => {
        // Support legacy API where duration is passed as third parameter
        const duration = typeof options === 'number' ? options : (options?.duration ?? 5000);
        const toastOptions = typeof options === 'number' ? {} : (options ?? {});

        const sonnerOptions = {
            duration,
            ...(toastOptions.action && {
                action: {
                    label: toastOptions.action.label,
                    onClick: toastOptions.action.onClick,
                },
            }),
            ...(toastOptions.cancel && {
                cancel: {
                    label: toastOptions.cancel.label,
                    onClick: toastOptions.cancel.onClick,
                },
            }),
            ...(toastOptions.description && {
                description: toastOptions.description,
            }),
        };

        // If no action provided, add default Close action button
        if (!toastOptions.action && !toastOptions.cancel) {
            sonnerOptions.action = {
                label: 'Close',
                onClick: () => toast.dismiss(),
            };
        }

        switch (type) {
            case 'success':
                return toast.success(message, sonnerOptions);
            case 'error':
                return toast.error(message, sonnerOptions);
            default:
                return toast(message, sonnerOptions);
        }
    }, []);

    return { addToast };
}

// Re-export toast and Toaster from sonner for convenience
export { toast, Toaster } from 'sonner';

// Export theme-aware Toaster component
export { ToasterTheme } from './toaster-theme';
