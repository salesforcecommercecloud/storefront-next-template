import { Command } from 'commander';
import { push } from './commands/push';
import { dev } from './commands/dev';
import { preview } from './commands/preview';
import { generateInstructions } from './extensibility/create-instructions';
import { error, info, success } from './utils/logger';
import { generateMetadata } from './cartridge-services/generate-cartridge';
import { deployCode } from './cartridge-services/deploy-cartridge';
import {
    CARTRIDGES_BASE_DIR,
    SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR,
    GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH,
} from './config';
import { DEFAULT_CLOUD_ORIGIN } from './utils';
import pkg from '../package.json' with { type: 'json' };
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs-extra';
import { createStorefront } from './create-storefront';
import { manageExtensions, createExtension, listExtensions } from './extensibility/manage-extensions';

// Get the directory of this CLI file for resolving dw.json path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Shared path resolution and validation
interface PathOptions {
    projectDirectory?: string;
}

function validateAndBuildPaths(options: PathOptions): {
    projectDirectory: string;
    cartridgeBaseDir: string;
    metadataDir: string;
} {
    if (!options.projectDirectory) {
        error('--project-directory is required.');
        process.exit(1);
    }

    // Check if project directory exists
    if (!fs.existsSync(options.projectDirectory)) {
        error(`Project directory doesn't exist: ${options.projectDirectory}`);
        process.exit(1);
    }

    // Base directory for deployment (everything under this gets zipped)
    const cartridgeBaseDir = path.join(options.projectDirectory, CARTRIDGES_BASE_DIR);

    // Full path where metadata files are generated
    const metadataDir = path.join(options.projectDirectory, CARTRIDGES_BASE_DIR, SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR);

    return { projectDirectory: options.projectDirectory, cartridgeBaseDir, metadataDir };
}

/**
 * Shared function to generate cartridge metadata
 * Used by both the generate-cartridge command and the push command (when enabled)
 */
async function runGenerateCartridge(projectDirectory: string): Promise<void> {
    const { projectDirectory: validatedProjectDir, metadataDir } = validateAndBuildPaths({ projectDirectory });

    // Ensure the full metadata directory path exists
    if (!fs.existsSync(metadataDir)) {
        info(`Creating metadata directory: ${metadataDir}`);
        fs.mkdirSync(metadataDir, { recursive: true });
    }

    await generateMetadata(validatedProjectDir, metadataDir);
}

/**
 * Shared function to deploy cartridge to Commerce Cloud
 * Used by both the deploy-cartridge command and the push command (when enabled)
 */
async function runDeployCartridge(projectDirectory: string): Promise<void> {
    // Read credentials from dw.json in the storefront-next-dev package directory
    // __dirname points to dist/, so go up one level to package root
    const dwJsonPath = path.join(__dirname, '..', 'dw.json');

    if (!fs.existsSync(dwJsonPath)) {
        throw new Error(
            `The dw.json file not found in storefront-next-dev directory. Make sure dw.json exists at ${dwJsonPath}`
        );
    }

    const dwConfig = JSON.parse(fs.readFileSync(dwJsonPath, 'utf8'));

    const { cartridgeBaseDir, metadataDir } = validateAndBuildPaths({ projectDirectory });

    // Verify metadata directory exists within cartridge base
    if (!fs.existsSync(metadataDir)) {
        throw new Error(`Metadata directory doesn't exist: ${metadataDir}. Run 'generate-cartridge' first.`);
    }

    if (!dwConfig.username || !dwConfig.password) {
        throw new Error('Username and password are required in the dw.json file.');
    }

    const instance = dwConfig.hostname;
    if (!instance) {
        throw new Error('Instance is required. Add "hostname" to the dw.json file.');
    }

    const codeVersion = dwConfig['code-version'];
    if (!codeVersion) {
        throw new Error('Code version is required. Add "code-version" to the dw.json file.');
    }

    const credentials = `${dwConfig.username}:${dwConfig.password}`;
    const encoded = Buffer.from(credentials).toString('base64');

    // Deploy the cartridge base directory (includes full cartridge path structure)
    const result = await deployCode(instance, codeVersion, cartridgeBaseDir, encoded);

    success(`Code deployed to version "${result.version}" successfully!`);
}

