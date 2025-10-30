import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = '\0patched-react-router';
const MODULE_TO_PATCH = 'react-router';

/**
 * This plugin intercepts imports of 'react-router' and provides patched versions
 * of specific components (like Scripts) with custom logic.
 *
 * @returns {Plugin} A Vite plugin for patching react-router components
 */
export const patchReactRouterPlugin = (): Plugin => {
    return {
        name: 'odyssey:patch-react-router',
        // must be enforce: 'pre'
        // otherwise the react-router plugin will resolve the module first
        // and we will not be able to enhance the module with our custom logic
        enforce: 'pre',
        configEnvironment(name) {
            if (name === 'ssr') {
                // By default, on dev mode, Vite does not process external modules like react-router
                // but we need to patch it, so we mark react-router as noExternal
                // so that it is included in the Vite plugin pipeline, and we can patch it
                return {
                    resolve: {
                        noExternal: ['react-router'],
                    },
                };
            }
        },
        resolveId(id, importer) {
            if (id === MODULE_TO_PATCH) {
                // In the virtual module, we need to import the same react-router module
                // and then re-export everything from it, and override a subset of the exports.
                // This following code is to make sure that the import from the virtual module
                // imports the same react-router module and not causing infinite loop.
                if (importer === VIRTUAL_MODULE_ID || importer?.includes('vite-plugin-odyssey')) {
                    return null;
                }
                return VIRTUAL_MODULE_ID;
            }
            return null;
        },

        load(id) {
            if (id === VIRTUAL_MODULE_ID) {
                const scriptsImportPath = '@salesforce/vite-plugin-odyssey/react-router/Scripts';

                const code = `
                    export * from 'react-router';
                    export { Scripts } from '${scriptsImportPath}';
                `;
                return code;
            }
            return null;
        },
    };
};
