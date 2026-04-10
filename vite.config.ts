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
import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, perEnvironmentPlugin, loadEnv } from 'vite';
import { configDefaults, coverageConfigDefaults } from 'vitest/config';
import coverageConfigThresholds from './vitest.thresholds';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import devtoolsJson from 'vite-plugin-devtools-json';
import storefrontNextTargets, { hybridProxyPlugin, shouldRouteToNext } from '@salesforce/storefront-next-dev';
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
    // Load environment variables with PUBLIC_ prefix for client-side config
    const environment = loadEnv(mode, __dirname, 'PUBLIC');

    const shortCode = environment.PUBLIC__app__commerce__api__shortCode;
    const scapiProxyHost = process.env.SCAPI_PROXY_HOST;

    // Only validate shortCode in development mode (when dev proxy is used) and no proxyHost override
    if (!shortCode && !scapiProxyHost && mode === 'development') {
        throw new Error(
            'Missing required Commerce API short code for Vite dev proxy.\n\n' +
                'Set PUBLIC__app__commerce__api__shortCode in your .env file:\n' +
                '  PUBLIC__app__commerce__api__shortCode=your-short-code\n\n' +
                'See .env.default for a complete example.'
        );
    }

    const target = scapiProxyHost || (shortCode && `https://${shortCode}.api.commercecloud.salesforce.com`);

    const localProviderPath = resolve(__dirname, '../storefront-next-dev/dist/data-store/local-provider.js');
    const mrtUtilitiesPath = resolve(
        __dirname,
        '../storefront-next-runtime/node_modules/@salesforce/mrt-utilities/dist/esm/middleware/index.js'
    );
    const localDevAliases: Record<string, string> = {};
    if (existsSync(localProviderPath)) {
        localDevAliases['@salesforce/storefront-next-dev/data-store/local-provider'] = localProviderPath;
    }
    if (existsSync(mrtUtilitiesPath)) {
        localDevAliases['@salesforce/mrt-utilities/middleware'] = mrtUtilitiesPath;
    }

    return {
        build: {
            sourcemap: true,
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

                        // Split checkout components into separate chunk
                        // Lazy loaded on /checkout route only
                        if (id.includes('/src/components/checkout/') && !id.includes('.test.')) {
                            return 'checkout-components';
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
            // Hybrid proxy: routes matching eCDN rules → Storefront Next, everything else → SFCC.
            //
            // The `routeMatcher` callback controls which routes are handled by Storefront Next.
            // The default `shouldRouteToNext` parses Cloudflare eCDN routing expressions.
            //
            // To customize routing, you can wrap or replace the default matcher:
            //
            //   // Add custom overrides on top of eCDN rules:
            //   routeMatcher: (pathname, rules) => {
            //       if (pathname === '/my-custom-page') return true;  // always route to Next
            //       if (pathname === '/legacy-page') return false;    // always proxy to SFCC
            //       return shouldRouteToNext(pathname, rules);
            //   },
            //
            //   // Or replace entirely with custom logic:
            //   routeMatcher: (pathname) => myCustomMatcher(pathname),
            //
            mode === 'development' &&
                hybridProxyPlugin({
                    enabled: process.env.HYBRID_PROXY_ENABLED === 'true',
                    targetOrigin:
                        process.env.SFCC_ORIGIN ||
                        scapiProxyHost ||
                        (shortCode && `https://${shortCode}.api.commercecloud.salesforce.com`) ||
                        '',
                    routingRules: process.env.HYBRID_ROUTING_RULES ?? '',
                    routeMatcher: shouldRouteToNext,
                    siteId: environment.PUBLIC__app__defaultSiteId,
                    // Locale for SFRA path transformation
                    // Priority: HYBRID_PROXY_LOCALE > fallbackLng > 'default' (plugin fallback)
                    locale: process.env.HYBRID_PROXY_LOCALE || environment.PUBLIC__app__i18n__fallbackLng,
                }),
        ],
        resolve: {
            alias: {
                // Server-only config access (must be before '@' to take precedence)
                '@/config/server': resolve(__dirname, './config.server.ts'),
                '@': resolve(__dirname, './src'),
                // Fonts alias for easy customization
                ...localDevAliases,
                // Fonts alias — uses root-absolute path (not a filesystem resolve) because fonts
                // live in public/. Vite serves public assets at the root, so '/fonts' maps to
                // public/fonts/. Using resolve(__dirname, './public/fonts') would trigger Vite
                // warnings about importing from the public directory.
                '@fonts': '/fonts',
            },
            // Prevent duplicate React instances in the monorepo. hooks break if multiple copies are loaded
            dedupe: ['react', 'react-dom', 'react-router'],
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
                'e2e/**/*', // Exclude E2E tests (CodeceptJS, not Vitest)
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
                        secure: !scapiProxyHost,
                        rewrite: (path) => path.replace(/^\/mobify\/proxy/, ''),
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
