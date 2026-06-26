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

/**
 * Per-vertical primary font binding. Verticals override this module via
 * `src/verticals/${VERTICAL}/lib/fonts.ts` to ship a different woff2 file
 * (and matching `@font-face` declaration in their theme css) without forking
 * `root.tsx`. The `@/lib/fonts` import in `root.tsx` resolves vertical-first
 * via the `@/` alias chain in dev, and the mirror script flattens the
 * vertical's override over canonical at build time.
 */
import sen from '/fonts/sen-variable.woff2';

export const primaryFont = sen;
