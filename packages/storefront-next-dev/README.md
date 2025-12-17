# @salesforce/storefront-next-dev

Vite plugin and deployment tools for Salesforce Odyssey integration with React Router v7 and React Server Components.

## Features

### Vite Plugin

- 🚀 **React Server Components (RSC)** support with Vite v7
- 🛣️ **React Router v7** integration with React Router as the framework
- 🛒 **Commerce Cloud API** proxying for development
- 📦 **Built-in entry files** for RSC, SSR, and browser environments
- ☁️ **Managed Runtime Optimization** for Salesforce Commerce Cloud deployment environment

### CLI & Deployment Tools

- **Feature Extension Management**: Keep or remove features from a template
- **Extension LLM Instructions**: Generate LLM instructions for installing a feature
- **Bundle Creation**: Creates TAR archives from React Router build directories
- **Deployment**: Pushes bundles to Managed Runtime
- **Cartridge Generation**: Generate cartridge from decorated components, page types, aspects
- **Cartridge Deployment**: Deploy cartridges to Commerce Cloud
- **Workspace Integration**: Seamlessly works within pnpm workspaces
- **Automatic Configuration**: Intelligent file detection from build directory structure
- **TypeScript**: Written in modern TypeScript with full type safety
- **Clean API**: Minimal, focused public API with only essential exports
- **Modern Tooling**: Built with tsdown for fast compilation
- **Native APIs**: Uses Node.js 18+ built-in fetch (no external HTTP dependencies)

## Installation

```bash
npm install @salesforce/storefront-next-dev
```

## Usage

### Vite Plugin

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import odysseyPlugin from '@salesforce/storefront-next-dev';

export default defineConfig({
    plugins: [
        odysseyPlugin({
            readableChunkNames: false, // optional
        }),
    ],
});
```

### React Router Preset

Use the React Router preset in your `react-router.config.ts`:

```typescript
import type { Config } from '@react-router/dev/config';
import { odysseyPreset } from '@salesforce/storefront-next-dev/react-router-preset';

export default {
    presets: [odysseyPreset()],
} satisfies Config;
```

### CLI Commands

#### Create storefront
```bash
# Create storefront
sfnext create-storefront
```

#### Push bundle

```bash
# Push bundle
sfnext push --project-directory /path/to/your/project --project-slug mrt-project-id --target mrt-target-environment

# Push bundle and wait for deployment
sfnext push --project-directory /path/to/your/project --project-slug mrt-project-id --target mrt-target-environment --wait

# Push with custom message
sfnext push --project-directory /path/to/your/project --project-slug mrt-project-id --target mrt-target-environment --message "Release v1.2.3"

# Push without deployment (upload only)
sfnext push --project-directory /path/to/your/project --project-slug mrt-project-id

# With custom build directory
sfnext push --project-directory /path/to/your/project --build-directory /custom/build/path --project-slug mrt-project-id --target mrt-target-environment
```

#### Generate extension instructions

```bash
# Generate extension instructions
sfnext create-instructions --project-directory /path/to/your/project --extension-config /path/to/extension/config/file --extension SFDC_EXT_STORE_LOCATOR --template-repo https://github.com/SalesforceCommerceCloud/storefront-next-template.git --branch main --files /path/to/your/new/extension/files --output-dir /path/to/instruction/files
```

#### Cartridge generation and deployment instructions

```bash
# Generate cartridge metadata for your site
sfnext generate-cartridge --project-directory /path/to/your/project

# Deploy generated metadata to Commerce Cloud (uses dw.json for all settings)
sfnext deploy-cartridge --project-directory /path/to/your/project

# Deploy cartridge to Commerce Cloud (uses dw.json for all settings)
sfnext deploy-cartridge my-cartridge.zip

