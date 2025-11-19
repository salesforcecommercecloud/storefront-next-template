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
                'src/utils.ts',
                'src/types.ts',
                'src/cli.ts',
                'dist/**',
                'node_modules/**',
            ],
            thresholds: {
                lines: 98,
                functions: 98,
                branches: 96,
                statements: 98,
            },
        },
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
        ],
    },
});
