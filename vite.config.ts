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
/// <reference types="vitest" />

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig, perEnvironmentPlugin, loadEnv } from 'vite';
import { configDefaults, coverageConfigDefaults } from 'vitest/config';
import coverageConfigThresholds from './vitest.thresholds';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import devtoolsJson from 'vite-plugin-devtools-json';
import storefrontNextTargets from '@salesforce/storefront-next-dev';
import bundlesize from 'vite-plugin-bundlesize';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const enableBundlesizeCheck = !!process.env.BUNDLES_SIZE_CHECK;
const enableBundlesizeAnalyze = !!process.env.BUNDLES_SIZE_ANALYZE;
const enableReadableChunkNames = enableBundlesizeCheck || enableBundlesizeAnalyze;

/**
 * @see {@link https://vite.dev/config/}
 * @see {@link https://github.com/http-party/node-http-proxy?tab=readme-ov-file#modify-response}
 */
export default defineConfig(({ mode }) => {
    // Load environment variables for dev proxy target
    const environment = loadEnv(mode, __dirname, 'PUBLIC');

    const shortCode = environment.PUBLIC__app__commerce__api__shortCode;

    // Only validate shortCode in development mode (when dev proxy is used)
    if (!shortCode && mode === 'development') {
        throw new Error(
            'Missing required Commerce API short code for Vite dev proxy.\n\n' +
                'Set PUBLIC__app__commerce__api__shortCode in your .env file:\n' +
                '  PUBLIC__app__commerce__api__shortCode=your-short-code\n\n' +
                'See .env.default for a complete example.'
        );
    }

    const target = `https://${shortCode}.api.commercecloud.salesforce.com`;

    return {
        build: {
            sourcemap: 'hidden',
            rollupOptions: {
                external: ['_local'],
                output: {
                    // TODO: consider extracting this as a plugin instead
                    manualChunks(id) {
                        // Automatically name translation chunks based on language directory
                        // Matches: /src/locales/{lang}/ and extracts the language code
                        // This dynamically works for any language (en, es, fr, de-DE, zh-CN, etc.)
                        // without needing to manually add each language to this config
                        const localeMatch = id.match(/\/src\/locales\/([^/]+)\//);
                        if (localeMatch) {
                            const languageCode = localeMatch[1];
                            return `locales-${languageCode}`;
                        }
                    },
                },
            },
        },
        envPrefix: ['VITE_', 'PUBLIC_', 'PUBLIC__'],
        define: {
            __DEV__: `${mode !== 'production'}`,
            __TEST__: `${mode === 'test'}`,
        },
        plugins: [
            // Dynamically import to avoid ESM/CJS cycle with @react-router/dev in test mode
            mode !== 'test' && import('@react-router/dev/vite').then(({ reactRouter }) => reactRouter()),
            tailwindcss(),
            tsconfigPaths(),
            devtoolsJson(),
            storefrontNextTargets({
                readableChunkNames: enableReadableChunkNames,
                staticRegistry: {
                    componentPath: 'src/components',
                    registryPath: 'src/lib/static-registry.ts',
                    verbose: mode !== 'production' && mode !== 'test',
                },
            }),
            perEnvironmentPlugin('bundlesize', (env) => {
                if (!enableBundlesizeCheck) {
                    return;
                }
                const bundlesizeConfig = packageJson.bundlesize || {};
                const serverLimits = bundlesizeConfig.server || [{ name: '**/*', limit: '5 mB' }];
                const clientLimits = bundlesizeConfig.client || [{ name: '**/*', limit: '50 kB' }];

                return bundlesize({
                    outputFile: `./build/${env.name}-bundlemeta.json`,
                    limits: env.name === 'ssr' ? serverLimits : clientLimits,
                });
            }),
            perEnvironmentPlugin('bundle-visualizer', (env) => {
                if (!enableBundlesizeAnalyze) {
                    return;
                }
                return visualizer({ filename: `./build/${env.name}-bundle-size.html`, open: true });
            }),
        ],
        resolve: {
            alias: {
                // Server-only config access (must be before '@' to take precedence)
                '@/config/server': resolve(__dirname, './config.server.ts'),
                '@': resolve(__dirname, './src'),
            },
        },
        optimizeDeps: {
            include: ['react-router', 'react-router/internal/react-server-client'],
        },
        ssr: {
            // Ensure Vite compiles the SDK for SSR so Node doesn't attempt to run its ESM as CJS
            noExternal: ['@salesforce/storefront-next-runtime'],
            target: 'node',
        },
        test: {
            // Test environment variables loaded from .env.test automatically
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./vitest.setup.ts'],
            include: ['**/*.{test,spec}.{ts,tsx}'],
            exclude: [
                ...configDefaults.exclude, // Extend Vitest's default excludes (node_modules, .git, etc.)
                '.storybook/**/*', // Exclude entire Storybook folder (story tests use Storybook config)
            ],
            coverage: {
                reporter: [...new Set([...coverageConfigDefaults.reporter, 'json', 'json-summary'])], // `json-summary` and `json` are required for the CI
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
                thresholds: coverageConfigThresholds,
            },
        },
        server: {
            proxy: {
                // Development-only: Page proxy with local fallback
                ...(mode === 'development' && {
                    '^/mobify/proxy/api/experience/shopper-experience/.*/pages': {
                        target,
                        changeOrigin: true,
                        rewrite: (path) => path.replace(/^\/mobify\/proxy\/api/, ''),
                        selfHandleResponse: true,
                        configure: (proxy, _options) => {
                            proxy.on('proxyReq', (proxyReq, req) => {
                                console.log(
                                    '🔄 Proxying request:',
                                    req.method,
                                    req.url,
                                    '→',
                                    `${String(proxyReq.getHeader('host'))}${proxyReq.path}`
                                );
                            });
                            proxy.on('proxyRes', (proxyRes, req, res) => {
                                const chunks: Buffer[] = [];
                                proxyRes.on('data', (chunk) => chunks.push(chunk));
                                proxyRes.on('end', () => {
                                    const body = Buffer.concat(chunks);

                                    if (
                                        typeof proxyRes.statusCode === 'number' &&
                                        proxyRes.statusCode >= 200 &&
                                        proxyRes.statusCode <= 399
                                    ) {
                                        console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
                                        // Pass through successful response
                                        res.statusCode = proxyRes.statusCode;
                                        Object.entries(proxyRes.headers).forEach(([k, v]) => v && res.setHeader(k, v));
                                        res.end(body);
                                    } else {
                                        const bodyStr = body.toString();
                                        console.log('❌ Fetch page error:', proxyRes.statusCode, req.url, bodyStr);

                                        // No fallback available, return original error
                                        res.statusCode = proxyRes.statusCode || 404;
                                        Object.entries(proxyRes.headers).forEach(([k, v]) => v && res.setHeader(k, v));
                                        res.end(body);
                                    }
                                });
                            });
                            proxy.on('error', (err, req) => {
                                console.error('❌ Fetch Page error:', err.message, req.url);
                            });
                        },
                    },
                }),
            },
        },
    };
});
