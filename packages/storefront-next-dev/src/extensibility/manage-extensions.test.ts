import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { manageExtensions, createExtension } from './manage-extensions';
import { execSync } from 'child_process';
import prompts from 'prompts';
import trimExtensions from './trim-extensions';

const SOURCE_GIT_URL = 'https://github.com/SalesforceCommerceCloud/storefront-next-template.git';
const MOCK_NOW = 1731273600000;

vi.mock('prompts', () => ({
    __esModule: true,
    default: vi.fn(() => {
        return {
            sourceGitUrl: SOURCE_GIT_URL,
        };
    }),
}));

vi.mock('child_process', () => ({
    execSync: vi.fn(),
}));

vi.mock('os', () => {
    const tmpdir = vi.fn(() => '/tmp');
    return {
        tmpdir,
        default: { tmpdir },
    };
});

vi.mock('./trim-extensions', () => ({
    default: vi.fn(),
}));

const consoleLog = vi.fn();
vi.spyOn(console, 'log').mockImplementation(consoleLog);
vi.spyOn(console, 'error').mockImplementation(consoleLog);

describe('manageExtensions', () => {
    const getExtensionConfigPath = (dir: string) => path.join(dir, 'src', 'extensions', 'config.json');

    beforeEach(() => {
        vi.clearAllMocks();
        // Sanity stub for fs
        const existngPaths = [
            getExtensionConfigPath('/test-project'),
            getExtensionConfigPath(path.join('/tmp', 'fake-temp-dir')),
            getExtensionConfigPath(path.join('/tmp', `sfnext-extensions-${MOCK_NOW}`)),
            path.join('/test-project', 'src', 'extensions', 'my-extension2'),
        ];
        vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => existngPaths.includes(filePath as string));
        vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
            if (
                filePath === getExtensionConfigPath('/test-project') ||
                filePath === getExtensionConfigPath(`/tmp/sfnext-extensions-${MOCK_NOW}`)
            ) {
                return JSON.stringify({
                    extensions: {
                        SFDC_EXT_STORE_LOCATOR: {
                            name: 'Store Locator',
                            description: 'Store Locator allows a shopper to find the closest store to them.',
                            installationInstructions: 'instructions/install-store-locator.mdc',
                            uninstallationInstructions: 'instructions/uninstall-store-locator.mdc',
                        },
                    },
                });
            }
            return '{}';
        });
        vi.spyOn(fs, 'mkdtempSync').mockReturnValue(`/tmp/sfnext-extensions-${MOCK_NOW}`);
        vi.spyOn(fs, 'readdirSync').mockImplementationOnce((dir, options) => {
            if (dir === '/test-project/src' && options?.recursive) {
                return ['index.tsx.original'] as any;
            }
            return ['index.tsx'] as any;
        });
        vi.spyOn(fs, 'readdirSync').mockReturnValue(['index.tsx'] as any);
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => '' as any);
    });

    it('should abort if install and uninstall are both provided', async () => {
        await manageExtensions({ projectDirectory: '/test-project', install: true, uninstall: true });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Please select either install or uninstall, not both.')
        );
    });

    it('should ask for operation if not provided', async () => {
        (prompts as unknown as { mockResolvedValueOnce: (value: any) => void }).mockResolvedValueOnce({
            operation: 'uninstall',
        });
        await manageExtensions({ projectDirectory: '/test-project' });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Please select at least one extension to uninstall')
        );
    });

    /** Uninstall test cases starts here */
    it('should abort if no extension is installed', async () => {
        vi.spyOn(fs, 'readFileSync').mockReturnValue('{"extensions": {}}');
        await manageExtensions({ projectDirectory: '/test-project', uninstall: true });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('You have not installed any extensions yet.')
        );
    });

    it('should abort if no extension is selected', async () => {
        (prompts as unknown as { mockResolvedValueOnce: (value: any) => void }).mockResolvedValueOnce({
            operation: 'uninstall',
            selectedExtensions: null,
        });
        await manageExtensions({ projectDirectory: '/test-project', uninstall: true });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Please select at least one extension to uninstall.')
        );
    });

    it('should run uninstall based on -u flag', async () => {
        (prompts as unknown as { mockResolvedValueOnce: (value: any) => void }).mockResolvedValueOnce({
            operation: 'uninstall',
            extensions: ['SFDC_EXT_STORE_LOCATOR'],
        });
        await manageExtensions({
            projectDirectory: '/test-project',
            uninstall: true,
            extensions: ['SFDC_EXT_STORE_LOCATOR'],
        });
        expect(trimExtensions).toHaveBeenCalledWith(
            '/test-project',
            {},
            {
                extensions: {
                    SFDC_EXT_STORE_LOCATOR: {
                        name: 'Store Locator',
                        description: 'Store Locator allows a shopper to find the closest store to them.',
                        installationInstructions: 'instructions/install-store-locator.mdc',
                        uninstallationInstructions: 'instructions/uninstall-store-locator.mdc',
                    },
                },
            },
            false
        );
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Extensions uninstalled.'));
    });

    /** Install test cases starts here */
    it('should abort if cursor-agent is not installed', async () => {
        (execSync as any).mockImplementationOnce(() => {
            throw new Error('not installed');
        });
        await manageExtensions({
            projectDirectory: '/test-project',
            install: true,
            sourceGitUrl: SOURCE_GIT_URL,
        });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining(
                'Cursor cli is not installed. Please install it (https://cursor.com/docs/cli/overview) and try again. not installed'
            )
        );
    });

    it('should abort if no extensions are found in the source project', async () => {
        vi.spyOn(fs, 'readFileSync').mockReturnValue('{}');
        (prompts as unknown as { mockResolvedValueOnce: (value: any) => void }).mockResolvedValueOnce({
            sourceGitUrl: SOURCE_GIT_URL,
        });
        await manageExtensions({
            projectDirectory: '/test-project',
            install: true,
            sourceGitUrl: SOURCE_GIT_URL,
        });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining(
                'No extensions found in the source project, please check src/extensions/config.json exists'
            )
        );
    });

    it('should abort if no extensions are selected', async () => {
        (prompts as unknown as { mockResolvedValueOnce: (value: any) => void }).mockResolvedValueOnce({
            operation: 'install',
            selectedExtensions: null,
        });
        await manageExtensions({
            projectDirectory: '/test-project',
            install: true,
            sourceGitUrl: SOURCE_GIT_URL,
        });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Please select extactly one extension to install.')
        );
    });

    it('should run install based on -i flag', async () => {
        (prompts as unknown as { mockResolvedValueOnce: (value: any) => void }).mockResolvedValueOnce({
            operation: 'install',
            extensions: ['SFDC_EXT_STORE_LOCATOR'],
        });
        await manageExtensions({
            projectDirectory: '/test-project',
            install: true,
            sourceGitUrl: SOURCE_GIT_URL,
            extensions: ['SFDC_EXT_STORE_LOCATOR'],
        });
        expect(execSync).toHaveBeenCalledWith(
            `cursor-agent -p --force 'Execute the steps specified in the installation instructions file: instructions/install-store-locator.mdc' --model "gpt-5" --output-format text`,
            { cwd: '/test-project', stdio: 'inherit' }
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('✅ Store Locator was installed successfully.')
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining(
                'The following files were modified. The original files are still available in the same location with the ".original" extension.:'
            )
        );
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('- index.tsx'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Installation completed successfully.'));
    });

    it('should error and exit if error occurs during installation', async () => {
        (execSync as any).mockImplementation((command: string) => {
            if (command.includes('cursor-agent -p --force')) {
                throw new Error('error');
            }
            return '';
        });
        await manageExtensions({
            projectDirectory: '/test-project',
            install: true,
            sourceGitUrl: SOURCE_GIT_URL,
            extensions: ['SFDC_EXT_STORE_LOCATOR'],
        });
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error installing Store Locator. error'));
    });

    it('should error and exit if no installation instructions are found', async () => {
        vi.spyOn(fs, 'readFileSync').mockReturnValue(
            '{"extensions": { "SFDC_EXT_STORE_LOCATOR": { "name": "Store Locator", "description": "Store Locator allows a shopper to find the closest store to them." } }}'
        );
        await manageExtensions({
            projectDirectory: '/test-project',
            install: true,
            sourceGitUrl: SOURCE_GIT_URL,
            extensions: ['SFDC_EXT_STORE_LOCATOR'],
        });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining(
                'Store Locator has no installation instructions, pleae contact the extension author to get the instructions.'
            )
        );
    });

    it('should error and exit if no config is found', async () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('exit');
        });
        await expect(manageExtensions({ projectDirectory: '/not-exist' })).rejects.toThrow('exit');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Extension config file not found'));
        exitSpy.mockRestore();
    });

    it('should create an extension', async () => {
        (prompts as unknown as { mockResolvedValueOnce: (value: any) => void }).mockResolvedValueOnce({
            extensionName: 'My Extension',
        });
        (prompts as unknown as { mockResolvedValueOnce: (value: any) => void }).mockResolvedValueOnce({
            extensionDescription: 'My Extension description',
        });
        await createExtension({ projectDirectory: '/test-project', name: '', description: '' });
        expect(fs.mkdirSync).toHaveBeenCalledWith(
            path.join('/test-project', 'src', 'extensions', 'my-extension', 'components'),
            { recursive: true }
        );
        expect(fs.mkdirSync).toHaveBeenCalledWith(
            path.join('/test-project', 'src', 'extensions', 'my-extension', 'locales'),
            { recursive: true }
        );
        expect(fs.mkdirSync).toHaveBeenCalledWith(
            path.join('/test-project', 'src', 'extensions', 'my-extension', 'hooks'),
            { recursive: true }
        );
        expect(fs.mkdirSync).toHaveBeenCalledWith(
            path.join('/test-project', 'src', 'extensions', 'my-extension', 'routes'),
            { recursive: true }
        );
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.join('/test-project', 'src', 'extensions', 'my-extension', 'README.md'),
            `# My Extension\n\nMy Extension description`
        );

        // Get the second call (config.json write)
        const configWriteCall = (fs.writeFileSync as any).mock.calls[1];
        expect(configWriteCall[0]).toBe(path.join('/test-project', 'src', 'extensions', 'config.json'));

        // Parse and verify the JSON structure
        const writtenConfig = JSON.parse(configWriteCall[1]);
        expect(writtenConfig.extensions.SFDC_EXT_MY_EXTENSION).toEqual({
            name: 'My Extension',
            description: 'My Extension description',
            installationInstructions: '',
            uninstallationInstructions: '',
            folder: 'my-extension',
            dependencies: [],
        });
    });

    it('should prevent invalid extension name', async () => {
        await createExtension({
            projectDirectory: '/test-project',
            name: 'My Extension$',
            description: 'My Extension description',
        });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining(
                'Extension name can only contain alphanumeric characters, spaces, dashes, or underscores'
            )
        );
    });

    it('should prevent extension name that already exists', async () => {
        await createExtension({
            projectDirectory: '/test-project',
            name: 'Store Locator',
            description: 'Store Locator description',
        });
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Extension "Store Locator" already exists'));
    });

    it('should prevent extension directory that already exists', async () => {
        await createExtension({
            projectDirectory: '/test-project',
            name: 'My Extension2',
            description: 'My Extension description',
        });
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Extension directory my-extension2 already exists')
        );
    });
});
