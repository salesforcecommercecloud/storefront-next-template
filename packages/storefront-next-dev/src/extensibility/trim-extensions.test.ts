/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { Volume, type Volume as VolumeType } from 'memfs';
import path from 'path';

// Mock plugin config to simulate different plugin states

const mockedExtensionConfig: Record<string, { name: string; description: string; dependencies: string[] }> = {
    extensions: {
        SFDC_EXT_featureA: {
            name: 'Feature A',
            description: 'Feature A description',
            dependencies: [],
        },
        SFDC_EXT_featureB: {
            name: 'Feature B',
            description: 'Feature B description',
            dependencies: [],
        },
    },
};

// Test data constants
const TEST_CODES = {
    BASIC_COMPONENT: `
        // @sfdc-extension-line SFDC_EXT_featureA
        import ComponentA from './featureAComponent'
        // @sfdc-extension-line SFDC_EXT_featureB
        import ComponentB from './featureBComponent'
    `,
    BASIC_COMPONENT_TRIMMED: `
        import ComponentA from './featureAComponent'
    `,
    COMPONENT_A: `export default ComponentA`,
    COMPONENT_B: `export default ComponentB`,
    FEATURE_B_PAGE: `export const FeatureBPage = 'FeatureBPage'`,
    COMPONENT_B_WITH_PAGE_REF: `
        // @sfdc-extension-line SFDC_EXT_featureB
        import pageB from '../../pages/featureBPage'
        export default ComponentB
    `,
    FEATURE_B_PAGE_WITH_COMPONENT_REF_ALIAS: `
        // @sfdc-extension-line SFDC_EXT_featureB
        import ComponentB from '@/components/featureBComponent'
        export default ComponentB
    `,
    COMPONENT_B_WITH_PAGE_REF_TRIMMED: `export default ComponentB`,
    FEATURE_B_PAGE_WITH_COMPONENT_REF: `
        // @sfdc-extension-line SFDC_EXT_featureB
        import ComponentB from '../../components/featureBComponent'
        export const FeatureBPage = 'FeatureBPage'
    `,
    FEATURE_B_PAGE_WITH_COMPONENT_REF_TRIMMED: `export const FeatureBPage = 'FeatureBPage'`,
};

// In-memory file system
let vol: VolumeType;

// Helper to create in-memory file system with test files
const createTestFileSystem = (fileContents: any = {}) => {
    vol = new Volume();

    const defaultFiles: Record<string, string> = {
        '/mock/dir/src/components/featureComponent.tsx': fileContents.featureComponent || TEST_CODES.BASIC_COMPONENT,
        '/mock/dir/src/components/featureAComponent/index.tsx':
            fileContents.featureAComponent || TEST_CODES.COMPONENT_A,
        '/mock/dir/src/components/featureBComponent/index.tsx':
            fileContents.featureBComponent || TEST_CODES.COMPONENT_B,
        '/mock/dir/src/pages/featureBPage/index.tsx': fileContents.featureBPage || TEST_CODES.FEATURE_B_PAGE,
        ...(fileContents.additional || {}),
    };

    vol.fromJSON(defaultFiles);

    // Mock fs module with memfs volume
    vi.doMock('fs', () => ({
        default: vol,
        ...vol,
    }));

    return vol;
};

// Helper to read file content from memory
const readFile = (filePath: string) => {
    try {
        return vol.readFileSync(filePath, 'utf8') as string;
    } catch {
        return null;
    }
};

// Helper to check if file exists
const fileExists = (filePath: string) => {
    try {
        vol.statSync(filePath);
        return true;
    } catch {
        return false;
    }
};

// Mock console methods
const mockConsole = (method: 'log' | 'error' = 'error') => {
    const spy = vi.spyOn(console, method).mockImplementation(() => vi.fn() as any);
    return spy;
};

