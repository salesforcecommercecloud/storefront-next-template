/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Utility to trim the directory to remove unused components and unused extensions.
 * This is used to reduce the size of the project by removing the code that is not part of the selected extensions.
 */
/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-shadow */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = (traverseModule as any).default || (traverseModule as any);
import type ExtensionConfig from './extension-config';
import { resolvePathFromAlias, isSupportedFileExtension, FILE_EXTENSIONS } from './path-util';

type ExtensionsSelection = Record<string, boolean>;

const removeComponentCandidates: Set<string> = new Set();
const SEPARATOR = path.sep;
const COMPONENT_SCAN_PATHS: string[] = [path.join(SEPARATOR, 'src', SEPARATOR)];

const SINGLE_LINE_MARKER = '@sfdc-extension-line';
const BLOCK_MARKER_START = '@sfdc-extension-block-start';
const BLOCK_MARKER_END = '@sfdc-extension-block-end';
const FILE_MARKER = '@sfdc-extension-file';
let verbose = false;

export default function trimExtensions(
    directory: string,
    selectedExtensions?: Partial<ExtensionsSelection>,
    extensionConfig?: typeof ExtensionConfig,
    verboseOverride: boolean = false
): void {
    const startTime = Date.now();
    removeComponentCandidates.clear();
    verbose = verboseOverride ?? false;

    // read available extensions from config file

    const configuredExtensions: Record<string, unknown> = extensionConfig?.extensions || {};
    const extensions: ExtensionsSelection = {};
    Object.keys(configuredExtensions).forEach((pluginKey) => {
        extensions[pluginKey] = Boolean(selectedExtensions?.[pluginKey]) || false;
    });

    if (Object.keys(extensions).length === 0) {
        if (verbose) {
            console.log('No plugins found, skipping trim');
        }
        return;
    }

    const processDirectory = (dir: string): void => {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (!filePath.includes('node_modules')) {
                if (stats.isDirectory()) {
                    processDirectory(filePath);
                } else if (isSupportedFileExtension(file)) {
                    processFile(directory, filePath, extensions);
                }
            }
        });
    };

    processDirectory(directory);
    removeUnusedComponents(directory, directory);
    const endTime = Date.now();
    if (verbose) {
        console.log(`Trim extensions took ${endTime - startTime}ms`);
    }
}