# Deploy with both custom instance and version
sfnext deploy-cartridge my-cartridge.zip -i yourCommerceInstance -v custom-version
```


## CLI Options

#### Push bundle

Run `sfnext push --help` to see all available options:

- `-b, --build-directory <dir>`: Build directory to push (default: auto-detected)
- `-m, --message <message>`: Bundle message (default: git branch:commit)
- `-s, --project-slug <slug>`: Project slug - the unique identifier for your project on Managed Runtime (required)
- `-t, --target <target>`: Deploy target environment on Managed Runtime
- `-w, --wait`: Wait for deployment to complete
- `--cloud-origin <origin>`: API origin (default: https://cloud.mobify.com)
- `-c, --credentials-file <file>`: Credentials file location
- `-u, --user <email>`: User email for Managed Runtime
- `-k, --key <api-key>`: API key for Managed Runtime

#### Manage extensions

Run `sfnext extensions list` to view the list of installed extensions
- `-d, --project-directory`: Target project directory (default: current directory)

Run `sfnext extensions install` to install a new extension
- `-d, --project-directory`: Target project directory (default: current directory)
- `-e, --extension`: Extension marker value (e.g. SFDC_EXT_STORE_LOCATOR)
- `-s, --source-git-url`: Git URL of the source template project (default: "https://github.com/SalesforceCommerceCloud/storefront-next-template.git")
- `-v, --verbose`: Verbose mode

Run `sfnex extensions remove` to remove existing extensions
- `-d, --project-directory`: Target project directory (default: current directory)
- `-e, --extensions`: Comma-separated list of extension marker values (e.g. SFDC_EXT_STORE_LOCATOR,SFDC_EXT_INTERNAL_THEME_SWITCHER)
- `-v, --verbose`: Verbose mode

Run `sfnext extensions create` to create a new extension scaffolding
- `-p, --project-directory`: Target project directory (default: current directory)
- `-n, --name`: New extension name (e.g., Store Locator)
- `-d, --description`: Description for the extension

#### Generate extension instructions

Run `sfnext create-instructions --help` to see all available options:

- `-d, --project-directory <dir>`: Project directory
- `-c, --extension-config <config>`: Extension config JSON file location
- `-e, --extension <extension>`: Extension marker value (e.g. SFDC_EXT_featureA)
- `-p, --template-repo <repo>`: Storefront template repo URL (default: https://github.com/SalesforceCommerceCloud/storefront-next-template.git)
- `-b, --branch <branch>`: PWA repo branch (default: main)
- `-f, --files <files...>`: Specific files to include (relative to project directory)
- `-o, --output-dir <dir>`: Output directory (default: ./instructions)

### Programmatic Usage

```typescript
import { push, type PushOptions } from '@salesforce/storefront-next-dev/push';

// With explicit options type
const options: PushOptions = {
    projectDirectory: '/path/to/your/project',
    target: 'mrt-target-environment',
    projectSlug: 'mrt-project-id',
    wait: true,
    message: 'Automated deployment',
};

