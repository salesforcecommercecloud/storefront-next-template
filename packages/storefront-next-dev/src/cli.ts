import { Command } from 'commander';
import { push } from './push.js';
import { generateInstructions } from './extensibility/create-instructions.js';
import trimExtensions from './extensibility/trim-extensions.js';
import { DEFAULT_CLOUD_ORIGIN, error } from './utils.js';
import pkg from '../package.json' with { type: 'json' };
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs-extra';
import { createStorefront } from './create-storefront.js';

const program = new Command();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

program
    .command('manage-extensions')
    .description('Manage features extensions for a template project')
    .requiredOption('-d, --project-directory <dir>', 'Project directory to trim')
    .requiredOption('-c, --extension-config <config>', 'Extension config JSON file location')
    .option(
        '-e, --extensions <extensions>',
        'Comma-separated list of enabled extension marker values (e.g. SFDC_EXT_featureA)'
    )
    .action((options) => {
        try {
            const cwd = process.cwd();
            const directory = path.resolve(cwd, options.projectDirectory);
            const extensionConfig = path.resolve(cwd, options.extensionConfig);
            // Read JSON config file
            const jsonText = fs.readFileSync(extensionConfig, 'utf8');
            const configuredExtensions = JSON.parse(jsonText);
            let enabledExtensions: Record<string, boolean> | undefined = undefined;
            if (options.extensions) {
                // eslint-disable-next-line no-console
                console.log('options.extensions', options.extensions);
                enabledExtensions = {};
                for (const ext of options.extensions.split(',')) {
                    enabledExtensions[ext] = true;
                }
            }
            trimExtensions(directory, enabledExtensions, { extensions: configuredExtensions.extensions });
            // eslint-disable-next-line no-console
            console.log('Trim complete.');
            process.exit(0);
        } catch (err) {
            handleCommandError('trim-extensions', err);
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
