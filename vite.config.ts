/// <reference types="vitest" />
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv, perEnvironmentPlugin } from 'vite';
import { coverageConfigDefaults } from 'vitest/config';
import coverageConfigThresholds from './vitest.thresholds';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import devtoolsJson from 'vite-plugin-devtools-json';
import storefrontNextPlugin from '@salesforce/storefront-next-dev';
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
    // Note: We don't use envPrefix anymore because config is read from
    // process.env at runtime (server-side)
    const environment = loadEnv(mode, __dirname);
    const target = `https://${environment.PUBLIC_COMMERCE_API_SHORT_CODE || 'kv7kzm78'}.api.commercecloud.salesforce.com`;

    return {
        build: {
            sourcemap: 'hidden',
        },
        envPrefix: ['VITE_', 'PUBLIC_'],
        define: {
            __DEV__: `${mode !== 'production'}`,
            __TEST__: `${mode === 'test'}`,
        },
        plugins: [
            mode !== 'test' && reactRouter(),
            tailwindcss(),
            tsconfigPaths(),
            devtoolsJson(),
            storefrontNextPlugin({ readableChunkNames: enableReadableChunkNames }),
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
            include: [
                'react-router',
                'react-router/internal/react-server-client',
                // Pre-bundle SDK subpaths individually to keep per-API payloads small in dev
                'commerce-sdk-isomorphic/helpers',
                'commerce-sdk-isomorphic/shopperBaskets',
                'commerce-sdk-isomorphic/shopperBasketsv2',
                'commerce-sdk-isomorphic/shopperConsents',
                'commerce-sdk-isomorphic/shopperContext',
                'commerce-sdk-isomorphic/shopperCustomers',
                'commerce-sdk-isomorphic/shopperExperience',
                'commerce-sdk-isomorphic/shopperGiftCertificates',
                'commerce-sdk-isomorphic/shopperLogin',
                'commerce-sdk-isomorphic/shopperOrders',
                'commerce-sdk-isomorphic/shopperProducts',
                'commerce-sdk-isomorphic/shopperPromotions',
                'commerce-sdk-isomorphic/shopperSearch',
                'commerce-sdk-isomorphic/shopperSeo',
                'commerce-sdk-isomorphic/shopperStores',
            ],
        },
        ssr: {
            // Ensure Vite compiles the SDK for SSR so Node doesn't attempt to run its ESM as CJS
            noExternal: ['commerce-sdk-isomorphic'],
            target: 'node',
        },
        test: {
            // Test environment variables loaded from .env.test automatically
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./vitest.setup.ts'],
            include: ['**/*.{test,spec}.{ts,tsx}'],
            coverage: {
                reporter: [...new Set([...coverageConfigDefaults.reporter, 'json', 'json-summary'])], // `json-summary` and `json` are required for the CI
                include: ['src/**/*.{ts,tsx}'],
                exclude: ['src/**/*.d.ts', 'src/components/ui/**/*', 'src/**/*.stories.tsx'],
                reportOnFailure: true,
                thresholds: coverageConfigThresholds,
            },
        },
        server: {
            proxy: {
                // Proxy Commerce Cloud API requests directly to your instance
                '/mobify/proxy/api': {
                    target,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/mobify\/proxy\/api/, ''),
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
                        proxy.on('proxyRes', (proxyRes, req) => {
                            if (
                                typeof proxyRes.statusCode === 'number' &&
                                proxyRes.statusCode >= 200 &&
                                proxyRes.statusCode <= 399
                            ) {
                                console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
                            } else {
                                const body: Buffer[] = [];
                                proxyRes.on('data', (chunk: Buffer) => {
                                    body.push(chunk);
                                });
                                proxyRes.on('end', () => {
                                    console.log(
                                        '❌ Proxy error:',
                                        proxyRes.statusCode,
                                        req.url,
                                        Buffer.concat(body).toString()
                                    );
                                });
                            }
                        });
                        proxy.on('error', (err, req) => {
                            console.error('❌ Proxy error:', err.message, req.url);
                        });
                    },
                },
            },
        },
    };
});
