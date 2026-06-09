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
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { parse } from '@babel/parser';
import { GENERATED_EXTENSION_DIRS } from '../extensibility/constants.js';
import { logger } from '../logger.js';

/** Apache License 2.0 header text for generated files. Inlined to avoid path resolution issues in standalone projects. */
const APACHE_LICENSE_HEADER = [
    `Copyright ${new Date().getFullYear()} Salesforce, Inc.`,
    '',
    'Licensed under the Apache License, Version 2.0 (the "License");',
    'you may not use this file except in compliance with the License.',
    'You may obtain a copy of the License at',
    '',
    '    http://www.apache.org/licenses/LICENSE-2.0',
    '',
    'Unless required by applicable law or agreed to in writing, software',
    'distributed under the License is distributed on an "AS IS" BASIS,',
    'WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
    'See the License for the specific language governing permissions and',
    'limitations under the License.',
].join('\n');

// Both generated-barrel dirs are skipped during the scan so a regenerate never treats its
// own output — or the locale aggregator's — as an extension. Names shared with the locale
// aggregator via GENERATED_EXTENSION_DIRS so the two skip lists can't drift.
const OUTPUT_DIR_NAME = GENERATED_EXTENSION_DIRS.config;
const LOCALES_DIR_NAME = GENERATED_EXTENSION_DIRS.locales;

/**
 * A camelCased folder name is only usable as a config key if it is also a plain JS identifier:
 * a leading letter followed by letters or digits. Folder names that camelCase to anything else
 * (a dot, a leading digit, an empty string) would emit a barrel that fails to parse.
 */
const VALID_CONFIG_KEY = /^[a-zA-Z][a-zA-Z0-9]*$/;

export interface Dirs {
    EXTENSIONS_DIR: string;
    OUTPUT_DIR: string;
}

export interface AggregateExtensionConfigOptions {
    projectDirectory?: string;
    /** Override directory paths — used in tests. Takes precedence over projectDirectory. */
    dirs?: Dirs;
    silent?: boolean;
}

export interface AggregateResult {
    /** camelCase namespace keys written into the barrel, in barrel order. */
    extensions: string[];
    filePath: string;
}

export function getDefaultDirs(projectDirectory: string): Dirs {
    const extensionsDir = join(projectDirectory, 'src', 'extensions');
    return {
        EXTENSIONS_DIR: extensionsDir,
        OUTPUT_DIR: join(extensionsDir, OUTPUT_DIR_NAME),
    };
}

