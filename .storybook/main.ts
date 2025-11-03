import type { StorybookConfig } from '@storybook/react-vite';
import type { InlineConfig, Plugin } from 'vite';

const config: StorybookConfig = {
    stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: ['@chromatic-com/storybook', '@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
    core: {
        builder: {
            name: '@storybook/builder-vite',
            options: {
                viteConfigPath: '.storybook/vite.config.ts', // Use dedicated Storybook Vite config
            },
        },
    },
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
    viteFinal(inlineConfig: InlineConfig): InlineConfig {
        // Remove project-specific plugins that conflict with Storybook
        inlineConfig.plugins = inlineConfig.plugins?.filter((plugin) => {
            const pluginName = (plugin as Plugin)?.name || '';
            return ![
                'react-router',
                'storefront-next-dev',
                'transform-require-node-fetch',
                'vite-plugin-devtools-json',
            ].some((name) => pluginName.includes(name));
        });

        // Remove project-specific server configuration
        delete (inlineConfig as InlineConfig & { server?: unknown }).server;

        // Remove project-specific test configuration
        delete (inlineConfig as InlineConfig & { test?: unknown }).test;

        // Define process.env variables for browser environment
        // These are needed by config.server.ts which is imported in stories
        inlineConfig.define = {
            ...inlineConfig.define,
            'process.env.PUBLIC_COMMERCE_API_CLIENT_ID': JSON.stringify(
                process.env.PUBLIC_COMMERCE_API_CLIENT_ID || 'storybook-mock-client-id'
            ),
            'process.env.PUBLIC_COMMERCE_API_ORG_ID': JSON.stringify(
                process.env.PUBLIC_COMMERCE_API_ORG_ID || 'storybook-mock-org'
            ),
            'process.env.PUBLIC_COMMERCE_API_SITE_ID': JSON.stringify(
                process.env.PUBLIC_COMMERCE_API_SITE_ID || 'RefArchGlobal'
            ),
            'process.env.PUBLIC_COMMERCE_API_SHORT_CODE': JSON.stringify(
                process.env.PUBLIC_COMMERCE_API_SHORT_CODE || 'kv7kzm78'
            ),
            'process.env.PUBLIC_COMMERCE_API_PROXY': JSON.stringify(
                process.env.PUBLIC_COMMERCE_API_PROXY || '/mobify/proxy/api'
            ),
            'process.env.PUBLIC_COMMERCE_API_CALLBACK': JSON.stringify(
                process.env.PUBLIC_COMMERCE_API_CALLBACK || '/callback'
            ),
            'process.env.PUBLIC_COMMERCE_API_SLAS_PRIVATE': JSON.stringify(
                process.env.PUBLIC_COMMERCE_API_SLAS_PRIVATE || 'false'
            ),
            'process.env.PUBLIC_SITE_LOCALE': JSON.stringify(process.env.PUBLIC_SITE_LOCALE || 'en-US'),
            'process.env.PUBLIC_SITE_CURRENCY': JSON.stringify(process.env.PUBLIC_SITE_CURRENCY || 'USD'),
            'process.env.PUBLIC_SITE_PASSWORDLESS': JSON.stringify(process.env.PUBLIC_SITE_PASSWORDLESS || 'false'),
            'process.env.PUBLIC_SOCIAL_IDPS': JSON.stringify(process.env.PUBLIC_SOCIAL_IDPS || '["Apple","Google"]'),
            'process.env.PUBLIC_PASSWORDLESS_CALLBACK_URI': JSON.stringify(
                process.env.PUBLIC_PASSWORDLESS_CALLBACK_URI || '/passwordless-login-callback'
            ),
            'process.env.PUBLIC_PASSWORDLESS_LANDING_URI': JSON.stringify(
                process.env.PUBLIC_PASSWORDLESS_LANDING_URI || '/passwordless-login-landing'
            ),
            'process.env.MRT_PROJECT': JSON.stringify(process.env.MRT_PROJECT || ''),
            'process.env.MRT_TARGET': JSON.stringify(process.env.MRT_TARGET || ''),
        };

        return inlineConfig;
    },
};

export default config;
