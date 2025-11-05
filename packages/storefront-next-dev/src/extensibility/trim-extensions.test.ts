/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-require-imports */
// @ts-nocheck
/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { Volume as VolumeType } from 'memfs';
const { Volume } = require('memfs');
const path = require('path');

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

    // Default file structure, this is the file system starting point for every unit test cases in this file
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
    jest.doMock('fs', () => vol);

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
    const spy = jest.spyOn(console, method).mockImplementation(() => jest.fn() as any);
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

describe('trim-extensions without config', () => {
    beforeEach(() => {
        jest.resetModules();
        createTestFileSystem();
    });

    it('returns early if no plugins is defined', () => {
        const trimExtensions = require('./trim-extensions').default || require('./trim-extensions');
        const consoleSpy = mockConsole('log');

        trimExtensions('/mock/dir', {}, { extensions: {} }, true);

        expect(console.log).toHaveBeenCalledWith('No plugins found, skipping trim');
        consoleSpy.mockRestore();
    });
});

describe('trim-extensions with nested directories', () => {
    let trimExtensions: (dir: string, ext: Record<string, boolean>) => void;

    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();

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

        trimExtensions = require('./trim-extensions').default || require('./trim-extensions');
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

    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        createTestFileSystem();
        trimExtensions = require('./trim-extensions').default || require('./trim-extensions');
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

    it('fails when mismatching block markers are found', () => {
        const code = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
            // @sfdc-extension-block-end SFDC_EXT_featureB
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        const filePath = path.join(path.sep, 'mock', 'dir', 'src', 'components', 'featureComponent.tsx');
        expect(() =>
            trimExtensions(
                '/mock/dir',
                { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false },
                mockedExtensionConfig,
                true
            )
        ).toThrow(
            `Block marker mismatch in ${filePath}, expected end marker for SFDC_EXT_featureA but got SFDC_EXT_featureB at line 3`
        );
    });

    it('fails when block marker is not closed', () => {
        const code = `
            // @sfdc-extension-block-start SFDC_EXT_featureA
            const featureAVar = 'Feature A variable 1';
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        const filePath = path.join(path.sep, 'mock', 'dir', 'src', 'components', 'featureComponent.tsx');
        expect(() => trimExtensions('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true)).toThrow(
            `Unclosed end marker found in ${filePath}: SFDC_EXT_featureA`
        );
    });

    it('fails when start marker is missing', () => {
        const code = `
            // @sfdc-extension-block-end SFDC_EXT_featureA
        `;
        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);
        const filePath = path.join(path.sep, 'mock', 'dir', 'src', 'components', 'featureComponent.tsx');
        expect(() => trimExtensions('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true)).toThrow(
            `Block marker mismatch in ${filePath}, encountered end marker SFDC_EXT_featureA without a matching start marker at line 1`
        );
    });

    it('fails when nested block markers are not closed in the correct order', () => {
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
        expect(() =>
            trimExtensions(
                '/mock/dir',
                { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false },
                mockedExtensionConfig,
                true
            )
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
        expect(result).not.toContain('<ComponentB />');
    });

    it('does not remove referenced imports', () => {
        const code = `import { FeatureA } from './featureAComponent'`;

        vol.writeFileSync('/mock/dir/src/components/featureComponent.tsx', code);

        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true }, mockedExtensionConfig, true);

        // FeatureA component should still exist since it's referenced
        expect(fileExists('/mock/dir/src/components/featureAComponent')).toBe(true);
        expect(fileExists('/mock/dir/src/components/featureAComponent/index.tsx')).toBe(true);
    });

    it('removes unused alias import file when no more references exist', () => {
        // page B with component ref to featureBComponent
        vol.writeFileSync(
            '/mock/dir/src/pages/featureBPage/index.tsx',
            TEST_CODES.FEATURE_B_PAGE_WITH_COMPONENT_REF_ALIAS
        );
        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);

        // FeatureA should remain (it's enabled)
        expect(fileExists('/mock/dir/src/components/featureAComponent')).toBe(true);

        // FeatureB should be removed (it's disabled and unused)
        expect(fileExists('/mock/dir/src/components/featureBComponent')).toBe(false);
    });

    it('reports error when updating file fails', () => {
        const consoleSpy = mockConsole('error');

        // Create a read-only file to simulate write failure
        vol.writeFileSync(
            '/mock/dir/src/components/featureComponent.tsx',
            `// @sfdc-extension-line SFDC_EXT_featureA
            const feature = Feature_A;`
        );
        vol.writeFileSync = (..._args: unknown[]) => {
            throw new Error('Simulated write error');
        };

        try {
            trimExtensions('/mock/dir', { SFDC_EXT_featureA: false }, mockedExtensionConfig, true);
        } catch (error: unknown) {
            expect(error.message).toContain('Simulated write error');
        }

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error updating file'));
        consoleSpy.mockRestore();
    });

    it('removes separate unused directories when the only references are from each other', () => {
        // Set up files that reference each other but are both unused
        vol.writeFileSync('/mock/dir/src/components/featureBComponent/index.tsx', TEST_CODES.COMPONENT_B_WITH_PAGE_REF);
        vol.writeFileSync('/mock/dir/src/pages/featureBPage/index.tsx', TEST_CODES.FEATURE_B_PAGE_WITH_COMPONENT_REF);

        trimExtensions('/mock/dir', { SFDC_EXT_featureA: true, SFDC_EXT_featureB: false }, mockedExtensionConfig, true);

        // FeatureA should remain
        expect(fileExists('/mock/dir/src/components/featureAComponent')).toBe(true);

        // Both FeatureB component and page should be removed since they only reference each other
        expect(fileExists('/mock/dir/src/components/featureBComponent')).toBe(false);
        expect(fileExists('/mock/dir/src/pages/featureBPage')).toBe(false);
    });

    it('removes entire file when marked by @sfdc-extension-file marker', () => {
        // Ensure routes directory exists in the in-memory FS
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
        trimExtensions('/mock/dir', { SFDC_EXT_featureA: false, SFDC_EXT_featureB: true }, mockedExtensionConfig, true);
        expect(fileExists('/mock/dir/src/routes/featureARoute.tsx')).toBe(false);
        expect(fileExists('/mock/dir/src/routes/featureBRoute.tsx')).toBe(true);
    });
});
