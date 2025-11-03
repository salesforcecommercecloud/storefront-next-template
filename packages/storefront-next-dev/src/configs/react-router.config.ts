import type { Preset } from '@react-router/dev/config';

/**
 * Odyssey preset for React Router configuration.
 * This preset enforces standard configuration for SFCC Odyssey applications.
 * Users cannot override these values - they will be validated and an error will be thrown if modified.
 */
export function odysseyPreset(): Preset {
    const presetConfig = {
        appDirectory: './src',
        buildDirectory: 'build',
        routeDiscovery: { mode: 'initial' as const },
        serverModuleFormat: 'cjs' as const,
        ssr: true,
        future: {
            v8_middleware: true,
            unstable_viteEnvironmentApi: true,
        },
    };

    return {
        name: 'odyssey-preset',
        reactRouterConfig: () => presetConfig,
        reactRouterConfigResolved: ({ reactRouterConfig }) => {
            // Validate that critical config values have not been overridden
            // Note: We don't validate appDirectory and buildDirectory because they get resolved
            // to absolute paths and we can't reliably determine the correct absolute path
            const errors: string[] = [];

            if (reactRouterConfig.routeDiscovery?.mode !== presetConfig.routeDiscovery.mode) {
                errors.push(
                    `routeDiscovery.mode: expected "${presetConfig.routeDiscovery.mode}", got "${reactRouterConfig.routeDiscovery?.mode}"`
                );
            }

            if (reactRouterConfig.serverModuleFormat !== presetConfig.serverModuleFormat) {
                errors.push(
                    `serverModuleFormat: expected "${presetConfig.serverModuleFormat}", got "${reactRouterConfig.serverModuleFormat}"`
                );
            }

            if (reactRouterConfig.ssr !== presetConfig.ssr) {
                errors.push(`ssr: expected ${presetConfig.ssr}, got ${reactRouterConfig.ssr}`);
            }

            if (reactRouterConfig.future?.v8_middleware !== presetConfig.future.v8_middleware) {
                errors.push(
                    `future.v8_middleware: expected ${presetConfig.future.v8_middleware}, got ${reactRouterConfig.future?.v8_middleware}`
                );
            }

            if (
                reactRouterConfig.future?.unstable_viteEnvironmentApi !==
                presetConfig.future.unstable_viteEnvironmentApi
            ) {
                errors.push(
                    `future.unstable_viteEnvironmentApi: expected ${presetConfig.future.unstable_viteEnvironmentApi}, got ${reactRouterConfig.future?.unstable_viteEnvironmentApi}`
                );
            }

            if (errors.length > 0) {
                throw new Error(
                    `Odyssey preset configuration was overridden. The following values must not be modified:\n${errors.map((e) => `  - ${e}`).join('\n')}`
                );
            }
        },
    };
}
