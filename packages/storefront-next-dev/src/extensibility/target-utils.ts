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
import { parse } from '@babel/parser';
import {
    isJSXIdentifier,
    isJSXAttribute,
    jsxText,
    isJSXElement,
    isJSXFragment,
    jsxElement,
    jsxOpeningElement,
    jsxIdentifier,
    jsxClosingElement,
    jsxFragment,
    jsxOpeningFragment,
    jsxClosingFragment,
    type JSXElement as BabelJSXElement,
    type File,
    type VariableDeclaration as BabelVariableDeclaration,
    type ReturnStatement as BabelReturnStatement,
    type ImportDeclaration as BabelImportDeclaration,
} from '@babel/types';
import fs from 'fs-extra';
import { generate } from '@babel/generator';
import path from 'path';

import traverseModule, { type NodePath } from '@babel/traverse';

export interface TargetComponentConfig {
    targetId: string;
    path: string;
    namespace: string;
    componentName: string;
    order: number;
}

export interface TargetContextProviderConfig {
    path: string;
    namespace: string;
    componentName: string;
    order: number;
}

export type TargetComponentRegistry = Record<string, TargetComponentConfig[]>;

const traverse = (traverseModule as unknown as { default: typeof traverseModule }).default || traverseModule;

const TARGET_COMPONENT_TAG = 'UITarget';
const TARGET_PROVIDERS_TAG = 'TargetProviders';
const TARGET_ID_ATTRIBUTE = 'targetId';

/**
 * Find and replace the TargetProviders tags with the corresponding context providers
 * @param element - the AST element to replace
 * @param contextProviders - the context providers to replace
 */
function findAndReplaceProviders(
    element: NodePath<BabelJSXElement>,
    contextProviders: TargetContextProviderConfig[]
): void {
    if (isJSXIdentifier(element.node.openingElement.name, { name: TARGET_PROVIDERS_TAG })) {
        // if there are context providers, replace the TargetProviders tag with the corresponding context providers in reverse order
        if (contextProviders.length > 0) {
            let nested = element.node.children;
            for (let i = contextProviders.length - 1; i >= 0; i--) {
                const contextProvider = contextProviders[i];
                const componentName = contextProvider.componentName;
                const providerElement = jsxElement(
                    jsxOpeningElement(jsxIdentifier(componentName), [], false),
                    jsxClosingElement(jsxIdentifier(componentName)),
                    nested,
                    false
                );
                nested = [providerElement];
            }
            element.replaceWithMultiple(nested);
        } else {
            // no replacement needed, just remove the TargetProviders tag,
            // but wrap the children in a JSXFragment
            element.replaceWith(jsxFragment(jsxOpeningFragment(), jsxClosingFragment(), element.node.children));
        }
    }
}

/**
 * Find and replace the target component with the replacement code
 * @param componentName - the name of the component to replace
 * @param element - the AST element as the replacement candidate
 * @param targetRegistry - the target registry
 * @returns the targetId that was replaced, or null if no replacement was found
 */
function findAndReplaceComponent(
    componentName: string,
    element: NodePath<BabelJSXElement>,
    targetRegistry: TargetComponentRegistry
): string | null {
    let targetIdReplaced = null;
    if (isJSXIdentifier(element.node.openingElement.name, { name: componentName })) {
        let replaced = false;
        // Find the "targetId" property value from the JSX node, then replace the element with the replacement code
        // if no matching replacement is found, remove the element
        if (Array.isArray(element.node.openingElement.attributes)) {
            const attr = element.node.openingElement.attributes.find(
                (a) => isJSXAttribute(a) && isJSXIdentifier(a.name, { name: TARGET_ID_ATTRIBUTE })
            );
            const targetId =
                attr && isJSXAttribute(attr) && attr.value && 'value' in attr.value ? attr.value.value : undefined;
            if (targetId == null) {
                throw new Error(`UITarget must contain a targetId attribute`);
            }
            if (targetRegistry[targetId] && targetRegistry[targetId].length > 0) {
                // Create JSX elements for each component
                const components = targetRegistry[targetId].map((targetComponent: TargetComponentConfig) => {
                    return jsxElement(
                        jsxOpeningElement(jsxIdentifier(targetComponent.componentName), [], true),
                        null,
                        [],
                        true
                    );
                });

                // If multiple components, wrap in a fragment; otherwise use single component
                if (components.length > 1) {
                    element.replaceWith(jsxFragment(jsxOpeningFragment(), jsxClosingFragment(), components));
                } else {
                    element.replaceWith(components[0]);
                }
                targetIdReplaced = targetId;
                replaced = true;
            }
        }
        if (!replaced) {
            if (element.node.children && element.node.children.length > 0) {
                // replace the element with its children
                element.replaceWithMultiple(element.node.children);
            } else {
                // No children, just remove the element
                element.remove();
            }
        }
    }
    return targetIdReplaced;
}

