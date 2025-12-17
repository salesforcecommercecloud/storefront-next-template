import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { glob } from 'glob';
import {
    Project,
    Node,
    type Decorator,
    type SourceFile,
    ts,
    type FunctionDeclaration,
    type VariableStatement,
} from 'ts-morph';

// Default component group when none is specified in the decorator
const DEFAULT_COMPONENT_GROUP = 'odyssey_base';

/**
 * Information about a discovered component
 */
export interface ComponentInfo {
    /** Component ID from @Component decorator */
    id: string;
    /** Absolute path to the component file */
    filePath: string;
    /** Relative import path from registry.ts */
    relativePath: string;
    /** Whether the component has loader exports */
    hasLoader: boolean;
    /** Whether the component has clientLoader export */
    hasClientLoader: boolean;
    /** Whether the component has fallback export */
    hasFallback: boolean;
}

/**
 * Configuration options for the static registry plugin
 */
export interface StaticRegistryPluginConfig {
    /**
     * Path to the components directory to scan
     * @default 'src/components'
     */
    componentPath?: string;

    /**
     * Path to the registry file to update
     * Note: The registry file must contain STATIC_REGISTRY_START and STATIC_REGISTRY_END markers
     * and must export a 'registry' variable (or use registryIdentifier to specify a different name)
     * @default 'src/lib/registry.ts'
     */
    registryPath?: string;

    /**
     * Name of the registry variable to use in generated code
     * @default 'registry'
     */
    registryIdentifier?: string;

    /**
     * Whether to fail the build on registry generation errors
     * @default true
     */
    failOnError?: boolean;

    /**
     * Enable verbose logging
     * @default false
     */
    verbose?: boolean;
}

/**
 * Extracts component ID and group from @Component decorator using ts-morph AST parsing
 */
export function extractComponentInfo(decorator: Decorator): { id: string; group: string } | null {
    const callExpression = decorator.getCallExpression();
    if (!callExpression) {
        return null;
    }

    const args = callExpression.getArguments();
    if (args.length === 0) {
        return null;
    }

    // First argument should be the component ID string (string literal or template literal)
    const firstArg = args[0];

    let baseComponentId: string;
    if (Node.isStringLiteral(firstArg)) {
        baseComponentId = firstArg.getLiteralValue();
    } else if (Node.isNoSubstitutionTemplateLiteral(firstArg)) {
        baseComponentId = firstArg.getText().slice(1, -1); // Remove backticks
    } else if (Node.isTemplateExpression(firstArg)) {
        // Template literals with interpolation cannot be resolved at build time
        throw new Error(
            `@Component id must be a simple string literal or backtick string without interpolation. Found: ${firstArg.getText()}`
        );
    } else {
        return null;
    }
    let group = DEFAULT_COMPONENT_GROUP;

    // Check if there's a second argument with metadata object
    if (args.length > 1) {
        const secondArg = args[1];
        if (Node.isObjectLiteralExpression(secondArg)) {
            // Look for group property in the metadata object
            const groupProperty = secondArg.getProperty('group');
            if (groupProperty && Node.isPropertyAssignment(groupProperty)) {
                const initializer = groupProperty.getInitializer();
                if (initializer && Node.isStringLiteral(initializer)) {
                    group = initializer.getLiteralValue();
                }
            }
        }
    }

    return {
        id: `${group}.${baseComponentId}`,
        group,
    };
}

/**
 * Checks if a source file has a specific named export using ts-morph AST parsing
 */
