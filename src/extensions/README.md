# Extensions Directory

This folder contains **feature extensions** that allow you to enhance and customize your storefront experience in a modular way.

## Purpose

The `extensions` directory is the central place for developing and managing reusable application extensions, such as UI widgets, backend integrations, or business logic add-ons. Files under each is self-contained and can be included individually, making it easy to add new features or integrations to your retail application. 

## Extension Plugin

### Component
Extension components can be inserted into plugin points defined in the main application. These plugin points are marked with the `PluginComponent` element, each identified by a unique plugId. For example:

```
<PluginComponent pluginId='header.before.cart' />
```

To insert a component into a plugin point, configure the `plugin-config.json` file under `src/extensions/<your-extension>` folder. For example: 

```
{
    "components": [
        {
            "pluginId": "header.before.cart",
            "path": "extensions/store-locator/components/header/store-locator-badge.tsx",
            "order": 0
        }
    ]
}
```
When more than one components target the same pluginId, they'll be rendered in ascending order as specified.

### Context provider

Similarly, a custom context provider can also be inserted into the application root (root.tsx):

```
{
  "contextProviders": [
        {
            "path": "extensions/store-locator/providers/store-locator.tsx",
            "order": 0
        }
    ]
}
```

### Route
To add a custom route for an extension, simply create a new file under the `src/extensions/<your-extension>/routes` folder. Any file under this folder will be processed as a new route.

## Extension Integration
This folder contains only "net-new" files related to an extention. Integration changes, i.e., additional code changes to the core application, are made in files outside the extension folder. They're marked by special comment markers to indicate the annotated code snippet is a part of an extension.

Example integration code:

- A single line of code
```typescript
/** @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */
import storeLocator from '@extensions/store-locator'
```

- A block of code
```typescript
{/* @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR */}
<li>
    <Link to="/store-locator" className="hover:underline">
        {uiStringsSL.footer.links.storeLocator}
    </Link>
</li>
{/* @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR */}

```

- An entire file
```typescript
/** @sfdc-extension-file SFDC_EXT_STORE_LOCATOR */
...
```


## How Extensions Are Registered

Each extension is registered via the `config.json` file located in the `extensions` directory. Each entry is keyed by a unique marker string, which is used to mark code snippets where extension code is integrated with rest of the application. During the app creation process, a user chooses which extension to include based on the registry.

## Extensions Structure

Example structure:

```
src/extensions/
  config.json
  my-extension/
    index.ts
    [other extension files...]
  another-extension/
    index.ts
```

## Extension Internationalization

Extensions support internationalization (i18n) through the same i18next system used by the core application. Each extension can maintain its own translation files that are discovered and integrated during the build process (when you run `pnpm dev` or `pnpm build`).

### Adding Translations to Your Extension

Create translation files within your extension's `locales` directory:

```
src/extensions/
  my-extension/
    components/
    locales/
      en-US/
        translations.json
      it-IT/
        translations.json
    index.ts
```

Your extension's translations will automatically be namespaced as `extMyExtension` (using PascalCase of your extension folder name). This prevents namespace collisions with core application translations and other extensions.

### Usage Example

```typescript
import { useTranslation } from 'react-i18next';

export function MyExtensionComponent() {
    const { t } = useTranslation('extMyExtension');
    return <h1>{t('welcome')}</h1>;
}
```

For complete documentation on i18n, including usage patterns, best practices, and examples, see [README-I18N.md](../../README-I18N.md#extension-translations).

## Generating Installation/Uninstallation Instructions
If you’re building an extension for customer distribution, you can generate installation and uninstallation instructions that both humans and LLMs can follow to complete the install/uninstall steps.
```
npx @salesforce/sfnext create-instructions -d /path/to/this/project -c /path/to/src/extensions/config.json -e SFDC_EXT_STORE_LOCATOR -p https://github.com/your/template.git -f /path/to/src/extensions/your-extension
```
 Complete options:

 - `-d, --project-directory <dir>`: Project directory
- `-c, --extension-config <config>`: Extension config JSON file location
- `-e, --extension <extension>`: Extension marker value (e.g. SFDC_EXT_featureA)
- `-p, --template-repo <repo>`: Your storefront template repo URL (default: https://github.com/SalesforceCommerceCloud/storefront-next-template.git)
- `-b, --branch <branch>`: PWA repo branch (default: main)
- `-f, --files <files...>`: Specific files/folder to include (relative to project directory, e.g., src/extensions/store-locator)
- `-o, --output-dir <dir>`: Output directory (default: ./instructions)

## `config.json` Schema

Each `config.json` must adhere to the following schema:

| Field                         | Type     | Required | Description                                                                   |
| ----------------------------- | -------- | -------- | ----------------------------------------------------------------------------- |
| `name`                        | string   | yes      | Human-readable name of the extension                                          |
| `description`                 | string   | yes      | A short description of what the extension does                                |
| `installationInstructions`    | string   | no       | (Optional) Path to file with installation instructions                        |
| `uninstallationInstructions`  | string   | no       | (Optional) Path to file with uninstallation instructions                      |
| `folder`                      | string   | no       | (Optional) Folder containing extension specfic code                           |

### Example `config.json`

```json
"SFDC_EXT_PRODUCT_REVIEW": {
  "name": "Product Review",
  "description": "Product review allows a user to see reviews of a product and create new reviews.",
  "installationInstructions": "instructions/install-product-review.mdc",
  "uninstallationInstructions": "instructions/uninstall-product-review.mdc",
  "folder": "product-review"
}
```

## Adding an Extension

1. Create a new subdirectory in `src/extensions/`.
2. Add your extension code files.
3. Add your extension integration code.
4. Generate install/uninstall instructions.
5. Create a new entry in `config.json` per the schema above.