/** Convert kebab-case to PascalCase (e.g. `store-locator` → `StoreLocator`). */
export function toPascalCase(str: string): string {
    return str
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

/**
 * Convert a kebab-case extension folder name to the camelCase key it occupies under
 * `app.extension` (e.g. `loqate-address-verification` → `loqateAddressVerification`). This
 * is the key merchants reference as `PUBLIC__app__extension__<key>__<setting>`.
 */
export function toCamelCase(str: string): string {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Value node types allowed inside a config object: static data only, no computed expressions. */
const STATIC_VALUE_TYPES = new Set([
    'StringLiteral',
    'NumericLiteral',
    'BooleanLiteral',
    'NullLiteral',
    'ArrayExpression',
    'ObjectExpression',
    'TSAsExpression', // `value as const` — unwrapped and re-checked below
]);

/**
 * Assert an extension's `config.ts` is a static, default-exported object literal — and nothing
 * more. The generated barrel imports each `config.ts` as a live ES module, evaluated at build,
 * typegen, `pnpm dev`, and server startup; since extensions are third-party and distributable,
 * any top-level statement (an import, a `fetch`, a `process.env` read) would run arbitrary
 * vendor code in those contexts and could leak secrets into the client bundle. Validating the
 * shape at discovery time turns that supply-chain risk into a clear build-time error.
 */
function assertStaticConfigModule(filePath: string, source: string): void {
    const reject = (reason: string): never => {
        throw new Error(
            `Extension config "${filePath}" must default-export a plain object of static values. ${reason} ` +
                `Config files are imported as live modules at build and server startup, so they may not ` +
                `import, call functions, or read process.env. Move dynamic/server-only values to a route handler.`
        );
    };

    const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });

    let declaration: { type: string } | undefined;
    for (const node of ast.program.body) {
        // Any statement other than the single default export is a side-effect channel.
        if (node.type === 'ExportDefaultDeclaration') {
            declaration = node.declaration as { type: string };
        } else if (node.type !== 'EmptyStatement') {
            reject(`Found a top-level \`${node.type}\` (only \`export default { … }\` is allowed).`);
        }
    }
    if (!declaration) {
        reject('No default export found.');
        return; // unreachable — reject throws; satisfies control-flow narrowing of `declaration`
    }

    // A structural view of just the AST fields this walk reads — avoids depending on the full
    // @babel/types union for a handful of properties.
    type Node = {
        type: string;
        expression?: Node;
        value?: Node;
        properties?: Node[];
        elements?: Array<Node | null>;
    };

    const unwrap = (n: Node): Node => (n.type === 'TSAsExpression' && n.expression ? n.expression : n);

    const assertStaticValue = (node: Node): void => {
        const v = unwrap(node);
        if (!STATIC_VALUE_TYPES.has(v.type)) reject(`Found a non-static \`${v.type}\` value.`);
        if (v.type === 'ObjectExpression') {
            for (const prop of v.properties ?? []) {
                if (prop.type !== 'ObjectProperty')
                    reject(`Found a \`${prop.type}\` (spreads and methods are not allowed).`);
                if (prop.value) assertStaticValue(prop.value);
            }
        } else if (v.type === 'ArrayExpression') {
            for (const el of v.elements ?? []) {
                if (el) assertStaticValue(el);
            }
        }
    };

    assertStaticValue(unwrap(declaration as Node));
}

/**
 * Find every extension folder that ships a `config.ts`. The output `config/` directory and
 * the locale aggregator's `locales/` directory are siblings of real extensions, so both are
 * skipped. Each `config.ts` is validated as a static object literal before it joins the list
 * (see `assertStaticConfigModule`). Results are sorted by folder name for stable output.
 */
