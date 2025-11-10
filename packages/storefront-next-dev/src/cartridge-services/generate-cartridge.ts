#!/usr/bin/env node
/* eslint-disable no-console */

import { readdir, readFile, writeFile, mkdir, access, rm } from 'fs/promises';
import { join, extname, resolve, basename, posix as pathPosix } from 'path';
import { Project, Node, type SourceFile, type PropertyDeclaration, type Decorator } from 'ts-morph';

const SKIP_DIRECTORIES = ['build', 'dist', 'node_modules', '.git', '.next', 'coverage'];

const DEFAULT_COMPONENT_GROUP = 'odyssey_base';
const ARCH_TYPE_HEADLESS = 'headless';

type AttributeType =
    | 'string'
    | 'text'
    | 'markup'
    | 'integer'
    | 'boolean'
    | 'product'
    | 'category'
    | 'file'
    | 'page'
    | 'image'
    | 'url'
    | 'enum'
    | 'custom'
    | 'cms_record';

const VALID_ATTRIBUTE_TYPES: readonly AttributeType[] = [
    'string',
    'text',
    'markup',
    'integer',
    'boolean',
    'product',
    'category',
    'file',
    'page',
    'image',
    'url',
    'enum',
    'custom',
    'cms_record',
] as const;

// Type mapping for TypeScript types to B2C Commerce attribute types
// Based on official schema: https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/content/attributedefinition.json
const TYPE_MAPPING: Record<string, string> = {
    String: 'string',
    string: 'string',
    Number: 'integer',
    number: 'integer',
    Boolean: 'boolean',
    boolean: 'boolean',
    Date: 'string', // B2C Commerce doesn't have a native date type, use string
    URL: 'url',
    CMSRecord: 'cms_record',
};

// Resolve attribute type in order: decorator type -> ts-morph type inference -> fallback to string
function resolveAttributeType(decoratorType?: string, tsMorphType?: string, fieldName?: string): string {
    // 1) If the type is set on the decorator, use that (with validation)
    if (decoratorType) {
        if (!VALID_ATTRIBUTE_TYPES.includes(decoratorType as AttributeType)) {
            console.error(
                `Error: Invalid attribute type '${decoratorType}' for field '${fieldName || 'unknown'}'. Valid types are: ${VALID_ATTRIBUTE_TYPES.join(', ')}`
            );
            process.exit(1);
        }
        return decoratorType;
    }

    // 2) Use the type from ts-morph type inference
    if (tsMorphType && TYPE_MAPPING[tsMorphType]) {
        return TYPE_MAPPING[tsMorphType];
    }

    // 3) Fall back to string
    return 'string';
}

// Convert field name to human-readable name
function toHumanReadableName(fieldName: string): string {
    return fieldName
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim();
}

// Convert name to camelCase filename (handles spaces and hyphens, preserves existing camelCase)
function toCamelCaseFileName(name: string): string {
    // If the name is already camelCase (no spaces or hyphens), return as-is
    if (!/[\s-]/.test(name)) {
        return name;
    }

    return name
        .split(/[\s-]+/) // Split by whitespace and hyphens
        .map((word, index) => {
            if (index === 0) {
                return word.toLowerCase(); // First word is all lowercase
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); // Subsequent words are capitalized
        })
        .join(''); // Join without spaces or hyphens
}

function getTypeFromTsMorph(property: PropertyDeclaration, _sourceFile: SourceFile): string {
    try {
        const typeNode = property.getTypeNode();
        if (typeNode) {
            const typeText = typeNode.getText();
            // Extract the base type name from complex types
            const baseType = typeText.split('|')[0].split('&')[0].trim();
            return baseType;
        }
    } catch {
        // If type extraction fails, return string
    }

    return 'string';
}

