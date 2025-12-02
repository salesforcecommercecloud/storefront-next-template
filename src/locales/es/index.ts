import home from './home'; // import your namespaced locales
import product from './product';

// TODO: sync with updates to the English version at /src/locales/en/index.ts

// Automatically import all extension translations (if they exist)
// eager: true loads all modules synchronously at build time, which is required for:
// 1. SSR compatibility (server needs immediate access to translations)
// 2. Simpler synchronous code (no async/await needed in the loop below)
// 3. Single bundle strategy (all translations in one chunk per language)
const extensionTranslations = import.meta.glob<{ default: Record<string, unknown> }>(
    '@/extensions/*/locales/es/translations.json',
    { eager: true }
);

// Build the merged translations object
const allTranslations = {
    home,
    product,
} as Record<string, unknown>;

// Add each extension's translations with automatic namespacing
for (const [path, module] of Object.entries(extensionTranslations)) {
    // Extract extension name from path: @/extensions/bopis/locales/es/translations.json -> bopis
    const extensionName = path.split('/')[2];
    // Convert kebab-case to PascalCase (e.g., store-locator -> StoreLocator)
    const pascalCase = extensionName
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    const namespace = `ext${pascalCase}`;
    allTranslations[namespace] = module.default;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export default allTranslations as typeof import('@/locales/en').default;