export async function findExtensionsWithConfig(extensionsDir: string): Promise<Array<{ name: string; path: string }>> {
    const extensions: Array<{ name: string; path: string }> = [];

    try {
        const entries = await readdir(extensionsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name === OUTPUT_DIR_NAME || entry.name === LOCALES_DIR_NAME) continue;

            const configPath = join(extensionsDir, entry.name, 'config.ts');
            if (existsSync(configPath)) {
                assertStaticConfigModule(`${entry.name}/config.ts`, await readFile(configPath, 'utf8'));
                extensions.push({
                    // Imports are relative to the generated barrel (src/extensions/config/index.ts),
                    // not aliased: config.server.ts pulls this barrel in transitively, and route
                    // typegen loads config.server.ts through a jiti instance with no `@/` alias
                    // resolver — so an aliased import here would fail to resolve. config.server.ts
                    // imports by relative path for the same reason.
                    name: entry.name,
                    path: `../${entry.name}/config`,
                });
            }
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    return extensions.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build the barrel that re-exports each extension's config default under its camelCase key.
 * Imports are widened (no `as const`) so the merged `app.extension` type stays mutable and
 * a value like `apiKey: ''` types as `string`, not the literal `''`.
 *
 * Throws if two folders collapse to the same camelCase key — config feeds runtime values
 * like API keys, so a silent last-wins could route a setting to the wrong extension.
 */
export function generateConfigFile(extensions: Array<{ name: string; path: string }>): string {
    const licenseLines = APACHE_LICENSE_HEADER.split('\n');
    const licenseHeader = `/**\n${licenseLines.map((line) => (line ? ` * ${line}` : ' *')).join('\n')}\n */`;

    const header = `${licenseHeader}

// NOTE: This file is auto-generated. Do not edit manually.
// Run 'pnpm config:aggregate-extensions' to regenerate this file.

`;

    if (extensions.length === 0) {
        return `${header}// No extension config files found\nexport default {};\n`;
    }

    const keyByExtension = new Map<string, string>();
    for (const ext of extensions) {
        const key = toCamelCase(ext.name);

        // Underscores survive toCamelCase unchanged (it only splits on `-`), so `store_locator`
        // stays `store_locator` — a valid JS identifier that would NOT match the merchant-facing
        // `PUBLIC__app__extension__storeLocator__*` convention. Catch it before the generic
        // invalid-key throw with a message that names the fix.
        if (ext.name.includes('_')) {
            throw new Error(
                `Extension folder "${ext.name}" uses underscores. Use hyphens so the name camelCases ` +
                    `to the expected config key (e.g. "store-locator" → "storeLocator", not "store_locator").`
            );
        }

        // The key becomes both a JS identifier (the import binding) and an object key in the
        // generated barrel. A folder name that camelCases to a non-identifier — a dot, a
        // leading digit, an empty collapse from `--` — would emit a barrel that fails to parse,
        // breaking the whole app build far from its cause. Reject it here with the folder named.
        if (!VALID_CONFIG_KEY.test(key)) {
            throw new Error(
                `Extension folder "${ext.name}" maps to an invalid config key "${key}". ` +
                    `Use a folder name of letters, digits, and hyphens that starts with a letter ` +
                    `(e.g. "loqate-address-verification" → "loqateAddressVerification").`
            );
        }

        const existing = keyByExtension.get(key);
        if (existing) {
            throw new Error(
                `Extension config key collision: "${existing}" and "${ext.name}" both map to "${key}". ` +
                    `Rename one extension folder so each resolves to a distinct config namespace.`
            );
        }
        keyByExtension.set(key, ext.name);
    }

    const imports = extensions.map((ext) => `import ${toCamelCase(ext.name)}Config from '${ext.path}';`).join('\n');

    const exports = extensions
        .map((ext) => {
            const key = toCamelCase(ext.name);
            return `    ${key}: ${key}Config,`;
        })
        .join('\n');

    return `${header}${imports}

// Each extension's config.ts default export is namespaced by the camelCase of its folder
// name (e.g. loqate-address-verification -> loqateAddressVerification), making it available
// at config.app.extension.<key> and overridable via PUBLIC__app__extension__<key>__<setting>.
export default {
${exports}
};
`;
}

/**
 * Discover every `src/extensions/<name>/config.ts` and regenerate the
 * `src/extensions/config/index.ts` barrel that `config.server.ts` merges into
 * `app.extension`. Runs as a build prestep (mirrors `sfnext locales aggregate-extensions`).
 */
export async function aggregateExtensionConfig(
    options: AggregateExtensionConfigOptions = {}
): Promise<AggregateResult> {
    const { projectDirectory = process.cwd(), silent = false } = options;
    const dirs = options.dirs ?? getDefaultDirs(projectDirectory);
    const { OUTPUT_DIR, EXTENSIONS_DIR } = dirs;

    const log = (message: string, ...args: unknown[]) => {
        if (!silent) logger.debug(message, ...args);
    };

    try {
        log('🔍 Scanning for extension config files...');

        const extensions = await findExtensionsWithConfig(EXTENSIONS_DIR);
        const content = generateConfigFile(extensions);

        await mkdir(OUTPUT_DIR, { recursive: true });
        const filePath = join(OUTPUT_DIR, 'index.ts');

        // Skip the write when the barrel is already current. The prestep runs on every `pnpm dev`
        // and an unconditional write touches the file's mtime, which the Vite watcher reads as a
        // change and rebuilds — a self-triggered reload loop. Only write when content differs.
        const current = await readFile(filePath, 'utf8').catch(() => null);
        if (current !== content) {
            await writeFile(filePath, content, 'utf8');
        }

        log(`✅ Generated: src/extensions/config/index.ts (${extensions.length} extension(s))`);
        return { extensions: extensions.map((ext) => toCamelCase(ext.name)), filePath };
    } catch (error) {
        if (!silent) logger.error(`❌ Error generating extension config: ${String(error)}`);
        throw error;
    }
}
