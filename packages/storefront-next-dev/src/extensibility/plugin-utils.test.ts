import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import fs from 'fs-extra';
import { transformPluginComponent, injectPluginContextproviders, buildPluginRegistry } from './plugin-utils';

describe('plugin-utils', () => {
    describe('transformPluginComponent', () => {
        const code = `
            import React from "react";
            import { PluginComponent } from '@/plugins/plugin-components';
            export default function Test() {
                const testFunc =  async () => {
                return 'test';
                };
                return (
                <div>
                    <PluginComponent pluginId="test.plugin" />
                </div>
                );
            }
            `;
        const codeWithVariableDeclaration = `
            import React from "react";
            import { PluginComponent } from '@/plugins/plugin-components';
            export default function Test() {
                const test = '<PluginComponent pluginId="test.plugin" />';
                return (
                <div>{test}</div>
                );
            }
            `;
        const codeWithPluginComponentWithoutAttr = `
            import React from "react";
            import { PluginComponent } from '@/plugins/plugin-components';
            export default function Test() {
                return (
                <div><PluginComponent /></div>
                );
            }
            `;
        const codeWithoutPluginComponent = `
            import React from "react";
            export default function Test() {
                return (
                <div>test</div>
                );
            }
            `;
        const pluginRegistry = {
            'test.plugin': [
                {
                    pluginId: 'test.plugin',
                    path: 'extensions/foo1.tsx',
                    namespace: 'Bar',
                    componentName: 'Bar_Foo1',
                    order: 0,
                },
                {
                    pluginId: 'test.plugin',
                    path: 'extensions/foo2.tsx',
                    namespace: 'Bar',
                    componentName: 'Bar_Foo2',
                    order: 1,
                },
                {
                    pluginId: 'test.plugin',
                    path: 'extensions/foo3.tsx',
                    namespace: 'Bar',
                    componentName: 'Bar_Foo3',
                    order: 2,
                },
            ],
        };

        it('should replace PluginComponent with corresponding registry component', () => {
            const output = transformPluginComponent(code, pluginRegistry);
            expect(output).toContain('<Bar_Foo1 /><Bar_Foo2 /><Bar_Foo3 />');
            expect(output).not.toContain('PluginComponent');
            expect(output).toContain("import Bar_Foo1 from '@/extensions/foo1';");
            expect(output).toContain("import Bar_Foo2 from '@/extensions/foo2';");
            expect(output).toContain("import Bar_Foo3 from '@/extensions/foo3';");
        });

        it('should replace PluginComponent with corresponding registry component in variable declaration', () => {
            const output = transformPluginComponent(codeWithVariableDeclaration, pluginRegistry);
            expect(output).toContain('<Bar_Foo1 /><Bar_Foo2 /><Bar_Foo3 />');
            expect(output).not.toContain('PluginComponent');
        });

        it('should not transform code without PluginComponent', () => {
            const output = transformPluginComponent(codeWithoutPluginComponent, pluginRegistry);
            expect(output).toBeNull();
        });

        it('should not transform PluginComponent without pluginId attribute', () => {
            expect(() => transformPluginComponent(codeWithPluginComponentWithoutAttr, pluginRegistry)).toThrow(
                'PluginComponent must contain a pluginId attribute'
            );
        });

        it('should remove PluginComponent if pluginId not found in registry', () => {
            const codeMissingPlugin = `
        export default function Test() {
          return (
            <div>
              <PluginComponent pluginId="not.found" />
            </div>
          );
        }
      `;
            const output = transformPluginComponent(codeMissingPlugin, pluginRegistry);
            expect(output).not.toContain('PluginComponent');
            expect(output).toContain('<div>');
            expect(output).toContain('</div>');
        });

        it('should keep children of PluginComponent if present and not replaced', () => {
            const codeWithChildren = `
        export default async function Test() {
          return (
            <PluginComponent pluginId="not.found"><span>Hello</span></PluginComponent>
          );
        }
      `;
            const output = transformPluginComponent(codeWithChildren, pluginRegistry);
            expect(output).toContain('<span>Hello</span>');
            expect(output).not.toContain('PluginComponent');
        });
    });

    describe('injectPluginContextproviders', () => {
        const code = `
      import React from "react";
      import { ComposeProviders } from '@/providers/compose-providers';
      export default function Root({ children }) { 
        const test = () => {
          return 'test';
        }
        return <ComposeProviders>{children}</ComposeProviders>
      }
    `;
        const contextProviders = [
            {
                path: 'extensions/foo/providers/foo-provider.tsx',
                namespace: 'Foo',
                componentName: 'Foo_BarProvider',
                order: 0,
            },
            {
                path: 'extensions/bar/providers/bar-provider.tsx',
                namespace: 'Bar',
                componentName: 'Bar_BazProvider',
                order: 1,
            },
        ];

        it('should wrap ComposeProviders children in context providers', () => {
            const result = injectPluginContextproviders(code, contextProviders);
            expect(result).toContain('<Foo_BarProvider>');
            expect(result).toContain('<Bar_BazProvider>');
            // All providers and children are nested
            expect(result?.indexOf('<Foo_BarProvider>') ?? -1).toBeLessThan(result?.indexOf('<Bar_BazProvider>') ?? -1);
        });

        it('should not transform code without ComposeProviders', () => {
            const result = injectPluginContextproviders(code, []);
            expect(result).toBeNull();
        });
    });

    describe('buildPluginRegistry', () => {
        const extensionsRoot = join(__dirname, '__test-extensions__');
        const extensionDir = join(extensionsRoot, 'src', 'extensions', 'store-locator');
        const pluginConfigPath = join(extensionDir, 'plugin-config.json');
        beforeEach(() => {
            // Setup fake extension directory and config
            fs.ensureDirSync(extensionDir);
            const pluginConfig = {
                components: [
                    {
                        pluginId: 'footer.ourcompany.start',
                        path: 'extensions/store-locator/components/footer/index.tsx',
                        order: 0,
                    },
                    {
                        pluginId: 'footer.ourcompany.start',
                        path: 'extensions/theme-switcher/components/footer/index.tsx',
                        order: 1,
                    },
                    {
                        pluginId: 'header.before.cart',
                        path: 'extensions/store-locator/components/header/store-locator-badge.tsx',
                        order: 2,
                    },
                ],
                contextProviders: [
                    {
                        path: 'extensions/store-locator/providers/store-locator.tsx',
                        order: 1,
                    },
                ],
            };
            fs.writeJsonSync(pluginConfigPath, pluginConfig);
        });

        afterEach(() => {
            fs.removeSync(extensionsRoot);
        });

        it('should build componentRegistry and contextProviders from extensions', () => {
            const { componentRegistry, contextProviders } = buildPluginRegistry(join(extensionsRoot, 'src'));

            expect(componentRegistry['footer.ourcompany.start']).toHaveLength(2);
            expect(componentRegistry['footer.ourcompany.start'][0].pluginId).toBe('footer.ourcompany.start');
            expect(componentRegistry['footer.ourcompany.start'][1].pluginId).toBe('footer.ourcompany.start');
            expect(componentRegistry['header.before.cart'][0].order).toBe(2);

            expect(contextProviders).toHaveLength(1);
            expect(contextProviders[0].path).toBe('extensions/store-locator/providers/store-locator.tsx');

            // It generates proper componentName and namespace
            expect(componentRegistry['footer.ourcompany.start'][0].componentName).toMatch(/StoreLocator_Index/);
            expect(contextProviders[0].componentName).toMatch(/StoreLocator_StoreLocator/);
        });

        it('should sort components and contextProviders by order', () => {
            // Add a second contextProvider with lower order
            const pluginConfig = fs.readJsonSync(pluginConfigPath);
            pluginConfig.contextProviders.push({
                path: 'extensions/store-locator/providers/zzz-provider.tsx',
                order: 0,
            });
            pluginConfig.contextProviders.push({
                path: 'extensions/store-locator/providers/yyy-provider.tsx',
                order: 3,
            });
            fs.writeJsonSync(pluginConfigPath, pluginConfig);

            const { contextProviders } = buildPluginRegistry(join(extensionsRoot, 'src'));
            expect(contextProviders[0].order).toBe(0);
            expect(contextProviders[1].order).toBe(1);
            expect(contextProviders[2].order).toBe(3);
            expect(contextProviders[0].path).toContain('zzz-provider.tsx');
            expect(contextProviders[1].path).toContain('store-locator.tsx');
            expect(contextProviders[2].path).toContain('yyy-provider.tsx');
        });
    });
});