// Helper function to parse any TypeScript expression into a JavaScript value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseExpression(expression: any): unknown {
    if (Node.isStringLiteral(expression)) {
        return expression.getLiteralValue();
    } else if (Node.isNumericLiteral(expression)) {
        return expression.getLiteralValue();
    } else if (Node.isTrueLiteral(expression)) {
        return true;
    } else if (Node.isFalseLiteral(expression)) {
        return false;
    } else if (Node.isObjectLiteralExpression(expression)) {
        return parseNestedObject(expression);
    } else if (Node.isArrayLiteralExpression(expression)) {
        return parseArrayLiteral(expression);
    } else {
        return expression.getText();
    }
}

// Helper function to parse deeply nested object literals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNestedObject(objectLiteral: any): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    try {
        const properties = objectLiteral.getProperties();

        for (const property of properties) {
            if (Node.isPropertyAssignment(property)) {
                const name = property.getName();
                const initializer = property.getInitializer();

                if (initializer) {
                    result[name] = parseExpression(initializer);
                }
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not parse nested object: ${(error as Error).message}`);
        return result; // Return the result even if there was an error
    }

    return result;
}

export function filePathToRoute(filePath: string, projectRoot: string): string {
    // Normalize to POSIX-style to handle inputs from any OS consistently
    const filePathPosix = filePath.replace(/\\/g, '/');
    const projectRootPosix = projectRoot.replace(/\\/g, '/');

    // Compute relative path using POSIX semantics regardless of host OS
    const routesRoot = pathPosix.join(projectRootPosix, 'src/routes');
    // Prefer simple substring slice to avoid drive-letter quirks
    const marker = '/src/routes/';
    const relativePath = filePathPosix.includes(marker)
        ? filePathPosix.slice(filePathPosix.indexOf(marker) + marker.length)
        : pathPosix.relative(routesRoot, filePathPosix);

    // Remove file extension
    let routePath = relativePath.replace(/\.(tsx|ts|jsx|js)$/i, '');

    // Handle special files and dynamic params
    routePath = routePath
        // Root-level index files
        .replace(/^_index$/i, '')
        .replace(/^index$/i, '')
        // Nested index files
        .replace(/\/_index$/i, '')
        .replace(/\/index$/i, '')
        // $param -> :param
        .replace(/\$([^/]+)/g, ':$1');

    // Ensure leading slash
    return routePath.startsWith('/') ? routePath : `/${routePath}`;
}

// Helper function to parse array literals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseArrayLiteral(arrayLiteral: any): unknown[] {
    const result: unknown[] = [];

    try {
        const elements = arrayLiteral.getElements();

        for (const element of elements) {
            result.push(parseExpression(element));
        }
    } catch (error) {
        console.warn(`Warning: Could not parse array literal: ${(error as Error).message}`);
    }

    return result;
}

// Parse decorator arguments using ts-morph
function parseDecoratorArgs(decorator: Decorator): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    try {
        const args = decorator.getArguments();

        if (args.length === 0) {
            return result;
        }

        // Handle the first argument (usually an object literal)
        const firstArg = args[0];

        if (Node.isObjectLiteralExpression(firstArg)) {
            const properties = firstArg.getProperties();

            for (const property of properties) {
                if (Node.isPropertyAssignment(property)) {
                    const name = property.getName();
                    const initializer = property.getInitializer();

                    if (initializer) {
                        result[name] = parseExpression(initializer);
                    }
                }
            }
        } else if (Node.isStringLiteral(firstArg)) {
            // Handle string literal argument
            result.id = parseExpression(firstArg);
        }

        return result;
    } catch {
        console.warn(`Warning: Could not parse decorator arguments`);
        return result;
    }
}

function extractAttributesFromSource(sourceFile: SourceFile, className: string): Record<string, unknown>[] {
    const attributes: Record<string, unknown>[] = [];

    try {
        // Find the class declaration
        const classDeclaration = sourceFile.getClass(className);
        if (!classDeclaration) {
            return attributes;
        }

        // Get all properties in the class
        const properties = classDeclaration.getProperties();

        for (const property of properties) {
            // Check if the property has an @AttributeDefinition decorator
            const attributeDecorator = property.getDecorator('AttributeDefinition');
            if (!attributeDecorator) {
                continue;
            }

            const fieldName = property.getName();
            const config = parseDecoratorArgs(attributeDecorator);

            const isRequired = !property.hasQuestionToken();

            const inferredType = (config.type as string) || getTypeFromTsMorph(property, sourceFile);

            const attribute: Record<string, unknown> = {
                id: config.id || fieldName,
                name: config.name || toHumanReadableName(fieldName),
                type: resolveAttributeType(config.type as string, inferredType, fieldName),
                required: config.required !== undefined ? config.required : isRequired,
                description: config.description || `Field: ${fieldName}`,
            };

            if (config.values) {
                attribute.values = config.values;
            }

            if (config.defaultValue !== undefined) {
                attribute.defaultValue = config.defaultValue;
            }

            attributes.push(attribute);
        }
    } catch (error) {
        console.warn(`Warning: Could not extract attributes from class ${className}: ${(error as Error).message}`);
    }

    return attributes;
}

function extractRegionDefinitionsFromSource(sourceFile: SourceFile, className: string): Record<string, unknown>[] {
    const regionDefinitions: Record<string, unknown>[] = [];

    try {
        // Find the class declaration
        const classDeclaration = sourceFile.getClass(className);
        if (!classDeclaration) {
            return regionDefinitions;
        }

        // Check for class-level @RegionDefinition decorator
        const classRegionDecorator = classDeclaration.getDecorator('RegionDefinition');
        if (classRegionDecorator) {
            const args = classRegionDecorator.getArguments();
            if (args.length > 0) {
                const firstArg = args[0];

                // Handle array literal argument (most common case)
                if (Node.isArrayLiteralExpression(firstArg)) {
                    const elements = firstArg.getElements();
                    for (const element of elements) {
                        if (Node.isObjectLiteralExpression(element)) {
                            const regionConfig = parseDecoratorArgs({
                                getArguments: () => [element],
                            } as unknown as Decorator);

                            const regionDefinition: Record<string, unknown> = {
                                id: regionConfig.id || 'region',
                                name: regionConfig.name || 'Region',
                            };

                            // Add optional properties if they exist in the decorator
                            if (regionConfig.componentTypes) {
                                regionDefinition.component_types = regionConfig.componentTypes;
                            }

                            if (Array.isArray(regionConfig.componentTypeInclusions)) {
                                regionDefinition.component_types = regionConfig.componentTypeInclusions.map((incl) => ({
                                    type_id: incl,
                                }));
                            }

                            if (Array.isArray(regionConfig.componentTypeExclusions)) {
                                regionDefinition.component_types = regionConfig.componentTypeExclusions.map((incl) => ({
                                    type_id: incl,
                                }));
                            }

                            if (regionConfig.maxComponents !== undefined) {
                                regionDefinition.max_components = regionConfig.maxComponents;
                            }

                            if (regionConfig.minComponents !== undefined) {
                                regionDefinition.min_components = regionConfig.minComponents;
                            }

                            if (regionConfig.allowMultiple !== undefined) {
                                regionDefinition.allow_multiple = regionConfig.allowMultiple;
                            }

                            if (regionConfig.defaultComponentConstructors) {
                                regionDefinition.default_component_constructors =
                                    regionConfig.defaultComponentConstructors;
                            }

                            regionDefinitions.push(regionDefinition);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.warn(
            `Warning: Could not extract region definitions from class ${className}: ${(error as Error).message}`
        );
    }

    return regionDefinitions;
}

async function processComponentFile(filePath: string, _projectRoot: string): Promise<unknown[]> {
    try {
        const content = await readFile(filePath, 'utf-8');
        const components: unknown[] = [];

        // Check if file contains @Component decorator
        if (!content.includes('@Component')) {
            return components;
        }

        // Convert file path to module path (currently unused but may be needed in future)
        // const relativePath = relative(join(projectRoot, 'src'), filePath);
        // const modulePath = relativePath.replace(/\.tsx?$/, '').replace(/\\/g, '/');

        try {
            // Create a ts-morph project and add the source file
            const project = new Project({
                useInMemoryFileSystem: true,
                skipAddingFilesFromTsConfig: true,
            });

            const sourceFile = project.createSourceFile(filePath, content);

            const classes = sourceFile.getClasses();

            for (const classDeclaration of classes) {
                const componentDecorator = classDeclaration.getDecorator('Component');
                if (!componentDecorator) {
                    continue;
                }

                const className = classDeclaration.getName();
                if (!className) {
                    continue;
                }

                const componentConfig = parseDecoratorArgs(componentDecorator);

                const attributes = extractAttributesFromSource(sourceFile, className);
                const regionDefinitions = extractRegionDefinitionsFromSource(sourceFile, className);

                const componentMetadata = {
                    typeId: componentConfig.id || className.toLowerCase(),
                    name: componentConfig.name || toHumanReadableName(className),
                    group: componentConfig.group || DEFAULT_COMPONENT_GROUP,
                    description: componentConfig.description || `Custom component: ${className}`,
                    regionDefinitions,
                    attributes,
                };

                components.push(componentMetadata);
            }
        } catch (error) {
            console.warn(`Warning: Could not process file ${filePath}:`, (error as Error).message);
        }

        return components;
    } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}:`, (error as Error).message);
        return [];
    }
}

