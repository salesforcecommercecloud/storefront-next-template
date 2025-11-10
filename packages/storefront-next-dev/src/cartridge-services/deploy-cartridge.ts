/**
 * Core cartridge business logic
 * Contains the actual implementation without validation
 */

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import {
    type DeployResult,
    type HttpResponse,
    WEBDAV_BASE,
    CARTRIDGES_PATH,
    HTTP_METHODS,
    CONTENT_TYPES,
    WEBDAV_OPERATIONS,
} from './types.js';
import { getWebdavOptions, checkAuthenticationError, makeRequest } from './sfcc-client.js';
import { validateDeployCodeParams } from './validation.js';

/**
 * Extract the filename (including extension) from a file path
 *
 * @param filePath - The full path to the file
 * @returns The filename portion of the path (e.g., 'archive.zip' from '/path/to/archive.zip')
 */
function getFilename(filePath: string): string {
    return path.basename(filePath);
}

/**
 * Create a ZIP cartridge from a directory
 *
 * @param sourceDir - The directory to zip
 * @param outputPath - The output ZIP file path (can be same as sourceDir)
 * @returns Promise resolving when the ZIP file is created
 */
async function zipCartridge(sourceDir: string, outputPath: string): Promise<void> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(outputPath);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    await archive.finalize();
}

/**
 * Build the WebDAV endpoint URL for a file
 *
 * @param instance - The Commerce Cloud instance hostname
 * @param path - The WebDAV path (e.g., 'Cartridges/local_metadata')
 * @param file - The local file path (filename will be extracted)
 * @returns The complete WebDAV endpoint URL
 */
function buildWebdavEndpoint(instance: string, webdavPath: string, file: string): string {
    const filename = getFilename(file);
    return `https://${instance}${WEBDAV_BASE}/${webdavPath}/${filename}`;
}

/**
 * Unzip an uploaded archive file on Commerce Cloud via WebDAV
 *
 * @param instance - The Commerce Cloud instance hostname
 * @param path - The WebDAV path where the file was uploaded
 * @param file - The local file path (used to determine the remote filename)
 * @param basicAuth - Base64 encoded basic authentication credentials
 * @returns Promise resolving to HTTP response and body from the unzip operation
 */
async function unzip(
    instance: string,
    webdavPath: string,
    file: string,
    basicAuth: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ response: HttpResponse; body: any }> {
    const endpoint = buildWebdavEndpoint(instance, webdavPath, file);
    const opts = getWebdavOptions(instance, webdavPath, basicAuth, HTTP_METHODS.POST, {
        method: WEBDAV_OPERATIONS.UNZIP,
        target: WEBDAV_OPERATIONS.TARGET_CARTRIDGES,
    });
    opts.uri = endpoint;
    const result = await makeRequest(opts);
    checkAuthenticationError(result.response);
    return result;
}

/**
 * Delete a file from Commerce Cloud via WebDAV
 *
 * @param instance - The Commerce Cloud instance hostname
 * @param path - The WebDAV path where the file is located
 * @param file - The local file path (used to determine the remote filename)
 * @param basicAuth - Base64 encoded basic authentication credentials
 * @returns Promise resolving to HTTP response and body from the delete operation
 */
async function deleteFile(
    instance: string,
    webdavPath: string,
    file: string,
    basicAuth: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ response: HttpResponse; body: any }> {
    const endpoint = buildWebdavEndpoint(instance, webdavPath, file);
    const opts = getWebdavOptions(instance, webdavPath, basicAuth, HTTP_METHODS.DELETE);
    opts.uri = endpoint;
    const result = await makeRequest(opts);
    checkAuthenticationError(result.response);
    return result;
}

/**
 * Upload a file to a specific cartridge version on Commerce Cloud via WebDAV (internal function)
 *
 * @param instance - The Commerce Cloud instance hostname
 * @param codeVersionName - The target code version name
 * @param filePath - The local file path to upload
 * @param basicAuth - Base64 encoded basic authentication credentials
 * @returns Promise resolving to HTTP response and body from the upload operation
 */
