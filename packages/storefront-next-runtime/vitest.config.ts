import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@salesforce/mrt-utilities/middleware': resolve(
                __dirname,
                'node_modules/@salesforce/mrt-utilities/dist/esm/middleware/index.js'
            ),
            '@salesforce/storefront-next-dev/data-store/local-provider': resolve(
                __dirname,
                '../storefront-next-dev/src/data-store/local-provider.ts'
            ),
        },
    },
    test: {
        environment: 'happy-dom',
        coverage: {
            thresholds: {
                statements: 89,
                branches: 82,
                functions: 87,
                lines: 89,
            },
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                // Exclude CLI/deployment files that don't have Vitest tests
                'dist/**',
                'node_modules/**',
                'src/scapi-client/generated/**',
                // Exclude type-safety tests (they don't execute runtime code)
                'src/**/*-safety.test.{ts,tsx}',
                // Design specific test utilities
                'src/design/test/**',
                // Ignore coverage of public export files in design
                'src/design/**/index.ts',
                // Type only files
                'src/design/**/*{-,.}types.ts'
            ],
            reporters: ['text', 'lcov', 'json-summary'],
        },
        // Vitest tests - exclude Jest test files
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**'],
    },
});
