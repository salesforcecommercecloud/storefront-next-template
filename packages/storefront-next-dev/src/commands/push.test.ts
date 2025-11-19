import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PushOptions, CloudAPIResponse } from '../types';
// Import after mocks
import { push } from './push';
import { createBundle } from '../bundle';
import { CloudAPIClient } from '../cloud-api';
import { buildMrtConfig } from '../config';
import { getMrtConfig } from '../utils';
import { info, success, warn, error } from '../utils/logger';
import fs from 'fs-extra';

// Mock dependencies - use factory functions to avoid hoisting issues
vi.mock('../bundle', () => ({
    createBundle: vi.fn(() => Promise.resolve('mock-bundle')),
}));

vi.mock('../cloud-api', () => ({
    CloudAPIClient: vi.fn(() => ({
        push: vi.fn(() =>
            Promise.resolve<CloudAPIResponse>({
                url: 'https://example.com/bundle',
                warnings: [],
            })
        ),
        waitForDeploy: vi.fn(() => Promise.resolve()),
    })),
}));

vi.mock('../config', () => ({
    buildMrtConfig: vi.fn(() => ({
        ssrParameters: {},
        ssrOnly: [],
        ssrShared: [],
    })),
}));

vi.mock('../utils', () => ({
    DEFAULT_CLOUD_ORIGIN: 'https://cloud.mobify.com',
    getDefaultBuildDir: vi.fn(() => '/test/build'),
    getCredentialsFile: vi.fn(() => '/test/.credentials'),
    readCredentials: vi.fn(() =>
        Promise.resolve({
            username: 'test@example.com',
            api_key: 'test-api-key',
        })
    ),
    getMrtConfig: vi.fn(() => ({
        defaultMrtProject: 'test-project',
        defaultMrtTarget: 'staging' as string | undefined,
    })),
    getDefaultMessage: vi.fn(() => 'main:abc123'),
}));

vi.mock('../utils/logger', () => ({
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}));

vi.mock('fs-extra', () => ({
    default: {
        existsSync: vi.fn(() => true),
    },
    existsSync: vi.fn(() => true),
}));

describe('push', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mocks to default values
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (getMrtConfig as ReturnType<typeof vi.fn>).mockReturnValue({
            defaultMrtProject: 'test-project',
            defaultMrtTarget: 'staging' as string | undefined,
        });
    });

    it('should successfully push a bundle with minimal options', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
        };

        await push(options);

        expect(createBundle).toHaveBeenCalled();
        expect(success).toHaveBeenCalledWith('Bundle uploaded successfully!');
    });

    it('should use credentials from options when provided', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
            user: 'user@example.com',
            key: 'test-key',
        };

        await push(options);

        expect(createBundle).toHaveBeenCalled();
    });

    it('should wait for deployment when wait flag is set', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
            target: 'staging',
            wait: true,
        };

        await push(options);

        const clientInstance = (CloudAPIClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(clientInstance.waitForDeploy).toHaveBeenCalledWith('test-project', 'staging');
        expect(success).toHaveBeenCalledWith('Deployment complete!');
    });

    it('should use custom build directory when provided', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
            buildDirectory: '/custom/build',
        };

        await push(options);

        expect(buildMrtConfig).toHaveBeenCalledWith('/custom/build', '/test/project');
    });

    it('should use custom message when provided', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
            message: 'Custom deployment message',
        };

        await push(options);

        expect(createBundle).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Custom deployment message',
            })
        );
    });

    it('should throw error when wait is set without target', async () => {
        (getMrtConfig as ReturnType<typeof vi.fn>).mockReturnValue({
            defaultMrtProject: 'test-project',
            defaultMrtTarget: undefined,
        });

        const options: PushOptions = {
            projectDirectory: '/test/project',
            wait: true,
        };

        await expect(push(options)).rejects.toThrow('You must provide a target to deploy to when using --wait');
    });

    it('should throw error when only user is provided without key', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
            user: 'user@example.com',
        };

        await expect(push(options)).rejects.toThrow('You must provide both --user and --key together, or neither');
    });

    it('should throw error when only key is provided without user', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
            key: 'test-key',
        };

        await expect(push(options)).rejects.toThrow('You must provide both --user and --key together, or neither');
    });

    it('should throw error when project directory does not exist', async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

        const options: PushOptions = {
            projectDirectory: '/nonexistent/project',
        };

        await expect(push(options)).rejects.toThrow('Project directory "/nonexistent/project" does not exist!');
    });

    it('should throw error when project slug cannot be determined', async () => {
        (getMrtConfig as ReturnType<typeof vi.fn>).mockReturnValue({
            defaultMrtProject: '',
            defaultMrtTarget: 'staging' as string | undefined,
        });

        const options: PushOptions = {
            projectDirectory: '/test/project',
        };

        await expect(push(options)).rejects.toThrow(
            'Project slug could not be determined from CLI, .env, or package.json'
        );
    });

    it('should throw error when build directory does not exist', async () => {
        (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(true).mockReturnValueOnce(false);

        const options: PushOptions = {
            projectDirectory: '/test/project',
        };

        await expect(push(options)).rejects.toThrow('Build directory "/test/build" does not exist!');
    });

    it('should display warnings from API response', async () => {
        const mockClientInstance = {
            push: vi.fn(() =>
                Promise.resolve<CloudAPIResponse>({
                    url: 'https://example.com/bundle',
                    warnings: ['Warning 1', 'Warning 2'],
                })
            ),
            waitForDeploy: vi.fn(() => Promise.resolve()),
        };
        (CloudAPIClient as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockClientInstance);

        const options: PushOptions = {
            projectDirectory: '/test/project',
        };

        await push(options);

        // warnings.forEach(warn) passes index and array as additional parameters
        expect(warn).toHaveBeenNthCalledWith(1, 'Warning 1', 0, ['Warning 1', 'Warning 2']);
        expect(warn).toHaveBeenNthCalledWith(2, 'Warning 2', 1, ['Warning 1', 'Warning 2']);
    });

    it('should use custom cloud origin when provided', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
            cloudOrigin: 'https://custom-cloud.example.com',
        };

        await push(options);

        expect(info).toHaveBeenCalledWith('Beginning upload to https://custom-cloud.example.com');
    });

    it('should set DEPLOY_TARGET environment variable when target is provided', async () => {
        const options: PushOptions = {
            projectDirectory: '/test/project',
            target: 'production',
        };

        await push(options);

        expect(process.env.DEPLOY_TARGET).toBe('production');
    });

    it('should rethrow errors after logging them', async () => {
        const testError = new Error('Test error');
        (createBundle as ReturnType<typeof vi.fn>).mockRejectedValueOnce(testError);

        const options: PushOptions = {
            projectDirectory: '/test/project',
        };

        await expect(push(options)).rejects.toThrow('Test error');
        expect(error).toHaveBeenCalledWith('Test error');
    });
});