async function processPageTypeFile(filePath: string, projectRoot: string): Promise<unknown[]> {
    try {
        const content = await readFile(filePath, 'utf-8');
        const pageTypes: unknown[] = [];

        // Check if file contains @PageType decorator
        if (!content.includes('@PageType')) {
            return pageTypes;
        }

        try {
            // Create a ts-morph project and add the source file
            const project = new Project({
                useInMemoryFileSystem: true,
                skipAddingFilesFromTsConfig: true,
            });

            const sourceFile = project.createSourceFile(filePath, content);

            const classes = sourceFile.getClasses();

            for (const classDeclaration of classes) {
                const pageTypeDecorator = classDeclaration.getDecorator('PageType');
                if (!pageTypeDecorator) {
                    continue;
                }

                const className = classDeclaration.getName();
                if (!className) {
                    continue;
                }

                const pageTypeConfig = parseDecoratorArgs(pageTypeDecorator);

                const attributes = extractAttributesFromSource(sourceFile, className);
                const regionDefinitions = extractRegionDefinitionsFromSource(sourceFile, className);
                const route = filePathToRoute(filePath, projectRoot);

                const pageTypeMetadata = {
                    typeId: pageTypeConfig.id || className.toLowerCase(),
                    name: pageTypeConfig.name || toHumanReadableName(className),
                    description: pageTypeConfig.description || `Custom page type: ${className}`,
                    regionDefinitions,
                    supportedAspectTypes: pageTypeConfig.supportedAspectTypes || [],
                    attributes,
                    route,
                };

                pageTypes.push(pageTypeMetadata);
            }
        } catch (error) {
            console.warn(`Warning: Could not process file ${filePath}:`, (error as Error).message);
        }

        return pageTypes;
    } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}:`, (error as Error).message);
        return [];
    }
}

async function processAspectFile(filePath: string, _projectRoot: string): Promise<unknown[]> {
    try {
        const content = await readFile(filePath, 'utf-8');
        const aspects: unknown[] = [];

        // Check if file is a JSON aspect file
        if (!filePath.endsWith('.json') || !content.trim().startsWith('{')) {
            return aspects;
        }

        // Check if file is in the aspects directory
        if (!filePath.includes('/aspects/') && !filePath.includes('\\aspects\\')) {
            return aspects;
        }

        try {
            // Parse the JSON content
            const aspectData = JSON.parse(content);

            // Extract filename without extension as the aspect ID
            const fileName = basename(filePath, '.json');

            // Validate that it looks like an aspect file
            if (!aspectData.name || !aspectData.attribute_definitions) {
                return aspects;
            }

            const aspectMetadata = {
                id: fileName,
                name: aspectData.name,
                description: aspectData.description || `Aspect type: ${aspectData.name}`,
                attributeDefinitions: aspectData.attribute_definitions || [],
                supportedObjectTypes: aspectData.supported_object_types || [],
            };

            aspects.push(aspectMetadata);
        } catch (parseError) {
            console.warn(`Warning: Could not parse JSON in file ${filePath}:`, (parseError as Error).message);
        }

        return aspects;
    } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}:`, (error as Error).message);
        return [];
    }
}

