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
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { Check } from 'lucide-react';

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

    return (
        <Toaster
            expand
            position="top-center"
            closeButton
            className="toaster"
            theme={theme}
            offset="calc(var(--header-height, 0px) + 0.75rem)"
            icons={{ success: <Check size={20} strokeWidth={2.5} /> }}
            toastOptions={{ unstyled: true }}
        />
    );
}
