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
import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { generate } from '@babel/generator';
import {
    type JSXAttribute,
    isJSXIdentifier,
    isJSXAttribute,
    isStringLiteral,
    jsxIdentifier,
    jsxAttribute,
    jsxExpressionContainer,
    booleanLiteral,
    importDeclaration,
    importSpecifier,
    identifier,
    stringLiteral,
} from '@babel/types';

// Handle CJS/ESM interop for @babel/traverse (same pattern as target-utils.ts)
const traverse = (traverseModule as unknown as { default: typeof traverseModule }).default || traverseModule;
import { logger } from '../logger';

// Pre-compiled regex — avoids false substring matches on 'UITargetProviders'.
// Mirrors TARGET_COMPONENT_JSX_RE in target-utils.ts.
const UI_TARGET_JSX_RE = /<UITarget[\s/>]/;

export interface UITargetDevModeConfig {
    /**
     * Enable dev mode visual markers. Defaults to false.
     * Set via VITE_UI_TARGET_DEV_MODE=true environment variable.
     */
    enabled?: boolean;

    /**
     * Build-time filter: only show targets matching a category prefix.
     * Set via VITE_TARGET_FILTER_CATEGORY=pdp environment variable.
     * @example filterCategory: 'pdp' — only shows targets whose id starts with "pdp."
     */
    filterCategory?: string;

    /**
     * Map of targetId → hint label for overlay grouping/filtering.
     * Built from target-config.json at config time and injected into each dev marker
     * as a __hint__ prop, which is emitted as a data-ui-target-hint DOM attribute.
     * Example: { 'emailSignUp.consent.marketing': 't/my-branch/W-123', 'checkout.contactInfo': 'pr:1384' }
     */
    hintMap?: Record<string, string>;
}

/**
 * Vite plugin that adds visual markers to UITarget components in development.
 *
 * PRODUCTION: This plugin is completely inactive - zero overhead.
 * DEVELOPMENT: Transforms UITarget JSX to add visual debugging markers.
 *
 * @example
 * // Source code:
 * <UITarget targetId="pdp.loyalty.badge">
 *   <Widget />
 * </UITarget>
 *
 * // Transformed in DEV mode:
 * <UITargetDevMarker
 *   targetId="pdp.loyalty.badge"
 *   __file__="/src/components/product.tsx"
 *   __hasChildren__={true}
 * >
 *   <Widget />
 * </UITargetDevMarker>
 */
export function uiTargetDevModePlugin(config: UITargetDevModeConfig = {}): Plugin {
    // Production: return no-op plugin
    if (process.env.NODE_ENV === 'production') {
        return {
            name: 'storefront-next:ui-target-dev-mode-noop',
        };
    }

    // Development: check if enabled
    const enabled = config.enabled ?? process.env.VITE_UI_TARGET_DEV_MODE === 'true';

    if (!enabled) {
        return {
            name: 'storefront-next:ui-target-dev-mode-disabled',
        };
    }

    logger.info('🎯 UITarget Dev Mode enabled');

    if (config.filterCategory) {
        logger.info(`   Filtering to category: ${config.filterCategory} (build-time)`);
    }

    return {
        name: 'storefront-next:ui-target-dev-mode',

        enforce: 'pre', // Run BEFORE the production transform so UITarget is still in the source

        transform(code: string, id: string) {
            // Only process .tsx/.jsx files
            if (!id.match(/\.(tsx|jsx)$/)) {
                return null;
            }

            // Skip node_modules
            if (id.includes('node_modules')) {
                return null;
            }

            // Skip the UITarget component itself
            if (id.includes('/targets/ui-target.tsx')) {
                return null;
            }

            // Quick check: does this file contain UITarget JSX?
            // UI_TARGET_JSX_RE avoids false matches on 'UITargetProviders' (which contains 'UITarget').
            // Also verify the import is present to avoid processing files that just reference the string.
            if (!UI_TARGET_JSX_RE.test(code) || !code.includes("from '@/targets/ui-target'")) {
                return null;
            }

            try {
                // Parse AST
                const ast = parse(code, {
                    sourceType: 'module',
                    plugins: ['typescript', 'jsx', 'decorators-legacy'],
                });

                let hasTransforms = false;
                const targetIds: string[] = [];

                // Find and transform UITarget usages
                traverse(ast, {
                    JSXElement(path) {
                        const openingElement = path.node.openingElement;

                        // Check if this is <UITarget>
                        if (!isJSXIdentifier(openingElement.name) || openingElement.name.name !== 'UITarget') {
                            return;
                        }

                        // Extract targetId attribute
                        const targetIdAttr = openingElement.attributes.find(
                            (attr) =>
                                isJSXAttribute(attr) && isJSXIdentifier(attr.name) && attr.name.name === 'targetId'
                        ) as JSXAttribute | undefined;

                        if (!targetIdAttr) {
                            logger.warn(`UITarget without targetId in ${id}`);
                            return;
                        }

                        // Get targetId value
                        const targetId = isStringLiteral(targetIdAttr.value) ? targetIdAttr.value.value : null;

                        if (!targetId) {
                            logger.warn(`UITarget with non-string targetId in ${id}`);
                            return;
                        }

                        // Apply build-time category filter
                        if (config.filterCategory && !targetId.startsWith(`${config.filterCategory}.`)) {
                            return;
                        }

                        // Determine if this target has children
                        const hasChildren = path.node.children.length > 0;

                        // Transform: UITarget → UITargetDevMarker
                        openingElement.name = jsxIdentifier('UITargetDevMarker');
                        if (path.node.closingElement) {
                            path.node.closingElement.name = jsxIdentifier('UITargetDevMarker');
                        }

                        // Add metadata attributes
                        const hint = config.hintMap?.[targetId];
                        openingElement.attributes.push(
                            jsxAttribute(jsxIdentifier('__file__'), stringLiteral(id)),
                            jsxAttribute(
                                jsxIdentifier('__hasChildren__'),
                                jsxExpressionContainer(booleanLiteral(hasChildren))
                            ),
                            ...(hint ? [jsxAttribute(jsxIdentifier('__hint__'), stringLiteral(hint))] : [])
                        );

                        hasTransforms = true;
                        targetIds.push(targetId);
                    },
                });

                if (!hasTransforms) {
                    return null;
                }

                // Add import for UITargetDevMarker at top of file
                const devMarkerImport = importDeclaration(
                    [importSpecifier(identifier('UITargetDevMarker'), identifier('UITargetDevMarker'))],
                    stringLiteral('@/lib/ui-target-dev-mode/marker')
                );

                ast.program.body.unshift(devMarkerImport);

                // Generate transformed code
                const output = generate(
                    ast,
                    {
                        retainLines: true,
                        compact: false,
                    },
                    code
                );

                logger.debug(`Transformed ${targetIds.length} targets in ${id.split('/').pop()}`);

                return {
                    code: output.code,
                    map: output.map,
                };
            } catch (error) {
                logger.error(`Failed to transform UITarget in ${id}:`, error);
                return null; // Return original code on error
            }
        },
    };
}