const program = new Command();
// allow the default template git url to be overridden by an environment variable
const DEFAULT_TEMPLATE_GIT_URL =
    process.env.DEFAULT_TEMPLATE_GIT_URL || 'https://github.com/SalesforceCommerceCloud/storefront-next-template.git';

const handleCommandError = (label: string, err: unknown): never => {
    if (err instanceof Error) {
        error(err.stack || err.message);
        error(`${label} failed: ${err.message}`);
    } else {
        error(String(err));
        error(`${label} failed`);
    }
    process.exit(1);
};

program.name('sfnext').description('Dev and build tools for Storefront Next.').version(pkg.version);

program
    .command('create-storefront')
    .description('Create a storefront project.')
    .option('-v --verbose', 'Verbose mode')
    .action(async (options) => {
        try {
            await createStorefront({ verbose: options.verbose });
        } catch (err) {
            handleCommandError('create-storefront', err);
        }
    });

program
    .command('push')
    .description('Create and push bundle to Managed Runtime.')
    .requiredOption('-d, --project-directory <dir>', 'Project directory')
    .option('-b, --build-directory <dir>', 'Build directory to push (default: auto-detected)')
    .option('-m, --message <message>', 'Bundle message (default: git branch:commit)')
    .option(
        '-s, --project-slug <slug>',
        'Project slug - the unique identifier for your project on Managed Runtime (default: from .env MRT_PROJECT or package.json name.)'
    )
    .option('-t, --target <target>', 'Deploy target environment (default: from .env MRT_TARGET).')
    .option('-w, --wait', 'Wait for deployment to complete.', false)
    .option('--cloud-origin <origin>', 'API origin', DEFAULT_CLOUD_ORIGIN)
    .option('-c, --credentials-file <file>', 'Credentials file location.')
    .option('-u, --user <email>', 'User email for Managed Runtime.')
    .option('-k, --key <api-key>', 'API key for Managed Runtime.')
    .action(async (options) => {
        try {
            // Optionally generate and deploy cartridge metadata before MRT push
            if (GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH) {
                try {
                    info('Generating cartridge metadata before MRT push...');
                    await runGenerateCartridge(options.projectDirectory);
                    success('Cartridge metadata generated successfully!');

                    info('Deploying cartridge to Commerce Cloud...');
                    await runDeployCartridge(options.projectDirectory);
                    success('Cartridge deployed successfully!');
                } catch (cartridgeError) {
                    // Don't fail the push if cartridge generation/deployment fails
                    error(`Warning: Failed to generate or deploy cartridge: ${(cartridgeError as Error).message}`);
                }
            }

            await push({
                projectDirectory: options.projectDirectory,
                buildDirectory: options.buildDirectory,
                message: options.message,
                projectSlug: options.projectSlug,
                target: options.target,
                wait: options.wait,
                cloudOrigin: options.cloudOrigin,
                credentialsFile: options.credentialsFile,
                user: options.user,
                key: options.key,
            });

            process.exit(0);
        } catch (err) {
            handleCommandError('Push', err);
        }
    });

program
    .command('dev')
    .description('Start Vite development server with SSR.')
    .option('-d, --project-directory <dir>', 'Project directory (default: current directory).')
    .option('-p, --port <port>', 'Port number (default: 5173)', (val) => parseInt(val, 10))
    .action(async (options) => {
        try {
            await dev({
                projectDirectory: options.projectDirectory,
                port: options.port,
            });
        } catch (err) {
            handleCommandError('Dev', err);
        }
    });

program
    .command('preview')
    .description('Start preview server with production build (auto-builds if needed).')
    .option('-d, --project-directory <dir>', 'Project directory (default: current directory).')
    .option('-p, --port <port>', 'Port number (default: 3000)', (val) => parseInt(val, 10))
    .action(async (options) => {
        try {
            await preview({
                projectDirectory: options.projectDirectory,
                port: options.port,
            });
        } catch (err) {
            handleCommandError('Serve', err);
        }
    });

