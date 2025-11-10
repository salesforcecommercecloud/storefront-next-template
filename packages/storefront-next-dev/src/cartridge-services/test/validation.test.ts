import { describe, test, expect } from 'vitest';
import {
    ValidationError,
    validateInstance,
    validateCartridgePath,
    validateBasicAuth,
    validateVersion,
    validateWebdavPath,
    validateDeployCodeParams,
} from '../validation.js';

// Test data
const testCases = {
    valid: {
        instance: 'test-instance.dx.commercecloud.salesforce.com',
        version: 'version1',
        basicAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
        webdavPath: '/cartridges/local_metadata',
    },
    invalid: {
        empty: '',
        null: null as any,
        undefined: undefined as any,
        whitespace: '   ',
        noDomain: 'test-instance',
        invalidBase64: 'invalid-base64!',
        invalidPath: 'invalid/path',
    },
};

describe('Validation Functions', () => {
    describe('validateInstance', () => {
        test('valid instance', () => {
            expect(() => validateInstance(testCases.valid.instance)).not.toThrow();
        });

        test('invalid cases', () => {
            expect(() => validateInstance(testCases.invalid.empty)).toThrow(ValidationError);
            expect(() => validateInstance(testCases.invalid.null)).toThrow(ValidationError);
            expect(() => validateInstance(testCases.invalid.undefined)).toThrow(ValidationError);
            expect(() => validateInstance(testCases.invalid.whitespace)).toThrow(ValidationError);
            expect(() => validateInstance(testCases.invalid.noDomain)).toThrow(ValidationError);
        });
    });

    describe('validateCartridgePath - validating path of the cartridge', () => {
        test('valid cartridge directory', () => {
            expect(() => validateCartridgePath('/path/to/project/build/cartridge/experience')).not.toThrow();
        });

        test('invalid cases', () => {
            expect(() => validateCartridgePath(testCases.invalid.empty)).toThrow(ValidationError);
            expect(() => validateCartridgePath(testCases.invalid.null)).toThrow(ValidationError);
            expect(() => validateCartridgePath(testCases.invalid.undefined)).toThrow(ValidationError);
            expect(() => validateCartridgePath(testCases.invalid.whitespace)).toThrow(ValidationError);
            expect(() => validateCartridgePath('test.zip')).toThrow('cartridge must be a directory, got: .zip');
            expect(() => validateCartridgePath('test.txt')).toThrow('cartridge must be a directory, got: .txt');
        });
    });

    describe('validateBasicAuth', () => {
        test('valid basic auth', () => {
            expect(() => validateBasicAuth(testCases.valid.basicAuth)).not.toThrow();
        });

        test('invalid cases', () => {
            expect(() => validateBasicAuth(testCases.invalid.empty)).toThrow(ValidationError);
            expect(() => validateBasicAuth(testCases.invalid.null)).toThrow(ValidationError);
            expect(() => validateBasicAuth(testCases.invalid.undefined)).toThrow(ValidationError);
            expect(() => validateBasicAuth(testCases.invalid.whitespace)).toThrow(ValidationError);
            expect(() => validateBasicAuth('short')).toThrow(ValidationError);
        });
    });

    describe('validateVersion', () => {
        test('valid version', () => {
            expect(() => validateVersion(testCases.valid.version)).not.toThrow();
        });

        test('invalid cases', () => {
            expect(() => validateVersion(testCases.invalid.empty)).toThrow(ValidationError);
            expect(() => validateVersion(testCases.invalid.null)).toThrow(ValidationError);
            expect(() => validateVersion(testCases.invalid.undefined)).toThrow(ValidationError);
            expect(() => validateVersion(testCases.invalid.whitespace)).toThrow(ValidationError);
        });

        test('invalid characters in version', () => {
            // Test version with invalid characters (special characters not allowed)
            expect(() => validateVersion('version@1')).toThrow(ValidationError);
            expect(() => validateVersion('version#1')).toThrow(ValidationError);
            expect(() => validateVersion('version$1')).toThrow(ValidationError);
            expect(() => validateVersion('version%1')).toThrow(ValidationError);
            expect(() => validateVersion('version!1')).toThrow(ValidationError);
            expect(() => validateVersion('version 1')).toThrow(ValidationError); // space
            expect(() => validateVersion('version/1')).toThrow(ValidationError); // forward slash
            expect(() => validateVersion('version\\1')).toThrow(ValidationError); // backslash
        });
    });

    describe('validateWebdavPath', () => {
        test('valid webdav path', () => {
            expect(() => validateWebdavPath(testCases.valid.webdavPath)).not.toThrow();
        });

        test('invalid cases', () => {
            expect(() => validateWebdavPath(testCases.invalid.empty)).toThrow(ValidationError);
            expect(() => validateWebdavPath(testCases.invalid.null)).toThrow(ValidationError);
            expect(() => validateWebdavPath(testCases.invalid.undefined)).toThrow(ValidationError);
            expect(() => validateWebdavPath(testCases.invalid.whitespace)).toThrow(ValidationError);
            expect(() => validateWebdavPath(testCases.invalid.invalidPath)).toThrow(ValidationError);
        });
    });

    describe('validateDeployCodeParams', () => {
        test('valid parameters', () => {
            expect(() =>
                validateDeployCodeParams(
                    testCases.valid.instance,
                    testCases.valid.version,
                    '/path/to/project/build/cartridge/experience',
                    testCases.valid.basicAuth,
                    testCases.valid.webdavPath
                )
            ).not.toThrow();
        });

        test('invalid cases', () => {
            expect(() =>
                validateDeployCodeParams(
                    testCases.invalid.empty,
                    testCases.valid.version,
                    '/path/to/project/build/cartridge/experience',
                    testCases.valid.basicAuth,
                    testCases.valid.webdavPath
                )
            ).toThrow(ValidationError);

            expect(() =>
                validateDeployCodeParams(
                    testCases.valid.instance,
                    testCases.invalid.empty,
                    '/path/to/project/build/cartridge/experience',
                    testCases.valid.basicAuth,
                    testCases.valid.webdavPath
                )
            ).toThrow(ValidationError);

            expect(() =>
                validateDeployCodeParams(
                    testCases.valid.instance,
                    testCases.valid.version,
                    testCases.invalid.empty,
                    testCases.valid.basicAuth,
                    testCases.valid.webdavPath
                )
            ).toThrow(ValidationError);

            expect(() =>
                validateDeployCodeParams(
                    testCases.valid.instance,
                    testCases.valid.version,
                    '/path/to/project/build/cartridge/experience',
                    testCases.invalid.empty,
                    testCases.valid.webdavPath
                )
            ).toThrow(ValidationError);
        });
    });

    describe('ValidationError', () => {
        test('creates error with correct name', () => {
            const error = new ValidationError('Test error');
            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe('Test error');
        });
    });
});
