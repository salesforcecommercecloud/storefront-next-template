import { describe, test, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

// Mock the outgoing requests
vi.mock('../sfcc-client', () => ({
    getWebdavOptions: vi.fn(),
    makeRequest: vi.fn(),
    checkAuthenticationError: vi.fn(),
}));

vi.mock('../validation', () => ({
    validateDeployCodeParams: vi.fn(),
}));

vi.mock('archiver', () => ({
    default: vi.fn(() => ({
        pipe: vi.fn(),
        directory: vi.fn(),
        finalize: vi.fn().mockResolvedValue(undefined),
    })),
}));

vi.mock('fs', () => ({
    default: {
        mkdtempSync: vi.fn(() => '/tmp/test-dir'),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(() => true),
        rmSync: vi.fn(),
        readdirSync: vi.fn(() => []),
        unlinkSync: vi.fn(),
        createWriteStream: vi.fn(() => ({
            on: vi.fn(),
            write: vi.fn(),
            end: vi.fn(),
        })),
        createReadStream: vi.fn(() => ({
            pipe: vi.fn(),
            on: vi.fn(),
        })),
    },
    mkdtempSync: vi.fn(() => '/tmp/test-dir'),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => true),
    rmSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    unlinkSync: vi.fn(),
    createWriteStream: vi.fn(() => ({
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
    })),
    createReadStream: vi.fn(() => ({
        pipe: vi.fn(),
        on: vi.fn(),
    })),
}));

// Import after mocking
import { deployCode } from '../deploy-cartridge';

