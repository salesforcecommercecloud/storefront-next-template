// Default export: Vite plugin (for tree-shaking, plugin users won't bundle CLI code)
export { storefrontNextPlugins as default, type StorefrontNextPluginsConfig } from './plugin.js';

// Named export: Push function for programmatic usage
// For better tree-shaking, import from './push' subpath export instead
export { push } from './push.js';
export type { PushOptions } from './types.js';
