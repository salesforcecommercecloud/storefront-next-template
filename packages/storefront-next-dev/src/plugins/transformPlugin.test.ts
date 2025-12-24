import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import type { ResolvedConfig } from 'vite';

import { transformPluginPlaceholderPlugin } from './transformPlugins';
import { pathEndsWith } from '../test-utils';

// mock vite config
const viteConfig = {
    resolve: {
        alias: [{ find: '@', replacement: 'src' }],
    },
} as unknown as ResolvedConfig;

// Mock the plugin-utils module
vi.mock('../extensibility/plugin-utils', () => ({
    buildPluginRegistry: vi.fn(),
    transformPlugins: vi.fn(),
}));

import {
    buildPluginRegistry,
    type PluginComponentRegistry,
    type PluginContextProviderConfig,
    transformPlugins,
} from '../extensibility/plugin-utils';

describe('transformPluginPlaceholderPlugin', () => {
    let buildPluginRegistryMock: any;
    let transformPluginsMock: any;
    let plugin: ReturnType<typeof transformPluginPlaceholderPlugin>;
    const mockComponentRegistry: PluginComponentRegistry = {
        'test.plugin': [
            {
                pluginId: 'test.plugin',
                path: 'extensions/bar.tsx',
                namespace: 'Bar',
                componentName: 'Bar_Foo',
                order: 0,
            },
        ],
    };
    const mockContextProviders: PluginContextProviderConfig[] = [
        {
            path: 'extensions/store-locator/providers/store-locator.tsx',
            namespace: 'StoreLocator',
            componentName: 'StoreLocator_StoreLocator',
            order: 0,
        },
    ];
    const mockCode: string = '<div>Hello</div>';
    const mockId = '/project/src/SomeComponent.tsx';
    const rootId = join('src', 'root.tsx');

    beforeEach(() => {
        // Mock plugin-utils methods
        buildPluginRegistryMock = vi.mocked(buildPluginRegistry).mockImplementation(() => ({
            componentRegistry: mockComponentRegistry,
            contextProviders: mockContextProviders,
        }));
        transformPluginsMock = vi.mocked(transformPlugins);
        vi.spyOn(process, 'cwd').mockReturnValue('/project');

        plugin = transformPluginPlaceholderPlugin();
        plugin.configResolved(viteConfig);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should use src as default when no alias is found in the vite config', () => {
        const viteConfig2 = {
            resolve: {
                alias: [{ find: '+', replacement: 'foobar' }],
            },
        } as unknown as ResolvedConfig;
        plugin.configResolved(viteConfig2);
        plugin.buildStart();
        // Use pathEndsWith for cross-platform path comparison (handles Windows absolute paths)
        const actualPath = buildPluginRegistryMock.mock.calls[0][0] as string;
        expect(pathEndsWith(actualPath, '/src')).toBe(true);
    });

    it('should build registry at buildStart()', () => {
        plugin.buildStart();
        expect(buildPluginRegistryMock).toHaveBeenCalledWith('src');
    });

    it('should transform root.tsx with injectPluginContextproviders', () => {
        plugin.buildStart();
        transformPluginsMock.mockReturnValue('transformed-root-code');
        const res = plugin.transform(mockCode, `/project/${rootId}`);
        expect(transformPluginsMock).toHaveBeenCalledWith(mockCode, mockComponentRegistry, mockContextProviders);
        expect(res).toEqual({ code: 'transformed-root-code', map: null });
    });

    it('should transform other components with transformPluginComponent', () => {
        plugin.buildStart();
        transformPluginsMock.mockReturnValue('transformed-nonroot');
        const res = plugin.transform(mockCode, mockId);
        expect(transformPluginsMock).toHaveBeenCalledWith(mockCode, mockComponentRegistry, mockContextProviders);
        expect(res).toEqual({ code: 'transformed-nonroot', map: null });
    });

    it('should return null if transformedCode is null or undefined', () => {
        plugin.buildStart();
        transformPluginsMock.mockReturnValue(null);
        const res = plugin.transform(mockCode, mockId);
        expect(res).toBeNull();
    });

    it('should log and throw on transform error', () => {
        plugin.buildStart();
        const error = new Error('test error');
        transformPluginsMock.mockImplementation(() => {
            throw error;
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => plugin.transform(mockCode, mockId)).toThrow(error);
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining(
                'PluginComponent replace ERROR in /project/src/SomeComponent.tsx: Error: test error'
            )
        );
        errorSpy.mockRestore();
    });

    it('should log and throw on transform error that is not an Error', () => {
        plugin.buildStart();
        const error = 'test error';
        transformPluginsMock.mockImplementation(() => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw error;
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => plugin.transform(mockCode, mockId)).toThrow(error);
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('PluginComponent replace ERROR in /project/src/SomeComponent.tsx: test error')
        );
        errorSpy.mockRestore();
    });
});
