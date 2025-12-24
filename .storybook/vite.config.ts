import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { transformPluginPlaceholderPlugin } from '@salesforce/storefront-next-dev';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dedicated Vite configuration for Storybook
 * This ensures Storybook uses its own config and doesn't inherit from the project's vite.config.ts
 */
export default defineConfig({
    plugins: [
        react({
            babel: {
                parserOpts: {
                    plugins: [['decorators', { decoratorsBeforeExport: true }]],
                },
            },
        }), // Include React plugin for JSX processing with decorator support
        tailwindcss(), // Include Tailwind CSS plugin
        tsconfigPaths(),
        transformPluginPlaceholderPlugin() as any, // Transform plugin placeholders for extensibility
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../src'), // Proper path resolution for Storybook
            '@storybook/test-utils': path.resolve(__dirname, './test-utils'), // Storybook test utilities
            // Ensure React 19 compatibility
            react: path.resolve(__dirname, '../node_modules/react'),
            'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
            'react/jsx-runtime': path.resolve(__dirname, '../node_modules/react/jsx-runtime'),
        },
    },
    define: {
        // Define global variables for Storybook
        __TEST__: 'false',
    },
    // Make PUBLIC_ prefixed env vars available in Storybook
    envPrefix: ['VITE_', 'PUBLIC_', 'PUBLIC__'],
    optimizeDeps: {
        // Include dependencies that Storybook needs
        include: ['react', 'react-dom', 'react-router', '@radix-ui/react-accordion'],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/**/*-snapshot.tsx'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov', 'json-summary'], // `json-summary` and `json` are required for the CI
            reportsDirectory: './.storybook/coverage/coverage-vitest',
            all: true,
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.d.ts',
                'src/components/ui/**/*',
                'src/**/*.stories.{ts,tsx}',
                'src/**/*-snapshot.tsx',
                'src/**/mocks/**/*',
                'src/**/__mocks__/**/*',
                'src/**/__snapshots__/**/*',
                'src/**/*.test.{ts,tsx}',
                'src/test-utils/*',
                'src/lib/test-utils/*',
                'src/**/__tests__/*',
                '.storybook/tests/generated-stories/**/*',
                '.storybook/coverage/**/*',
            ],
            reportOnFailure: true,
            // Disable coverage thresholds for story tests for now
            thresholds: {},
        },
    },
});