async function generateComponentCartridge(component: Record<string, unknown>, outputDir: string): Promise<void> {
    const fileName = toCamelCaseFileName(component.typeId as string);
    const groupDir = join(outputDir, component.group as string);
    const outputPath = join(groupDir, `${fileName}.json`);

    // Ensure the group directory exists
    try {
        await mkdir(groupDir, { recursive: true });
    } catch {
        // Directory might already exist, which is fine
    }

    const attributeDefinitionGroups = [
        {
            id: component.typeId,
            name: component.name,
            description: component.description,
            attribute_definitions: component.attributes,
        },
    ];

    const cartridgeData = {
        name: component.name,
        description: component.description,
        group: component.group,
        arch_type: ARCH_TYPE_HEADLESS,
        region_definitions: component.regionDefinitions || [],
        attribute_definition_groups: attributeDefinitionGroups,
    };

    await writeFile(outputPath, JSON.stringify(cartridgeData, null, 2));
    console.log(
        `   - ${String(component.typeId)}: ${String(component.name)} (${String((component.attributes as unknown[]).length)} attributes) → ${fileName}.json`
    );
}

async function generatePageTypeCartridge(pageType: Record<string, unknown>, outputDir: string): Promise<void> {
    const fileName = toCamelCaseFileName(pageType.name as string);
    const outputPath = join(outputDir, `${fileName}.json`);

    const cartridgeData: Record<string, unknown> = {
        name: pageType.name,
        description: pageType.description,
        arch_type: ARCH_TYPE_HEADLESS,
        region_definitions: pageType.regionDefinitions || [],
    };

    // Add attribute_definition_groups if there are attributes
    if (pageType.attributes && (pageType.attributes as unknown[]).length > 0) {
        const attributeDefinitionGroups = [
            {
                id: pageType.typeId || fileName,
                name: pageType.name,
                description: pageType.description,
                attribute_definitions: pageType.attributes,
            },
        ];
        cartridgeData.attribute_definition_groups = attributeDefinitionGroups;
    }

    // Add supported_aspect_types if specified
    if (pageType.supportedAspectTypes) {
        cartridgeData.supported_aspect_types = pageType.supportedAspectTypes;
    }

    if (pageType.route) {
        cartridgeData.route = pageType.route;
    }

    await writeFile(outputPath, JSON.stringify(cartridgeData, null, 2));
    console.log(
        `   - ${String(pageType.name)}: ${String(pageType.description)} (${String((pageType.attributes as unknown[]).length)} attributes) → ${fileName}.json`
    );
}

