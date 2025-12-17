import { execSync } from 'child_process';
import { generateEnvFile } from './utils';
import { error } from './utils/logger';
import prompts from 'prompts';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import trimExtensions from './extensibility/trim-extensions';

const DEFAULT_STOREFRONT = 'sfcc-storefront';
const STOREFRONT_NEXT_GITHUB_URL = 'https://github.com/SalesforceCommerceCloud/storefront-next-template';

export const createStorefront = async (options: { verbose?: boolean }) => {
    // Check if git is available before proceeding
    try {
        execSync('git --version', { stdio: 'ignore' });
    } catch (e) {
        error(`❌ git isn't installed or found in your PATH. Install git before running this command: ${String(e)}`);
        process.exit(1);
    }
    const { storefront } = await prompts({
        type: 'text',
        name: 'storefront',
        message: '🏪 What would you like to name your storefront?\n',
        initial: DEFAULT_STOREFRONT,
    });
    if (!storefront) {
        error('Storefront name is required.');
        process.exit(1);
    }
    // eslint-disable-next-line no-console
    console.log('\n');
    let { template } = await prompts({
        type: 'select',
        name: 'template',
        message: '📄 Which template would you like to use for your storefront?\n',
        choices: [
            { title: 'Salesforce B2C Commerce Retail Storefront', value: STOREFRONT_NEXT_GITHUB_URL },
            { title: 'A different template (I will provide the Github URL)', value: 'custom' },
        ],
    });
    // eslint-disable-next-line no-console
    console.log('\n');
    if (template === 'custom') {
        const { githubUrl } = await prompts({
            type: 'text',
            name: 'githubUrl',
            message: '🌐 What is the Github URL for your template?\n',
        });
        if (!githubUrl) {
            error('Github URL is required.');
            process.exit(1);
        }
        template = githubUrl;
    }
    // Clone the template based on the template URL and storefront name
    execSync(`git clone ${template} ${storefront}`);
    // remove the .git directory so it starts out as a local project
    const gitDir = path.join(storefront, '.git');
    if (fs.existsSync(gitDir)) {
        fs.rmSync(gitDir, { recursive: true, force: true });
    }
    // eslint-disable-next-line no-console
    console.log('\n');
    // configure extensions
    if (fs.existsSync(path.join(storefront, 'src', 'extensions', 'config.json'))) {
        const extensionConfigText = fs.readFileSync(path.join(storefront, 'src', 'extensions', 'config.json'), 'utf8');
        const extensionConfig = JSON.parse(extensionConfigText);
        if (extensionConfig.extensions) {
            const { selectedExtensions } = await prompts({
                type: 'multiselect',
                name: 'selectedExtensions',
                message:
                    '🔌 Which extension would you like to enable? (Use arrow keys to select, space to toggle, and enter to confirm.)\n',
                choices: Object.keys(extensionConfig.extensions).map((extension) => ({
                    title: `${extensionConfig.extensions[extension].name} - ${
                        extensionConfig.extensions[extension].description
                    }`,
                    value: extension,
                    selected: extensionConfig.extensions[extension].defaultOn ?? true,
                })),
                instructions: false,
            });
            const enabledExtensions = Object.fromEntries(selectedExtensions.map((ext: string) => [ext, true]));
            trimExtensions(
                storefront,
                enabledExtensions,
                { extensions: extensionConfig.extensions },
                options?.verbose || false
            );
        }
    }
    // interview for config overrides
    const configMeta = JSON.parse(fs.readFileSync(path.join(storefront, 'src', 'config', 'config-meta.json'), 'utf8'));
    // Load default config values from .env.default if it exists
    const envDefaultPath = path.join(storefront, '.env.default');
    let envDefaultValues: Record<string, string> = {};
    if (fs.existsSync(envDefaultPath)) {
        const result = dotenv.parse(fs.readFileSync(envDefaultPath, 'utf8'));
        envDefaultValues = result;
    }
    // eslint-disable-next-line no-console
    console.log('\n⚙️ We will now configure your storefront before it will be ready to run.\n');
    const configOverrides: Record<string, string> = {};
    for (const config of configMeta.configs) {
        const answer = await prompts({
            type: 'text',
            name: config.key,
            message: `What is the value for ${config.name}? (default: ${envDefaultValues[config.key]})\n`,
            initial: envDefaultValues[config.key] ?? '',
        });
        configOverrides[config.key] = answer[config.key];
    }
    // Generate the .env file based on the .env.default file and the config overrides from the extension config
    generateEnvFile(storefront, configOverrides);
    // Print banner after setup is complete
    const BANNER = `
    ╔══════════════════════════════════════════════════════════════════╗
    ║                       CONGRATULATIONS                            ║
    ╚══════════════════════════════════════════════════════════════════╝

        🎉 Congratulations! Your storefront is ready to use! 🎉
        What's next:
        - Navigate to the storefront directory: cd ${storefront}
        - Install dependencies: pnpm install
        - Build the storefront: pnpm run build
        - Run the development server: pnpm run dev
    `;
    // eslint-disable-next-line no-console
    console.log(BANNER);
};