async function postFile(
    instance: string,
    codeVersionName: string,
    filePath: string,
    basicAuth: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ response: HttpResponse; body: any }> {
    const targetPath = `${CARTRIDGES_PATH}/${codeVersionName}`;

    try {
        const endpoint = buildWebdavEndpoint(instance, targetPath, filePath);
        const opts = getWebdavOptions(instance, targetPath, basicAuth, HTTP_METHODS.PUT);
        opts.uri = endpoint;

        // Stream the ZIP file for upload - uses fs.createReadStream for memory efficiency
        // This allows uploading large cartridges without loading them entirely into memory
        opts.body = fs.createReadStream(filePath);

        // Add duplex: 'half' - required by Node.js fetch for streaming bodies
        opts.duplex = 'half';
        opts.headers = {
            ...opts.headers,
            'Content-Type': CONTENT_TYPES.APPLICATION_ZIP,
        };

        const result = await makeRequest(opts);
        checkAuthenticationError(result.response);

        if (![200, 201, 204].includes(result.response.statusCode)) {
            throw new Error(
                `Post file "${filePath}" failed: ${result.response.statusCode} (${result.response.statusMessage})`
            );
        }

        return result;
    } catch (error) {
        throw new Error(`Post file "${filePath}" failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Deploy code to Commerce Cloud by uploading, unzipping, and cleaning up
 *
 * This function performs a complete code deployment workflow:
 * 1. Uploads the archive file via WebDAV to the specified cartridge version
 * 2. Unzips the archive on the server
 * 3. Deletes the uploaded archive file
 * 4. Returns the deployed version name
 *
 * @param instance - The Commerce Cloud instance hostname
 * @param codeVersionName - The target code version name
 * @param sourceDir - The local directory containing the source files to deploy
 * @param basicAuth - Base64 encoded basic authentication credentials
 * @returns Promise resolving to deployment result with the version name
 * @throws Error if any step of the deployment process fails
 */
async function deployCode(
    instance: string,
    codeVersionName: string,
    sourceDir: string,
    basicAuth: string
): Promise<DeployResult> {
    const cartridgePath = `/${CARTRIDGES_PATH}/${codeVersionName}/cartridges`;

    validateDeployCodeParams(instance, codeVersionName, sourceDir, basicAuth, cartridgePath);

    // Create a temporary ZIP file in the same directory as sourceDir
    const tempZipPath = path.join(path.dirname(sourceDir), `metadata-${Date.now()}.zip`);

    try {
        // Step 0: Create ZIP cartridge from source directory
        await zipCartridge(sourceDir, tempZipPath);
        const file = path.basename(tempZipPath);

        // Step 1: Upload metadata cartridge
        // Note: postFile already validates status codes [200, 201, 204] and throws on failure
        await postFile(instance, codeVersionName, tempZipPath, basicAuth);

        // Step 2: Unzip file to cartridges subdirectory
        const unzipResult = await unzip(instance, `${CARTRIDGES_PATH}/${codeVersionName}`, file, basicAuth);
        if (![200, 201, 202].includes(unzipResult.response.statusCode)) {
            throw new Error(
                `Deploy code ${file} failed (unzip step): ${unzipResult.response.statusCode} (${unzipResult.response.statusMessage})`
            );
        }

        // Step 3: Delete ZIP file
        const deleteResult = await deleteFile(instance, `${CARTRIDGES_PATH}/${codeVersionName}`, file, basicAuth);
        if (![200, 204].includes(deleteResult.response.statusCode)) {
            throw new Error(
                `Delete ZIP file ${file} after deployment failed (deleteFile step): ${deleteResult.response.statusCode} (${deleteResult.response.statusMessage})`
            );
        }

        // Generate version name
        const version = getFilename(file).replace('.zip', '');
        return { version };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`Deploy code ${sourceDir} failed: ${String(error)}`);
    } finally {
        // Clean up temporary ZIP file
        if (fs.existsSync(tempZipPath)) {
            fs.unlinkSync(tempZipPath);
        }
    }
}

export { deployCode };
