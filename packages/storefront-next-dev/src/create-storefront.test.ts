import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import { join } from 'path';
import { execSync } from 'child_process';
import prompts from 'prompts';
import trimExtensions from './extensibility/trim-extensions';

// Mock external modules before importing the SUT
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.mock('fs-extra', () => ({
    __esModule: true,
    default: {
        existsSync: vi.fn(),
        rmSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
    },
}));
vi.mock('./extensibility/trim-extensions', () => ({
    __esModule: true,
    default: vi.fn(),
}));
vi.mock('prompts', () => {
    return {
        default: vi.fn(() => {
            return {
                storefront: 'sfcc-storefront',
                template: 'custom',
                githubUrl: 'http://github.com/sfcc-odyssey/template-retail-rsc-app',
                selectedExtensions: ['SFDC_EXT_STORE_LOCATOR'],
                PUBLIC__app__commerce__api__clientId: '1234567890',
                PUBLIC__app__commerce__api__organizationId: '0987654321',
            };
        }),
    } as const;
});
vi.mock('child_process', () => ({
    execSync: vi.fn(),
}));

let createStorefront: (args?: any) => Promise<void>;
const exitMock = vi.fn();
// @ts-expect-error Needed for test hack
process.exit = exitMock;

describe('create-storefront', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(async () => {
        originalEnv = { ...process.env };
        vi.clearAllMocks();
        vi.resetAllMocks();
        // Dynamically import after mocks are in place
        ({ createStorefront } = await import('./create-storefront'));
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should abort if git is not installed', async () => {
        // Arrange
        vi.mocked(execSync).mockImplementation(() => {
            throw new Error('command not found: git');
        });

        try {
            await createStorefront();
        } catch (e: any) {
            // because we mocked process.exit, the code will continue and the error will be caught by the try/catch block
            expect(e).toBeDefined();
            expect(e.message).toMatch(/command not found: git/i);
        }

        expect(exitMock).toHaveBeenCalledWith(1);
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining(
                `git isn't installed or found in your PATH. Install git before running this command`
            )
        );
    });

    it('should abort if storefront name is not provided', async () => {
        // Arrange
        vi.mocked(prompts as unknown as any).mockImplementation(() => {
            return { storefront: '' };
        });

        try {
            await createStorefront();
        } catch (e: any) {
            // because we mocked process.exit, the code will continue and the error will be caught by the try/catch block
            expect(e).toBeDefined();
        }
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Storefront name is required'));
        expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should abort if user chooses a custom template but no URL was provided', async () => {
        // Arrange
        vi.mocked(prompts as unknown as any).mockImplementation(() => {
            return { template: 'custom', githubUrl: '' };
        });

        try {
            await createStorefront();
        } catch (e: any) {
            // because we mocked process.exit, the code will continue and the error will be caught by the try/catch block
            expect(e).toBeDefined();
        }
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Github URL is required'));
        expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should clone the template into the storefront directory', async () => {
        // Arrange
        vi.mocked(execSync).mockImplementation(() => {
            return '';
        });
        vi.mocked(fs.existsSync).mockReturnValue(true as any);
        try {
            await createStorefront();
        } catch (e: any) {
            expect(e).toBeDefined();
        }
        expect(execSync).toHaveBeenCalledWith(
            'git clone http://github.com/sfcc-odyssey/template-retail-rsc-app sfcc-storefront'
        );
        expect(fs.rmSync).toHaveBeenCalledWith(join('sfcc-storefront', '.git'), { recursive: true, force: true });
    });

    it('should configure extensions', async () => {
        // Arrange
        vi.mocked(fs.existsSync).mockReturnValue(true as any);
        vi.mocked(fs.readFileSync).mockReturnValue(
            JSON.stringify({
                extensions: {
                    SFDC_EXT_STORE_LOCATOR: {
                        name: 'Store Locator',
                        description: 'Store Locator allows a shopper to find the closest store to them.',
                    },
                },
            })
        );
        try {
            await createStorefront({ verbose: false });
        } catch (e: any) {
            expect(e).toBeDefined();
        }
        expect(trimExtensions).toHaveBeenCalledWith(
            'sfcc-storefront',
            { SFDC_EXT_STORE_LOCATOR: true },
            {
                extensions: {
                    SFDC_EXT_STORE_LOCATOR: {
                        name: 'Store Locator',
                        description: 'Store Locator allows a shopper to find the closest store to them.',
                    },
                },
            },
            false
        );
    });

    it('should configure config overrides', async () => {
        // Arrange
        vi.mocked(fs.existsSync as any).mockImplementation((path: string) => {
            if (path.endsWith('config.json')) return false;
            return true;
        });
        vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
            if (path.endsWith('config-meta.json')) {
                return JSON.stringify({
                    configs: [
                        {
                            name: 'API Client ID',
                            key: 'PUBLIC__app__commerce__api__clientId',
                        },
                        {
                            name: 'API Organization ID',
                            key: 'PUBLIC__app__commerce__api__organizationId',
                        },
                    ],
                });
            } else if (path.endsWith('.env.default')) {
                return 'PUBLIC__app__commerce__api__clientId=0000000000';
            }
            return '';
        });
        await createStorefront();
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            join('sfcc-storefront', '.env'),
            'PUBLIC__app__commerce__api__clientId=1234567890'
        );
    });
});
