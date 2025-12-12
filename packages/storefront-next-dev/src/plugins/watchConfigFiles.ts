import type { ViteDevServer, ResolvedConfig } from 'vite';
import path from 'path';

export const watchConfigFilesPlugin = () => {
    let viteConfig: ResolvedConfig;
    return {
        name: 'odyssey:watch-config-files',
        configResolved(config: ResolvedConfig) {
            viteConfig = config;
        },
        configureServer(server: ViteDevServer) {
            const aliases = viteConfig.resolve.alias;
            const root = Object.values(aliases).find((alias) => alias.find === '@')?.replacement || 'src';
            // Use Vite's chokidar watcher; it supports glob patterns
            const glob = path.join(root, '/extensions/**/plugin-config.json');
            server.watcher.add(glob);

            const onChange = (file: string) => {
                if (file.endsWith('plugin-config.json')) {
                    // eslint-disable-next-line no-console
                    console.log(`🔁 plugin-config.json changed: ${file}`);
                    void server.restart();
                }
            };

            server.watcher.on('add', onChange);
            server.watcher.on('change', onChange);
            server.watcher.on('unlink', onChange);
        },
    };
};
