import prompts from 'prompts';
import path from 'path';
import fs from 'fs-extra';
import type { ExtensionMeta } from './extension-config';
import trimExtensions from './trim-extensions';
import os from 'os';
import { execSync } from 'child_process';

const CONFIG_PATH = ['src', 'extensions', 'config.json'];

const consoleLog = (message: string, type: 'error' | 'success' | 'info') => {
    switch (type) {
        case 'error':
            // eslint-disable-next-line no-console
            console.error(`❌ ${message}`);
            break;
        case 'success':
            // eslint-disable-next-line no-console
            console.log(`✅ ${message}`);
            break;
        default:
            // eslint-disable-next-line no-console
            console.log(message);
            break;
    }
};

/**
 * Get the path to the extension config file
 */
const getExtensionConfigPath = (projectDirectory: string) => {
    return path.join(projectDirectory, ...CONFIG_PATH);
};

/**
 * Check if the project directory contains the extensions directory and config.json file
 */
const getExtensionConfig = (projectDirectory: string): Record<string, ExtensionMeta> => {
    const extensionConfigPath = getExtensionConfigPath(projectDirectory);
    if (!fs.existsSync(extensionConfigPath)) {
        consoleLog(
            `Extension config file not found: ${extensionConfigPath}. Are you running this command in the correct project directory?`,
            'error'
        );
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(extensionConfigPath, 'utf8')).extensions;
};

/**
 * Common function to get the extension selection from the user
 * @param type 'multiselect' | 'select'
 * @param extensionConfig Record<string, ExtensionMeta>
 * @param message string
 * @param installedExtensions string[]
 * @returns string[]
 */
const getExtensionSelection = async (
    type: 'multiselect' | 'select',
    extensionConfig: Record<string, ExtensionMeta>,
    message: string,
    installedExtensions: string[]
) => {
    consoleLog('\n', 'info');
    const { selectedExtensions } = await prompts({
        type,
        name: 'selectedExtensions',
        message,
        choices: installedExtensions.map((extensionKey: string) => ({
            title: `${extensionConfig[extensionKey].name} - ${extensionConfig[extensionKey].description}`,
            value: extensionKey,
        })),
        instructions: false,
    });
    return type === 'multiselect' ? selectedExtensions : [selectedExtensions];
};

/**
 * Handle the uninstallation of extensions
 * @param extensionConfig Record<string, ExtensionMeta>
 * @param options {
    projectDirectory: string;
    extensions?: string[];
    verbose?: boolean;
}
 * @returns void
 */
const handleUninstall = async (
    extensionConfig: Record<string, ExtensionMeta>,
    options: {
        projectDirectory: string;
        extensions?: string[];
        verbose?: boolean;
    }
) => {
    let installedExtensions: string[] = Object.keys(extensionConfig);
    if (installedExtensions.length === 0) {
        consoleLog('\n You have not installed any extensions yet.', 'error');
        return;
    }
    const selectedExtensions = options.extensions
        ? options.extensions
        : await getExtensionSelection(
              'multiselect',
              extensionConfig,
              '🔌 Which extensions would you like to uninstall?',
              installedExtensions
          );
    if (selectedExtensions == null || selectedExtensions.length === 0) {
        consoleLog('\n Please select at least one extension to uninstall.', 'error');
        return;
    }
    installedExtensions = installedExtensions.filter((ext) => !selectedExtensions.includes(ext));
    trimExtensions(
        options.projectDirectory,
        Object.fromEntries(installedExtensions.map((ext) => [ext, true])),
        { extensions: extensionConfig },
        options.verbose ?? false
    );
    consoleLog('\n Extensions uninstalled.', 'success');
};

/**
 * Handle the installation of extensions
 * @param extensionConfig 
 * @param options {
    sourceGithubUrl?: string;
    projectDirectory: string;
    extensions?: string[];
    verbose?: boolean;
}
 * @returns 
 */
