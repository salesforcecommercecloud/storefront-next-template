#!/usr/bin/env node

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
import { readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { logger } from '@salesforce/storefront-next-dev/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * Apache License 2.0 header text for file headers
 * Inlined here to avoid path resolution issues in standalone projects
 */
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

// Default directories - can be overridden for testing
export const getDefaultDirs = () => ({
    SRC_DIR: join(__dirname, '..', 'src'),
    get EXTENSIONS_DIR() {
        return join(this.SRC_DIR, 'extensions');
    },
    get OUTPUT_DIR() {
        return join(this.EXTENSIONS_DIR, 'locales');
    },
});

/**
 * Convert kebab-case to PascalCase
 * @param {string} str - The kebab-case string
 * @returns {string} The PascalCase string
 */
export function toPascalCase(str) {
    return str
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

/**
 * Convert kebab-case to camelCase for variable names
 * @param {string} str - The kebab-case string
 * @returns {string} The camelCase string
 */
export function toCamelCase(str) {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Scan main app and extensions directories to find all available locales.
 * @param {object} dirs - Directory paths configuration
 * @param {string} dirs.SRC_DIR - Source directory path
 * @param {string} dirs.EXTENSIONS_DIR - Extensions directory path
 * @returns {Promise<Set<string>>} Set of locale codes
 */
export async function discoverLocales(dirs) {
    const { SRC_DIR, EXTENSIONS_DIR } = dirs;
    const locales = new Set();

    // 1. Discover locales from main app
    const mainLocalesPath = join(SRC_DIR, 'locales');
    if (existsSync(mainLocalesPath)) {
        try {
            const mainLocaleEntries = await readdir(mainLocalesPath, { withFileTypes: true });
            for (const entry of mainLocaleEntries) {
                if (entry.isDirectory() && entry.name !== 'index.ts') {
                    locales.add(entry.name);
                }
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.debug('📁 No main app locales directory found.');
            } else {
                throw error;
            }
        }
    }

    // 2. Discover locales from extensions
    try {
        const extensions = await readdir(EXTENSIONS_DIR, { withFileTypes: true });

        for (const extension of extensions) {
            if (!extension.isDirectory()) continue;
            if (extension.name === 'locales') continue; // Skip the output directory

            const localesPath = join(EXTENSIONS_DIR, extension.name, 'locales');
            if (!existsSync(localesPath)) continue;

            const localeEntries = await readdir(localesPath, { withFileTypes: true });
            for (const localeEntry of localeEntries) {
                if (localeEntry.isDirectory()) {
                    locales.add(localeEntry.name);
                }
            }
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.debug('📁 No extensions directory found.');
        } else {
            throw error;
        }
    }

    return locales;
}

/**
 * Find all extensions (NOT main app) that have translations for a given locale
 * @param {string} locale - The locale code (e.g., 'en', 'es')
 * @param {string} extensionsDir - Extensions directory path
 * @returns {Promise<Array<{name: string, path: string}>>} Array of extension info
 */
export async function findExtensionsWithLocale(locale, extensionsDir) {
    const extensions = [];

    try {
        const extensionEntries = await readdir(extensionsDir, { withFileTypes: true });

        for (const entry of extensionEntries) {
            if (!entry.isDirectory()) continue;
            if (entry.name === 'locales') continue; // Skip the output directory

            const translationPath = join(extensionsDir, entry.name, 'locales', locale, 'translations.json');

            if (existsSync(translationPath)) {
                extensions.push({
                    name: entry.name,
                    path: `@/extensions/${entry.name}/locales/${locale}/translations.json`,
                });
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }

    // Sort by name for consistent output
    return extensions.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generate the locale index file content for extension translations only
 * @param {Array<{name: string, path: string}>} extensions - Array of extension info
 * @returns {string} The generated TypeScript content
 */
export function generateLocaleFile(extensions) {
    // Format license header as multi-line comment block
    const licenseLines = APACHE_LICENSE_HEADER.split('\n');
    const licenseHeader = '/**\n' + licenseLines.map((line) => (line ? ` * ${line}` : ' *')).join('\n') + '\n */';

    const header = `${licenseHeader}

// NOTE: This file is auto-generated. Do not edit manually.
// Run 'pnpm locales:aggregate-extensions' to regenerate this file.

`;

    if (extensions.length === 0) {
        return `${header}// No extension translations found for this locale\nexport default {};\n`;
    }

    const imports = extensions
        .map((ext) => {
            const varName = toCamelCase(ext.name) + 'Translations';
            return `import ${varName} from '${ext.path}';`;
        })
        .join('\n');

    const exports = extensions
        .map((ext) => {
            const namespace = 'ext' + toPascalCase(ext.name);
            const varName = toCamelCase(ext.name) + 'Translations';
            return `    ${namespace}: ${varName},`;
        })
        .join('\n');

    return `${header}${imports}

// Namespace is based on the following convention: extPascalCase, and it's the pascal case of the folder name (e.g. store-locator -> extStoreLocator)
export default {
${exports}
};
`;
}

/**
 * Main function to generate aggregation files for extension translations only.
 * Main app translations in /src/locales/ are NOT aggregated by this script.
 * @param {object} [options] - Configuration options
 * @param {object} [options.dirs] - Directory paths (defaults to getDefaultDirs())
 * @param {boolean} [options.silent] - Suppress console output (for testing)
 */
export async function aggregateExtensionLocales(options = {}) {
    const { dirs = getDefaultDirs(), silent = false } = options;
    const { OUTPUT_DIR, EXTENSIONS_DIR } = dirs;

    const log = (...args) => {
        if (!silent) logger.debug(...args);
    };

    try {
        log('🔍 Scanning for extension translation files...');

        const locales = await discoverLocales(dirs);

        if (locales.size === 0) {
            log('📝 No locales found in extensions. Nothing to generate.');
            return { generated: 0, locales: [] };
        }

        log(`📝 Found ${locales.size} locale(s): ${Array.from(locales).join(', ')}`);

        // Ensure output directory exists
        await mkdir(OUTPUT_DIR, { recursive: true });

        const results = [];
        for (const locale of locales) {
            const extensions = await findExtensionsWithLocale(locale, EXTENSIONS_DIR);
            const content = generateLocaleFile(extensions);

            const outputPath = join(OUTPUT_DIR, locale);
            await mkdir(outputPath, { recursive: true });

            const filePath = join(outputPath, 'index.ts');
            await writeFile(filePath, content, 'utf8');

            log(`✅ Generated: src/extensions/locales/${locale}/index.ts (${extensions.length} extension(s))`);
            results.push({ locale, extensionCount: extensions.length, filePath });
        }

        log('✨ Extension locale generation complete!');
        return { generated: results.length, locales: results };
    } catch (error) {
        if (!silent) logger.error('❌ Error generating extension locales:', error);
        throw error;
    }
}

/**
 * CLI entry point
 */
async function main() {
    try {
        await aggregateExtensionLocales();
    } catch {
        process.exit(1);
    }
}

// Only run main if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
