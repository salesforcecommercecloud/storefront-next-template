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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile, stat } from 'fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
    toPascalCase,
    toCamelCase,
    getDefaultDirs,
    findExtensionsWithConfig,
    generateConfigFile,
    aggregateExtensionConfig,
} from './aggregate-extension-config';

interface TestDirs {
    EXTENSIONS_DIR: string;
    OUTPUT_DIR: string;
}

const writeExtensionConfig = (extensionsDir: string, name: string, body = 'export default {};') =>
    mkdir(join(extensionsDir, name), { recursive: true }).then(() =>
        writeFile(join(extensionsDir, name, 'config.ts'), body)
    );

describe('aggregate-extension-config', () => {
    describe('toCamelCase', () => {
        it('converts a kebab-case folder name to the camelCase config key', () => {
            expect(toCamelCase('loqate-address-verification')).toBe('loqateAddressVerification');
            expect(toCamelCase('store-locator')).toBe('storeLocator');
            expect(toCamelCase('bnpl')).toBe('bnpl');
        });

        it('handles single words and empty strings', () => {
            expect(toCamelCase('extension')).toBe('extension');
            expect(toCamelCase('')).toBe('');
        });
    });

    describe('toPascalCase', () => {
        it('converts kebab-case to PascalCase', () => {
            expect(toPascalCase('store-locator')).toBe('StoreLocator');
        });
    });

    describe('getDefaultDirs', () => {
        it('places the output dir under src/extensions/config of the project root', () => {
            const { EXTENSIONS_DIR, OUTPUT_DIR } = getDefaultDirs('/tmp/my-app');
            expect(EXTENSIONS_DIR).toBe(join('/tmp/my-app', 'src', 'extensions'));
            expect(OUTPUT_DIR).toBe(join('/tmp/my-app', 'src', 'extensions', 'config'));
        });
    });

    describe('generateConfigFile', () => {
        it('emits an empty default export when no extensions ship a config', () => {
            const content = generateConfigFile([]);
            expect(content).toContain('// No extension config files found');
            expect(content).toContain('export default {};');
        });

        it('namespaces each extension by the camelCase of its folder name', () => {
            const content = generateConfigFile([
                { name: 'loqate-address-verification', path: '../loqate-address-verification/config' },
            ]);
            expect(content).toContain(
                "import loqateAddressVerificationConfig from '../loqate-address-verification/config';"
            );
            expect(content).toContain('loqateAddressVerification: loqateAddressVerificationConfig,');
            // The locale aggregator's ext-prefixed convention must NOT leak into config keys —
            // the merchant-facing path is app.extension.loqateAddressVerification.
            expect(content).not.toContain('extLoqateAddressVerification');
        });

        it('imports each extension config by a relative path, never the @/ alias', () => {
            // config.server.ts pulls this barrel in through jiti during route typegen, before
            // Vite resolves @/, so an aliased import here would fail to resolve at typegen time.
            const content = generateConfigFile([{ name: 'store-locator', path: '../store-locator/config' }]);
            expect(content).toContain("from '../store-locator/config';");
            expect(content).not.toContain('@/extensions');
        });

        it('throws when two folders collapse to the same config key', () => {
            // A kebab folder and an already-camel folder both resolve to `storeLocator`.
            expect(() =>
                generateConfigFile([
                    { name: 'store-locator', path: '../store-locator/config' },
                    { name: 'storeLocator', path: '../storeLocator/config' },
                ])
            ).toThrow(/collision.*storeLocator/i);
        });

        it('throws on a folder name that cannot form a valid config key', () => {
            // Folder names are authored by third-party extension vendors. A dot, a leading digit,
            // or an empty collapse would emit a barrel that fails to parse — fail fast, named.
            for (const name of ['my.ext', '123-ext', '--']) {
                expect(() => generateConfigFile([{ name, path: `../${name}/config` }])).toThrow(/invalid config key/i);
            }
        });

        it('throws a hyphens-not-underscores error for an underscore-named folder', () => {
            // store_locator camelCases to itself (toCamelCase only splits on `-`), so it would
            // silently mismatch the PUBLIC__app__extension__storeLocator__* convention. The error
            // must name underscores specifically, not just the generic invalid-key message.
            expect(() => generateConfigFile([{ name: 'store_locator', path: '../store_locator/config' }])).toThrow(
                /underscore.*hyphen|use hyphens/i
            );
        });

        it('includes the license header and the auto-generation warning', () => {
            const content = generateConfigFile([]);
            expect(content).toContain('Licensed under the Apache License, Version 2.0');
            expect(content).toContain('// NOTE: This file is auto-generated. Do not edit manually.');
            expect(content).toContain("// Run 'pnpm config:aggregate-extensions' to regenerate this file.");
        });
    });

    describe('filesystem integration', () => {
        let testDir: string;
        let dirs: TestDirs;

        beforeEach(async () => {
            testDir = join(tmpdir(), `test-extension-config-${Date.now()}-${Math.random().toString(36).slice(2)}`);
            const extensionsDir = join(testDir, 'src', 'extensions');
            dirs = { EXTENSIONS_DIR: extensionsDir, OUTPUT_DIR: join(extensionsDir, 'config') };
            await mkdir(extensionsDir, { recursive: true });
        });

        afterEach(async () => {
            await rm(testDir, { recursive: true, force: true });
        });

        describe('findExtensionsWithConfig', () => {
            it('finds only extensions that ship a config.ts, sorted by name', async () => {
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'store-locator');
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'bnpl');
                await mkdir(join(dirs.EXTENSIONS_DIR, 'no-config-ext', 'components'), { recursive: true });

                const found = await findExtensionsWithConfig(dirs.EXTENSIONS_DIR);

                expect(found.map((e) => e.name)).toEqual(['bnpl', 'store-locator']);
                expect(found[0].path).toBe('../bnpl/config');
            });

            it('skips the generated config output directory and the locales directory', async () => {
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'bopis');
                // Siblings that are NOT extensions: the aggregator's own output and the locale barrel.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'config');
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'locales');

                const found = await findExtensionsWithConfig(dirs.EXTENSIONS_DIR);

                expect(found.map((e) => e.name)).toEqual(['bopis']);
            });

            it('returns an empty array when the extensions directory does not exist', async () => {
                expect(await findExtensionsWithConfig(join(testDir, 'nonexistent'))).toEqual([]);
            });
        });

        describe('aggregateExtensionConfig', () => {
            it('writes a barrel that re-exports each discovered config under its camelCase key', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'loqate-address-verification',
                    'export default { apiKey: "", cacheTTL: 900000 };'
                );

                const result = await aggregateExtensionConfig({ dirs, silent: true });

                expect(result.extensions).toEqual(['loqateAddressVerification']);
                const barrel = await readFile(join(dirs.OUTPUT_DIR, 'index.ts'), 'utf8');
                expect(barrel).toContain(
                    "import loqateAddressVerificationConfig from '../loqate-address-verification/config';"
                );
                expect(barrel).toContain('loqateAddressVerification: loqateAddressVerificationConfig,');
            });

            it('writes an empty barrel when no extension ships a config', async () => {
                const result = await aggregateExtensionConfig({ dirs, silent: true });

                expect(result.extensions).toEqual([]);
                const barrel = await readFile(join(dirs.OUTPUT_DIR, 'index.ts'), 'utf8');
                expect(barrel).toContain('export default {};');
            });

            it('does not re-write the barrel when the content is already up to date', async () => {
                // The prestep runs on every `pnpm dev`; an unconditional write touches mtime and
                // the Vite watcher rebuilds, a self-triggered reload loop. A second run with no
                // change must leave the file untouched.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'store-locator');

                await aggregateExtensionConfig({ dirs, silent: true });
                const { mtimeMs: before } = await stat(join(dirs.OUTPUT_DIR, 'index.ts'));

                await aggregateExtensionConfig({ dirs, silent: true });
                const { mtimeMs: after } = await stat(join(dirs.OUTPUT_DIR, 'index.ts'));

                expect(after).toBe(before);
            });

            // A config.ts is imported as a live module at build and server startup. Because
            // extensions are third-party, anything beyond a static object literal is a
            // supply-chain / secret-leak vector and must be rejected at discovery time.
            it('rejects a config.ts with a top-level import', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'evil-import',
                    "import { execSync } from 'child_process';\nexecSync('id');\nexport default { apiKey: '' };"
                );
                await expect(aggregateExtensionConfig({ dirs, silent: true })).rejects.toThrow(/static values/i);
            });

            it('rejects a config.ts whose value is a process.env read', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'evil-env',
                    'export default { apiKey: process.env.STRIPE_SECRET_KEY };'
                );
                await expect(aggregateExtensionConfig({ dirs, silent: true })).rejects.toThrow(/static values/i);
            });

            it('rejects a config.ts whose value is a function call', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'evil-call',
                    "export default { token: fetchToken() };\nfunction fetchToken() { return 'x'; }"
                );
                await expect(aggregateExtensionConfig({ dirs, silent: true })).rejects.toThrow(/static values/i);
            });

            it('rejects a config.ts that has no default export', async () => {
                // An empty `config.ts` (or one with only stray semicolons) parses without a
                // default declaration — the merged `app.extension.<key>` would be `undefined`
                // at runtime. Surface the missing default at discovery time with the file named.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'no-default', ';;;');
                await expect(aggregateExtensionConfig({ dirs, silent: true })).rejects.toThrow(/no default export/i);
            });

            it('rejects a config.ts whose default object contains a spread', async () => {
                // A spread inside the default object isn't an `ObjectProperty` — even an inline
                // one widens the contract from "static keys" to "evaluate at import", which the
                // static-only rule exists to close.
                await writeExtensionConfig(dirs.EXTENSIONS_DIR, 'evil-spread', 'export default { ...{ apiKey: "" } };');
                await expect(aggregateExtensionConfig({ dirs, silent: true })).rejects.toThrow(/spreads and methods/i);
            });

            it('accepts a config.ts of nested static values (strings, numbers, arrays, objects)', async () => {
                await writeExtensionConfig(
                    dirs.EXTENSIONS_DIR,
                    'good-static',
                    'export default { apiKey: "", cacheTTL: 900000, regions: ["us", "eu"], nested: { on: true } };'
                );
                const result = await aggregateExtensionConfig({ dirs, silent: true });
                expect(result.extensions).toEqual(['goodStatic']);
            });
        });
    });
});
