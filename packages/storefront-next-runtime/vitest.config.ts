import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'happy-dom',
        coverage: {
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                // Exclude CLI/deployment files that don't have Vitest tests
                'dist/**',
                'node_modules/**',
            ],
            reporters: ['text', 'lcov', 'json-summary'],
        },
        // Vitest tests - exclude Jest test files
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**'],
    },
});
