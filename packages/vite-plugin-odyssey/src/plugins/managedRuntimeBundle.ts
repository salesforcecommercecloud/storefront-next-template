import type { Plugin, ResolvedConfig } from 'vite';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * This is a Vite plugin specifically for building the Managed Runtime production bundle.
 * This plugin relies on the @react-router/dev/vite plugin to work.
 * This plugin creates the Managed Runtime production bundle from the build output of the @react-router/dev/vite plugin.
 *
 * @returns {Plugin} A Vite plugin for building the Managed Runtime production react-router bundle
 */
export const managedRuntimeBundlePlugin = (): Plugin => {
    let resolvedConfig: ResolvedConfig;

    // Note: The react-router vite plugin does not use/respect vite's config.build.outDir
    // We must not use the resolvedConfig.build.outDir
    // Instead, react-router has a "buildDirectory" option from react-router.config.ts
    // Should we infer the build directory from the react-router config OR let the user configure it?
    let buildDirectory: string;

    /**
     * Creates the Managed Runtime production bundle assets
     * - ssr.js
     * - loader.js
     * - package.json
     *
     * @returns {Promise<void>}
     */
    const createManagedRuntimeBundleAssets = async (): Promise<void> => {
        const loaderPath = path.resolve(buildDirectory, 'loader.js');
        const ssrPath = path.resolve(buildDirectory, 'ssr.js');

        await fs.ensureDir(buildDirectory);
        await fs.outputFile(loaderPath, '// This file is intentionally empty');

        const prebuiltSsrPath = path.resolve(__dirname, './mrt/ssr.js');
        await fs.copy(prebuiltSsrPath, ssrPath);

        const packageJsonPath = path.resolve(resolvedConfig.root, 'package.json');
        const buildPackageJsonPath = path.resolve(buildDirectory, 'package.json');

        const packageJson = await fs.readJson(packageJsonPath);

        // Currently MRT only supports CJS modules, and we are building a CJS bundle.
        // But we need to make sure the package.json doesn't have the "type" key to use ESM
        // otherwise the MRT environment will break because the node ESM resolution will not work
        // for our CJS bundle.
        delete packageJson.type;
        await fs.writeJson(buildPackageJsonPath, packageJson, { spaces: 2 });
    };

    return {
        name: 'odyssey:managed-runtime-bundle',
        apply: 'build',
        config({ mode }) {
            return {
                environments: {
                    ssr: {
                        resolve: {
                            noExternal: true,
                        },
                    },
                },
                experimental: {
                    renderBuiltUrl(filename, { type }) {
                        if (mode !== 'preview' && (type === 'asset' || type === 'public')) {
                            const runtimeCode = `(typeof window !== 'undefined' ? window._BUNDLE_PATH : ('/mobify/bundle/'+process.env.BUNDLE_ID+'/client/')) + ${JSON.stringify(filename)}`;

                            return {
                                runtime: runtimeCode,
                            };
                        }
                    },
                },
            };
        },
        configResolved(config) {
            resolvedConfig = config;

            // @ts-expect-error: react-router plugin context is not typed
            buildDirectory = config.__reactRouterPluginContext.reactRouterConfig.buildDirectory;
        },
        buildApp: {
            order: 'post',
            handler: async () => {
                await createManagedRuntimeBundleAssets();
            },
        },
    };
};