async function generateAspectCartridge(aspect: Record<string, unknown>, outputDir: string): Promise<void> {
    const fileName = toCamelCaseFileName(aspect.id as string);
    const outputPath = join(outputDir, `${fileName}.json`);

    const cartridgeData: Record<string, unknown> = {
        name: aspect.name,
        description: aspect.description,
        arch_type: ARCH_TYPE_HEADLESS,
        attribute_definitions: aspect.attributeDefinitions || [],
    };

    // Add supported_object_types if specified
    if (aspect.supportedObjectTypes) {
        cartridgeData.supported_object_types = aspect.supportedObjectTypes;
    }

    await writeFile(outputPath, JSON.stringify(cartridgeData, null, 2));
    console.log(
        `   - ${String(aspect.name)}: ${String(aspect.description)} (${String((aspect.attributeDefinitions as unknown[]).length)} attributes) → ${fileName}.json`
    );
}

// Main function
export async function generateMetadata(projectDirectory: string, metadataDirectory: string): Promise<void> {
    try {
        console.log('🔍 Generating metadata for decorated components and page types...');

        const projectRoot = resolve(projectDirectory);
        const srcDir = join(projectRoot, 'src');
        const metadataDir = resolve(metadataDirectory);
        const componentsOutputDir = join(metadataDir, 'components');
        const pagesOutputDir = join(metadataDir, 'pages');
        const aspectsOutputDir = join(metadataDir, 'aspects');

        // Delete existing output directories to ensure clean generation
        console.log('🗑️  Cleaning existing output directories...');
        for (const outputDir of [componentsOutputDir, pagesOutputDir, aspectsOutputDir]) {
            try {
                await rm(outputDir, { recursive: true, force: true });
                console.log(`   - Deleted: ${outputDir}`);
            } catch {
                // Directory might not exist, which is fine
                console.log(`   - Directory not found (skipping): ${outputDir}`);
            }
        }

        // Create output directories if they don't exist
        console.log('📁 Creating output directories...');
        for (const outputDir of [componentsOutputDir, pagesOutputDir, aspectsOutputDir]) {
            try {
                await mkdir(outputDir, { recursive: true });
            } catch (error) {
                try {
                    await access(outputDir);
                    // Directory exists, that's fine
                } catch {
                    console.error(
                        `❌ Error: Failed to create output directory ${outputDir}: ${(error as Error).message}`
                    );
                    process.exit(1);
                }
            }
        }

        const files: string[] = [];
        const scanDirectory = async (dir: string): Promise<void> => {
            const entries = await readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (!SKIP_DIRECTORIES.includes(entry.name)) {
                        await scanDirectory(fullPath);
                    }
                } else if (
                    entry.isFile() &&
                    (extname(entry.name) === '.ts' || extname(entry.name) === '.tsx' || extname(entry.name) === '.json')
                ) {
                    files.push(fullPath);
                }
            }
        };

        await scanDirectory(srcDir);

        // Process each file for both components and page types
        const allComponents: unknown[] = [];
        const allPageTypes: unknown[] = [];
        const allAspects: unknown[] = [];

        for (const file of files) {
            const components = await processComponentFile(file, projectRoot);
            allComponents.push(...components);

            const pageTypes = await processPageTypeFile(file, projectRoot);
            allPageTypes.push(...pageTypes);

            const aspects = await processAspectFile(file, projectRoot);
            allAspects.push(...aspects);
        }

        if (allComponents.length === 0 && allPageTypes.length === 0 && allAspects.length === 0) {
            console.log('⚠️  No decorated components, page types, or aspect files found.');
            return;
        }

        // Generate component cartridge files
        if (allComponents.length > 0) {
            console.log(`✅ Found ${allComponents.length} decorated component(s):`);
            for (const component of allComponents) {
                await generateComponentCartridge(component as Record<string, unknown>, componentsOutputDir);
            }
            console.log(`📄 Generated ${allComponents.length} component metadata file(s) in: ${componentsOutputDir}`);
        }

        // Generate page type cartridge files
        if (allPageTypes.length > 0) {
            console.log(`✅ Found ${allPageTypes.length} decorated page type(s):`);
            for (const pageType of allPageTypes) {
                await generatePageTypeCartridge(pageType as Record<string, unknown>, pagesOutputDir);
            }
            console.log(`📄 Generated ${allPageTypes.length} page type metadata file(s) in: ${pagesOutputDir}`);
        }

        if (allAspects.length > 0) {
            console.log(`✅ Found ${allAspects.length} decorated aspect(s):`);
            for (const aspect of allAspects) {
                await generateAspectCartridge(aspect as Record<string, unknown>, aspectsOutputDir);
            }
            console.log(`📄 Generated ${allAspects.length} aspect metadata file(s) in: ${aspectsOutputDir}`);
        }
    } catch (error) {
        console.error('❌ Error:', (error as Error).message);
        process.exit(1);
    }
}
