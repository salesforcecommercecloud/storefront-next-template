import type { Plugin, ResolvedConfig } from 'vite';
import path from 'node:path';
import fs from 'fs-extra';

function patchAssetsPaths(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            patchAssetsPaths(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('"/assets/') || content.includes("'/assets/")) {
                // Transform asset URLs that start with /assets/ to use dynamic bundle path
                fs.writeFileSync(
                    fullPath,
                    content.replace(/["']\/assets\//g, '(window._BUNDLE_PATH || "/") + "assets/')
                );
                // eslint-disable-next-line no-console
                console.log(`patched /assets/ references in ${fullPath}`);
            }
        }
    }
}

/**
 * Plugin to transform React Router client manifest URLs to use dynamic bundle paths
 */
export function fixReactRouterManifestUrlsPlugin(): Plugin {
    let resolvedConfig: ResolvedConfig;

    return {
        name: 'odyssey:fix-react-router-manifest-urls',
        enforce: 'post', // Run after React Router plugin

        configResolved(config: ResolvedConfig) {
            resolvedConfig = config;
        },

        // Post-process client manifest files after they're written to disk
        closeBundle() {
            const clientBuildDir = resolvedConfig.environments.client.build.outDir;
            if (fs.existsSync(clientBuildDir)) {
                // Patch references to `/assets/` in files within React Router's client build directory
                patchAssetsPaths(clientBuildDir);
            }
        },
    };
}
