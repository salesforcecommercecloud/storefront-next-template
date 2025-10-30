import type { Plugin, ResolvedConfig } from 'vite';
import path from 'path';
import fs from 'fs-extra';

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
            if (resolvedConfig?.mode === 'preview') {
                return;
            }

            const { readdirSync, existsSync } = fs;
            const clientBuildDir = resolvedConfig.environments.client.build.outDir;
            if (!existsSync(clientBuildDir)) return;

            // Find React Router manifest files in client build directory
            const findManifestFiles = (dir: string): string[] => {
                const files: string[] = [];
                const entries = readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        files.push(...findManifestFiles(fullPath));
                    } else if (entry.name.includes('manifest-') && entry.name.endsWith('.js')) {
                        files.push(fullPath);
                    }
                }
                return files;
            };

            const manifestFiles = findManifestFiles(clientBuildDir);

            for (const filePath of manifestFiles) {
                let content = fs.readFileSync(filePath, 'utf-8');

                // TODO: lets traverse the JS instead of using regex
                // Transform asset URLs that start with /assets/ to use dynamic bundle path
                if (content.includes('"/assets/') || content.includes("'/assets/")) {
                    // Replace asset URLs with dynamic window._BUNDLE_PATH
                    content = content.replace(/["']\/assets\//g, '(window._BUNDLE_PATH || "/") + "assets/');

                    fs.writeFileSync(filePath, content);
                }
            }
        },
    };
}
