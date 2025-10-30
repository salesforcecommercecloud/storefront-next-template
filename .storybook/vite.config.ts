import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dedicated Vite configuration for Storybook
 * This ensures Storybook uses its own config and doesn't inherit from the project's vite.config.ts
 */
export default defineConfig({
    plugins: [
        react(), // Include React plugin for JSX processing
        tailwindcss(), // Include Tailwind CSS plugin
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../src'), // Proper path resolution for Storybook
        },
    },
    // Make PUBLIC_ prefixed env vars available in Storybook
    envPrefix: ['VITE_', 'PUBLIC_'],
    optimizeDeps: {
        // Include dependencies that Storybook needs
        include: ['react', 'react-dom'],
    },
});
