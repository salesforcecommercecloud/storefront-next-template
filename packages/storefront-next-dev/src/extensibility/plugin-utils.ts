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
const PLUGIN_PROVIDERS_TAG = 'PluginProviders';
const PLUGIN_ID_ATTRIBUTE = 'pluginId';

/**
 * Find and replace the PluginProviders tags with the corresponding context providers
 * @param element - the AST element to replace
 * @param contextProviders - the context providers to replace
 */
function findAndReplaceProviders(
    element: NodePath<BabelJSXElement>,
    contextProviders: PluginContextProviderConfig[]
): void {
    if (isJSXIdentifier(element.node.openingElement.name, { name: PLUGIN_PROVIDERS_TAG })) {
        // if there are context providers, replace the PluginProviders tag with the corresponding context providers in reverse order
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
            // no replacement needed, just remove the PluginProviders tag,
            // but wrap the children in a JSXFragment
            element.replaceWith(jsxFragment(jsxOpeningFragment(), jsxClosingFragment(), element.node.children));
        }
    }
}

/**
 * Find and replace the plugin component with the replacement code
 * @param componentName - the name of the component to replace
 * @param element - the AST element as the replacement candidate
 * @param pluginRegistry - the plugin registry
 * @returns the pluginId that was replaced, or null if no replacement was found
 */
function findAndReplaceComponent(
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
 * @param contextProviders - the context providers to replace
 * @returns a set of pluginIds that were replaced
 */
function runReplacementPass(
    ast: File,
    tagName: string,
    pluginRegistry: PluginComponentRegistry | null = null,
    contextProviders: PluginContextProviderConfig[] | null = null
): Set<string> {
    const pluginIdsReplaced = new Set<string>();
    // Helper function to apply the replacement for a given path, targeting either the PluginComponent or PluginProviders tag
    const applyReplacement = (pathToReplace: NodePath<BabelJSXElement>) => {
        if (pluginRegistry) {
            const replacedId = findAndReplaceComponent(tagName, pathToReplace, pluginRegistry);
            if (replacedId) pluginIdsReplaced.add(replacedId);
        } else if (contextProviders) {
            findAndReplaceProviders(pathToReplace, contextProviders);
        }
    };
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

export function transformPlugins(
    code: string,
    pluginRegistry: PluginComponentRegistry,
    contextProviders: PluginContextProviderConfig[]
): string | null {
    if (!code.includes(PLUGIN_COMPONENT_TAG) && !code.includes(PLUGIN_PROVIDERS_TAG)) {
        return null;
    }
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });

    // replace PluginComponent tags with the corresponding components
    if (code.includes(PLUGIN_COMPONENT_TAG)) {
        const pluginIdsReplaced = runReplacementPass(ast, PLUGIN_COMPONENT_TAG, pluginRegistry, null);
        const replacementImportStatements = buildReplacementImportStatements(pluginIdsReplaced, pluginRegistry);
        // Single import rewrite pass
        traverse(ast, {
            ImportDeclaration(nodePath: NodePath<BabelImportDeclaration>) {
                const source = nodePath.node.source.value;
                if (source.includes('@/plugins/plugin-component')) {
                    nodePath.replaceWith(jsxText(replacementImportStatements));
                }
            },
        });
    }

    // replace PluginProviders tags with the corresponding components
    if (code.includes(PLUGIN_PROVIDERS_TAG)) {
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
                if (source.includes('@/plugins/plugin-providers')) {
                    nodePath.replaceWith(jsxText(replacementImportStatements));
                }
            },
        });
        runReplacementPass(ast, PLUGIN_PROVIDERS_TAG, null, contextProviders);
    }
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
