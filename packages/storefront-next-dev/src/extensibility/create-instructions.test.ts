/**
 * @file Vitest tests for create-instructions.ts
 * Uses memfs to mock the file system.
 */
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { Volume, type Volume as VolumeType } from 'memfs';
import path from 'path';
import { normalizePath } from '../test-utils';

const repo = 'https://github.com/SalesforceCommerceCloud/SFCC-Odyssey.git';
const branch = 'main';

// Mock extension config
const mockedExtensionConfig: any = {
    extensions: {
        SFDC_EXT_featureA: {
            name: 'Feature A',
            description: 'Feature A description',
        },
        SFDC_EXT_featureB: {
            name: 'Feature B',
            description: 'Feature B description',
        },
    },
};

// Helper to create in-memory file system with test files
let vol: VolumeType;
const TEMPLATE_RETAIL_RSC_APP_DIR = '/mock/project/dir';
const configPath = path.join(TEMPLATE_RETAIL_RSC_APP_DIR, 'config/config.json');
const createTestFileSystem = (fileContents: any = {}) => {
    vol = new Volume();
    // Default file structure for the template-retail-rsc-app
    const defaultFiles: Record<string, string> = {
        [path.join(TEMPLATE_RETAIL_RSC_APP_DIR, 'src/components/featureComponent.tsx')]:
            fileContents.featureComponent ||
            `
                // @sfdc-extension-line SFDC_EXT_featureA
                import ComponentA from './featureAComponent'
                // @sfdc-extension-line SFDC_EXT_featureB
                import ComponentB from './featureBComponent'
            `,
        [path.join(TEMPLATE_RETAIL_RSC_APP_DIR, 'src/components/featureAComponent/index.tsx')]:
            fileContents.featureAComponent || `export default ComponentA`,
        [path.join(TEMPLATE_RETAIL_RSC_APP_DIR, 'src/components/featureBComponent/index.tsx')]:
            fileContents.featureBComponent || `export default ComponentB`,
        [path.join(TEMPLATE_RETAIL_RSC_APP_DIR, 'src/pages/featureBPage/index.tsx')]:
            fileContents.featureBPage || `export const FeatureBPage = 'FeatureBPage'`,
        [configPath]: fileContents.extensionConfig || JSON.stringify(mockedExtensionConfig),
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

// Import after fs is mocked
const reloadModule = async () => {
    vi.resetModules();
    return await import('./create-instructions');
};

describe('create-instructions', () => {
    const markerValue = 'SFDC_EXT_featureA';

    beforeEach(() => {
        vi.resetModules();
        createTestFileSystem();
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('getContext throws if extension not found in config', async () => {
        const { getContext } = await reloadModule();
        expect(() => getContext(TEMPLATE_RETAIL_RSC_APP_DIR, 'NOT_FOUND', repo, branch, [], configPath)).toThrow(
            /not found in extension config/
        );
    });

    it('getContext returns context with correct extensionName and files', async () => {
        const { getContext } = await reloadModule();
        const filesToCopy = ['src/components/featureAComponent/index.tsx'];
        const context = getContext(TEMPLATE_RETAIL_RSC_APP_DIR, markerValue, repo, branch, filesToCopy, configPath);
        expect(context.extensionName).toBe('Feature A');
        expect(context.markerValue).toBe(markerValue);
        expect(context.copy).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    src: expect.stringContaining('src/components/featureAComponent/index.tsx'),
                    dest: 'src/components/featureAComponent/index.tsx',
                    isDirectory: false,
                }),
            ])
        );
        expect(Array.isArray(context.mergeFiles)).toBe(true);
        expect(Array.isArray(context.newFiles)).toBe(true);
    });

    it('getFilesToCopyContext throws if file does not exist', async () => {
        const { getFilesToCopyContext } = await reloadModule();
        expect(() => getFilesToCopyContext(TEMPLATE_RETAIL_RSC_APP_DIR, ['src/doesnotexist/file.tsx'])).toThrow(
            /not found/
        );
    });

    it('findMarkedFiles finds files with marker', async () => {
        const { findMarkedFiles } = await reloadModule();
        const { mergeFiles, newFiles } = findMarkedFiles(TEMPLATE_RETAIL_RSC_APP_DIR, markerValue);
        expect(Array.isArray(mergeFiles)).toBe(true);
        expect(mergeFiles.some((f: string) => f.includes('featureComponent.tsx'))).toBe(true);
        expect(Array.isArray(newFiles)).toBe(true);
    });

    it('getContext adds newFiles to filesToCopy', async () => {
        // Add a new file with @sfdc-extension-file marker
        const newFileRel = 'src/components/newFeatureFile.tsx';
        const newFileAbs = path.join(TEMPLATE_RETAIL_RSC_APP_DIR, newFileRel);
        createTestFileSystem({
            additional: {
                [newFileAbs]: `// @sfdc-extension-file SFDC_EXT_featureA\nexport const NewFile = true`,
            },
        });
        const { getContext } = await reloadModule();
        const context = getContext(TEMPLATE_RETAIL_RSC_APP_DIR, markerValue, repo, branch, [], configPath);
        // Use normalizePath for cross-platform comparison
        const normalizedNewFiles = context.newFiles.map((f: string) => normalizePath(f));
        expect(normalizedNewFiles).toContain(newFileRel);
        expect(context.copy.some((f: { dest: string }) => normalizePath(f.dest) === newFileRel)).toBe(true);
    });

    it('getFilesToCopyContext marks directories correctly', async () => {
        // Add a directory
        const dirRel = 'src/components/featureDir';
        const dirAbs = path.join(TEMPLATE_RETAIL_RSC_APP_DIR, dirRel);
        createTestFileSystem();
        vol.mkdirSync(dirAbs, { recursive: true });
        const { getFilesToCopyContext } = await reloadModule();
        const result = getFilesToCopyContext(TEMPLATE_RETAIL_RSC_APP_DIR, [dirRel]);
        expect(result[0].isDirectory).toBe(true);
    });

    it('genertaeAndWriteInstructions writes rendered content to output file', async () => {
        const { genertaeAndWriteInstructions } = await reloadModule();
        const templatePath = path.join(TEMPLATE_RETAIL_RSC_APP_DIR, './src/templates/test-template.mdc.hbs');
        const outputPath = path.join(TEMPLATE_RETAIL_RSC_APP_DIR, 'out.mdc');
        // ensure directory exists in memfs and write template
        vol.mkdirSync(path.join(TEMPLATE_RETAIL_RSC_APP_DIR, 'src/templates'), { recursive: true });
        vol.writeFileSync(templatePath, 'Hello {{extensionName}}');
        const context = {
            extensionName: 'Feature A',
            pwaRepo: repo,
            branch,
            markerValue,
            mergeFiles: [],
            newFiles: [],
            copy: [],
        };
        genertaeAndWriteInstructions(templatePath, context, outputPath);
        const rendered = vol.readFileSync(outputPath, 'utf8') as string;
        expect(rendered).toContain('Hello Feature A');
    });

    it('generateInstructions writes install and uninstall files to outputDir', async () => {
        // Arrange templates at expected relative paths
        const installTemplate = './src/extensibility/templates/install-instructions.mdc.hbs';
        const uninstallTemplate = './src/extensibility/templates/uninstall-instructions.mdc.hbs';
        vol.mkdirSync('src/extensibility/templates', { recursive: true });
        vol.writeFileSync(installTemplate, 'Install {{extensionName}} from {{pwaRepo}} on {{branch}}');
        vol.writeFileSync(uninstallTemplate, 'Uninstall {{extensionName}}');

        const { generateInstructions } = await reloadModule();

        const outputRel = '../instructions';
        generateInstructions(
            TEMPLATE_RETAIL_RSC_APP_DIR,
            'SFDC_EXT_featureA',
            outputRel,
            'repo-url',
            'main',
            [],
            configPath,
            `${__dirname}/templates`
        );

        const outDir = path.join(TEMPLATE_RETAIL_RSC_APP_DIR, outputRel);
        const installOut = path.join(outDir, 'install-feature-a.mdc');
        const uninstallOut = path.join(outDir, 'uninstall-feature-a.mdc');

        expect(vol.readFileSync(installOut, 'utf8')).toContain('Install Feature A');
        expect(vol.readFileSync(installOut, 'utf8')).toContain('repo-url');
        expect(vol.readFileSync(uninstallOut, 'utf8')).toContain('Uninstall Feature A');
    });

    it('generateInstructions uses default outputDir when not provided', async () => {
        // Arrange templates at expected relative paths
        const installTemplate = './src/extensibility/templates/install-instructions.mdc.hbs';
        const uninstallTemplate = './src/extensibility/templates/uninstall-instructions.mdc.hbs';
        vol.mkdirSync('src/extensibility/templates', { recursive: true });
        vol.writeFileSync(installTemplate, 'Install {{extensionName}}');
        vol.writeFileSync(uninstallTemplate, 'Uninstall {{extensionName}}');

        const { generateInstructions } = await reloadModule();

        // Call with empty string for outputDir to trigger default 'instructions'
        generateInstructions(
            TEMPLATE_RETAIL_RSC_APP_DIR,
            'SFDC_EXT_featureA',
            '',
            'repo-url',
            'main',
            [],
            configPath,
            `${__dirname}/templates`
        );

        const outDir = path.join(TEMPLATE_RETAIL_RSC_APP_DIR, 'instructions');
        const installOut = path.join(outDir, 'install-feature-a.mdc');
        const uninstallOut = path.join(outDir, 'uninstall-feature-a.mdc');

        expect(vol.readFileSync(installOut, 'utf8')).toContain('Install Feature A');
        expect(vol.readFileSync(uninstallOut, 'utf8')).toContain('Uninstall Feature A');
    });

    it('throws file not found error if file does not exist', async () => {
        const { getContext } = await reloadModule();
        expect(() =>
            getContext(
                TEMPLATE_RETAIL_RSC_APP_DIR,
                'SFDC_EXT_featureA',
                'repo-url',
                'main',
                ['doesnotexist'],
                configPath
            )
        ).toThrow(/File or directory (.*)doesnotexist(.*) not found/);
    });
});
