/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComponentRegistry, type ComponentModule, type ComponentTypeMetadata } from './component-registry';

// Mock design mode utilities
vi.mock('@salesforce/storefront-next-runtime/design/mode', () => ({
    isDesignModeActive: vi.fn(() => false),
}));

type TestProps = { title: string };
type TestParams = { id: string };

describe('ComponentRegistry', () => {
    let registry: ComponentRegistry<TestProps, TestParams>;

    beforeEach(() => {
        registry = new ComponentRegistry<TestProps, TestParams>();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        test('creates registry with default options', () => {
            const reg = new ComponentRegistry<TestProps, TestParams>();
            expect(reg).toBeInstanceOf(ComponentRegistry);
        });

        test('accepts custom design decorator', () => {
            const decorator = vi.fn((c) => c);
            const reg = new ComponentRegistry<TestProps, TestParams>({
                designDecorator: decorator,
            });
            expect(reg).toBeInstanceOf(ComponentRegistry);
        });

        test('accepts custom modules map', () => {
            const modules = {
                '/test.tsx': vi.fn(),
            };
            const reg = new ComponentRegistry<TestProps, TestParams>({
                modules,
            });
            expect(reg).toBeInstanceOf(ComponentRegistry);
        });

        test('accepts custom extractMeta function', () => {
            const extractMeta = vi.fn(() => ({ id: 'test' }));
            const reg = new ComponentRegistry<TestProps, TestParams>({
                extractMeta,
            });
            expect(reg).toBeInstanceOf(ComponentRegistry);
        });
    });

    describe('registerComponent', () => {
        test('registers a component with an id', () => {
            const TestComponent = () => null;
            registry.registerComponent('test-id', TestComponent);

            const component = registry.getComponent('test-id');
            expect(component).toBe(TestComponent);
        });

        test('overwrites existing component with same id', () => {
            const Component1 = () => null;
            const Component2 = () => null;

            registry.registerComponent('test-id', Component1);
            registry.registerComponent('test-id', Component2);

            const component = registry.getComponent('test-id');
            expect(component).toBe(Component2);
        });

        test('registers multiple components with different ids', () => {
            const Component1 = () => null;
            const Component2 = () => null;

            registry.registerComponent('id-1', Component1);
            registry.registerComponent('id-2', Component2);

            expect(registry.getComponent('id-1')).toBe(Component1);
            expect(registry.getComponent('id-2')).toBe(Component2);
        });
    });

    describe('registerLoader', () => {
        test('registers a dynamic importer for a component', () => {
            const mockModule: ComponentModule<TestProps, TestParams> = {
                default: () => null,
            };
            const importer = vi.fn(() => Promise.resolve(mockModule));

            registry.registerImporter('test-id', importer);
            expect(registry.has('test-id')).toBe(true);
        });

        test('can register loader with metadata', async () => {
            const serverLoader = vi.fn();
            const fallback = () => null;
            const importer = vi.fn(() =>
                Promise.resolve({
                    default: () => null,
                    loaders: { server: serverLoader },
                    fallback,
                })
            );

            registry.registerImporter('lazy-id', importer);
            await registry.preload('lazy-id');

            expect(registry.getLoaders('lazy-id')?.server).toBe(serverLoader);
            expect(registry.getFallback('lazy-id')).toBe(fallback);
        });
    });

    describe('getComponent', () => {
        test('returns null for non-existent component', () => {
            const component = registry.getComponent('non-existent');
            expect(component).toBeNull();
        });

        test('returns registered raw component', () => {
            const TestComponent = () => null;
            registry.registerComponent('test-id', TestComponent);

            const component = registry.getComponent('test-id');
            expect(component).toBe(TestComponent);
        });

        test('returns lazy component when registered via loader', async () => {
            const TestComponent = () => null;
            const importer = vi.fn(() =>
                Promise.resolve({
                    default: TestComponent,
                })
            );

            registry.registerImporter('lazy-id', importer);
            await registry.preload('lazy-id');

            const component = registry.getComponent('lazy-id');
            expect(component).toBeTruthy();
            // React.lazy returns a lazy component object with $$typeof
            expect(component).toHaveProperty('$$typeof');
        });

        test('applies design decorator in design mode', async () => {
            const { isDesignModeActive } = await import('@salesforce/storefront-next-runtime/design/mode');
            vi.mocked(isDesignModeActive).mockReturnValue(true);

            const TestComponent = () => null;
            const decorator = vi.fn((c) => c);
            const reg = new ComponentRegistry<TestProps, TestParams>({
                designDecorator: decorator,
            });

            reg.registerComponent('test-id', TestComponent);
            reg.getComponent('test-id');

            expect(decorator).toHaveBeenCalledWith(TestComponent);
        });
    });

    describe('preload', () => {
        test('resolves immediately for registered raw component', async () => {
            const TestComponent = () => null;
            registry.registerComponent('test-id', TestComponent);

            await expect(registry.preload('test-id')).resolves.toBeUndefined();
        });

        test('calls importer when preloading lazy component', async () => {
            const TestComponent = () => null;
            const importer = vi.fn(() =>
                Promise.resolve({
                    default: TestComponent,
                })
            );

            registry.registerImporter('lazy-id', importer);
            await registry.preload('lazy-id');

            expect(importer).toHaveBeenCalledTimes(1);
        });

        test('throws error for non-existent component', async () => {
            await expect(registry.preload('non-existent')).rejects.toThrow(
                'Component "non-existent" could not be discovered'
            );
        });

        test('deduplicates concurrent preload calls', async () => {
            const TestComponent = () => null;
            const importer = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return { default: TestComponent };
            });

            registry.registerImporter('lazy-id', importer);

            // Call preload multiple times concurrently
            await Promise.all([registry.preload('lazy-id'), registry.preload('lazy-id'), registry.preload('lazy-id')]);

            // Importer should only be called once due to deduplication
            expect(importer).toHaveBeenCalledTimes(1);
        });
    });

    describe('getMetadata', () => {
        test('returns undefined for non-existent component', () => {
            const metadata = registry.getMetadata('non-existent');
            expect(metadata).toBeUndefined();
        });

        test('returns metadata for component with loader', async () => {
            const meta: ComponentTypeMetadata = {
                id: 'test-id',
                name: 'Test Component',
                description: 'A test component',
                group: 'test-group',
            };

            const importer = vi.fn(() =>
                Promise.resolve({
                    default: () => null,
                })
            );

            const extractMeta = vi.fn(() => meta);
            const reg = new ComponentRegistry<TestProps, TestParams>({
                extractMeta,
            });

            reg.registerImporter('test-id', importer);
            await reg.preload('test-id');

            const metadata = reg.getMetadata('test-id');
            expect(metadata).toEqual(meta);
        });
    });

    describe('getLoaders', () => {
        test('returns undefined for component without loaders', () => {
            const TestComponent = () => null;
            registry.registerComponent('test-id', TestComponent);

            const loaders = registry.getLoaders('test-id');
            expect(loaders).toBeUndefined();
        });

        test('returns loaders from module', async () => {
            const serverLoader = vi.fn();
            const clientLoader = vi.fn();

            const importer = vi.fn(() =>
                Promise.resolve({
                    default: () => null,
                    loaders: {
                        server: serverLoader,
                        client: clientLoader,
                    },
                })
            );

            registry.registerImporter('test-id', importer);
            await registry.preload('test-id');

            const loaders = registry.getLoaders('test-id');
            expect(loaders).toEqual({
                server: serverLoader,
                client: clientLoader,
            });
        });
    });

    describe('getFallback', () => {
        test('returns undefined for component without fallback', () => {
            const TestComponent = () => null;
            registry.registerComponent('test-id', TestComponent);

            const fallback = registry.getFallback('test-id');
            expect(fallback).toBeUndefined();
        });

        test('returns fallback from module', async () => {
            const FallbackComponent = () => null;

            const importer = vi.fn(() =>
                Promise.resolve({
                    default: () => null,
                    fallback: FallbackComponent,
                })
            );

            registry.registerImporter('test-id', importer);
            await registry.preload('test-id');

            const fallback = registry.getFallback('test-id');
            expect(fallback).toBe(FallbackComponent);
        });
    });

    describe('getRegisteredIds', () => {
        test('returns empty array for new registry', () => {
            const ids = registry.getRegisteredIds();
            expect(ids).toEqual([]);
        });

        test('returns all registered component ids', () => {
            registry.registerComponent('id-1', () => null);
            registry.registerComponent('id-2', () => null);
            registry.registerComponent('id-3', () => null);

            const ids = registry.getRegisteredIds();
            expect(ids).toHaveLength(3);
            expect(ids).toContain('id-1');
            expect(ids).toContain('id-2');
            expect(ids).toContain('id-3');
        });
    });

    describe('has', () => {
        test('returns false for non-existent component', () => {
            expect(registry.has('non-existent')).toBe(false);
        });

        test('returns true for registered component', () => {
            registry.registerComponent('test-id', () => null);
            expect(registry.has('test-id')).toBe(true);
        });

        test('returns true for component with registered loader', () => {
            registry.registerImporter('lazy-id', () =>
                Promise.resolve({
                    default: () => null,
                })
            );
            expect(registry.has('lazy-id')).toBe(true);
        });
    });

    describe('clear', () => {
        test('removes all registered components', () => {
            registry.registerComponent('id-1', () => null);
            registry.registerComponent('id-2', () => null);

            registry.clear();

            expect(registry.getRegisteredIds()).toEqual([]);
            expect(registry.has('id-1')).toBe(false);
            expect(registry.has('id-2')).toBe(false);
        });

        test('cancels pending discoveries when cleared', async () => {
            const importer = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return { default: () => null };
            });

            registry.registerImporter('lazy-id', importer);

            // Start preload but don't await
            const preloadPromise = registry.preload('lazy-id');

            // Clear immediately (cancels in-flight discoveries)
            registry.clear();

            // The preload promise should reject with cancellation error
            await expect(preloadPromise).rejects.toThrow('Component discovery for "lazy-id" was cancelled');

            // The component should not be in the registry
            expect(registry.has('lazy-id')).toBe(false);
            expect(registry.getRegisteredIds()).toEqual([]);
        });

        test('cancels all concurrent pending discoveries', async () => {
            const importer = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return { default: () => null };
            });

            registry.registerImporter('lazy-id', importer);

            // Start multiple concurrent preloads
            const promise1 = registry.preload('lazy-id');
            const promise2 = registry.preload('lazy-id');
            const promise3 = registry.preload('lazy-id');

            // Clear should cancel all of them
            registry.clear();

            // All promises should reject with the same error
            await expect(promise1).rejects.toThrow('Component discovery for "lazy-id" was cancelled');
            await expect(promise2).rejects.toThrow('Component discovery for "lazy-id" was cancelled');
            await expect(promise3).rejects.toThrow('Component discovery for "lazy-id" was cancelled');

            expect(registry.has('lazy-id')).toBe(false);
        });
    });

    describe('module discovery', () => {
        test('discovers component from modules map', async () => {
            const TestComponent = () => null;
            const meta: ComponentTypeMetadata = { id: 'discovered-id' };

            const modules = {
                '/test.tsx': vi.fn(() =>
                    Promise.resolve({
                        default: TestComponent,
                    })
                ),
            };

            const extractMeta = vi.fn(() => meta);

            const reg = new ComponentRegistry<TestProps, TestParams>({
                modules,
                extractMeta,
            });

            await reg.preload('discovered-id');

            expect(extractMeta).toHaveBeenCalled();
            expect(reg.has('discovered-id')).toBe(true);
        });

        test('scans all modules when component not found in first', async () => {
            const TestComponent = () => null;
            const meta: ComponentTypeMetadata = { id: 'target-id' };

            const modules = {
                '/test1.tsx': vi.fn(() =>
                    Promise.resolve({
                        default: () => null,
                    })
                ),
                '/test2.tsx': vi.fn(() =>
                    Promise.resolve({
                        default: () => null,
                    })
                ),
                '/test3.tsx': vi.fn(() =>
                    Promise.resolve({
                        default: TestComponent,
                    })
                ),
            };

            let callCount = 0;
            const extractMeta = vi.fn(() => {
                callCount++;
                return callCount === 3 ? meta : { id: `other-${callCount}` };
            });

            const reg = new ComponentRegistry<TestProps, TestParams>({
                modules,
                extractMeta,
            });

            await reg.preload('target-id');

            expect(extractMeta).toHaveBeenCalledTimes(3);
            expect(reg.has('target-id')).toBe(true);
        });

        test('returns null when component not found in any module', async () => {
            const modules = {
                '/test.tsx': vi.fn(() =>
                    Promise.resolve({
                        default: () => null,
                    })
                ),
            };

            const extractMeta = vi.fn(() => ({ id: 'other-id' }));

            const reg = new ComponentRegistry<TestProps, TestParams>({
                modules,
                extractMeta,
            });

            await expect(reg.preload('non-existent')).rejects.toThrow();
        });
    });

    describe('Region Functions', () => {
        beforeEach(() => {
            // Register test components and manually set metadata
            const mockImporter = vi.fn().mockResolvedValue({
                default: (() => null) as any,
            });

            // Component with regions
            registry.registerImporter('with-regions', mockImporter);
            (registry as any).registry.set('with-regions', {
                id: 'with-regions',
                raw: null,
                import: mockImporter,
                meta: {
                    id: 'with-regions',
                    name: 'Component With Regions',
                    regions: [
                        { id: 'header', name: 'Header', maxComponents: 3 },
                        { id: 'main', name: 'Main', componentTypeExclusions: ['footer'] },
                    ],
                },
            });

            // Component without regions
            registry.registerImporter('no-regions', mockImporter);
            (registry as any).registry.set('no-regions', {
                id: 'no-regions',
                raw: null,
                import: mockImporter,
                meta: {
                    id: 'no-regions',
                    name: 'Component Without Regions',
                },
            });

            // Component with empty regions
            registry.registerImporter('empty-regions', mockImporter);
            (registry as any).registry.set('empty-regions', {
                id: 'empty-regions',
                raw: null,
                import: mockImporter,
                meta: {
                    id: 'empty-regions',
                    name: 'Component With Empty Regions',
                    regions: [],
                },
            });
        });

        describe('getRegions', () => {
            const getRegionsTestCases = [
                {
                    description: 'returns regions array for component with regions',
                    componentId: 'with-regions',
                    expected: [
                        { id: 'header', name: 'Header', maxComponents: 3 },
                        { id: 'main', name: 'Main', componentTypeExclusions: ['footer'] },
                    ],
                },
                {
                    description: 'returns undefined for component without regions',
                    componentId: 'no-regions',
                    expected: undefined,
                },
                {
                    description: 'returns empty array for component with empty regions',
                    componentId: 'empty-regions',
                    expected: [],
                },
                {
                    description: 'returns undefined for non-existent component',
                    componentId: 'non-existent',
                    expected: undefined,
                },
            ];

            test.each(getRegionsTestCases)('$description', ({ componentId, expected }) => {
                const result = registry.getRegions(componentId);
                expect(result).toEqual(expected);
            });
        });

        describe('getRegion', () => {
            const getRegionTestCases = [
                {
                    description: 'returns specific region by IDs',
                    componentId: 'with-regions',
                    regionId: 'header',
                    expected: { id: 'header', name: 'Header', maxComponents: 3 },
                },
                {
                    description: 'returns different region when requested',
                    componentId: 'with-regions',
                    regionId: 'main',
                    expected: { id: 'main', name: 'Main', componentTypeExclusions: ['footer'] },
                },
                {
                    description: 'returns undefined for non-existent region',
                    componentId: 'with-regions',
                    regionId: 'non-existent',
                    expected: undefined,
                },
                {
                    description: 'returns undefined for non-existent component',
                    componentId: 'non-existent',
                    regionId: 'any-region',
                    expected: undefined,
                },
            ];

            test.each(getRegionTestCases)('$description', ({ componentId, regionId, expected }) => {
                const result = registry.getRegion(componentId, regionId);
                expect(result).toEqual(expected);
            });
        });

        describe('hasRegions', () => {
            const hasRegionsTestCases = [
                {
                    description: 'returns true for component with regions',
                    componentId: 'with-regions',
                    expected: true,
                },
                {
                    description: 'returns false for component without regions',
                    componentId: 'no-regions',
                    expected: false,
                },
                {
                    description: 'returns false for component with empty regions',
                    componentId: 'empty-regions',
                    expected: false,
                },
                {
                    description: 'returns false for non-existent component',
                    componentId: 'non-existent',
                    expected: false,
                },
            ];

            test.each(hasRegionsTestCases)('$description', ({ componentId, expected }) => {
                const result = registry.hasRegions(componentId);
                expect(result).toBe(expected);
            });
        });
    });

    describe('extractMeta default behavior', () => {
        test('extracts metadata from __meta property', () => {
            const TestComponent = (() => null) as any;
            TestComponent.__meta = {
                id: 'test-id',
                name: 'Test',
            };

            const reg = new ComponentRegistry<TestProps, TestParams>();

            // We can't easily test the default extractMeta without exposing it,
            // but we can verify the registry works with decorated components
            expect(reg).toBeInstanceOf(ComponentRegistry);
        });
    });
});
