import { describe, it, expect, vi } from 'vitest';
import type { ViteDevServer, ResolvedConfig } from 'vite';
import { watchConfigFilesPlugin } from './watchConfigFiles';

const resolvedConfig = {
    resolve: {
        alias: [
            {
                find: '@',
                replacement: 'src',
            },
        ],
    },
} as unknown as ResolvedConfig;

describe('watchConfigFilesPlugin', () => {
    it('should add glob pattern and register event listeners', () => {
        // Arrange
        const add = vi.fn();
        const watcherOn = vi.fn();
        const restart = vi.fn();

        const fakeServer = {
            watcher: {
                add,
                on: watcherOn,
            },
            restart,
        } as unknown as ViteDevServer;

        // Act
        const plugin = watchConfigFilesPlugin();
        plugin.configResolved(resolvedConfig);
        plugin.configureServer(fakeServer);

        // Assert
        expect(add).toHaveBeenCalledWith('src/extensions/**/plugin-config.json');
        expect(watcherOn).toHaveBeenCalledWith('add', expect.any(Function));
        expect(watcherOn).toHaveBeenCalledWith('change', expect.any(Function));
        expect(watcherOn).toHaveBeenCalledWith('unlink', expect.any(Function));
    });

    it('should call server.restart() when plugin-config.json changes', () => {
        // Arrange
        const add = vi.fn();
        const restart = vi.fn();
        const handlers: Record<string, (file: string) => void> = {
            add: vi.fn(),
            change: vi.fn(),
            unlink: vi.fn(),
        };

        const watcher = {
            add,
            on(event: string, fn: (file: string) => void) {
                handlers[event] = fn;
            },
        };
        const fakeServer = {
            watcher,
            restart,
        } as unknown as ViteDevServer;

        // Act
        const plugin = watchConfigFilesPlugin();
        plugin.configResolved(resolvedConfig);
        plugin.configureServer(fakeServer);

        // Simulate change event
        handlers.change('/abs/path/src/extensions/foo/plugin-config.json');

        // Assert
        expect(restart).toHaveBeenCalled();
    });

    it('should not restart server for non-plugin-config.json files', () => {
        // Arrange
        const add = vi.fn();
        const restart = vi.fn();
        const handlers: Record<string, (file: string) => void> = {
            add: vi.fn(),
            change: vi.fn(),
            unlink: vi.fn(),
        };

        const watcher = {
            add,
            on(event: string, fn: (file: string) => void) {
                handlers[event] = fn;
            },
        };
        const fakeServer = {
            watcher,
            restart,
        } as unknown as ViteDevServer;

        // Act
        const plugin = watchConfigFilesPlugin();
        plugin.configResolved(resolvedConfig);
        plugin.configureServer(fakeServer);

        // Simulate change event with irrelevant file
        handlers.change('/abs/path/somefile.txt');

        // Assert
        expect(restart).not.toHaveBeenCalled();
    });
});
