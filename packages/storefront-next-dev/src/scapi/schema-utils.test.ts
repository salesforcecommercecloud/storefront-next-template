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
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
    deriveBasePath,
    deriveClientKey,
    readAllSchemaMetadata,
    writeSchemaMetadata,
    type SchemaMetadata,
} from './schema-utils';

describe('schema-utils', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
        tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    });

    const createTempDir = () => {
        const dir = mkdtempSync(join(tmpdir(), 'sfnext-scapi-schema-utils-'));
        tempDirs.push(dir);
        return dir;
    };

    it('derives camelCase client keys from hyphenated API names', () => {
        expect(deriveClientKey('shopper-products')).toBe('shopperProducts');
        expect(deriveClientKey('store-inventory-api')).toBe('storeInventoryApi');
    });

    it('derives a base path from yaml server urls with placeholders', () => {
        const dir = createTempDir();
        const schemaPath = join(dir, 'loyalty.yaml');

        writeFileSync(
            schemaPath,
            [
                'openapi: 3.0.0',
                'servers:',
                '  - url: https://{shortCode}.api.commercecloud.salesforce.com/custom/loyalty/v1',
            ].join('\n'),
            'utf-8'
        );

        expect(deriveBasePath(schemaPath)).toBe('/custom/loyalty/v1');
    });

    it('derives a base path from json schemas that already use a path-only server url', () => {
        const dir = createTempDir();
        const schemaPath = join(dir, 'loyalty.json');

        writeFileSync(
            schemaPath,
            JSON.stringify({
                openapi: '3.0.0',
                servers: [{ url: '/custom/loyalty/v1' }],
            }),
            'utf-8'
        );

        expect(deriveBasePath(schemaPath)).toBe('/custom/loyalty/v1');
    });

    it('returns undefined for unusable root server urls', () => {
        const dir = createTempDir();
        const schemaPath = join(dir, 'root-only.yaml');

        writeFileSync(schemaPath, ['openapi: 3.0.0', 'servers:', '  - url: /'].join('\n'), 'utf-8');

        expect(deriveBasePath(schemaPath)).toBeUndefined();
    });

    it('writes and reads schema metadata sidecars', () => {
        const dir = createTempDir();
        const schemasDir = join(dir, 'src', 'scapi', 'schemas');
        mkdirSync(schemasDir, { recursive: true });

        const metadata: SchemaMetadata = {
            clientKey: 'loyalty',
            basePath: '/custom/loyalty/v1',
            supportsLocale: false,
            orgPrefix: true,
        };

        writeSchemaMetadata(schemasDir, 'loyalty-v1', metadata);

        expect(readFileSync(join(schemasDir, 'loyalty-v1.meta.json'), 'utf-8')).toContain('"clientKey": "loyalty"');
        expect(readAllSchemaMetadata(schemasDir)).toEqual([
            {
                ...metadata,
                schemaName: 'loyalty-v1',
            },
        ]);
    });

    it('returns an empty array when no metadata directory exists', () => {
        const dir = createTempDir();

        expect(readAllSchemaMetadata(join(dir, 'missing'))).toEqual([]);
    });
});
