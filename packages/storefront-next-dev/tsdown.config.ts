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
        // Don't bundle dependencies - they should be installed by consumers
        external: [/node_modules/],
        hash: false
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
        external: [/node_modules/],
        hash: false
    },
    // 3a. MRT SSR server build
    {
        entry: {
            ssr: 'src/mrt/ssr.ts',
        },
        platform: 'node',
        target: 'node22',
        format: ['esm'],
        outExtensions: () => {
            return {
                js: '.mjs',
                dts: '.d.ts',
            };
        },
        // We use a custom chunk file name so we can identify our own shared chunks
        // vs customer's chunks.
        outputOptions: {
            chunkFileNames: 'sfnext-server-[name]-[hash].mjs',
        },
        dts: true,
        outDir: 'dist/mrt',
        // This is the react-router server build entry point, it is created from the user land when running `vite build`
        // it is a relative path from within the build directory
        external: ['./server/index.js', 'vite'],
        noExternal: [/.*/],
        clean: false,
        hash: false,
        minify: true,
    },
    // 3b. MRT streamingHandler build
    {
        entry: {
            streamingHandler: 'src/mrt/streamingHandler.ts',
        },
        platform: 'node',
        target: 'node22',
        format: ['esm'],
        outExtensions: () => {
            return {
                js: '.mjs',
                dts: '.d.ts',
            };
        },
        // We use a custom chunk file name so we can identify our own shared chunks
        // vs customer's chunks.
        outputOptions: {
            chunkFileNames: 'sfnext-server-[name]-[hash].mjs',
        },
        dts: true,
        outDir: 'dist/mrt',
        // This is the react-router server build entry point, it is created from the user land when running `vite build`
        // it is a relative path from within the build directory
        external: ['./server/index.js', 'vite'],
        noExternal: [/.*/],
        clean: false,
        hash: false,
        minify: true,
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
        external: [/node_modules/],
        hash: false
    },
    // 5. Cartridge services API
    {
        entry: {
            index: 'src/cartridge-services/index.ts',
        },
        platform: 'node',
        target: 'node22',
        format: ['esm'],
        dts: true,
        outDir: 'dist/cartridge-services',
        clean: false,
        external: [/node_modules/],
        hash: false
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
        external: [/node_modules/],
        hash: false
    },
]);
