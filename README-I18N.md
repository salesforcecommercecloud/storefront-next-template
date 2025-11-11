# Internationalization (i18n)

This project uses `i18next` with `remix-i18next` for internationalization. The implementation follows a dual-instance architecture with server-side and client-side i18next instances.

## Architecture Overview

We maintain 2 separate instances of i18next:

1. **Server-side instance**: Has access to _all_ translations for the entire site
2. **Client-side instance**: Dynamically imports translations as static JavaScript chunks

### Server-side and Client-side Flow

1. Server-side middleware detects the user locale and initializes i18next
2. Server has access to all translations from all locales and renders SSR content with translations
3. Client-side initializes its own i18next instance
4. When a translation is first requested, the client dynamically imports ALL translations for the current language
   - This triggers an HTTP request for a JavaScript chunk (e.g., `/assets/locales-en-[hash].js`)
   - The chunk is served as a **static asset** (pre-built, minified, and cached with long-term headers)
   - Much more efficient than an API endpoint: no server processing, CDN-friendly, immutable caching
5. All namespaces for that language are loaded and cached in memory
6. Subsequent translation requests use the cached data (no additional requests)

## Configuration

### Supported Languages

Configured in `config.server.ts`:

```typescript
i18n: {
    fallbackLng: 'en',
    supportedLngs: ['es', 'en'], // Your supported languages
}
```

### Locale Detection

The middleware automatically detects the user's locale from:
1. The `lng` cookie (if previously set)
2. The `Accept-Language` HTTP header
3. Falls back to the configured `fallbackLng`

## File Structure

```
src/locales/
├── index.ts                # Exports all language resources
├── en/
│   ├── index.ts            # Exports English translations
│   └── translations.json
└── es/
    ├── index.ts            # Exports Spanish translations
    └── translations.json
```

## Usage Examples

### In React Components (Client-side)

Use the `useTranslation` hook from `react-i18next`:

```typescript
import { useTranslation } from 'react-i18next';

function HomeView() {
    // Specify the namespace to load
    const { t } = useTranslation('home');

    return (
        <div>
            <p>{t('title')}</p>
            <p>{t('description')}</p>
        </div>
    );
}
```

### In Route Loaders (Server-side)

Use the `getInstance` and `getLocale` helpers from the i18next middleware:

```typescript
import { getInstance, getLocale } from '@/middlewares/i18next';

export function loader(args: LoaderFunctionArgs) {
    // Get the server-side i18next instance for translations
    const { t } = getInstance(args.context);
    const translatedTitle = t('title');
    
    // Get the current locale for formatting
    const locale = getLocale(args.context);
    const date = new Date().toLocaleDateString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    
    return { translatedTitle, date };
}
```

## Adding New Translations

### 1. Create Translation Files

For each new namespace, create files in each language directory:

**src/locales/en/my-page.ts:**
```typescript
export default {
    welcome: 'Welcome',
    greeting: 'Hello, {{name}}!',
    itemCount: 'You have {{count}} item',
    itemCount_other: 'You have {{count}} items',
};
```

**src/locales/es/my-page.ts:**
```typescript
export default {
    welcome: 'Bienvenido',
    greeting: '¡Hola, {{name}}!',
    itemCount: 'Tienes {{count}} artículo',
    itemCount_other: 'Tienes {{count}} artículos',
};
```

### 2. Export in Language Index

Add to `src/locales/en/index.ts` and `src/locales/es/index.ts`:

```typescript
import myPage from './my-page';

export default { 
    home, 
    product, 
    myPage  // Add new namespace
} satisfies ResourceLanguage;
```

### 3. Use in Components

```typescript
const { t } = useTranslation('myPage');

// Simple translation
<p>{t('welcome')}</p>

// With interpolation
<p>{t('greeting', { name: 'John' })}</p>

// With pluralization
<p>{t('itemCount', { count: items.length })}</p>
```

## Best Practices

1. **Namespace by Route/Feature**: Create separate namespaces for each major route or feature (e.g., `home`, `product`, `checkout`)
2. **Use TypeScript**: The project includes type-safe translations based on the English locale
3. **Client vs Server**: Use `useTranslation` in components, `getInstance` in loaders
4. **Lazy Loading**: Client-side translations are loaded on-demand per namespace for optimal performance
5. **Fallback Chain**: Missing translations fall back to the configured `fallbackLng`

## Type Safety

The project is configured for type-safe translations. TypeScript will autocomplete available keys and warn about missing translations:

```typescript
// ✅ TypeScript knows these keys exist
t('home.title')
t('product.title')

// ❌ TypeScript will warn about this
t('nonexistent.key')
```

Type definitions are generated from the English locale (`resources.en`) in `src/middlewares/i18next.ts`.