/**
 * Run a replacement pass on the AST
 * @param ast - the AST to traverse
 * @param tagName - the name of the tag to replace
 * @param targetRegistry - the target registry
 * @param contextProviders - the context providers to replace
 * @returns a set of targetIds that were replaced
 */
function runReplacementPass(
    ast: File,
    tagName: string,
    targetRegistry: TargetComponentRegistry | null = null,
    contextProviders: TargetContextProviderConfig[] | null = null
): Set<string> {
    const targetIdsReplaced = new Set<string>();
    // Helper function to apply the replacement for a given path, targeting either the UITarget or TargetProviders tag
    const applyReplacement = (pathToReplace: NodePath<BabelJSXElement>) => {
        if (targetRegistry) {
            const replacedId = findAndReplaceComponent(tagName, pathToReplace, targetRegistry);
            if (replacedId) targetIdsReplaced.add(replacedId);
        } else if (contextProviders) {
            findAndReplaceProviders(pathToReplace, contextProviders);
        }
    };
    traverse(ast, {
        // look for variable declarations that contains <UITarget .../> in JSX fragment
        VariableDeclaration(nodePath: NodePath<BabelVariableDeclaration>) {
            const declarationPaths = nodePath.get('declarations');
            const declarationsArray = Array.isArray(declarationPaths) ? declarationPaths : [declarationPaths];

            for (const declarationPath of declarationsArray) {
                const initPath = declarationPath.get('init');
                if (initPath && isJSXElement(initPath.node)) {
                    const content = generate(initPath.node).code;
                    if (new RegExp(`<(${tagName})(\\s|\\/|>)`).test(content)) {
                        // Handle the init node itself
                        applyReplacement(initPath as NodePath<BabelJSXElement>);

                        // Traverse nested JSX elements with the same handler
                        initPath.traverse({
                            JSXElement(inner: NodePath<BabelJSXElement>) {
                                applyReplacement(inner);
                            },
                        });
                    }
                }
            }
        },
        // look for return statements that contains the tag
        ReturnStatement(nodePath: NodePath<BabelReturnStatement>) {
            const arg = nodePath.node.argument;
            if (!isJSXElement(arg) && !isJSXFragment(arg)) {
                return;
            }
            nodePath.traverse({
                JSXElement(inner: NodePath<BabelJSXElement>) {
                    applyReplacement(inner);
                },
            });
        },
    });
    return targetIdsReplaced;
}

/**
 * Build the import statements for the target components
 * @param targetIds - the targetIds that were replaced
 * @param targetRegistry - the target registry
 * @returns the import statements
 */
function buildReplacementImportStatements(targetIds: Set<string>, targetRegistry: TargetComponentRegistry): string {
    const importStatements = new Set<string>();
    for (const targetId of targetIds) {
        const targetComponents = targetRegistry[targetId];
        for (const targetComponent of targetComponents) {
            importStatements.add(
                `import ${targetComponent.componentName} from '@/${targetComponent.path.replace('.tsx', '')}';`
            );
        }
    }
    return Array.from(importStatements).join('\n');
}

