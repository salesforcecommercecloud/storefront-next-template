import { Command } from 'commander';
import { push } from './push.js';
import { generateInstructions } from './extensibility/create-instructions.js';
import { generateMetadata } from './cartridge-services/generate-cartridge.js';
import { deployCode } from './cartridge-services/deploy-cartridge.js';
import { CARTRIDGES_BASE_DIR, SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR } from './config.js';
import { DEFAULT_CLOUD_ORIGIN, error, success, info } from './utils.js';
import pkg from '../package.json' with { type: 'json' };
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs-extra';
import { createStorefront } from './create-storefront.js';
import { manageExtensions } from './extensibility/manage-extensions.js';

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
        error('--project-directory is required');
        process.exit(1);
    }

    // Check if project directory exists
    if (!fs.existsSync(options.projectDirectory)) {
        error(`Project directory does not exist: ${options.projectDirectory}`);
        process.exit(1);
    }

    // Base directory for deployment (everything under this gets zipped)
    const cartridgeBaseDir = path.join(options.projectDirectory, CARTRIDGES_BASE_DIR);

    // Full path where metadata files are generated
    const metadataDir = path.join(options.projectDirectory, CARTRIDGES_BASE_DIR, SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR);

    return { projectDirectory: options.projectDirectory, cartridgeBaseDir, metadataDir };
}

const program = new Command();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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

program.name('sfnext').description('Dev and build tools for SFCC Storefront Next').version(pkg.version);

program
    .command('create-storefront')
    .description('Create a new storefront project')
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
    .description('Create and push bundle to Managed Runtime')
    .requiredOption('-d, --project-directory <dir>', 'Project directory')
    .option('-b, --build-directory <dir>', 'Build directory to push (default: auto-detected)')
    .option('-m, --message <message>', 'Bundle message (default: git branch:commit)')
    .option(
        '-s, --project-slug <slug>',
        'Project slug - the unique identifier for your project on Managed Runtime (default: from .env MRT_PROJECT or package.json name)'
    )
    .option('-t, --target <target>', 'Deploy target environment (default: from .env MRT_TARGET)')
    .option('-w, --wait', 'Wait for deployment to complete', false)
    .option('--cloud-origin <origin>', 'API origin', DEFAULT_CLOUD_ORIGIN)
    .option('-c, --credentials-file <file>', 'Credentials file location')
    .option('-u, --user <email>', 'User email for Managed Runtime')
    .option('-k, --key <api-key>', 'API key for Managed Runtime')
    .action(async (options) => {
        try {
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
    .command('create-instructions')
    .description(
        'Generate LLM instructions using prompt templating for installing and uninstalling Storefront Next feature extensions'
    )
    .requiredOption('-d, --project-directory <dir>', 'Project directory')
    .requiredOption('-c, --extension-config <config>', 'Extension config JSON file location')
    .requiredOption('-e, --extension <extension>', 'Extension marker value (e.g. SFDC_EXT_featureA)')
    .option(
        '-p, --template-repo <repo>',
        'Storefront template repo URL (default: https://github.com/SalesforceCommerceCloud/storefront-next-template.git)'
    )
    .option('-b, --branch <branch>', 'Storefront template repo branch (default: main)')
    .option('-f, --files <files...>', 'Specific files to include (relative to project directory)')
    .option('-o, --output-dir <dir>', 'Output directory (default: ./instructions)')
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
    .description('Manage features extensions for a storefront project');

extensionsCommand
    .command('install')
    .description('Install a new extension')
    .option('-d, --project-directory <dir>', 'Target project directory', process.cwd())
    .option('-e, --extension <extension>', 'Extension marker value (e.g. SFDC_EXT_STORE_LOCATOR)')
    .option('-s, --source-git-url <url>', 'Git URL of the source template project', DEFAULT_TEMPLATE_GIT_URL)
    .option('-v, --verbose', 'Verbose mode')
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
    .description('Remove one or more installed extensions')
    .option('-d, --project-directory <dir>', 'Target project directory', process.cwd())
    .option(
        '-e, --extensions <extensions>',
        'Comma-separated list of extension marker values (e.g. SFDC_EXT_STORE_LOCATOR,SFDC_EXT_INTERNAL_THEME_SWITCHER)'
    )
    .option('-v, --verbose', 'Verbose mode')
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

program
    .command('generate-cartridge')
    .description('Generate component cartridge metadata from decorated components')
    .requiredOption('-d, --project-directory <dir>', 'Project directory containing the source code')
    .action(async (options) => {
        try {
            const { projectDirectory, metadataDir } = validateAndBuildPaths(options);

            // Ensure the full metadata directory path exists
            if (!fs.existsSync(metadataDir)) {
                info(`Creating metadata directory: ${metadataDir}`);
                fs.mkdirSync(metadataDir, { recursive: true });
            }

            await generateMetadata(projectDirectory, metadataDir);
            process.exit(0);
        } catch (err) {
            error(`Generate metadata failed: ${(err as Error).message}`);
            process.exit(1);
        }
    });

program
    .command('deploy-cartridge')
    .description('Deploy a cartridge to Commerce Cloud (zips and uploads the metadata directory)')
    .requiredOption('-d, --project-directory <dir>', 'Project directory containing the source code')
    .action(async (options) => {
        try {
            // Read credentials from dw.json
            const dwJsonPath = path.join(process.cwd(), 'dw.json');

            if (!fs.existsSync(dwJsonPath)) {
                error('dw.json file not found. Please ensure dw.json exists in the current directory.');
                process.exit(1);
            }

            const dwConfig = JSON.parse(fs.readFileSync(dwJsonPath, 'utf8'));

            const { cartridgeBaseDir, metadataDir } = validateAndBuildPaths(options);

            // Verify metadata directory exists within cartridge base
            if (!fs.existsSync(metadataDir)) {
                info(`Warning: Metadata directory does not exist: ${metadataDir}`);
                info(`Run 'generate-cartridge' first to create metadata files.`);
                process.exit(1);
            }

            if (!dwConfig.username || !dwConfig.password) {
                error('Username and password are required in dw.json file.');
                process.exit(1);
            }

            const instance = dwConfig.hostname;

            if (!instance) {
                error('Instance is required. Add "hostname" to dw.json file.');
                process.exit(1);
            }

            const codeVersion = dwConfig['code-version'];

            if (!codeVersion) {
                error('Code version is required. Add "code-version" to dw.json file.');
                process.exit(1);
            }

            const credentials = `${dwConfig.username}:${dwConfig.password}`;
            const encoded = Buffer.from(credentials).toString('base64');

            // Deploy the cartridge base directory (includes full cartridge path structure)
            const result = await deployCode(instance, codeVersion, cartridgeBaseDir, encoded);

            success(`Code deployed to version "${result.version}" successfully!`);

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
