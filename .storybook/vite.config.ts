import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tsconfigPaths from 'vite-tsconfig-paths';

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
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../src'), // Proper path resolution for Storybook
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
    envPrefix: ['VITE_', 'PUBLIC_'],
    optimizeDeps: {
        // Include dependencies that Storybook needs
        include: ['react', 'react-dom', 'react-router', '@radix-ui/react-accordion'],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/**/*-snapshot.tsx'],
    },
});
