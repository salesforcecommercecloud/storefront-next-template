import {
    buildPluginRegistry,
    injectPluginContextproviders,
    transformPluginComponent,
    type PluginContextProviderConfig,
    type PluginComponentRegistry,
} from '../extensibility/plugin-utils';
import path from 'path';
import type { ResolvedConfig } from 'vite';

// --- Vite Plugin --------------------------------------------------------------

export function transformPluginPlaceholderPlugin() {
    // Memoize the extension registry - build it once and reuse across all file transformations
    let componentRegistry: PluginComponentRegistry;
    let contextProviders: PluginContextProviderConfig[];
    let sourceDir: string;

    return {
        name: 'odyssey:transform-plugin-placeholder',
        enforce: 'pre' as const, // run before Vite's default TS/JS transforms
        configResolved(config: ResolvedConfig) {
            // extract source directory from vite config
            sourceDir =
                config.resolve.alias.find((alias) => alias.find === '@')?.replacement ||
                path.resolve(__dirname, './src');
        },
        buildStart() {
            // Build the registry once at the start of the build
            ({ componentRegistry, contextProviders } = buildPluginRegistry(sourceDir));
        },

        transform(code: string, id: string) {
            let transformedCode = null;
            try {
                if (id.includes(path.join(sourceDir, 'root.tsx'))) {
                    transformedCode = injectPluginContextproviders(code, contextProviders);
                } else {
                    transformedCode = transformPluginComponent(code, componentRegistry);
                }
                if (transformedCode) {
                    return {
                        code: transformedCode,
                        map: null,
                    };
                }
                return null;
            } catch (err: unknown) {
                // eslint-disable-next-line no-console
                console.error(
                    `PluginComponent replace ERROR in ${id}: ${err instanceof Error ? err.stack : String(err)}`
                );
                throw err;
            }
        },
    };
}
