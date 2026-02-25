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
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Dynamically imports `config.server.ts` from the project root (CWD) and returns
 * the `app` configuration object. This runs at route discovery time under vite-node
 * (typegen, dev, build), which handles the TS transformation.
 *
 * - If the config file is missing, warns and returns an empty config.
 * - If the config file exists but fails to import, throws with the original error as cause.
 *
 * @returns The `app` configuration object, or an empty object if not available.
 */
// TODO: add a proper type when config schema is moved to runtime from the template
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadConfig(): Promise<Record<string, any>> {
    const configPath = path.resolve(process.cwd(), 'config.server.ts');

    if (!fs.existsSync(configPath)) {
        console.warn(
            `[storefront-next-runtime] config.server.ts not found at ${configPath}. ` + `Returning empty config.`
        );
        return {};
    }

    try {
        // The @vite-ignore comment suppresses Vite's "dynamic import cannot be analyzed" warning.
        // It must be placed on the variable value (not inside import()) so that rolldown's
        // single-use variable inlining carries it into the import() expression in the built output.
        // See: https://github.com/nicolo-ribaudo/rolldown/issues/6263
        const importPath = /* @vite-ignore */ pathToFileURL(configPath).href;

        const mod = await import(importPath);
        const config = mod.default ?? mod;
        return config?.app ?? {};
    } catch (error) {
        throw new Error(`[storefront-next-runtime] Found config.server.ts at ${configPath} but failed to import it.`, {
            cause: error,
        });
    }
}
