import { defineConfig } from 'tsdown';

/**
 * Build configurations for @salesforce/storefront-next-dev:
 * 1. Vite plugin (main entry) - imported from vite.config.ts
 * 2. React Router Scripts - exported for use in react-router apps
 * 3. MRT SSR server - bundles express server and AWS lambda handler
 * 4. React Router preset config - exported for use in react-router.config.ts
 * 5. Push API - programmatic API for bundle deployment
 * 6. CLI - command-line tool for deployment and extension management
 */
export default defineConfig([
    // 1. Main Vite plugin entry (default export)
    {
        entry: {
            index: 'src/index.ts',
        },
        platform: 'node',
        target: 'node22',
        format: ['esm'],
        dts: true,
        outDir: 'dist',
        clean: true,
    },
    // 2. React Router Scripts component
    {
        entry: {
            Scripts: 'src/react-router/Scripts.tsx',
        },
        platform: 'neutral',
        format: ['esm'],
        dts: true,
        outDir: 'dist/react-router',
        clean: false,
    },
    // 3. MRT SSR server build
    {
        entry: {
            ssr: 'src/mrt/ssr.ts',
        },
        platform: 'node',
        target: 'node22',
        format: ['cjs'],
        outExtensions: () => {
            return {
                // By default, tsdown creates .cjs extension for commonjs output
                // But, we need to create .js extension for MRT compatibility
                js: '.js',
                dts: '.d.ts',
            };
        },
        dts: true,
        outDir: 'dist/mrt',
        // This is the react-router server build entry point, it is created from the user land when running `vite build`
        // it is a relative path from within the build directory
        external: ['./server/index.js'],
        // unlike rollup where we can use `noExternal: true`, tsdown doesn't support it.
        // This regex will bundle all dependencies (except node internals?)
        // this regex is not extensively tested, if you encounter any issues like "require('xxx') not found"
        // you may need to fix this
        noExternal: '/.*/',
        clean: false,
    },
    // 4. React Router preset config
    {
        entry: {
            'react-router.config': 'src/configs/react-router.config.ts',
        },
        platform: 'node',
        target: 'node22',
        format: ['esm'],
        dts: true,
        outDir: 'dist/configs',
        clean: false,
    },
    // 5. Push API (programmatic API for bundle deployment)
    {
        entry: {
            push: 'src/push.ts',
        },
        platform: 'node',
        target: 'node22',
        format: ['esm'],
        dts: true,
        outDir: 'dist',
        clean: false,
    },
    // 6. CLI build (with shebang)
    {
        entry: {
            cli: 'src/cli.ts',
        },
        platform: 'node',
        target: 'node22',
        format: ['esm'],
        banner: {
            js: '#!/usr/bin/env node',
        },
        minify: false,
        dts: false,
        outDir: 'dist',
        copy: [
            {
                from: 'src/extensibility/templates',
                to: 'dist/extensibility/templates',
            },
        ],
        clean: false,
    },
]);
