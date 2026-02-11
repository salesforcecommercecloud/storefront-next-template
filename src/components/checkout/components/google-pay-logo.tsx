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

import googlePayLogo from '/images/google-pay-logo.svg';

/**
 * Google Pay Logo SVG Component
 * Official Google Pay logo matching SDK button appearance
 * Uses local Google Pay SVG file from public/images
 */
export default function GooglePayLogo({ className }: { className?: string }) {
    return (
        <img
            src={googlePayLogo}
            alt="Google Pay"
            className={`${className || ''} h-4 w-auto`}
            style={{ objectFit: 'contain' }}
        />
    );
}