export function hasNamedExport(sourceFile: SourceFile, exportName: string): boolean {
    // Check for function declarations: export function exportName(...)
    const functionDeclarations = sourceFile
        .getFunctions()
        .filter((func: FunctionDeclaration) => func.hasExportKeyword() && func.getName() === exportName);

    if (functionDeclarations.length > 0) {
        return true;
    }

    // Check for variable declarations: export const exportName = ...
    const variableStatements = sourceFile
        .getVariableStatements()
        .filter((stmt: VariableStatement) => stmt.hasExportKeyword());

    for (const stmt of variableStatements) {
        const declarations = stmt.getDeclarations();
        for (const decl of declarations) {
            if (decl.getName() === exportName) {
                return true;
            }
        }
    }

    // Check for export assignments: export { exportName } or export { localName as exportName }
    const exportDeclarations = sourceFile.getExportDeclarations();
    for (const exportDecl of exportDeclarations) {
        const namedExports = exportDecl.getNamedExports();
        for (const namedExport of namedExports) {
            // Check both the local name and the alias (if any)
            const localName = namedExport.getName();
            const aliasName = namedExport.getAliasNode()?.getText();

            if (localName === exportName || aliasName === exportName) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Checks if a source file has a fallback export (including default exports with 'fallback' in name)
 */
export function hasFallbackExport(sourceFile: SourceFile): boolean {
    // Check for named export 'fallback'
    if (hasNamedExport(sourceFile, 'fallback')) {
        return true;
    }

    // Check for default function declarations with 'fallback' in name
    const functions = sourceFile
        .getFunctions()
        .filter((func: FunctionDeclaration) => func.hasExportKeyword() && func.hasDefaultKeyword());

    for (const func of functions) {
        const name = func.getName();
        if (name && name.toLowerCase().includes('fallback')) {
            return true;
        }
    }

    return false;
}

/**
 * Scans all files in the component directory for @Component decorators and extracts metadata using ts-morph
 */
export async function scanComponents(
    project: Project,
    projectRoot: string,
    componentPath: string,
    registryPath: string,
    verbose: boolean
): Promise<ComponentInfo[]> {
    // Scan all TypeScript/TSX files in the component directory recursively
    const componentPattern = `${componentPath}/**/*.{ts,tsx}`;
    const componentFiles = await glob(componentPattern, {
        cwd: projectRoot,
        absolute: true,
    });

    if (verbose) {
        console.log(`🔍 Scanning ${componentFiles.length} files in ${componentPath}...`);
    }

    const components: ComponentInfo[] = [];
    const registryDir = dirname(resolve(projectRoot, registryPath));

    for (const filePath of componentFiles) {
        try {
            // Read file content and create source file in ts-morph project
            const content = readFileSync(filePath, 'utf-8');
            const sourceFile = project.createSourceFile(filePath, content, { overwrite: true });

            // Find all classes with @Component decorator
            const classes = sourceFile.getClasses();

            for (const classDeclaration of classes) {
                const decorators = classDeclaration.getDecorators();

                for (const decorator of decorators) {
                    const decoratorName = decorator.getName();

                    if (decoratorName === 'Component') {
                        const componentInfo = extractComponentInfo(decorator);

                        if (componentInfo) {
                            // Calculate relative path from registry.ts to component
                            let relativePath = relative(registryDir, filePath)
                                .replace(/\\/g, '/') // Normalize Windows paths
                                .replace(/\.(ts|tsx)$/, ''); // Remove extension

                            // Ensure relative path starts with './' or '../'
                            if (!relativePath.startsWith('.')) {
                                relativePath = `./${relativePath}`;
                            }

                            // Check for React Router style loader exports using AST parsing
                            const hasLoaderExport = hasNamedExport(sourceFile, 'loader');
                            const hasClientLoaderExport = hasNamedExport(sourceFile, 'clientLoader');
                            const hasFallback = hasFallbackExport(sourceFile);

                            components.push({
                                id: componentInfo.id,
                                filePath,
                                relativePath,
                                hasLoader: hasLoaderExport,
                                hasClientLoader: hasClientLoaderExport,
                                hasFallback,
                            });

                            if (verbose) {
                                const exports = [];
                                if (hasLoaderExport) {
                                    exports.push('loader');
                                }
                                if (hasClientLoaderExport) {
                                    exports.push('clientLoader');
                                }
                                if (hasFallback) {
                                    exports.push('fallback');
                                }
                                const exportsText = exports.length > 0 ? ` (with ${exports.join(', ')})` : '';
                                console.log(
                                    `  ✅ Found component: ${componentInfo.id} → ${relativePath}${exportsText}`
                                );
                            }
                        }
                    }
                }
            }
        } catch (error) {
            if (verbose) {
                console.warn(`⚠️  Could not process ${filePath}:`, (error as Error).message);
            }
            // Continue processing other files even if one fails
        }
    }

    return components;
}

/**
 * Generates the initializeRegistry function code
 */
export function generateRegistryCode(components: ComponentInfo[], registryIdentifier: string = 'registry'): string {
    // Ensure deterministic output: sort by component id, then by relativePath as a stable tiebreaker
    const sorted = [...components].sort(
        (a, b) => a.id.localeCompare(b.id) || a.relativePath.localeCompare(b.relativePath)
    );

    if (sorted.length === 0) {
        return `
/* eslint-disable */
/**
 * Initialize the static component registry.
 * This function is auto-generated by the staticRegistry Vite plugin.
 * 
 * DO NOT EDIT THIS FUNCTION MANUALLY - it will be overwritten on next build.
 */
export function initializeRegistry(targetRegistry = ${registryIdentifier}): void {
    // No components found with @Component decorators
}
`;
    }

    const registrations = sorted
        .map(({ id, relativePath, hasLoader, hasClientLoader, hasFallback }) => {
            if (hasLoader || hasClientLoader || hasFallback) {
                // Register with metadata - tell registry the function/component names
                const metadata = [];
                if (hasLoader) {
                    metadata.push(`loader: 'loader'`);
                }
                if (hasClientLoader) {
                    metadata.push(`clientLoader: 'clientLoader'`);
                }
                if (hasFallback) {
                    metadata.push(`fallback: 'fallback'`);
                }

                return `    targetRegistry.registerImporter('${id}', () => import('${relativePath}'), { ${metadata.join(', ')} });`;
            } else {
                return `    targetRegistry.registerImporter('${id}', () => import('${relativePath}'));`;
            }
        })
        .join('\n');

    return `
/* eslint-disable */
/**
 * Initialize the static component registry.
 * This function is auto-generated by the staticRegistry Vite plugin.
 * 
 * DO NOT EDIT THIS FUNCTION MANUALLY - it will be overwritten on next build.
 * 
 * Components registered: ${sorted.map((c) => c.id).join(', ')}
 */
export function initializeRegistry(targetRegistry = ${registryIdentifier}): void {
${registrations}
}
`;
}

/**
 * Updates the registry.ts file with the generated code
 */
export function updateRegistryFile(registryFilePath: string, generatedCode: string, verbose: boolean): void {
    let existingContent: string;

    // Check if file exists, if not create a basic one
    if (!existsSync(registryFilePath)) {
        if (verbose) {
            console.log(`📝 Creating new registry file...`);
        }

        // Create a basic registry file
        const basicRegistryContent = `import { ComponentRegistry } from '@/lib/component-registry';

// Create the component registry instance
export const registry = new ComponentRegistry();

// STATIC_REGISTRY_START
// Generated content will be inserted here by the static registry plugin
// STATIC_REGISTRY_END
`;
        writeFileSync(registryFilePath, basicRegistryContent, 'utf-8');
        existingContent = basicRegistryContent;
    } else {
        try {
            existingContent = readFileSync(registryFilePath, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to read registry file: ${(error as Error).message}`);
        }
    }

    // Use explicit markers for generated content
    const startMarker = '// STATIC_REGISTRY_START';
    const endMarker = '// STATIC_REGISTRY_END';

    const startIndex = existingContent.indexOf(startMarker);
    const endIndex = existingContent.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        throw new Error(
            `Registry file ${registryFilePath} is missing static registry markers. ` +
                `Please add "${startMarker}" and "${endMarker}" markers to define the generated content area.`
        );
    }

    const before = existingContent.slice(0, startIndex + startMarker.length);
    const after = existingContent.slice(endIndex);

    const updatedContent = `${before}\n${generatedCode}\n${after}`;

    try {
        writeFileSync(registryFilePath, updatedContent, 'utf-8');
        if (verbose) {
            console.log(`💾 Updated registry file: ${registryFilePath}`);
        }
    } catch (error) {
        throw new Error(`Failed to write registry file: ${(error as Error).message}`);
    }
}

/**
 * Vite plugin that generates static component registry based on @Component decorators.
 *
 * This plugin scans component files for @Component decorators and automatically generates
 * a static registry function that pre-registers all components with their import paths.
 * This eliminates the need for manual component registration and provides build-time
 * optimization for component discovery.
 *
 * @param config - Configuration options for the plugin
 * @returns A Vite plugin that generates static component registrations
 *
 * @example
 * // In vite.config.ts
 * export default defineConfig({
 *   plugins: [
 *     staticRegistryPlugin({
 *       componentPath: 'src/components',
 *       registryPath: 'src/lib/registry.ts',
 *       verbose: true
 *     })
 *   ]
 * })
 */
export const staticRegistryPlugin = (config: StaticRegistryPluginConfig = {}): Plugin => {
    const {
        componentPath = 'src/components',
        registryPath = 'src/lib/static-registry.ts',
        registryIdentifier = 'registry',
        failOnError = true,
        verbose = false,
    } = config;

    let projectRoot: string;

    const runRegistryGeneration = async () => {
        if (verbose) {
            console.log('🚀 Starting static registry generation...');
        }

        // Create a fresh Project for this run only
        const project = new Project({
            compilerOptions: {
                target: ts.ScriptTarget.Latest,
                module: ts.ModuleKind.ESNext,
                jsx: ts.JsxEmit.ReactJSX,
                allowJs: true,
                skipLibCheck: true,
                noEmit: true,
            },
        });

        // Build AST, extract plain data
        const components = await scanComponents(project, projectRoot, componentPath, registryPath, verbose);

        // From here on we do not need the AST any more.
        // `components` is just an array of plain objects.
        // `project` will fall out of scope after this function returns and can be GC'd.

        if (verbose) {
            console.log(`📦 Found ${components.length} components with @Component decorators`);
        }

        const generatedCode = generateRegistryCode(components, registryIdentifier);
        const registryFilePath = resolve(projectRoot, registryPath);
        updateRegistryFile(registryFilePath, generatedCode, verbose);

        if (verbose) {
            console.log('✅ Static registry generation complete!');
        }

        return registryFilePath;
    };

    return {
        name: 'storefrontnext:static-registry',

        configResolved(resolvedConfig) {
            projectRoot = resolvedConfig.root;
        },

        async buildStart() {
            try {
                await runRegistryGeneration();
            } catch (error) {
                console.error(`❌ Static registry generation failed: ${(error as Error).message}`);
                if (failOnError) {
                    throw error;
                }
                console.warn('⚠️  Continuing build without static registry...');
            }
        },

        async handleHotUpdate({ file, server }) {
            const normalizedComponentPath = componentPath.replace(/\\/g, '/');
            const normalizedFile = file.replace(/\\/g, '/');

            if (
                normalizedFile.includes(`/${normalizedComponentPath}/`) &&
                (normalizedFile.endsWith('.ts') || normalizedFile.endsWith('.tsx'))
            ) {
                if (verbose) {
                    console.log(`🔄 Component file changed: ${file}, regenerating registry...`);
                }

                try {
                    const registryFilePath = await runRegistryGeneration();

                    const registryModule = server.moduleGraph.getModuleById(registryFilePath);
                    if (registryModule) {
                        await server.reloadModule(registryModule);
                    }

                    if (verbose) {
                        console.log('✅ Registry regenerated successfully!');
                    }
                } catch (error) {
                    console.error(`❌ Failed to regenerate registry: ${(error as Error).message}`);
                }

                return [];
            }
        },
    };
};
