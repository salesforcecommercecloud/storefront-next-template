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
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig, perEnvironmentPlugin, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import devtoolsJson from 'vite-plugin-devtools-json';
import storefrontNextTargets, {
    hybridProxyPlugin,
    shouldRouteToNext,
    uiTargetDevModePlugin,
} from '@salesforce/storefront-next-dev';
import bundlesize from 'vite-plugin-bundlesize';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

/**
 * Load the hintMap from target-config.json for UITarget dev mode overlay filtering.
 * hintMap is defined in the uiTargetDevModePlugin source but is omitted from the compiled
 * .d.ts by rollup-plugin-dts, so we cast at the call site to avoid a type error.
 */
function loadUiTargetHintMap(): Record<string, string> {
    try {
        const configPath = resolve(__dirname, 'src/extensions/ui-target-smoke-test/target-config.json');
        const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as {
            components: { targetId: string; hint?: string }[];
        };
        return Object.fromEntries(raw.components.filter((c) => c.hint).map((c) => [c.targetId, c.hint as string]));
    } catch {
        return {};
    }
}
const enableBundlesizeCheck = !!process.env.BUNDLES_SIZE_CHECK;
const enableBundlesizeAnalyze = !!process.env.BUNDLES_SIZE_ANALYZE;
const enableReadableChunkNames = enableBundlesizeCheck || enableBundlesizeAnalyze;

/**
 * @see {@link https://vite.dev/config/}
 */
export default defineConfig(({ mode }) => {
    // Load environment variables with PUBLIC_ prefix for client-side config
    const environment = loadEnv(mode, __dirname, 'PUBLIC');

    const shortCode = environment.PUBLIC__app__commerce__api__shortCode;
    const scapiProxyHost = process.env.SCAPI_PROXY_HOST;

    // Only validate shortCode in development mode and no proxyHost override
    if (!shortCode && !scapiProxyHost && mode === 'development') {
        throw new Error(
            'Missing required Commerce API short code.\n\n' +
                'Set PUBLIC__app__commerce__api__shortCode in your .env file:\n' +
                '  PUBLIC__app__commerce__api__shortCode=your-short-code\n\n' +
                'See .env.default for a complete example.'
        );
    }
    return {
        build: {
            sourcemap: true,
            rollupOptions: {
                external: ['_local'],
                output: {
                    manualChunks(id) {
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
            // UITarget dev mode - visual markers (runs BEFORE storefrontNextTargets)
            uiTargetDevModePlugin({
                enabled: process.env.VITE_UI_TARGET_DEV_MODE === 'true',
                filterCategory: process.env.VITE_TARGET_FILTER_CATEGORY,
                hintMap: loadUiTargetHintMap(),
            } as Parameters<typeof uiTargetDevModePlugin>[0]),
            // Target system - extension transforms (always needed)
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
    };
});
