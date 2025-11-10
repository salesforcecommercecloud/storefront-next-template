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
            'design-react': 'src/design/react/index.ts',
        },
        platform: 'neutral',
        target: 'node22',
        format: ['esm'],
        dts: true,
        outDir: 'dist',
        clean: true,
    },
    // scapi module entry
    {
        entry: {
            scapi: 'src/scapi-client/index.ts',
        },
        platform: 'neutral',
        target: 'node22',
        format: ['esm'],
        dts: true,
        outDir: 'dist',
        clean: true,
        minify: true,
        noExternal: ['openapi-fetch']
    },
]);
