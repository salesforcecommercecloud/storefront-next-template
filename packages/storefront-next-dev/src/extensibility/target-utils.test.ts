/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import fs from 'fs-extra';
import { buildTargetRegistry, transformTargets } from './target-utils';

describe('target-utils', () => {
    describe('transformTargetComponent', () => {
        // UITarget as part of the JSX return
        const code = `
            import React from "react";
            import { UITarget } from '@/targets/ui-target';
            export default function Test() {
                const testFunc =  async () => {
                return 'test';
                };
                return (
                <div>
                    <UITarget targetId="test.target" />
                </div>
                );
            }
            `;
        // UITarget as part of the variable declaration
        const codeWithJSXElementDeclaration = `
            import React from "react";
            import { UITarget } from '@/targets/ui-target';
            export default function Test() {
                const test = <div><UITarget targetId="test.target" /></div>;
                return (
                <div>{test}</div>
                );
            }
            `;
        // UITarget as a variable declaration
        const codeWithTargetComponentAsVariable = `
            import React from "react";
            import { UITarget } from '@/targets/ui-target';
            export default function Test() {
                const test = <UITarget targetId="test.target" />;
                return (
                <div>{test}</div>
                );
            }
            `;
        // UITarget as part of the JSXFragment
        const codeWithJSXElementReturn = `
            import React from "react";
            import { UITarget } from '@/targets/ui-target';
            export default function Test() {
                const content = <div>content</div>;
                return <>{content}<UITarget targetId="test.target" /></>;
            }
            `;
        // UITarget has no attribute (error condition)
        const codeWithTargetComponentWithoutAttr = `
            import React from "react";
            import { UITarget } from '@/targets/ui-target';
            export default function Test() {
                return (
                <div><UITarget /></div>
                );
            }
            `;
        // No UITarget present
        const codeWithoutTargetComponent = `
            import React from "react";
            export default function Test() {
                return (
                <div>test</div>
                );
            }
            `;
        // test data for multiple target components targeting a targetId
        const targetRegistry = {
            'test.target': [
                {
                    targetId: 'test.target',
                    path: 'extensions/foo1.tsx',
                    namespace: 'Bar',
                    componentName: 'Bar_Foo1',
                    order: 0,
                },
                {
                    targetId: 'test.target',
                    path: 'extensions/foo2.tsx',
                    namespace: 'Bar',
                    componentName: 'Bar_Foo2',
                    order: 1,
                },
                {
                    targetId: 'test.target',
                    path: 'extensions/foo3.tsx',
                    namespace: 'Bar',
                    componentName: 'Bar_Foo3',
                    order: 2,
                },
            ],
        };
        // test data for a single target component targeting a targetId
        const singleTargetRegistry = {
            'test.target': [
                {
                    targetId: 'test.target',
                    path: 'extensions/store-locator/components/single-comp.tsx',
                    namespace: 'Bar',
                    componentName: 'Bar_FooSingle',
                    order: 0,
                },
            ],
        };

        it('should replace a single <UITarget /> with the correct registered component', () => {
            const transformed = transformTargets(code, singleTargetRegistry, []);
            // Should import the registered component and replace the UITarget tag
            expect(transformed).toContain(
                `import Bar_FooSingle from '@/extensions/store-locator/components/single-comp';`
            );
            expect(transformed).not.toContain('UITarget');
            expect(transformed).toContain('<Bar_FooSingle />');
        });

        it('should replace UITarget with corresponding registry component in variable declaration', () => {
            const output = transformTargets(codeWithTargetComponentAsVariable, targetRegistry, []);
            expect(output).toContain('<Bar_Foo1 /><Bar_Foo2 /><Bar_Foo3 />');
            expect(output).not.toContain('UITarget');
            expect(output).toContain(`import Bar_Foo1 from '@/extensions/foo1';`);
            expect(output).toContain(`import Bar_Foo2 from '@/extensions/foo2';`);
            expect(output).toContain(`import Bar_Foo3 from '@/extensions/foo3';`);
        });

        it('should replace UITarget with corresponding registry component', () => {
            const output = transformTargets(code, targetRegistry, []);
            expect(output).toContain('<Bar_Foo1 /><Bar_Foo2 /><Bar_Foo3 />');
            expect(output).not.toContain('UITarget');
            expect(output).toContain("import Bar_Foo1 from '@/extensions/foo1';");
            expect(output).toContain("import Bar_Foo2 from '@/extensions/foo2';");
            expect(output).toContain("import Bar_Foo3 from '@/extensions/foo3';");
        });

        it('should replace UITarget with corresponding registry component in JSX element declaration', () => {
            const output = transformTargets(codeWithJSXElementDeclaration, targetRegistry, []);
            expect(output).toContain('<Bar_Foo1 /><Bar_Foo2 /><Bar_Foo3 />');
            expect(output).not.toContain('UITarget');
        });

        it('should replace UITarget with corresponding registry component in JSX element return', () => {
            const output = transformTargets(codeWithJSXElementReturn, targetRegistry, []);
            expect(output).toContain('<Bar_Foo1 /><Bar_Foo2 /><Bar_Foo3 />');
            expect(output).not.toContain('UITarget');
        });

        it('should not transform code without UITarget', () => {
            const output = transformTargets(codeWithoutTargetComponent, targetRegistry, []);
            expect(output).toBeNull();
        });

        it('should not transform UITarget without targetId attribute', () => {
            expect(() => transformTargets(codeWithTargetComponentWithoutAttr, targetRegistry, [])).toThrow(
                'UITarget must contain a targetId attribute'
            );
        });

        it('should remove UITarget if targetId not found in registry', () => {
            const codeMissingTarget = `
        export default function Test() {
          return (
            <div>
              <UITarget targetId="not.found" />
            </div>
          );
        }
      `;
            const output = transformTargets(codeMissingTarget, targetRegistry, []);
            expect(output).not.toContain('UITarget');
            expect(output).toContain('<div>');
            expect(output).toContain('</div>');
        });

        it('should keep children of UITarget if present and not replaced', () => {
            const codeWithChildren = `
        export default async function Test() {
          return (
            <UITarget targetId="not.found"><span>Hello</span></UITarget>
          );
        }
      `;
            const output = transformTargets(codeWithChildren, targetRegistry, []);
            expect(output).toContain('<span>Hello</span>');
            expect(output).not.toContain('UITarget');
        });
    });

    describe('injectTargetContextProviders', () => {
        const code = `
      import React from "react";
      import { TargetProviders } from '@/targets/target-providers';
      export default function Root({ children }) { 
        const test = () => {
          return 'test';
        }
        return <TargetProviders>{children}</TargetProviders>
      }
    `;

        const codeWithVariableDeclaration = `
            import React from "react";
            import { TargetProviders } from '@/targets/target-providers';
            export default function Root({ children }) { 
                const test = <TargetProviders>{children}</TargetProviders>;
                return {test}
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
            const result = transformTargets(code, {}, contextProviders);
            expect(result).toContain('<Foo_BarProvider>');
            expect(result).toContain('<Bar_BazProvider>');
            // All providers and children are nested
            expect(result?.indexOf('<Foo_BarProvider>') ?? -1).toBeLessThan(result?.indexOf('<Bar_BazProvider>') ?? -1);
            expect(result).not.toContain('TargetProviders');
        });

        it('should wrap TargetProviders children in context providers in variable declaration', () => {
            const result = transformTargets(codeWithVariableDeclaration, {}, contextProviders);
            expect(result).toContain('<Foo_BarProvider>');
            expect(result).toContain('<Bar_BazProvider>');
            // All providers and children are nested
            expect(result?.indexOf('<Foo_BarProvider>') ?? -1).toBeLessThan(result?.indexOf('<Bar_BazProvider>') ?? -1);
            expect(result).not.toContain('TargetProviders');
        });

        it('should remove TargetProviders without ComposeProviders', () => {
            const result = transformTargets(code, {}, []);
            expect(result).not.toContain('TargetProviders');
            expect(result).toContain('<>{children}</>');
        });
    });

    describe('buildTargetRegistry', () => {
        const extensionsRoot = join(__dirname, '__test-extensions__');
        const extensionDir = join(extensionsRoot, 'src', 'extensions', 'store-locator');
        const extensionConfigPath = join(extensionDir, 'target-config.json');
        beforeEach(() => {
            // Setup fake extension directory and config
            fs.ensureDirSync(extensionDir);
            const extensionConfig = {
                components: [
                    {
                        targetId: 'footer.ourcompany.start',
                        path: 'extensions/store-locator/components/footer/index.tsx',
                        order: 0,
                    },
                    {
                        targetId: 'footer.ourcompany.start',
                        path: 'extensions/theme-switcher/components/footer/index.tsx',
                        order: 1,
                    },
                    {
                        targetId: 'header.before.cart',
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
            fs.writeJsonSync(extensionConfigPath, extensionConfig);
        });

        afterEach(() => {
            fs.removeSync(extensionsRoot);
        });

        it('should build componentRegistry and contextProviders from extensions', () => {
            const { componentRegistry, contextProviders } = buildTargetRegistry(join(extensionsRoot, 'src'));

            expect(componentRegistry['footer.ourcompany.start']).toHaveLength(2);
            expect(componentRegistry['footer.ourcompany.start'][0].targetId).toBe('footer.ourcompany.start');
            expect(componentRegistry['footer.ourcompany.start'][1].targetId).toBe('footer.ourcompany.start');
            expect(componentRegistry['header.before.cart'][0].order).toBe(2);

            expect(contextProviders).toHaveLength(1);
            expect(contextProviders[0].path).toBe('extensions/store-locator/providers/store-locator.tsx');

            // It generates proper componentName and namespace
            expect(componentRegistry['footer.ourcompany.start'][0].componentName).toMatch(/StoreLocator_Index/);
            expect(contextProviders[0].componentName).toMatch(/StoreLocator_StoreLocator/);
        });

        it('should sort components and contextProviders by order', () => {
            // Add a second contextProvider with lower order
            const extensionConfig = fs.readJsonSync(extensionConfigPath);
            extensionConfig.contextProviders.push({
                path: 'extensions/store-locator/providers/zzz-provider.tsx',
                order: 0,
            });
            extensionConfig.contextProviders.push({
                path: 'extensions/store-locator/providers/yyy-provider.tsx',
                order: 3,
            });
            fs.writeJsonSync(extensionConfigPath, extensionConfig);

            const { contextProviders } = buildTargetRegistry(join(extensionsRoot, 'src'));
            expect(contextProviders[0].order).toBe(0);
            expect(contextProviders[1].order).toBe(1);
            expect(contextProviders[2].order).toBe(3);
            expect(contextProviders[0].path).toContain('zzz-provider.tsx');
            expect(contextProviders[1].path).toContain('store-locator.tsx');
            expect(contextProviders[2].path).toContain('yyy-provider.tsx');
        });
    });
});