await push(options);
```

## Configuration

### Automatic Configuration

sfnext uses automatic configuration that detects and configures files from your build directory:

- **Server files** (`ssr_only`): Files from `build/server/` directory plus `loader.js`, `ssr.js`
- **Client files** (`ssr_shared`): Files from `build/client/` directory plus static assets
- **Static patterns**: Common asset types (CSS, images, fonts)

### Default Configuration Details

The tool automatically generates the following configuration:

```json
{
    "ssrParameters": {
        "ssrFunctionNodeVersion": "22.x"
    },
    "ssrOnly": ["loader.js", "streamingHandler.mjs", "server/**/*", "!static/**/*"],
    "ssrShared": ["client/**/*", "static/**/*", "**/*.css", "**/*.png", "**/*.jpg", "**/*.svg", "**/*.ico"]
}
```

Response streaming is enabled by default for bundles pushed to MRT. To change this, export `MRT_BUNDLE_TYPE=ssr` during a push command (e.g. `MRT_BUNDLE_TYPE=ssr pnpm push ...`)

### Key Configuration Options

- **`ssrParameters`**: Runtime configuration (Node.js version, etc.)
- **`ssrOnly`**: Files only available on server (not CDN)
- **`ssrShared`**: Files available on both server and CDN
- **Patterns**: Use glob patterns with `!` for exclusions

## Authentication

### Deploy Cartridge Command Authentication

For cartridge deployment to Commerce Cloud, you need to configure credentials in `dw.json`:

1. **dw.json file** (required): Create a `dw.json` file in the **storefront-next-dev package directory** with:
   ```json
   {
     "username": "your-username@salesforce.com",
     "password": "your-web-access-key",
     "hostname": "your-instance.dx.commercecloud.salesforce.com",
     "code-version": "code-version-from-instance-BM"
   }
   ```

2. **Authentication**: The tool will automatically read username, password, hostname, and code-version from `dw.json` in the storefront-next-dev directory and use Basic Authentication

### Cartridge Commands

The cartridge commands are independent tools for working with Commerce Cloud metadata:

**Generate Cartridge**: `generate-cartridge` scans your project for decorated components and creates metadata files
- Scans `src/` directory for `@Component`, `@PageType`, and `@Aspect` decorators
- Generates JSON metadata files in `cartridge/cartridge/experience/` directory
- Creates separate files for components, page types, and aspects

**Deploy Metadata**: `deploy-cartridge` uploads metadata directories to Commerce Cloud
- ZIP Creation: Automatically creates a ZIP archive from the metadata directory
- Upload: Uploads the ZIP file to Commerce Cloud using WebDAV PUT
- Unzip: Extracts the ZIP contents on the server using WebDAV POST
- Cleanup: Deletes the temporary ZIP file from the server using WebDAV DELETE

**Automatic Cartridge Generation and Deployment on Push**

You can configure the tool to automatically generate and deploy cartridge metadata before an MRT push. This keeps your Page Designer metadata in sync with component changes.

To enable automatic cartridge generation and deployment:

1. Open `storefront-next-dev/dist/config.js`
2. Change `GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH` from `false` to `true`:

```javascript
// In config.ts or config.js
export const GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH = true; // Set to true to enable
```

**Default:** `false` (manual cartridge generation/deployment via `sfnext generate-cartridge` and `sfnext deploy-cartridge`)

**Prerequisites:**
- A valid `dw.json` file must be present in the storefront-next-dev package directory with Commerce Cloud credentials (see "Deploy Cartridge Command Authentication" section above)

When enabled, before each `sfnext push` command:
1. Cartridge metadata will be automatically generated from decorated components
2. The cartridge will be automatically deployed to Commerce Cloud
3. The MRT push will proceed as normal

If generation or deployment fails:
- A warning is displayed with manual command suggestions
- The MRT push still succeeds (cartridge errors don't block deployments)

You can still run `sfnext generate-cartridge` and `sfnext deploy-cartridge` manually at any time.

> **Note:** This feature is designed for development workflows where you want to keep Page Designer metadata in sync with your deployments. For production CI/CD pipelines, consider running `sfnext generate-cartridge` and `sfnext deploy-cartridge` as separate, explicit steps for better control and error handling.

## Credentials

Set up credentials in one of these ways:

1. **Credentials file** (recommended): `~/.mobify`

    ```json
    {
        "username": "your-email@example.com",
        "api_key": "your-api-key"
    }
    ```

2. **Command line flags**: Use `--user` and `--key` options (see CLI Options section)

Get your credentials at: https://runtime.commercecloud.com/account/settings

## Bundle Structure

The tool creates bundles with the following structure:

- **TAR Archive**: Contains all build files prefixed with `[projectSlug]/bld/`
- **File Distribution**:
    - `ssr_only`: Files only on server (not CDN) - includes server-side code
    - `ssr_shared`: Files on both server and CDN - includes client assets
- **Metadata**: Dependencies and Commerce Cloud overrides

## Subpath Exports

For optimal tree-shaking, use subpath exports:

- `@salesforce/storefront-next-dev` - Vite plugin (default export)
- `@salesforce/storefront-next-dev/react-router-preset` - React Router preset
- `@salesforce/storefront-next-dev/react-router/Scripts` - React Router Scripts component
- `@salesforce/storefront-next-dev/push` - Programmatic push API (tree-shakes CLI dependencies)
