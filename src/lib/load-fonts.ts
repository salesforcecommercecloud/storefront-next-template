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

// Import self-hosted Sen fonts as modules (Vite will handle bundle paths)
import sen400 from '@fonts/sen/sen-400.woff2?url';
import sen500 from '@fonts/sen/sen-500.woff2?url';
import sen600 from '@fonts/sen/sen-600.woff2?url';
import sen700 from '@fonts/sen/sen-700.woff2?url';

/**
 * Loads self-hosted Sen fonts using the FontFace API.
 * This approach is required for GDPR compliance (no external requests to Google Fonts)
 * and works with Managed Runtime's bundle path system.
 *
 * Uses 'optional' for optimal performance - prevents layout shifts and reduces TBT.
 * Font either loads within ~100ms or fallback is used permanently (no late swaps).
 */
export function loadFonts() {
    if (typeof window === 'undefined' || typeof FontFace === 'undefined') {
        return;
    }

    // Use 'optional' for all contexts to optimize TBT and prevent layout shifts
    const display = 'optional';

    const fonts = [
        new FontFace('Sen', `url(${sen400})`, { weight: '400', style: 'normal', display }),
        new FontFace('Sen', `url(${sen500})`, { weight: '500', style: 'normal', display }),
        new FontFace('Sen', `url(${sen600})`, { weight: '600', style: 'normal', display }),
        new FontFace('Sen', `url(${sen700})`, { weight: '700', style: 'normal', display }),
    ];

    // Load fonts and add to document
    fonts.forEach((font) => {
        font.load()
            .then((loadedFont) => {
                document.fonts.add(loadedFont);
            })
            .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Failed to load font:', error);
            });
    });
}

// Auto-load fonts when this module loads on the client
// This runs immediately, not waiting for React hydration
if (typeof window !== 'undefined') {
    loadFonts();
}