program
    .command('create-instructions')
    .description(
        'Generate LLM instructions using prompt templating for installing and uninstalling Storefront Next feature extensions.'
    )
    .requiredOption('-d, --project-directory <dir>', 'Project directory.')
    .requiredOption('-c, --extension-config <config>', 'Extension config JSON file location.')
    .requiredOption('-e, --extension <extension>', 'Extension marker value (e.g. SFDC_EXT_featureA).')
    .option(
        '-p, --template-repo <repo>',
        'Storefront template repo URL (default: https://github.com/SalesforceCommerceCloud/storefront-next-template.git)'
    )
    .option('-b, --branch <branch>', 'Storefront template repo branch (default: main).')
    .option('-f, --files <files...>', 'Specific files to include (relative to project directory).')
    .option('-o, --output-dir <dir>', 'Output directory (default: ./instructions).')
    .action((options) => {
        try {
            const baseDir = process.cwd();
            const projectDirectory = path.resolve(baseDir, options.projectDirectory);
            const extensionConfig = path.resolve(baseDir, options.extensionConfig);
            const files = options.files ?? undefined;

            generateInstructions(
                projectDirectory,
                options.extension,
                options.outputDir,
                options.templateRepo,
                options.branch,
                files,
                extensionConfig,
                `${__dirname}/extensibility/templates`
            );
            process.exit(0);
        } catch (err) {
            handleCommandError('create-instructions', err);
        }
    });

const extensionsCommand = program
    .command('extensions')
    .description('Manage features extensions for a storefront project.');

extensionsCommand
    .command('list')
    .description('List all installed extensions.')
    .option('-d, --project-directory <dir>', 'Target project directory', process.cwd())
    .action((options) => {
        try {
            listExtensions(options);
        } catch (err) {
            handleCommandError('extensions list', err);
        }
    });

extensionsCommand
    .command('install')
    .description('Install an extension.')
    .option('-d, --project-directory <dir>', 'Target project directory.', process.cwd())
    .option('-e, --extension <extension>', 'Extension marker value (e.g. SFDC_EXT_STORE_LOCATOR).')
    .option('-s, --source-git-url <url>', 'Git URL of the source template project', DEFAULT_TEMPLATE_GIT_URL)
    .option('-v, --verbose', 'Verbose mode.')
    .action(async (options) => {
        try {
            await manageExtensions({
                projectDirectory: options.projectDirectory,
                install: true,
                extensions: options.extension ? [options.extension] : undefined,
                sourceGitUrl: options.sourceGitUrl,
                verbose: options.verbose,
            });
        } catch (err) {
            handleCommandError('extensions install', err);
        }
    });

extensionsCommand
    .command('remove')
    .description('Remove one or more installed extensions.')
    .option('-d, --project-directory <dir>', 'Target project directory', process.cwd())
    .option(
        '-e, --extensions <extensions>',
        'Comma-separated list of extension marker values (e.g. SFDC_EXT_STORE_LOCATOR,SFDC_EXT_INTERNAL_THEME_SWITCHER).'
    )
    .option('-v, --verbose', 'Verbose mode.')
    .action(async (options) => {
        try {
            await manageExtensions({
                projectDirectory: options.projectDirectory,
                uninstall: true,
                extensions: options.extensions,
                verbose: options.verbose,
            });
        } catch (err) {
            handleCommandError('extensions remove', err);
        }
    });

extensionsCommand
    .command('create')
    .description('Create an extension.')
    .option('-p, --project-directory <projectDirectory>', 'Target project directory', process.cwd())
    .option('-n, --name <name>', 'Name of the extension to create, e.g., "My Extension".')
    .option('-d, --description <description>', 'Description of the extension.')
    .action(async (options) => {
        try {
            await createExtension(options);
        } catch (err) {
            handleCommandError('extensions create', err);
        }
    });

program
    .command('generate-cartridge')
    .description('Generate component cartridge metadata from decorated components.')
    .requiredOption('-d, --project-directory <dir>', 'Project directory containing the source code.')
    .action(async (options) => {
        try {
            await runGenerateCartridge(options.projectDirectory);
            process.exit(0);
        } catch (err) {
            error(`Generate metadata failed: ${(err as Error).message}`);
            process.exit(1);
        }
    });

program
    .command('deploy-cartridge')
    .description('Deploy a cartridge to Commerce Cloud (zips and uploads the metadata directory).')
    .requiredOption('-d, --project-directory <dir>', 'Project directory containing the source code.')
    .action(async (options) => {
        try {
            await runDeployCartridge(options.projectDirectory);
            process.exit(0);
        } catch (err) {
            error(`Deploy failed: ${(err as Error).message}`);
            process.exit(1);
        }
    });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    error(`Unhandled Rejection at: ${String(promise)}, reason: ${String(reason)}`);
    process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