export function transformTargets(
    code: string,
    targetRegistry: TargetComponentRegistry,
    contextProviders: TargetContextProviderConfig[]
): string | null {
    if (!code.includes(TARGET_COMPONENT_TAG) && !code.includes(TARGET_PROVIDERS_TAG)) {
        return null;
    }
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });

    // replace UITarget tags with the corresponding components
    if (code.includes(TARGET_COMPONENT_TAG)) {
        const targetIdsReplaced = runReplacementPass(ast, TARGET_COMPONENT_TAG, targetRegistry, null);
        const replacementImportStatements = buildReplacementImportStatements(targetIdsReplaced, targetRegistry);
        // Single import rewrite pass
        traverse(ast, {
            ImportDeclaration(nodePath: NodePath<BabelImportDeclaration>) {
                const source = nodePath.node.source.value;
                if (source.includes('@/targets/ui-target')) {
                    nodePath.replaceWith(jsxText(replacementImportStatements));
                }
            },
        });
    }

    // replace TargetProviders tags with the corresponding components
    if (code.includes(TARGET_PROVIDERS_TAG)) {
        // add import statements for the context providers
        const importStatements = new Set<string>();
        for (const contextProvider of contextProviders) {
            importStatements.add(
                `import ${contextProvider.componentName} from '@/${contextProvider.path.replace('.tsx', '')}';`
            );
        }
        const replacementImportStatements = Array.from(importStatements).join('\n');
        // Single import rewrite pass
        traverse(ast, {
            ImportDeclaration(nodePath: NodePath<BabelImportDeclaration>) {
                const source = nodePath.node.source.value;
                if (source.includes('@/targets/target-providers')) {
                    nodePath.replaceWith(jsxText(replacementImportStatements));
                }
            },
        });
        runReplacementPass(ast, TARGET_PROVIDERS_TAG, null, contextProviders);
    }
    return generate(ast).code;
}

/**
 * Build the target registry from the extension directories
 * @param rootDir - the root directory of the project
 * @param sourceDir - the source directory of the project
 * @returns the target registry
 */
export function buildTargetRegistry(rootDir: string): {
    componentRegistry: TargetComponentRegistry;
    contextProviders: TargetContextProviderConfig[];
} {
    const componentRegistry: TargetComponentRegistry = {};
    const contextProviders: TargetContextProviderConfig[] = [];
    const extensionDirPath = path.join(rootDir, 'extensions');
    const extensionDirs = fs.readdirSync(extensionDirPath, { withFileTypes: true });

    const getNamespaceAndComponentName = (dir: fs.Dirent, filePath: string) => {
        const namespace = dir.name
            .split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        const fileName = filePath.split('/').pop()?.replace('.tsx', '');
        const baseComponentName = fileName
            ?.split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        const componentName = `${namespace}_${baseComponentName}`;
        return { namespace, componentName };
    };
    const TARGET_CONFIG_FILENAME = 'target-config.json';

    for (const dir of extensionDirs) {
        if (dir.isDirectory()) {
            const configPath = path.join(extensionDirPath, dir.name, TARGET_CONFIG_FILENAME);
            if (fs.existsSync(configPath)) {
                const extensionConfig = fs.readJsonSync(configPath);
                if (extensionConfig && extensionConfig.components) {
                    for (const component of extensionConfig.components) {
                        const { targetId, path: componentPath, order = 0 } = component;
                        if (targetId && componentPath) {
                            if (!componentRegistry[targetId]) {
                                componentRegistry[targetId] = [];
                            }
                            const { namespace, componentName } = getNamespaceAndComponentName(dir, componentPath);
                            componentRegistry[targetId].push({
                                targetId,
                                path: componentPath,
                                order,
                                namespace,
                                componentName,
                            });
                        }
                    }
                }
                if (extensionConfig && extensionConfig.contextProviders) {
                    for (const contextProvider of extensionConfig.contextProviders) {
                        const { path: providerPath, order = 0 } = contextProvider;
                        if (providerPath) {
                            const { namespace, componentName } = getNamespaceAndComponentName(dir, providerPath);
                            contextProviders.push({ path: providerPath, namespace, componentName, order });
                        }
                    }
                }
            }
        }
    }
    // Sort each extension's components by order
    for (const targetId in componentRegistry) {
        componentRegistry[targetId].sort((a, b) => a.order - b.order);
    }
    contextProviders.sort((a, b) => a.order - b.order);
    return { componentRegistry, contextProviders };
}