function processFile(projectRoot: string, filePath: string, extensions: ExtensionsSelection): void {
    let modified = false;
    const blockMarkers: { extension: string; line: number }[] = [];
    const removedBlocks: string[] = [];
    let skippingBlock = false;

    const source = fs.readFileSync(filePath, 'utf-8');

    // If the file is guarded by a file-level marker and the extension is disabled, remove the file entirely
    if (source.includes(FILE_MARKER)) {
        // find() always returns a line since the if condition ensures marker exists, and FILE_MARKER has no newlines
        const markerLine = source.split('\n').find((line) => line.includes(FILE_MARKER)) as string;
        const extMatch = Object.keys(extensions).find((ext) => markerLine.includes(ext));
        if (!extMatch) {
            if (verbose) {
                console.warn(
                    `File ${filePath} is marked with ${markerLine} but it does not match any known extensions`
                );
            }
        } else if (extensions[extMatch] === false) {
            try {
                fs.unlinkSync(filePath);
                if (verbose) {
                    console.log(`Deleted file ${filePath}`);
                }
            } catch (e: unknown) {
                const error = e as Error;
                console.error(`Error deleting file ${filePath}: ${error.message}`);
                throw e;
            }
            // Track parent directory for potential cleanup
            removeComponentCandidates.add(path.resolve(path.dirname(filePath)));
            return;
        }
    }

    // extensions will always have keys since trimExtensions validates this before calling processFile
    const extKeys = Object.keys(extensions);
    const extensionRegex = new RegExp(extKeys.join('|'), 'g');
    if (extensionRegex.test(source)) {
        const lines = source.split('\n');
        const newLines: string[] = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            if (line.includes(SINGLE_LINE_MARKER)) {
                const matchingExtension = Object.keys(extensions).find((extension) => line.includes(extension));
                if (matchingExtension && extensions[matchingExtension] === false) {
                    removedBlocks.push(lines[i + 1]);
                    i += 2;
                    modified = true;
                    continue;
                }
            } else if (line.includes(BLOCK_MARKER_START)) {
                const matchingExtension = Object.keys(extensions).find((extension) => line.includes(extension));
                if (matchingExtension) {
                    blockMarkers.push({ extension: matchingExtension, line: i });
                    skippingBlock = extensions[matchingExtension] === false;
                } else {
                    if (verbose) {
                        console.warn(`Warning: Unknown marker found in ${filePath} at line ${i}: \n${line}`);
                    }
                }
            } else if (line.includes(BLOCK_MARKER_END)) {
                const matchingExtension = Object.keys(extensions).find((extension) => line.includes(extension));
                if (matchingExtension) {
                    const extension = Object.keys(extensions).find((p) => line.includes(p));
                    if (blockMarkers.length === 0) {
                        throw new Error(
                            `Block marker mismatch in ${filePath}, encountered end marker ${extension} without a matching start marker at line ${i}:\n${lines[i]}`
                        );
                    }
                    const startMarker = blockMarkers.pop() as { extension: string; line: number };
                    if (!extension || startMarker.extension !== extension) {
                        throw new Error(
                            `Block marker mismatch in ${filePath}, expected end marker for ${startMarker.extension} but got ${extension} at line ${i}:\n${lines[i]}`
                        );
                    }
                    if (extensions[extension] === false) {
                        const removedBlock = lines.slice(startMarker.line, i + 1).join('\n');
                        removedBlocks.push(removedBlock);
                        modified = true;
                        skippingBlock = false;
                        i++;
                        continue;
                    }
                }
            }
            if (!skippingBlock) {
                newLines.push(line);
            }
            i++;
        }
        if (blockMarkers.length > 0) {
            throw new Error(
                `Unclosed end marker found in ${filePath}: ${blockMarkers[blockMarkers.length - 1].extension}`
            );
        }
        if (modified) {
            const newSource = newLines.join('\n');
            try {
                fs.writeFileSync(filePath, newSource);
                if (verbose) {
                    console.log(`Updated file ${filePath}`);
                }
            } catch (e: unknown) {
                const error = e as Error;
                console.error(`Error updating file ${filePath}: ${error.message}`);
                throw e;
            }

            const addToRemoveComponentCandidates = (importPath: string): void => {
                if (importPath.startsWith('.')) {
                    removeComponentCandidates.add(path.resolve(path.dirname(filePath), importPath));
                } else {
                    // Handle path aliases based on the project's tsconfig.json "paths" configuration
                    const resolvedPath = resolvePathFromAlias(importPath, projectRoot);
                    removeComponentCandidates.add(path.dirname(resolvedPath));
                }
            };

            removedBlocks.forEach((block) => {
                if (block.includes('import')) {
                    try {
                        const ast = parse(block, {
                            sourceType: 'module',
                            plugins: ['jsx', 'typescript'],
                        });
                        if (verbose) {
                            console.log(`traversing block ${block}`);
                        }
                        traverse(ast, {
                            noScope: true,
                            ImportDeclaration(nodePath: { node: { source: { value: string } } }) {
                                addToRemoveComponentCandidates(nodePath.node.source.value);
                            },
                        });
                    } catch (e: unknown) {
                        const error = e as Error;
                        console.error(`Error parsing block ${block}: ${error.message}`);
                    }
                }
            });
        }
    }
}