describe('Core Functions', () => {
    // testSourceDir represents the source directory that gets zipped up and deployed
    // /tmp/test-source -> /tmp/metadata-123.zip -> uploaded to SFCC
    const testSourceDir = '/tmp/test-source';

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('deployCode', () => {
        test('should successfully deploy a directory', async () => {
            const { getWebdavOptions, makeRequest, checkAuthenticationError } = await import('../sfcc-client');
            const { validateDeployCodeParams } = await import('../validation');

            // Mock successful responses with different methods for each call
            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest).mockResolvedValue({
                response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                body: {},
            });

            vi.mocked(checkAuthenticationError).mockReturnValue(undefined);

            // Spy on fs.createReadStream to verify the file path
            const createReadStreamSpy = vi.spyOn(fs, 'createReadStream');

            const result = await deployCode(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ='
            );

            // Verify validation was called first
            expect(validateDeployCodeParams).toHaveBeenCalledWith(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ=',
                '/Cartridges/test-version/cartridges'
            );

            // Verify HTTP requests were made in correct sequence
            expect(getWebdavOptions).toHaveBeenCalledTimes(3); // Called for upload, unzip, delete
            expect(makeRequest).toHaveBeenCalledTimes(3); // upload, unzip, delete

            // Verify sequence: upload (PUT) -> unzip (POST) -> delete (DELETE)
            const calls = vi.mocked(makeRequest).mock.calls;
            expect(calls[0][0].method).toBe('PUT'); // Upload call
            expect(calls[1][0].method).toBe('POST'); // Unzip call
            expect(calls[2][0].method).toBe('DELETE'); // Delete call

            // Verify file operations were called
            expect(fs.createWriteStream).toHaveBeenCalled();
            expect(fs.unlinkSync).toHaveBeenCalled();

            // Verify fs.createReadStream was called with full file path (not just filename)
            const callArgs = createReadStreamSpy.mock.calls[0][0];
            expect(callArgs).toContain('/tmp/metadata-');
            expect(callArgs).toContain('.zip');
            expect(result.version).toBeDefined();
            expect(typeof result.version).toBe('string');
        });

        test('should handle upload failure', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');
            const { validateDeployCodeParams } = await import('../validation');

            // Mock successful getWebdavOptions but failed upload
            vi.mocked(getWebdavOptions).mockReturnValue({
                baseUrl: 'https://test-instance',
                uri: '/test/path',
                method: 'PUT',
                auth: { basic: 'test' },
            });

            vi.mocked(makeRequest).mockResolvedValue({
                response: { statusCode: 400, statusMessage: 'Bad Request', headers: {} },
                body: {},
            });

            await expect(
                deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=')
            ).rejects.toThrow('Post file');

            expect(validateDeployCodeParams).toHaveBeenCalled();
            expect(getWebdavOptions).toHaveBeenCalledTimes(1); // Only upload attempt
            expect(makeRequest).toHaveBeenCalledTimes(1); // Only upload attempt

            // Verify sequence stops after upload failure
            const calls = vi.mocked(makeRequest).mock.calls;
            expect(calls[0][0].method).toBe('PUT'); // Upload call
            expect(calls[1]).toBeUndefined(); // No unzip call
            expect(calls[2]).toBeUndefined(); // No delete call
        });

        test('should handle unzip failure', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');
            const { validateDeployCodeParams } = await import('../validation');

            // Mock successful upload, failed unzip with different methods
            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    // Upload success
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    // Unzip failure
                    response: { statusCode: 500, statusMessage: 'Internal Server Error', headers: {} },
                    body: {},
                });

            await expect(
                deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=')
            ).rejects.toThrow('Deploy code');

            expect(validateDeployCodeParams).toHaveBeenCalled();
            expect(getWebdavOptions).toHaveBeenCalledTimes(2); // Upload and unzip attempts
            expect(makeRequest).toHaveBeenCalledTimes(2); // Upload and unzip attempts

            // Verify sequence stops after unzip failure
            const calls = vi.mocked(makeRequest).mock.calls;
            expect(calls[0][0].method).toBe('PUT'); // Upload call
            expect(calls[1][0].method).toBe('POST'); // Unzip call
            expect(calls[2]).toBeUndefined(); // No delete call
        });

        test('should handle delete failure', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');
            const { validateDeployCodeParams } = await import('../validation');

            // Mock successful upload and unzip, failed delete with different methods
            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    // Upload success
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    // Unzip success
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    // Delete failure
                    response: { statusCode: 500, statusMessage: 'Internal Server Error', headers: {} },
                    body: {},
                });

            await expect(
                deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=')
            ).rejects.toThrow('Delete ZIP file');

            expect(validateDeployCodeParams).toHaveBeenCalled();
            expect(getWebdavOptions).toHaveBeenCalledTimes(3); // Upload, unzip, and delete attempts
            expect(makeRequest).toHaveBeenCalledTimes(3); // Upload, unzip, and delete attempts

            // Verify complete sequence: upload (PUT) -> unzip (POST) -> delete (DELETE)
            const calls = vi.mocked(makeRequest).mock.calls;
            expect(calls[0][0].method).toBe('PUT'); // Upload call
            expect(calls[1][0].method).toBe('POST'); // Unzip call
            expect(calls[2][0].method).toBe('DELETE'); // Delete call
        });

        test('should clean up temporary ZIP file on success', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            // Mock successful responses
            vi.mocked(getWebdavOptions).mockReturnValue({
                baseUrl: 'https://test-instance',
                uri: '/test/path',
                method: 'PUT',
                auth: { basic: 'test' },
            });

            vi.mocked(makeRequest).mockResolvedValue({
                response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                body: {},
            });

            await deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=');

            // Verify file operations were called
            expect(fs.createWriteStream).toHaveBeenCalled();
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should clean up temporary ZIP file on failure', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            // Mock successful validation but failed upload
            vi.mocked(getWebdavOptions).mockReturnValue({
                baseUrl: 'https://test-instance',
                uri: '/test/path',
                method: 'PUT',
                auth: { basic: 'test' },
            });

            vi.mocked(makeRequest).mockResolvedValue({
                response: { statusCode: 400, statusMessage: 'Bad Request', headers: {} },
                body: {},
            });

            await expect(
                deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=')
            ).rejects.toThrow();

            // Verify cleanup is attempted even on failure
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should handle status code 201 for upload', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    response: { statusCode: 201, statusMessage: 'Created', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                });

            const result = await deployCode(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ='
            );

            expect(result.version).toBeDefined();
        });

        test('should handle status code 204 for upload', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    response: { statusCode: 204, statusMessage: 'No Content', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                });

            const result = await deployCode(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ='
            );

            expect(result.version).toBeDefined();
        });

        test('should handle status code 201 for unzip', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 201, statusMessage: 'Created', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                });

            const result = await deployCode(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ='
            );

            expect(result.version).toBeDefined();
        });

        test('should handle status code 202 for unzip', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 202, statusMessage: 'Accepted', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                });

            const result = await deployCode(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ='
            );

            expect(result.version).toBeDefined();
        });

        test('should handle status code 204 for delete', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 204, statusMessage: 'No Content', headers: {} },
                    body: {},
                });

            const result = await deployCode(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ='
            );

            expect(result.version).toBeDefined();
        });

        test('should handle makeRequest throwing an error in postFile', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions).mockReturnValue({
                baseUrl: 'https://test-instance',
                uri: '/test/path',
                method: 'PUT',
                auth: { basic: 'test' },
            });

            vi.mocked(makeRequest).mockRejectedValue(new Error('Network error'));

            await expect(
                deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=')
            ).rejects.toThrow('Post file');

            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should handle non-Error exception in deployCode', async () => {
            // Mock zipCartridge to throw a non-Error exception
            const archiver = await import('archiver');
            vi.mocked(archiver.default).mockImplementation(() => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw 'String error';
            });

            try {
                await deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=');
                expect.fail('Should have thrown an error');
            } catch (error) {
                // When a non-Error is thrown, it's wrapped in a new Error
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('Deploy code /tmp/test-source failed: String error');
            }
        });

        test('should handle upload status code not in [200, 201, 204] from postFile', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions).mockReturnValue({
                baseUrl: 'https://test-instance',
                uri: '/test/path',
                method: 'PUT',
                auth: { basic: 'test' },
            });

            vi.mocked(makeRequest).mockResolvedValue({
                response: { statusCode: 403, statusMessage: 'Forbidden', headers: {} },
                body: {},
            });

            await expect(
                deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=')
            ).rejects.toThrow('Post file');

            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should handle unzip status code not in [200, 201, 202]', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 403, statusMessage: 'Forbidden', headers: {} },
                    body: {},
                });

            await expect(
                deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=')
            ).rejects.toThrow('Deploy code');

            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should handle delete status code not in [200, 204]', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest)
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                    body: {},
                })
                .mockResolvedValueOnce({
                    response: { statusCode: 403, statusMessage: 'Forbidden', headers: {} },
                    body: {},
                });

            await expect(
                deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=')
            ).rejects.toThrow('Delete ZIP file');

            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should not call unlinkSync if file does not exist', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(fs.existsSync).mockReturnValue(false);

            vi.mocked(getWebdavOptions)
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'PUT',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'POST',
                    auth: { basic: 'test' },
                })
                .mockReturnValueOnce({
                    baseUrl: 'https://test-instance',
                    uri: '/test/path',
                    method: 'DELETE',
                    auth: { basic: 'test' },
                });

            vi.mocked(makeRequest).mockResolvedValue({
                response: { statusCode: 200, statusMessage: 'OK', headers: {} },
                body: {},
            });

            await deployCode('test-instance.com', 'test-version', testSourceDir, 'dXNlcm5hbWU6cGFzc3dvcmQ=');

            // Verify unlinkSync was not called when file doesn't exist
            expect(fs.unlinkSync).not.toHaveBeenCalled();
        });

        test('should handle error in postFile catch block with Error instance', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions).mockReturnValue({
                baseUrl: 'https://test-instance',
                uri: '/test/path',
                method: 'PUT',
                auth: { basic: 'test' },
            });

            const testError = new Error('Custom error message');
            vi.mocked(makeRequest).mockRejectedValue(testError);

            const error = await deployCode(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ='
            ).catch((e) => e);

            expect(error.message).toContain('Post file');
            expect(error.message).toContain('Custom error message');
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should handle error in postFile catch block with non-Error instance', async () => {
            const { getWebdavOptions, makeRequest } = await import('../sfcc-client');

            vi.mocked(getWebdavOptions).mockReturnValue({
                baseUrl: 'https://test-instance',
                uri: '/test/path',
                method: 'PUT',
                auth: { basic: 'test' },
            });

            vi.mocked(makeRequest).mockRejectedValue('String error');

            const error = await deployCode(
                'test-instance.com',
                'test-version',
                testSourceDir,
                'dXNlcm5hbWU6cGFzc3dvcmQ='
            ).catch((e) => e);

            expect(error.message).toContain('Post file');
            expect(error.message).toContain('String error');
            expect(fs.unlinkSync).toHaveBeenCalled();
        });
    });
});