// Custom matcher to compare strings line by line with trimming
expect.extend({
    toEqualTrimmedLines(received: string, expected: string) {
        const clean = (str: string) =>
            str
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

        const receivedLines = clean(received);
        const expectedLines = clean(expected);

        const pass = this.equals(receivedLines, expectedLines);

        if (pass) {
            return {
                pass: true,
                message: () =>
                    `✅ Expected strings not to match line by line (but they did).\n\nExpected: ${this.utils.printExpected(
                        expectedLines
                    )}\nReceived: ${this.utils.printReceived(receivedLines)}`,
            };
        } else {
            return {
                pass: false,
                message: () =>
                    `❌ Expected strings to match line by line (with trimming).\n\nExpected: ${this.utils.printExpected(
                        expectedLines
                    )}\nReceived: ${this.utils.printReceived(receivedLines)}`,
            };
        }
    },
} as any);

// Import after fs is mocked
const reloadModule = async () => {
    vi.resetModules();
    return await import('./trim-extensions');
};

describe('trim-extensions without config', () => {
    beforeEach(() => {
        vi.resetModules();
        createTestFileSystem();
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('handles file instead of directory in isEmptyDirectory check', async () => {
        const mod = await reloadModule();
        const trimExt = mod.default || mod;

        vol.mkdirSync('/mock/dir/src/extensions', { recursive: true });
        vol.writeFileSync('/mock/dir/src/extensions/file.txt', 'not a directory');

        trimExt('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);
        expect(fileExists('/mock/dir/src/extensions/file.txt')).toBe(true);
    });
});

describe('trim-extensions with nested directories', () => {
    let trimExtensions: (dir: string, ext: Record<string, boolean>) => void;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        // Create file system with nested structure
        createTestFileSystem({
            additional: {
                '/mock/dir/src/route.tsx': `// @sfdc-extension-line SFDC_EXT_featureA
                import storeLocatorPage from './pages/store-locator'`,
                '/mock/dir/src/pages/store-locator/index.tsx': `import { Modal } from './partial/modal'
                    export default StoreLocator = 'StoreLocatorModal'`,
                '/mock/dir/src/pages/store-locator/partial/modal.tsx': `export const StoreLocator = 'StoreLocatorModal'`,
            },
        });

        const mod = await reloadModule();
        trimExtensions = mod.default || mod;
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('recursively removes unused directories', () => {
        trimExtensions('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);

        // Check that the store-locator directory was removed
        expect(fileExists('/mock/dir/src/pages/store-locator')).toBe(false);
        expect(fileExists('/mock/dir/src/pages/store-locator/index.tsx')).toBe(false);
        expect(fileExists('/mock/dir/src/pages/store-locator/partial/modal.tsx')).toBe(false);
    });
});

describe('trim-extensions', () => {
    let trimExtensions: (dir: string, ext: Record<string, boolean>) => void;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        createTestFileSystem();
        const mod = await reloadModule();
        trimExtensions = mod.default || mod;
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('leaves code untouched if no plugins are referenced', () => {
        const code = `
        const test = () => {
            // @sfdc-extension-line SFDC_EXT_featureA
            const featureA = 'Feature A';
            const categories = flatten(categoriesTree || {}, 'categories');
            const currency = locale.preferredCurrency || l10n.defaultCurrency;
            return [locale?.id || appConfig.defaultAppLocale];
        };
        `;

        const expected = `
        const test = () => {
            const categories = flatten(categoriesTree || {}, 'categories');
            const currency = locale.preferredCurrency || l10n.defaultCurrency;
            return [locale?.id || appConfig.defaultAppLocale];
        };
        `;

        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);

        trimExtensions('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig);

        const result = readFile('/mock/dir/src/components/featureComponent.tsx') as string;
        expect(result).toEqualTrimmedLines(expected);
    });

    it('removes code blocks that are guarded by plugin flags', () => {
        const code = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar1 = 'Feature A variable 1';
            const featureAVar2 = 'Feature A variable 2';
            // @sfdc-extension-block-end SFDC_EXT_featureA
            const anotherVar = 'Another variable';
        `;
        const expected = `
            const anotherVar = 'Another variable';
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        trimExtensions('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig);
        const result = readFile('/mock/dir/src/components/featureComponent.tsx') as string;
        expect(result).toEqualTrimmedLines(expected);
    });

    it('removes nested code blocks that are guarded by plugin flags', () => {
        const code = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
            // @sfdc-extension-block-start SFDC_EXT_featureB
            const featureBVar = 'Feature B variable 1';
            // @sfdc-extension-block-end SFDC_EXT_featureB
            // @sfdc-extension-block-end SFDC_EXT_featureA
        `;
        const expected = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
            // @sfdc-extension-block-end SFDC_EXT_featureA
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);
        const result = readFile('/mock/dir/src/components/featureComponent.tsx') as string;
        expect(result).toEqualTrimmedLines(expected);
    });

    it('removes nested line that are guarded by plugin flags', () => {
        const code = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
            // @sfdc-extension-line SFDC_EXT_featureB
            const featureBVar = 'Feature B variable 2';
            // @sfdc-extension-block-end SFDC_EXT_featureA
        `;
        const expected = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
            // @sfdc-extension-block-end SFDC_EXT_featureA
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);
        const result = readFile('/mock/dir/src/components/featureComponent.tsx') as string;
        expect(result).toEqualTrimmedLines(expected);
    });

    it('fails when mismatching block markers are found', async () => {
        const code = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
            // @sfdc-extension-block-end SFDC_EXT_featureB
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        const filePath = path.join(path.sep, 'mock', 'dir', 'src', 'components', 'featureComponent.tsx');
        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        expect(() =>
            trimExt('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true)
        ).toThrow(
            `Block marker mismatch in ${filePath}, expected end marker for SFDC_EXT_featureA but got SFDC_EXT_featureB at line 3`
        );
    });

    it('fails when block marker is not closed', async () => {
        const code = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        const filePath = path.join(path.sep, 'mock', 'dir', 'src', 'components', 'featureComponent.tsx');
        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        expect(() => trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true)).toThrow(
            `Unclosed end marker found in ${filePath}: SFDC_EXT_featureA`
        );
    });

    it('fails when start marker is missing', async () => {
        const code = `
            // @sfdc-extension-block-end SFDC_EXT_featureA
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        const filePath = path.join(path.sep, 'mock', 'dir', 'src', 'components', 'featureComponent.tsx');
        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        expect(() => trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true)).toThrow(
            `Block marker mismatch in ${filePath}, encountered end marker SFDC_EXT_featureA without a matching start marker at line 1`
        );
    });

    it('fails when nested block markers are not closed in the correct order', async () => {
        const code = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
            // @sfdc-extension-block-start SFDC_EXT_featureB
            const featureBVar = 'Feature B variable 1';
            // @sfdc-extension-block-end SFDC_EXT_featureA
            // @sfdc-extension-block-end SFDC_EXT_featureB
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        const filePath = path.join(path.sep, 'mock', 'dir', 'src', 'components', 'featureComponent.tsx');
        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        expect(() =>
            trimExt('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true)
        ).toThrow(
            `Block marker mismatch in ${filePath}, expected end marker for SFDC_EXT_featureB but got SFDC_EXT_featureA at line 5:`
        );
    });

    it('handles PropTypes declarations correctly', () => {
        const code = `
            MyClass.PropTypes = {
                name: PropTypes.string,
                description: PropTypes.string,
                // @sfdc-extension-line SFDC_EXT_featureA
                featureAProp: PropTypes.string,
                // @sfdc-extension-line SFDC_EXT_featureB
                featureBProp: PropTypes.string,
            };
        `;

        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);

        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);

        const expected = `
            MyClass.PropTypes = {
                name: PropTypes.string,
                description: PropTypes.string,
                // @sfdc-extension-line SFDC_EXT_featureA
                featureAProp: PropTypes.string,
            };
        `;
        const result = readFile('/mock/dir/src/components/featureComponent.tsx') as string;
        expect(result).toEqualTrimmedLines(expected);
        expect(result).not.toContain('featureBProp: PropTypes.string');
    });

    it('handles tsx elements in return statements correctly', () => {
        const code = `
            function test() {
                return (
                    <div>
                        {/* @sfdc-extension-line SFDC_EXT_featureA */}
                        <ComponentA />
                        {/* @sfdc-extension-line SFDC_EXT_featureB */}
                        <ComponentB />
                    </div>
                );
            }
        `;

        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);

        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);

        const expected = `
            function test() {
                return (
                    <div>
                        {/* @sfdc-extension-line SFDC_EXT_featureA */}
                        <ComponentA />
                    </div>
                );
            }
        `;
        const result = readFile('/mock/dir/src/components/featureComponent.tsx') as string;
        expect(result).toEqualTrimmedLines(expected);
        expect(result).not.toContain('<ComponentB />');
    });

    it('handles nested tsx elements in return statements correctly', () => {
        const code = `
            function test() {
                return (
                    <div>
                        {/* @sfdc-extension-line SFDC_EXT_featureA */}
                        <ComponentA>
                            <ChildComponent />
                        {/* @sfdc-extension-line SFDC_EXT_featureA */}
                        </ComponentA>
                    </div>
                );
            }
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);

        trimExtensions('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);

        const expected = `
            function test() {
                return (
                    <div>
                        <ChildComponent />
                    </div>
                );
            }
        `;
        const result = readFile('/mock/dir/src/components/featureComponent.tsx') as string;
        expect(result).toEqualTrimmedLines(expected);
        expect(result).not.toContain('<ComponentA />');
    });

    it('does not remove referenced imports', () => {
        const code = `import { FeatureA } from './featureAComponent'`;

        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);

        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);

        expect(fileExists('/mock/dir/src/components/featureAComponent')).toBe(true);
        expect(fileExists('/mock/dir/src/components/featureAComponent/index.tsx')).toBe(true);
    });

    it('removes unused alias import file when no more references exist', () => {
        vol.writeFileSync(
            '/mock/dir/src/pages/featureBPage/index.tsx',
            TEST_CODES.FEATURE_B_PAGE_WITH_COMPONENT_REF_ALIAS
        );
        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);

        expect(fileExists('/mock/dir/src/components/featureAComponent')).toBe(true);
        expect(fileExists('/mock/dir/src/components/featureBComponent')).toBe(false);
    });

    it('reports error when updating file fails', async () => {
        const consoleSpy = mockConsole('error');

        vol.writeFileSync(
            '/mock/dir/src/components/featureComponent.tsx',
            `// @sfdc-extension-line SFDC_EXT_featureA
            const feature = Feature_A;`
        );
        vol.writeFileSync = (..._args: unknown[]) => {
            throw new Error('Simulated write error');
        };

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        try {
            trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);
        } catch (error: unknown) {
            expect((error as Error).message).toContain('Simulated write error');
        }

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error updating file'));
        consoleSpy.mockRestore();
    });

    it('handles EPERM error when deleting directories', async () => {
        const consoleSpy = mockConsole('error');
        vol.writeFileSync('/mock/dir/src/components/featureBComponent/index.tsx', TEST_CODES.COMPONENT_B);

        const originalRmSync = vol.rmSync;
        vol.rmSync = () => {
            const error = new Error('Permission denied') as Error & { code?: string };
            error.code = 'EPERM';
            throw error;
        };

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Permission denied - cannot delete'));

        vol.rmSync = originalRmSync;
        consoleSpy.mockRestore();
    });

    it('handles other errors when deleting directories', async () => {
        const consoleSpy = mockConsole('error');
        vol.writeFileSync('/mock/dir/src/components/featureBComponent/index.tsx', TEST_CODES.COMPONENT_B);

        const originalRmSync = vol.rmSync;
        vol.rmSync = () => {
            throw new Error('Some other deletion error');
        };

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error deleting'));

        vol.rmSync = originalRmSync;
        consoleSpy.mockRestore();
    });

    it('skips node_modules directory', async () => {
        vol.mkdirSync('/mock/dir/node_modules/some-package', { recursive: true });
        vol.writeFileSync(
            '/mock/dir/node_modules/some-package/index.tsx',
            `// @sfdc-extension-line SFDC_EXT_featureA
            const test = 'test';`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);

        expect(fileExists('/mock/dir/node_modules/some-package/index.tsx')).toBe(true);
    });

    it('skips files with unsupported extensions', async () => {
        vol.writeFileSync(
            '/mock/dir/src/components/test.txt',
            `// @sfdc-extension-line SFDC_EXT_featureA
            const test = 'test';`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);

        expect(fileExists('/mock/dir/src/components/test.txt')).toBe(true);
    });

    it('deletes standalone files (not in directories)', async () => {
        vol.writeFileSync(
            '/mock/dir/src/components/standaloneFile.tsx',
            `// @sfdc-extension-line SFDC_EXT_featureA
            const feature = Feature_A;`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);

        const fileContent = vol.existsSync('/mock/dir/src/components/standaloneFile.tsx')
            ? vol.readFileSync('/mock/dir/src/components/standaloneFile.tsx', 'utf8')
            : '';
        expect(fileContent).not.toContain('@sfdc-extension-line SFDC_EXT_featureA');
        expect(fileContent).not.toContain('Feature_A');
    });

    it('removes separate unused directories when the only references are from each other', async () => {
        vol.writeFileSync('/mock/dir/src/components/featureBComponent/index.tsx', TEST_CODES.COMPONENT_B_WITH_PAGE_REF);
        vol.writeFileSync('/mock/dir/src/pages/featureBPage/index.tsx', TEST_CODES.FEATURE_B_PAGE_WITH_COMPONENT_REF);

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);

        expect(fileExists('/mock/dir/src/components/featureAComponent')).toBe(true);
        expect(fileExists('/mock/dir/src/components/featureBComponent')).toBe(false);
        expect(fileExists('/mock/dir/src/pages/featureBPage')).toBe(false);
    });

    it('cleans up empty extensions directory', async () => {
        vol.writeFileSync('/mock/dir/src/components/featureBComponent/index.tsx', TEST_CODES.COMPONENT_B_WITH_PAGE_REF);
        vol.writeFileSync('/mock/dir/src/pages/featureBPage/index.tsx', TEST_CODES.FEATURE_B_PAGE_WITH_COMPONENT_REF);

        vol.mkdirSync('/mock/dir/src/extensions/emptyExt', { recursive: true });
        vol.mkdirSync('/mock/dir/src/extensions/emptyExt/nested', { recursive: true });

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);

        expect(fileExists('/mock/dir/src/extensions/emptyExt')).toBe(false);
    });

    it('removes entire file when marked by @sfdc-extension-file marker', async () => {
        const consoleSpy = mockConsole('log');
        vol.mkdirSync('/mock/dir/src/routes', { recursive: true });
        vol.writeFileSync(
            '/mock/dir/src/routes/featureARoute.tsx',
            `// @sfdc-extension-file SFDC_EXT_featureA
        const feature = Feature_A;`
        );
        vol.writeFileSync(
            '/mock/dir/src/routes/featureBRoute.tsx',
            `// @sfdc-extension-file SFDC_EXT_featureB
            const feature = Feature_B;`
        );
        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: false, SFDC_EXT_featureB: true }, mockedExtensionConfig, true);
        expect(fileExists('/mock/dir/src/routes/featureARoute.tsx')).toBe(false);
        expect(fileExists('/mock/dir/src/routes/featureBRoute.tsx')).toBe(true);
        expect(console.log).toHaveBeenCalledWith(`Deleted file /mock/dir/src/routes/featureARoute.tsx`);
        consoleSpy.mockRestore();
    });

    it('resolves import paths correctly', async () => {
        vol.writeFileSync('/mock/dir/src/components/imported.tsx', `export const Imported = 'imported';`);
        vol.writeFileSync(
            '/mock/dir/src/components/importer.tsx',
            `import { Imported } from './imported';
            export const Importer = 'importer';`
        );
        vol.mkdirSync('/mock/dir/src/components/dirExport', { recursive: true });
        vol.writeFileSync('/mock/dir/src/components/dirExport/index.tsx', `export const DirExport = 'dirExport';`);
        vol.writeFileSync(
            '/mock/dir/src/components/dirImporter.tsx',
            `import { DirExport } from './dirExport';
            export const DirImporter = 'dirImporter';`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);

        expect(fileExists('/mock/dir/src/components/imported.tsx')).toBe(true);
        expect(fileExists('/mock/dir/src/components/importer.tsx')).toBe(true);
        expect(fileExists('/mock/dir/src/components/dirExport/index.tsx')).toBe(true);
    });

    it('warns when file marker has unknown extension', async () => {
        const consoleSpy = mockConsole('warn');
        vol.writeFileSync(
            '/mock/dir/src/components/unknownExt.tsx',
            `// @sfdc-extension-file UNKNOWN_EXTENSION
            const test = 'test';`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringMatching(/is marked with.*but it does not match any known extensions/)
        );
        consoleSpy.mockRestore();
    });

    it('handles errors when deleting marked files', async () => {
        const consoleSpy = mockConsole('error');
        vol.writeFileSync(
            '/mock/dir/src/components/toDelete.tsx',
            `// @sfdc-extension-file SFDC_EXT_featureA
            const test = 'test';`
        );

        const originalUnlinkSync = vol.unlinkSync;
        vol.unlinkSync = () => {
            throw new Error('Simulated delete error');
        };

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        expect(() => {
            trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);
        }).toThrow('Simulated delete error');

        expect(console.error).toHaveBeenCalledWith(
            expect.stringMatching(/Error deleting file.*Simulated delete error/)
        );

        vol.unlinkSync = originalUnlinkSync;
        consoleSpy.mockRestore();
    });

    it('warns when block marker has unknown extension', async () => {
        const consoleSpy = mockConsole('warn');
        vol.writeFileSync(
            '/mock/dir/src/components/unknownMarker.tsx',
            `// @sfdc-extension-block-start UNKNOWN_EXTENSION_NOT_IN_CONFIG
            const test = 'test';
            // @sfdc-extension-block-end UNKNOWN_EXTENSION_NOT_IN_CONFIG
            // @sfdc-extension-line SFDC_EXT_featureA
            const featureA = 'Feature A';`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);

        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Warning: Unknown marker found'));
        consoleSpy.mockRestore();
    });

    it('handles parse errors in removed code blocks', async () => {
        const consoleSpy = mockConsole('error');
        vol.writeFileSync(
            '/mock/dir/src/components/invalidImport.tsx',
            `// @sfdc-extension-line SFDC_EXT_featureA
            import { Invalid } from './invalid-syntax-!!!`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error parsing block'));
        consoleSpy.mockRestore();
    });

    it('shows message when no unused components found', async () => {
        const consoleSpy = mockConsole('log');
        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: true }, mockedExtensionConfig, true);

        expect(console.log).toHaveBeenCalledWith('\nNo unused components found.');
        consoleSpy.mockRestore();
    });

    it('preserves files when extension is enabled', async () => {
        vol.writeFileSync(
            '/mock/dir/src/components/enabledExt.tsx',
            `// @sfdc-extension-file SFDC_EXT_featureA
            const test = 'test';`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);

        // File should still exist
        expect(fileExists('/mock/dir/src/components/enabledExt.tsx')).toBe(true);
    });

    it('skips processing when no extensions configured', async () => {
        const consoleSpy = mockConsole('log');
        vol.writeFileSync(
            '/mock/dir/src/components/test.tsx',
            `// @sfdc-extension-line SFDC_EXT_featureA
            const test = 'test';`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', {}, { extensions: {} }, true);

        // Should log early return message
        expect(console.log).toHaveBeenCalledWith('No plugins found, skipping trim');
        const content = readFile('/mock/dir/src/components/test.tsx');
        expect(content).toContain('@sfdc-extension-line SFDC_EXT_featureA');
        consoleSpy.mockRestore();
    });

    it('preserves code blocks when extension is enabled', async () => {
        vol.writeFileSync(
            '/mock/dir/src/components/enabledBlock.tsx',
            `// @sfdc-extension-block-start SFDC_EXT_featureA
            const featureA = 'Feature A';
            // @sfdc-extension-block-end SFDC_EXT_featureA
            const other = 'other';`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);

        const content = readFile('/mock/dir/src/components/enabledBlock.tsx');
        expect(content).toContain('featureA');
        expect(content).toContain('Feature A');
    });

    it('removes unused component files when extensions are disabled and provides confirmation', async () => {
        // When a shopper disables an extension, unused component files should be removed
        // and they should receive confirmation that the cleanup was successful
        const consoleSpy = mockConsole('log');

        // Create a component file that will be removed when the extension is disabled
        vol.writeFileSync('/mock/dir/src/components.tsx', `export const Components = 'components';`);

        // Create a file that imports the component with the extension marker
        vol.mkdirSync('/mock/dir/src/components', { recursive: true });
        vol.writeFileSync(
            '/mock/dir/src/components/index.tsx',
            `// @sfdc-extension-line SFDC_EXT_featureA
            import { Components } from '../components.tsx';
            export default Components;`
        );

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);

        // The unused component file should be removed
        expect(fileExists('/mock/dir/src/components.tsx')).toBe(false);

        // Users should see a confirmation message when files are removed
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✓ Successfully deleted file'));

        consoleSpy.mockRestore();
    });

    it('preserves component files when extensions are enabled', async () => {
        // When a shopper has extensions enabled, their component files should remain intact
        vol.writeFileSync('/mock/dir/src/components.tsx', `export const Components = 'components';`);

        vol.mkdirSync('/mock/dir/src/components', { recursive: true });
        vol.writeFileSync('/mock/dir/src/components/index.tsx', `export default Components;`);

        const mod = await reloadModule();
        const trimExt = mod.default || mod;
        trimExt('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, false);

        // Component files should still exist when extensions are enabled
        expect(fileExists('/mock/dir/src/components.tsx')).toBe(true);
    });

    it('handles missing or incomplete extension configuration gracefully', async () => {
        // When extension configuration is missing or incomplete, the system should handle it without errors
        vol.writeFileSync('/mock/dir/src/components/test.tsx', `export const Test = 'test';`);

        const mod = await reloadModule();
        const trimExt = mod.default || mod;

        // Test with undefined extensionConfig
        trimExt('/mock/dir', {}, undefined, false);
        expect(fileExists('/mock/dir/src/components/test.tsx')).toBe(true);

        // Test with extensionConfig but undefined extensions property
        trimExt('/mock/dir', {}, { extensions: undefined }, false);
        expect(fileExists('/mock/dir/src/components/test.tsx')).toBe(true);
    });

    it('handles verbose mode configuration correctly', async () => {
        // When verbose mode is configured (enabled, null, or undefined), the system should behave appropriately
        const consoleSpy = mockConsole('log');

        vol.writeFileSync('/mock/dir/src/components/test.tsx', `export const Test = 'test';`);

        const mod = await reloadModule();
        const trimExt = mod.default || mod;

        // Test with verbose mode enabled
        trimExt('/mock/dir', {}, mockedExtensionConfig, true);
        expect(fileExists('/mock/dir/src/components/test.tsx')).toBe(true);
        expect(console.log).toHaveBeenCalled();
        consoleSpy.mockClear();

        // Test with verbose parameter set to null (should default to non-verbose)
        // @ts-expect-error - Testing defensive code path with null
        trimExt('/mock/dir', {}, mockedExtensionConfig, null);
        expect(fileExists('/mock/dir/src/components/test.tsx')).toBe(true);

        // Test with verbose parameter set to undefined (should default to non-verbose)
        // @ts-expect-error - Testing defensive code path with undefined
        trimExt('/mock/dir', {}, mockedExtensionConfig, undefined);
        expect(fileExists('/mock/dir/src/components/test.tsx')).toBe(true);

        consoleSpy.mockRestore();
    });
});
