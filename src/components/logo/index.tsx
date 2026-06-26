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

// Canonical brand logo. The raster asset resolves through the public-asset
// vertical overlay (`/images/logo.svg`), but verticals that ship a bespoke
// (e.g. inline-SVG) logo override this whole component via `@/components/logo` —
// the Vite vertical resolver checks `src/verticals/${VERTICAL}/components/logo`
// first. Keeping the logo behind a component (instead of a hardcoded `<img>`)
// lets the error page and any other consumer pick up the vertical's logo.
import logo from '/images/logo.svg';

interface LogoProps {
    className?: string;
    alt?: string;
}

export default function Logo({ className, alt = 'Logo' }: LogoProps) {
    return <img src={logo} alt={alt} className={className} />;
}
