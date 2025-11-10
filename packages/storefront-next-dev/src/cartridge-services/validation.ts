/**
 * Input validation utilities for cartridge services
 * Validates parameters before calling core business logic functions
 */
import { extname } from 'path';

/**
 * Validation error class for cartridge service parameter validation
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Validate Commerce Cloud instance hostname
 *
 * @param instance - The instance hostname to validate
 * @throws ValidationError if instance is invalid
 */
export function validateInstance(instance: string): void {
    if (!instance || typeof instance !== 'string') {
        throw new ValidationError('Instance parameter is required and must be a string');
    }

    if (instance.trim().length === 0) {
        throw new ValidationError('Instance parameter cannot be empty');
    }

    // Basic format validation for instance
    if (!instance.includes('.')) {
        throw new ValidationError('Parameter instance must be a valid domain name');
    }
}

/**
 * Validate cartridge file (must be a ZIP file)
 *
 * @param cartridgePath - The cartridge file path to validate
 * @throws ValidationError if cartridge is invalid
 */
export function validateCartridgePath(cartridgePath: string): void {
    if (!cartridgePath || typeof cartridgePath !== 'string') {
        throw new ValidationError('cartridge parameter is required and must be a string');
    }

    if (cartridgePath.trim().length === 0) {
        throw new ValidationError('cartridge parameter cannot be empty');
    }

    // Only allow directories (no file extension)
    const ext = extname(cartridgePath).toLowerCase();
    if (ext !== '') {
        throw new ValidationError(`cartridge must be a directory, got: ${ext}`);
    }
}

/**
 * Validate Basic Auth credentials
 *
 * @param basicAuth - The base64 encoded basic auth credentials to validate
 * @throws ValidationError if credentials are invalid
 */
export function validateBasicAuth(basicAuth: string): void {
    if (!basicAuth || typeof basicAuth !== 'string') {
        throw new ValidationError('Basic auth credentials parameter is required and must be a string');
    }

    if (basicAuth.trim().length === 0) {
        throw new ValidationError('Basic auth credentials parameter cannot be empty');
    }

    // Basic validation for base64 encoded credentials
    if (basicAuth.length < 10) {
        throw new ValidationError('Basic auth credentials appear to be too short to be valid');
    }
}

/**
 * Validate code version name
 *
 * @param version - The code version name to validate
 * @throws ValidationError if version is invalid
 */
export function validateVersion(version: string): void {
    if (!version || typeof version !== 'string') {
        throw new ValidationError('Version parameter is required and must be a string');
    }

    if (version.trim().length === 0) {
        throw new ValidationError('Version parameter cannot be empty');
    }

    // Basic version name validation (alphanumeric, hyphens, underscores, dots)
    const versionRegex = /^[a-zA-Z0-9._-]+$/;
    if (!versionRegex.test(version)) {
        throw new ValidationError(
            'Version parameter contains invalid characters. Only alphanumeric, dots, hyphens, and underscores are allowed'
        );
    }
}

/**
 * Validate WebDAV path
 *
 * @param webdavPath - The WebDAV path to validate
 * @throws ValidationError if path is invalid
 */
export function validateWebdavPath(webdavPath: string): void {
    if (!webdavPath || typeof webdavPath !== 'string') {
        throw new ValidationError('WebDAV path parameter is required and must be a string');
    }

    if (!webdavPath.startsWith('/')) {
        throw new ValidationError('WebDAV path must start with a forward slash');
    }
}

/**
 * Validate all parameters for deployCode function
 *
 * @param instance - Commerce Cloud instance hostname
 * @param codeVersionName - Target code version name
 * @param cartridgeDirectoryPath - Path to the source directory
 * @param basicAuth - Base64 encoded basic auth credentials
 * @param cartridgeWebDevPath - WebDAV path for cartridge deployment
 * @throws ValidationError if any parameter is invalid
 */
export function validateDeployCodeParams(
    instance: string,
    codeVersionName: string,
    cartridgeDirectoryPath: string,
    basicAuth: string,
    cartridgeWebDevPath: string
): void {
    validateInstance(instance);
    validateVersion(codeVersionName);
    validateCartridgePath(cartridgeDirectoryPath);
    validateBasicAuth(basicAuth);
    validateWebdavPath(cartridgeWebDevPath);
}