function removeUnusedComponents(directory: string, projectRoot: string): string[] {
    const exportedFiles: Set<string> = new Set();

    function collectExportedFiles(dir: string) {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory() && !filePath.includes('node_modules')) {
                collectExportedFiles(filePath);
            } else if (isSupportedFileExtension(file) && !filePath.includes('.storybook')) {
                const source = fs.readFileSync(filePath, 'utf-8');
                const ast = parse(source, {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript'],
                });
                let hasExports = false;
                traverse(ast, {
                    noScope: true,
                    ExportNamedDeclaration(astPath: { stop: () => void }) {
                        hasExports = true;
                        astPath.stop();
                    },
                    ExportDefaultDeclaration(astPath: { stop: () => void }) {
                        hasExports = true;
                        astPath.stop();
                    },
                });
                if (hasExports) {
                    const absolutePath = path.resolve(filePath);
                    const pathWithoutExt = path.resolve(path.dirname(absolutePath));
                    exportedFiles.add(pathWithoutExt);
                }
            }
        });
    }

    function findImports(dir: string, projectRoot: string) {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory() && !filePath.includes('node_modules')) {
                findImports(filePath, projectRoot);
            } else if (isSupportedFileExtension(file)) {
                const source = fs.readFileSync(filePath, 'utf-8');
                const ast = parse(source, {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript'],
                });

                traverse(ast, {
                    noScope: true,
                    ImportDeclaration(astPath: { node: { source: { value: string } } }) {
                        const importPath = resolvePathFromAlias(astPath.node.source.value, projectRoot);
                        if (importPath) {
                            let absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
                            const isDirectory =
                                fs.existsSync(absoluteImportPath) && fs.statSync(absoluteImportPath).isDirectory();
                            if (!isDirectory) {
                                absoluteImportPath = path.resolve(path.dirname(absoluteImportPath));
                            }
                            const isCandidate = Array.from(removeComponentCandidates).find((candidate) =>
                                path.resolve(filePath).startsWith(candidate + path.sep)
                            );
                            if (exportedFiles.has(absoluteImportPath) && !isCandidate) {
                                exportedFiles.delete(absoluteImportPath);
                                let parentPath = absoluteImportPath;
                                while (parentPath !== path.resolve(directory)) {
                                    parentPath = path.dirname(parentPath);
                                    exportedFiles.delete(parentPath);
                                }
                            }
                        }
                    },
                });
            }
        });
    }

    collectExportedFiles(directory);
    findImports(directory, projectRoot);

    const unusedFiles = Array.from(exportedFiles)
        .filter((filePath) => {
            return COMPONENT_SCAN_PATHS.some((p) => filePath.includes(p));
        })
        .map((filePath) => {
            const extensions = [...FILE_EXTENSIONS];
            for (const ext of extensions) {
                const fileWithExt = filePath + ext;
                if (fs.existsSync(fileWithExt)) {
                    return fileWithExt;
                }
            }
            return filePath;
        });

    if (verbose) {
        console.log('\nUnused components:');
        unusedFiles.forEach((file) => {
            console.log(`- ${file}`);
        });
        console.log('Remove component candidates:');
        Array.from(removeComponentCandidates).forEach((file) => {
            console.log(`- ${file}`);
        });
    }
    const filesToRemove = unusedFiles.filter((filePath) => removeComponentCandidates.has(filePath));
    if (verbose) {
        console.log('Files to remove:');
        filesToRemove.forEach((file) => {
            console.log(`- ${file}`);
        });
    }
    if (filesToRemove.length > 0) {
        if (verbose) {
            console.log('\nDeleting unused components:');
        }
        filesToRemove.forEach((file) => {
            if (verbose) {
                console.log(`- ${file}`);
            }
            try {
                const stats = fs.statSync(file);
                if (stats.isDirectory()) {
                    fs.rmSync(file, { recursive: true, force: true });
                    if (verbose) {
                        console.log(`  ✓ Successfully deleted directory`);
                    }
                } else {
                    fs.unlinkSync(file);
                    if (verbose) {
                        console.log(`  ✓ Successfully deleted file`);
                    }
                }
            } catch (err: unknown) {
                const error = err as Error & { code?: string };
                if (error.code === 'EPERM') {
                    console.error(
                        `  ✗ Permission denied - cannot delete. You may need to run with sudo or check permissions.`
                    );
                } else {
                    console.error(`  ✗ Error deleting: ${error.message}`);
                }
            }
        });
        // check if a directory is empty or only contains empty directories
        const isEmptyDirectory = (dir: string): boolean => {
            if (!fs.statSync(dir).isDirectory()) {
                return false;
            }
            const files = fs.readdirSync(dir);
            if (files.length === 0) {
                return true;
            }
            return files.every((file) => isEmptyDirectory(path.join(dir, file)));
        };
        // traverse the extensions directory and remove any empty directories
        const extensionsDir = path.join(projectRoot, 'src', 'extensions');
        if (fs.existsSync(extensionsDir)) {
            fs.readdirSync(extensionsDir).forEach((file) => {
                const subDirPath = path.join(extensionsDir, file);
                if (isEmptyDirectory(subDirPath)) {
                    if (verbose) {
                        console.log(`  ✓ Successfully deleted empty directory ${subDirPath}`);
                    }
                    fs.rmSync(subDirPath, { recursive: true, force: true });
                }
            });
        }
    } else {
        if (verbose) {
            console.log('\nNo unused components found.');
        }
    }

    return unusedFiles;
}
