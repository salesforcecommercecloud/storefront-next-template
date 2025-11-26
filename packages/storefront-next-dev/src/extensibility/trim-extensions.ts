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
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import type ExtensionConfig from './extension-config';
import { isSupportedFileExtension } from './path-util';

type ExtensionsSelection = Record<string, boolean>;

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
                    processFile(filePath, extensions);
                }
            }
        });
    };

    processDirectory(directory);
    if (extensionConfig?.extensions) {
        deleteExtensionFolders(directory, extensions, extensionConfig);
        updateExtensionConfig(directory, extensions);
    }
    const endTime = Date.now();
    if (verbose) {
        console.log(`Trim extensions took ${endTime - startTime}ms`);
    }
}

/**
 * Update the extension config file to only include the selected extensions.
 * @param projectDirectory - The project directory
 * @param extensionSelections - The selected extensions
 */
function updateExtensionConfig(projectDirectory: string, extensionSelections: ExtensionsSelection) {
    const extensionConfigPath = path.join(projectDirectory, 'src', 'extensions', 'config.json');
    const extensionConfig = JSON.parse(fs.readFileSync(extensionConfigPath, 'utf8'));
    Object.keys(extensionConfig.extensions).forEach((extensionKey: string) => {
        if (!extensionSelections[extensionKey]) {
            delete extensionConfig.extensions[extensionKey];
        }
    });
    fs.writeFileSync(extensionConfigPath, JSON.stringify({ extensions: extensionConfig.extensions }, null, 4), 'utf8');
}

/**
 * Process a file to trim extension-specific code based on markers.
 * @param filePath - The file path to process
 * @param extensions - The extension selections
 */
function processFile(filePath: string, extensions: ExtensionsSelection): void {
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
            return;
        }
    }

    // extensions will always have keys since trimExtensions validates this before calling processFile
    const extKeys = Object.keys(extensions);
    const extensionRegex = new RegExp(extKeys.join('|'), 'g');
    if (extensionRegex.test(source)) {
        const lines = source.split('\n');
        const newLines: string[] = [];
        const blockMarkers: { extension: string; line: number }[] = [];
        let skippingBlock = false;
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            if (line.includes(SINGLE_LINE_MARKER)) {
                const matchingExtension = Object.keys(extensions).find((extension) => line.includes(extension));
                if (matchingExtension && extensions[matchingExtension] === false) {
                    // Skip the marker line and the next line (the actual code line)
                    i += 2;
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
                        // Skip the entire block (marker lines are already skipped by skippingBlock)
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

        // Only write if content changed
        const newSource = newLines.join('\n');
        if (newSource !== source) {
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
        }
    }
}

/**
 * Delete extension folders for disabled extensions.
 * @param projectRoot - The project root directory
 * @param extensions - The extension selections
 * @param extensionConfig - The extension configuration
 */
function deleteExtensionFolders(
    projectRoot: string,
    extensions: ExtensionsSelection,
    extensionConfig: typeof ExtensionConfig & { extensions: Record<string, unknown> }
): void {
    const extensionsDir = path.join(projectRoot, 'src', 'extensions');
    if (!fs.existsSync(extensionsDir)) {
        return;
    }

    const configuredExtensions = extensionConfig.extensions;
    const disabledExtensions = Object.keys(extensions).filter((ext) => extensions[ext] === false);

    disabledExtensions.forEach((extKey) => {
        const extensionMeta = configuredExtensions[extKey] as { folder?: string } | undefined;
        if (extensionMeta?.folder) {
            const extensionFolderPath = path.join(extensionsDir, extensionMeta.folder);
            if (fs.existsSync(extensionFolderPath)) {
                try {
                    fs.rmSync(extensionFolderPath, { recursive: true, force: true });
                    if (verbose) {
                        console.log(`Deleted extension folder: ${extensionFolderPath}`);
                    }
                } catch (err: unknown) {
                    const error = err as Error & { code?: string };
                    if (error.code === 'EPERM') {
                        console.error(
                            `Permission denied - cannot delete ${extensionFolderPath}. You may need to run with sudo or check permissions.`
                        );
                    } else {
                        console.error(`Error deleting ${extensionFolderPath}: ${error.message}`);
                    }
                }
            }
        }
    });
}
