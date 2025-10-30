# Odyssey Dev

Bundle creation, deployment and feature extension management tool for SFCC Odyssey. Takes pre-built code, configures extensions and creates deployable bundles for Managed Runtime.

## Features

- **Feature Extension Management**: Keep or remove features from a template
- **Extension LLM Instructions**: Generate LLM instructions for installing a feature
- **Bundle Creation**: Creates TAR archives from React Router build directories
- **Deployment**: Pushes bundles to Managed Runtime
- **Workspace Integration**: Seamlessly works within pnpm workspaces
- **Automatic Configuration**: Intelligent file detection from build directory structure
- **TypeScript**: Written in modern TypeScript with full type safety
- **Clean API**: Minimal, focused public API with only essential exports
- **Modern Tooling**: Built with tsdown for fast compilation
- **Native APIs**: Uses Node.js 18+ built-in fetch (no external HTTP dependencies)

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Test the package
pnpm test
```
## Usage

### CLI Commands

#### Push bundle
```bash
# Push bundle
odyssey-dev push --project-directory /path/to/your/project --project-slug mrt-project-id --target mrt-target-environment

# Push bundle and wait for deployment
odyssey-dev push --project-directory /path/to/your/project --project-slug mrt-project-id --target mrt-target-environment --wait

# Push with custom message
odyssey-dev push --project-directory /path/to/your/project --project-slug mrt-project-id --target mrt-target-environment --message "Release v1.2.3"

# Push without deployment (upload only)
odyssey-dev push --project-directory /path/to/your/project --project-slug mrt-project-id

# With custom build directory
odyssey-dev push --project-directory /path/to/your/project --build-directory /custom/build/path --project-slug mrt-project-id --target mrt-target-environment
```

#### Manage extensions
```bash
# Manage Extensions allows you to enable or disable feature extensions in a template project by trimming files and code based on your extension configuration.
odyssey-dev manage-extensions --project-directory /path/to/your/project --extension-config /path/to/extension/config/file --extensions SFDC_EXT_STORE_LOCATOR,SFDC_EXT_THEME_SWITCHER
```


#### Generate extension instructions
```bash
# Generate extension instructions
odyssey-dev create-instructions --project-directory /path/to/your/project --extension-config /path/to/extension/config/file --extension SFDC_EXT_STORE_LOCATOR --pwa-repo https://github.com/SalesforceCommerceCloud/SFCC-Odyssey.git --branch main --files /path/to/your/new/extension/files --output-dir /path/to/instruction/files
```

## CLI Options
#### Push bundle
Run `odyssey-dev push --help` to see all available options:

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
Run `odyssey-dev manage-extensions --help` to see all available options:
- `-d, --project-directory <dir>`: Project directory to trim
- `-c, --extension-config <config>`: Extension config JSON file location
- `-e, --extensions <extensions>`: Comma-separated list of enabled extension marker values (e.g. SFDC_EXT_featureA)

#### Generate extension instructions
Run `odyssey-dev create-instructions --help` to see all available options:
- `-d, --project-directory <dir>`: Project directory
- `-c, --extension-config <config>`: Extension config JSON file location
- `-e, --extension <extension>`: Extension marker value (e.g. SFDC_EXT_featureA)
- `-p, --pwa-repo <repo>`: PWA repo URL (default: https://github.com/SalesforceCommerceCloud/SFCC-Odyssey.git)
- `-b, --branch <branch>`: PWA repo branch (default: main)
- `-f, --files <files...>`: Specific files to include (relative to project directory)
- `-o, --output-dir <dir>`: Output directory (default: ./instructions)

### Programmatic Usage
```typescript
import { push, type PushOptions } from 'odyssey-dev'

// With explicit options type
const options: PushOptions = {
  projectDirectory: '/path/to/your/project',
  target: 'mrt-target-environment',
  projectSlug: 'mrt-project-id',
  wait: true,
  message: 'Automated deployment'
}

await push(options)
```

## Configuration

### Automatic Configuration

odyssey-dev uses automatic configuration that detects and configures files from your build directory:

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
  "ssrOnly": [
    "loader.js",
    "ssr.js",
    "server/**/*",
    "!static/**/*"
  ],
  "ssrShared": [
    "client/**/*",
    "static/**/*",
    "**/*.css",
    "**/*.png",
    "**/*.jpg",
    "**/*.svg",
    "**/*.ico"
  ]
}
```

### Key Configuration Options

- **`ssrParameters`**: Runtime configuration (Node.js version, etc.)
- **`ssrOnly`**: Files only available on server (not CDN)
- **`ssrShared`**: Files available on both server and CDN
- **Patterns**: Use glob patterns with `!` for exclusions

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
      