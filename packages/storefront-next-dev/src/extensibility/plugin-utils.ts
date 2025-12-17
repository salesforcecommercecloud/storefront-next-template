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

export interface PluginComponentConfig {
    pluginId: string;
    path: string;
    namespace: string;
    componentName: string;
    order: number;
}

export interface PluginContextProviderConfig {
    path: string;
    namespace: string;
    componentName: string;
    order: number;
}

export type PluginComponentRegistry = Record<string, PluginComponentConfig[]>;

const traverse = (traverseModule as unknown as { default: typeof traverseModule }).default || traverseModule;

const PLUGIN_COMPONENT_TAG = 'PluginComponent';
const PLUGIN_ID_ATTRIBUTE = 'pluginId';
const COMPOSE_PROVIDERS_TAG = 'ComposeProviders';

/**
 * Find and replace the plugin component with the replacement code
 * @param componentName - the name of the component to replace
 * @param element - the AST element as the replacement candidate
 * @param pluginRegistry - the plugin registry
 * @returns the pluginId that was replaced, or null if no replacement was found
 */
function findAndReplace(
    componentName: string,
    element: NodePath<BabelJSXElement>,
    pluginRegistry: PluginComponentRegistry
): string | null {
    let pluginIdReplaced = null;
    if (isJSXIdentifier(element.node.openingElement.name, { name: componentName })) {
        let replaced = false;
        // Find the "pluginId" property value from the JSX node, then replace the element with the replacement code
        // if no matching replacement is found, remove the element
        if (Array.isArray(element.node.openingElement.attributes)) {
            const attr = element.node.openingElement.attributes.find(
                (a) => isJSXAttribute(a) && isJSXIdentifier(a.name, { name: PLUGIN_ID_ATTRIBUTE })
            );
            const pluginId =
                attr && isJSXAttribute(attr) && attr.value && 'value' in attr.value ? attr.value.value : undefined;
            if (pluginId == null) {
                throw new Error(`PluginComponent must contain a pluginId attribute`);
            }
            if (pluginRegistry[pluginId] && pluginRegistry[pluginId].length > 0) {
                // Create JSX elements for each component
                const components = pluginRegistry[pluginId].map((pluginComponent: PluginComponentConfig) => {
                    return jsxElement(
                        jsxOpeningElement(jsxIdentifier(pluginComponent.componentName), [], true),
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
                pluginIdReplaced = pluginId;
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
    return pluginIdReplaced;
}

/**
 * Run a replacement pass on the AST
 * @param ast - the AST to traverse
 * @param tagName - the name of the tag to replace
 * @param pluginRegistry - the plugin registry
 * @returns a set of pluginIds that were replaced
 */
function runReplacementPass(ast: File, tagName: string, pluginRegistry: PluginComponentRegistry): Set<string> {
    const pluginIdsReplaced = new Set<string>();
    traverse(ast, {
        // look for variable declarations that contains <PluginComponent .../> in JSX fragment
        VariableDeclaration(nodePath: NodePath<BabelVariableDeclaration>) {
            const declarationPaths = nodePath.get('declarations');
            const declarationsArray = Array.isArray(declarationPaths) ? declarationPaths : [declarationPaths];

            for (const declarationPath of declarationsArray) {
                const initPath = declarationPath.get('init');
                if (initPath && isJSXElement(initPath.node)) {
                    const content = generate(initPath.node).code;
                    if (new RegExp(`<(${tagName})(\\s|\\/|>)`).test(content)) {
                        // Check if the init itself is the PluginComponent
                        const pluginIdReplaced = findAndReplace(
                            tagName,
                            initPath as NodePath<BabelJSXElement>,
                            pluginRegistry
                        );
                        if (pluginIdReplaced) {
                            pluginIdsReplaced.add(pluginIdReplaced);
                        }
                        // Also traverse to find any nested PluginComponents
                        initPath.traverse({
                            JSXElement(inner: NodePath<BabelJSXElement>) {
                                const nestedPluginIdReplaced = findAndReplace(tagName, inner, pluginRegistry);
                                if (nestedPluginIdReplaced) {
                                    pluginIdsReplaced.add(nestedPluginIdReplaced);
                                }
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
                    const pluginIdReplaced = findAndReplace(tagName, inner, pluginRegistry);
                    if (pluginIdReplaced) {
                        pluginIdsReplaced.add(pluginIdReplaced);
                    }
                },
            });
        },
    });
    return pluginIdsReplaced;
}

/**
 * Build the import statements for the plugin components
 * @param pluginIds - the pluginIds that were replaced
 * @param pluginRegistry - the plugin registry
 * @returns the import statements
 */
function buildReplacementImportStatements(pluginIds: Set<string>, pluginRegistry: PluginComponentRegistry): string {
    const importStatements = new Set<string>();
    for (const pluginId of pluginIds) {
        const pluginComponents = pluginRegistry[pluginId];
        for (const pluginComponent of pluginComponents) {
            importStatements.add(
                `import ${pluginComponent.componentName} from '@/${pluginComponent.path.replace('.tsx', '')}';`
            );
        }
    }
    return Array.from(importStatements).join('\n');
}

/**
 * Transform the plugin component within the replacement code from the plugin registry
 * @param code - the code to transform
 * @param pluginRegistry - the plugin registry
 * @returns the transformed code, or null if no transformation was needed
 */
export function transformPluginComponent(code: string, pluginRegistry: PluginComponentRegistry): string | null {
    if (!code.includes(PLUGIN_COMPONENT_TAG)) {
        return null;
    }
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });

    const pluginIdsReplaced = runReplacementPass(ast, PLUGIN_COMPONENT_TAG, pluginRegistry);
    const replacementImportStatements = buildReplacementImportStatements(pluginIdsReplaced, pluginRegistry);
    // Single import rewrite pass
    traverse(ast, {
        ImportDeclaration(nodePath: NodePath<BabelImportDeclaration>) {
            const source = nodePath.node.source.value;
            if (source.includes('@/plugins/plugin-components')) {
                nodePath.replaceWith(jsxText(replacementImportStatements));
            }
        },
    });

    console.log('\n============= tranformed code start =============\n');
    console.log(generate(ast).code);
    console.log('\n============= tranformed code end =============\n');
    return generate(ast).code;
}

/**
 * Inject the plugin context providers into the root component (root.tsx)
 * @param code - the code to inject the context providers into, typically root.tsx
 * @param contextProviders - the context providers to inject
 * @returns the code with the context providers injected, or null if no injection was needed
 */
export function injectPluginContextproviders(
    code: string,
    contextProviders: PluginContextProviderConfig[]
): string | null {
    if (contextProviders == null || contextProviders.length === 0 || !code.includes(COMPOSE_PROVIDERS_TAG)) {
        return null;
    }
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });

    // add import statements for the context providers
    const importStatements = new Set<string>();
    for (const contextProvider of contextProviders) {
        importStatements.add(
            `import ${contextProvider.componentName} from '@/${contextProvider.path.replace('.tsx', '')}';`
        );
    }
    const replacementImportStatements = Array.from(importStatements).join('\n');
    ast.program.body.unshift(
        ...parse(replacementImportStatements, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy'],
        }).program.body
    );

    // insert the context providers between the ComposeProviders tag and its children
    traverse(ast, {
        ReturnStatement(nodePath: NodePath<BabelReturnStatement>) {
            const arg = nodePath.node.argument;
            if (!isJSXElement(arg)) {
                return;
            }
            nodePath.traverse({
                JSXElement(inner: NodePath<BabelJSXElement>) {
                    if (isJSXIdentifier(inner.node.openingElement.name, { name: COMPOSE_PROVIDERS_TAG })) {
                        const originalChildren = inner.node.children;
                        let nested = originalChildren;
                        for (let i = contextProviders.length - 1; i >= 0; i--) {
                            const contextProvider = contextProviders[i];
                            const componentName = contextProvider.componentName;
                            const element = jsxElement(
                                jsxOpeningElement(jsxIdentifier(componentName), [], false),
                                jsxClosingElement(jsxIdentifier(componentName)),
                                nested,
                                false
                            );
                            nested = [element];
                        }
                        inner.node.children = nested;
                    }
                },
            });
        },
    });
    return generate(ast).code;
}

/**
 * Build the plugin registry from the extension directories
 * @param rootDir - the root directory of the project
 * @param sourceDir - the source directory of the project
 * @returns the plugin registry
 */
export function buildPluginRegistry(rootDir: string): {
    componentRegistry: PluginComponentRegistry;
    contextProviders: PluginContextProviderConfig[];
} {
    const componentRegistry: PluginComponentRegistry = {};
    const contextProviders: PluginContextProviderConfig[] = [];
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
    for (const dir of extensionDirs) {
        if (dir.isDirectory()) {
            const configPath = path.join(extensionDirPath, dir.name, 'plugin-config.json');
            if (fs.existsSync(configPath)) {
                const pluginConfig = fs.readJsonSync(configPath);
                if (pluginConfig && pluginConfig.components) {
                    for (const pluginComponent of pluginConfig.components) {
                        const { pluginId, path: componentPath, order = 0 } = pluginComponent;
                        if (pluginId && componentPath) {
                            if (!componentRegistry[pluginId]) {
                                componentRegistry[pluginId] = [];
                            }
                            const { namespace, componentName } = getNamespaceAndComponentName(dir, componentPath);
                            componentRegistry[pluginId].push({
                                pluginId,
                                path: componentPath,
                                order,
                                namespace,
                                componentName,
                            });
                        }
                    }
                }
                if (pluginConfig && pluginConfig.contextProviders) {
                    for (const contextProvider of pluginConfig.contextProviders) {
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
    for (const pluginId in componentRegistry) {
        componentRegistry[pluginId].sort((a, b) => a.order - b.order);
    }
    contextProviders.sort((a, b) => a.order - b.order);
    return { componentRegistry, contextProviders };
}
