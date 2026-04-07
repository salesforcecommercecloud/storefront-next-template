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
 * Utilities for SCAPI schema management: client key derivation, base path parsing,
 * and schema metadata.
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import YAML from 'yaml';

/**
 * Convert an API name like "shopper-products" to a camelCase client key like "shopperProducts".
 */
export function deriveClientKey(apiName: string): string {
    return apiName.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Derive the SCAPI base path from an OpenAPI schema file.
 *
 * Parses the `servers[].url` field. SCAPI schemas typically have server URLs like:
 *   https://{shortCode}.api.commercecloud.salesforce.com/product/shopper-products/v1
 *
 * Returns the path portion (e.g., "/product/shopper-products/v1").
 *
 * @param schemaPath - Path to the OAS YAML/JSON file
 * @returns The derived base path, or undefined if it cannot be determined
 */
export function deriveBasePath(schemaPath: string): string | undefined {
    const content = readFileSync(schemaPath, 'utf-8');
    const ext = extname(schemaPath).toLowerCase();

    let schema: Record<string, unknown>;
    if (ext === '.yaml' || ext === '.yml') {
        schema = YAML.parse(content);
    } else {
        schema = JSON.parse(content);
    }

    const servers = schema.servers as Array<{ url?: string }> | undefined;
    if (!servers || servers.length === 0) return undefined;

    const serverUrl = servers[0].url;
    if (!serverUrl) return undefined;

    try {
        // Replace template variables with placeholders to make it parseable
        const normalizedUrl = serverUrl.replace(/\{[^}]+\}/g, 'placeholder');
        const url = new URL(normalizedUrl);
        const pathname = url.pathname;
        // Reject bare "/" — it's not a useful base path (common in custom SCAPI schemas)
        return pathname && pathname !== '/' ? pathname : undefined;
    } catch {
        // If it's already a path (no host), return as-is (but reject bare "/")
        if (serverUrl.startsWith('/') && serverUrl !== '/') return serverUrl;

        // Try to extract path after the host portion
        const match = serverUrl.match(/(?:https?:\/\/[^/]+)?(\/.+)/);
        return match?.[1] ?? undefined;
    }
}

/**
 * Metadata sidecar for a schema file.
 */
export interface SchemaMetadata {
    clientKey: string;
    basePath: string;
    supportsLocale: boolean;
    /** Whether to inject /organizations/{organizationId} into the base URL.
     *  Custom SCAPI schemas typically don't include the org path segment. */
    orgPrefix: boolean;
}

/**
 * Read all .meta.json sidecars from a schemas directory.
 */
export function readAllSchemaMetadata(schemasDir: string): Array<SchemaMetadata & { schemaName: string }> {
    if (!existsSync(schemasDir)) return [];

    const metaFiles = readdirSync(schemasDir).filter((f) => f.endsWith('.meta.json'));
    return metaFiles.map((f) => {
        const content = JSON.parse(readFileSync(join(schemasDir, f), 'utf-8')) as SchemaMetadata;
        const schemaName = f.replace('.meta.json', '');
        return { ...content, schemaName };
    });
}

/**
 * Write a .meta.json sidecar for a schema file.
 */
export function writeSchemaMetadata(schemasDir: string, schemaName: string, meta: SchemaMetadata): void {
    const metaPath = join(schemasDir, `${schemaName}.meta.json`);
    writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');
}
