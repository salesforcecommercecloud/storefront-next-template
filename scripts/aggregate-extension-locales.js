#!/usr/bin/env node

import { readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const SRC_DIR = join(__dirname, '..', 'src');
const LOCALES_DIR = join(SRC_DIR, 'locales');
const EXTENSIONS_DIR = join(SRC_DIR, 'extensions');
const OUTPUT_DIR = join(EXTENSIONS_DIR, 'locales');

/**
 * Convert kebab-case to PascalCase
 * @param {string} str - The kebab-case string
 * @returns {string} The PascalCase string
 */
function toPascalCase(str) {
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
function toCamelCase(str) {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Scan src/locales directory to find all available locales
 * @returns {Promise<Set<string>>} Set of locale codes
 */
async function discoverLocales() {
    const locales = new Set();
    const localesEntries = await readdir(LOCALES_DIR, { withFileTypes: true });
    for (const localeEntry of localesEntries) {
        if (!localeEntry.isDirectory()) continue;
        locales.add(localeEntry.name);
    }
    return locales;
}

/**
 * Find all extensions that have translations for a given locale
 * @param {string} locale - The locale code (e.g., 'en', 'es')
 * @returns {Promise<Array<{name: string, path: string}>>} Array of extension info
 */
async function findExtensionsWithLocale(locale) {
    const extensions = [];

    try {
        const extensionEntries = await readdir(EXTENSIONS_DIR, { withFileTypes: true });

        for (const entry of extensionEntries) {
            if (!entry.isDirectory()) continue;
            if (entry.name === 'locales') continue; // Skip the output directory

            const translationPath = join(EXTENSIONS_DIR, entry.name, 'locales', locale, 'translations.json');

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
 * Generate the locale index file content
 * @param {Array<{name: string, path: string}>} extensions - Array of extension info
 * @returns {string} The generated TypeScript content
 */
function generateLocaleFile(extensions) {
    const header = `// NOTE: This file is auto-generated. Do not edit manually.
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
 * Main function to generate all locale files
 */
async function main() {
    try {
        console.log('🔍 Scanning extensions for translation files...');

        const locales = await discoverLocales();

        if (locales.size === 0) {
            console.log('📝 No locales found. Nothing to generate.');
            return;
        }

        console.log(`📝 Found ${locales.size} locale(s): ${Array.from(locales).join(', ')}`);

        // Ensure output directory exists
        await mkdir(OUTPUT_DIR, { recursive: true });

        for (const locale of locales) {
            const extensions = await findExtensionsWithLocale(locale);
            const content = generateLocaleFile(extensions);

            const outputPath = join(OUTPUT_DIR, locale);
            await mkdir(outputPath, { recursive: true });

            const filePath = join(outputPath, 'index.ts');
            await writeFile(filePath, content, 'utf8');

            console.log(`✅ Generated: src/extensions/locales/${locale}/index.ts (${extensions.length} extension(s))`);
        }

        console.log('✨ Extension locale generation complete!');
    } catch (error) {
        console.error('❌ Error generating extension locales:', error);
        process.exit(1);
    }
}

main();
