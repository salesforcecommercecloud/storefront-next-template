import { defineConfig } from 'tsdown';

/**
 * Build configurations for @salesforce/storefront-next-runtime:
 * design - design layer module with component registry and React components
 * scapi - SCAPI client module with type-safe API clients
 */
export default defineConfig([
    // design module entry
    {
        entry: {
            design: 'src/design/index.ts',
            'design-messaging': 'src/design/messaging-api/index.ts',
            'design-react': 'src/design/react/index.ts',
            // Minimal entry point for checking whether we are in design mode
            // Won't bring in the rest of the design layer dependencies.
            'design-mode': 'src/design/modeDetection.ts',
            'design-react-core': 'src/design/react/core/index.ts',
            events: 'src/events/index.ts',
            routing: 'src/routing/index.ts',
            'routing-app-wrapper': 'src/routing/app-wrapper.tsx',
        },
        platform: 'neutral',
        target: 'node24',
        format: ['esm'],
        dts: true,
        outDir: 'dist',
        clean: true,
        external: ['node:fs', 'node:fs/promises', 'node:path', 'node:url'],
        alias: {
            '@/*': 'src/*',
        },
        hash: false
    },
    // scapi module entry
    {
        entry: {
            scapi: 'src/scapi-client/index.ts',
        },
        platform: 'neutral',
        target: 'node24',
        format: ['esm'],
        dts: true,
        outDir: 'dist',
        clean: true,
        minify: true,
        noExternal: ['openapi-fetch'],
        hash: false
    },
]);
