import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        coverage: {
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                'src/**/*config.d.ts',
                // Exclude CLI/deployment files that don't have Vitest tests
                'src/bundle.ts',
                'src/cloud-api.ts',
                'src/config.ts',
                'src/push.ts',
                'src/utils.ts',
                'src/types.ts',
                'src/cli.ts',
                'dist/**',
                'node_modules/**',
            ],
            thresholds: { 100: true },
            reporters: ['text', 'lcov', 'json-summary'],
        },
        // Vitest tests - now includes all test files
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
        ],
    },
});