const handleInstall = async (
    extensionConfig: Record<string, ExtensionMeta>,
    options: {
        sourceGitUrl?: string;
        projectDirectory: string;
        extensions?: string[];
        verbose?: boolean;
    }
) => {
    // check if cursor cli is installed
    try {
        execSync('cursor-agent -v', { stdio: 'ignore' });
    } catch (e) {
        consoleLog(
            `Cursor cli is not installed. Please install it (https://cursor.com/docs/cli/overview) and try again. ${(e as Error).message}`,
            'error'
        );
        return;
    }
    const { sourceGitUrl } = await prompts({
        type: 'text',
        name: 'sourceGitUrl',
        message: '🌐 What is the Git URL for the extensions project?',
        initial: options.sourceGitUrl,
    });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `sfnext-extensions-${Date.now()}`));
    execSync(`git clone ${sourceGitUrl} ${tmpDir}`);
    const srcExtensionConfig = getExtensionConfig(tmpDir);
    if (srcExtensionConfig == null || Object.keys(srcExtensionConfig).length === 0) {
        consoleLog(
            `No extensions found in the source project, please check ${path.join(...CONFIG_PATH)} exists in ${sourceGitUrl} and contains at least one extension.`,
            'error'
        );
        return;
    }
    const selectedExtensions = options.extensions
        ? options.extensions
        : await getExtensionSelection(
              'select',
              srcExtensionConfig,
              '🔌 Which extension would you like to install?',
              Object.keys(srcExtensionConfig)
          );
    if (selectedExtensions == null || selectedExtensions.length !== 1 || selectedExtensions[0] == null) {
        consoleLog('\n Please select extactly one extension to install.', 'error');
        return;
    }
    let hasError = false;
    try {
        const extensionKey = selectedExtensions[0];
        const extension = srcExtensionConfig[extensionKey];
        if (extension.installationInstructions) {
            // eslint-disable-next-line no-console
            console.log(`\n⏳ Installing ${extension.name}, this will take a few minutes...`);
            const startTime = Date.now();
            try {
                execSync(
                    `cursor-agent -p --force 'Execute the steps specified in the installation instructions file: ${extension.installationInstructions}' --model "gpt-5" --output-format text`,
                    { cwd: options.projectDirectory, stdio: 'inherit' }
                );
                // update config.json to include the installed extension
                extensionConfig[extensionKey] = extension;
                fs.writeFileSync(
                    getExtensionConfigPath(options.projectDirectory),
                    JSON.stringify({ extensions: extensionConfig }, null, 4)
                );
                consoleLog(`${extension.name} was installed successfully. (${Date.now() - startTime}ms)`, 'success');
            } catch (e) {
                consoleLog(`Error installing ${extension.name}. ${(e as Error).message}`, 'error');
                hasError = true;
            }
        } else {
            consoleLog(
                `${extension.name} has no installation instructions, pleae contact the extension author to get the instructions.`,
                'error'
            );
            hasError = true;
        }
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    // find all the .original files recursively and report them
    const originalFiles = fs
        .readdirSync(path.join(options.projectDirectory, 'src'), { recursive: true })
        .filter((file: string | Buffer<ArrayBufferLike>) => file.toString().endsWith('.original'));
    if (originalFiles.length > 0) {
        consoleLog(
            '\n📄 The following files were modified. The original files are still available in the same location with the ".original" extension.:',
            'info'
        );
        originalFiles.forEach((file: string | Buffer<ArrayBufferLike>) => {
            consoleLog(`- ${file.toString().replace('.original', '')}`, 'info');
        });
    }
    if (!hasError) {
        consoleLog('\n🚀 Installation completed successfully.', 'info');
    }
};

export const manageExtensions = async (options: {
    projectDirectory: string;
    install?: boolean;
    uninstall?: boolean;
    extensions?: string[];
    sourceGitUrl?: string;
    verbose?: boolean;
}) => {
    if (options.install && options.uninstall) {
        consoleLog('Please select either install or uninstall, not both.', 'error');
        return;
    }
    // Initialize operation based on options or user input
    let operation: string | undefined = options.install ? 'install' : options.uninstall ? 'uninstall' : undefined;
    const extensionConfig: Record<string, ExtensionMeta> = getExtensionConfig(options.projectDirectory);

    if (operation == null) {
        const value = await prompts({
            type: 'select',
            name: 'operation',
            message: '🤔 What would you like to do?',
            choices: [
                { title: 'Install extensions', value: 'install' },
                { title: 'Uninstall extensions', value: 'uninstall' },
            ],
        });
        operation = value.operation;
    }
    if (operation === 'uninstall') {
        await handleUninstall(extensionConfig, options);
    } else {
        await handleInstall(extensionConfig, options);
    }
};
