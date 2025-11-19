export type ServerMode = 'development' | 'serve' | 'production';

/**
 * Feature flags for each server mode
 */
export interface ServerModeFeatures {
    /** Enable Commerce API proxy middleware to forward /mobify/proxy/api requests to SCAPI */
    enableProxy: boolean;

    /** Enable static file serving from build/client directory */
    enableStaticServing: boolean;

    /** Enable gzip/brotli compression middleware for responses */
    enableCompression: boolean;

    /** Enable HTTP request/response logging */
    enableLogging: boolean;

    /** Enable patching of asset URLs with bundle path (for CDN deployment) */
    enableAssetUrlPatching: boolean;
}

/**
 * Default feature configuration for each server mode
 */
export const ServerModeFeatureMap: Record<ServerMode, ServerModeFeatures> = {
    development: {
        enableProxy: true,
        enableStaticServing: false,
        enableCompression: false,
        enableLogging: true,
        enableAssetUrlPatching: false,
    },
    serve: {
        enableProxy: true,
        enableStaticServing: true,
        enableCompression: true,
        enableLogging: true,
        enableAssetUrlPatching: true,
    },
    production: {
        enableProxy: false,
        enableStaticServing: false,
        enableCompression: true,
        enableLogging: false,
        enableAssetUrlPatching: true,
    },
};
