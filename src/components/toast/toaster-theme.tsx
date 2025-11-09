/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

/**
 * Client-side Toaster component that adapts to theme changes
 * Watches for changes to the 'dark' class on document.documentElement
 */
export function ToasterTheme() {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') {
            return 'light';
        }
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    useEffect(() => {
        // Watch for theme changes by observing class changes on documentElement
        const observer = new MutationObserver(() => {
            const isDark = document.documentElement.classList.contains('dark');
            setTheme(isDark ? 'dark' : 'light');
        });

        // Observe changes to the class attribute
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    return <Toaster richColors expand position="top-right" className="toaster" theme={theme} />;
}
