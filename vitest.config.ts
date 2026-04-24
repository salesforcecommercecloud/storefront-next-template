/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { defineConfig, mergeConfig, configDefaults, coverageConfigDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig((configEnv) =>
    mergeConfig(
        viteConfig(configEnv),
        defineConfig({
            test: {
                globals: true,
                environment: 'jsdom',
                setupFiles: ['./vitest.setup.ts'],
                include: ['**/*.{test,spec}.{ts,tsx}'],
                exclude: [...configDefaults.exclude, '.storybook/**/*', 'e2e/**/*'],
                coverage: {
                    reporter: [...new Set([...coverageConfigDefaults.reporter, 'json', 'json-summary'])],
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
                        'src/lib/static-registry.ts',
                    ],
                    reportOnFailure: true,
                    thresholds: { lines: 73, statements: 73, functions: 72, branches: 67 },
                },
            },
        })
    )
);
