import type { MrtSsrConfig } from './types';

export const CARTRIDGES_BASE_DIR = 'cartridges';
export const SFNEXT_BASE_CARTRIDGE_NAME = 'app_storefrontnext_base';
export const SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR = `${SFNEXT_BASE_CARTRIDGE_NAME}/cartridge/experience`;
export const SFNEXT_BASE_CARTRIDGE_VERSION = '0.0.1';

/**
 * Build MRT SSR configuration for bundle deployment
 *
 * Defines which files should be:
 * - Server-only (ssrOnly): Deployed only to Lambda functions
 * - Shared (ssrShared): Deployed to both Lambda and CDN
 *
 * @param buildDirectory - Path to the build output directory
 * @param projectDirectory - Path to the project root (reserved for future use)
 * @returns MRT SSR configuration with glob patterns
 */
export const buildMrtConfig = (_buildDirectory: string, _projectDirectory?: string): MrtSsrConfig => {
    // SSR-only files: Server bundles and entry points
    // These are deployed only to Lambda functions, not to CDN
    const ssrOnly = [
        'server/**/*', // All server-side code
        'loader.js', // SSR entry point
        'ssr.js', // SSR runtime
        '!static/**/*', // Exclude static assets from server
        // Exclude Storybook and test files
        '!**/*.stories.tsx',
        '!**/*.stories.ts',
        '!**/*-snapshot.tsx',
        '!.storybook/**/*',
        '!storybook-static/**/*',
        '!**/__mocks__/**/*',
        '!**/__snapshots__/**/*',
    ];

    // Shared files: Client bundles and static assets
    // These are deployed to both Lambda (for SSR) and CDN (for client)
    const ssrShared = [
        'client/**/*', // All client-side bundles (with content hashes)
        'static/**/*', // Static assets (images, fonts, etc.)
        '**/*.css', // Stylesheets
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg',
        '**/*.gif',
        '**/*.svg',
        '**/*.ico',
        '**/*.woff',
        '**/*.woff2',
        '**/*.ttf',
        '**/*.eot',
        // Exclude Storybook and test files
        '!**/*.stories.tsx',
        '!**/*.stories.ts',
        '!**/*-snapshot.tsx',
        '!.storybook/**/*',
        '!storybook-static/**/*',
        '!**/__mocks__/**/*',
        '!**/__snapshots__/**/*',
    ];

    // SSR function parameters
    const ssrParameters = {
        ssrFunctionNodeVersion: '22.x',
    };

    return {
        ssrOnly,
        ssrShared,
        ssrParameters,
    };
};
