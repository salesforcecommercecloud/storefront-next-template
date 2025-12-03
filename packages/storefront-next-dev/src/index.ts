// Default export: Vite plugin (for tree-shaking, plugin users won't bundle CLI code)
export { storefrontNextPlugins as default, type StorefrontNextPluginsConfig } from './plugin';

// Named export: Push function for programmatic usage
// For better tree-shaking, import from './commands/push' subpath export instead
export { push } from './commands/push';
export type { PushOptions } from './types';

// Server factory for production use
export { createServer, loadProjectConfig, loadConfigFromEnv } from './server/index';

// Named export: Trim extensions function
import trimExtensions from './extensibility/trim-extensions';
export { trimExtensions };

// Named export: Generate cartridge metadata for programmatic usage
export { generateMetadata, type GenerateMetadataOptions } from './cartridge-services/generate-cartridge';
