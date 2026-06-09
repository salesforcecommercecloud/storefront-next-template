import { t as logger } from "../../logger.js";
import "../../logger2.js";
import { r as commonFlags } from "../../flags.js";
import { t as GENERATED_EXTENSION_DIRS } from "../../constants.js";
import { Command, Flags } from "@oclif/core";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { parse } from "@babel/parser";

//#region src/config/aggregate-extension-config.ts
/** Apache License 2.0 header text for generated files. Inlined to avoid path resolution issues in standalone projects. */
const APACHE_LICENSE_HEADER = [
	`Copyright ${(/* @__PURE__ */ new Date()).getFullYear()} Salesforce, Inc.`,
	"",
	"Licensed under the Apache License, Version 2.0 (the \"License\");",
	"you may not use this file except in compliance with the License.",
	"You may obtain a copy of the License at",
	"",
	"    http://www.apache.org/licenses/LICENSE-2.0",
	"",
	"Unless required by applicable law or agreed to in writing, software",
	"distributed under the License is distributed on an \"AS IS\" BASIS,",
	"WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.",
	"See the License for the specific language governing permissions and",
	"limitations under the License."
].join("\n");
const OUTPUT_DIR_NAME = GENERATED_EXTENSION_DIRS.config;
const LOCALES_DIR_NAME = GENERATED_EXTENSION_DIRS.locales;
/**
* A camelCased folder name is only usable as a config key if it is also a plain JS identifier:
* a leading letter followed by letters or digits. Folder names that camelCase to anything else
* (a dot, a leading digit, an empty string) would emit a barrel that fails to parse.
*/
const VALID_CONFIG_KEY = /^[a-zA-Z][a-zA-Z0-9]*$/;
function getDefaultDirs(projectDirectory) {
	const extensionsDir = join(projectDirectory, "src", "extensions");
	return {
		EXTENSIONS_DIR: extensionsDir,
		OUTPUT_DIR: join(extensionsDir, OUTPUT_DIR_NAME)
	};
}
/** Convert kebab-case to PascalCase (e.g. `store-locator` → `StoreLocator`). */
function toPascalCase(str) {
	return str.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}
/**
* Convert a kebab-case extension folder name to the camelCase key it occupies under
* `app.extension` (e.g. `loqate-address-verification` → `loqateAddressVerification`). This
* is the key merchants reference as `PUBLIC__app__extension__<key>__<setting>`.
*/
function toCamelCase(str) {
	const pascal = toPascalCase(str);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
/** Value node types allowed inside a config object: static data only, no computed expressions. */
const STATIC_VALUE_TYPES = new Set([
	"StringLiteral",
	"NumericLiteral",
	"BooleanLiteral",
	"NullLiteral",
	"ArrayExpression",
	"ObjectExpression",
	"TSAsExpression"
]);
/**
* Assert an extension's `config.ts` is a static, default-exported object literal — and nothing
* more. The generated barrel imports each `config.ts` as a live ES module, evaluated at build,
* typegen, `pnpm dev`, and server startup; since extensions are third-party and distributable,
* any top-level statement (an import, a `fetch`, a `process.env` read) would run arbitrary
* vendor code in those contexts and could leak secrets into the client bundle. Validating the
* shape at discovery time turns that supply-chain risk into a clear build-time error.
*/
function assertStaticConfigModule(filePath, source) {
	const reject = (reason) => {
		throw new Error(`Extension config "${filePath}" must default-export a plain object of static values. ${reason} Config files are imported as live modules at build and server startup, so they may not import, call functions, or read process.env. Move dynamic/server-only values to a route handler.`);
	};
	const ast = parse(source, {
		sourceType: "module",
		plugins: ["typescript"]
	});
	let declaration;
	for (const node of ast.program.body) if (node.type === "ExportDefaultDeclaration") declaration = node.declaration;
	else if (node.type !== "EmptyStatement") reject(`Found a top-level \`${node.type}\` (only \`export default { … }\` is allowed).`);
	if (!declaration) {
		reject("No default export found.");
		return;
	}
	const unwrap = (n) => n.type === "TSAsExpression" && n.expression ? n.expression : n;
	const assertStaticValue = (node) => {
		const v = unwrap(node);
		if (!STATIC_VALUE_TYPES.has(v.type)) reject(`Found a non-static \`${v.type}\` value.`);
		if (v.type === "ObjectExpression") for (const prop of v.properties ?? []) {
			if (prop.type !== "ObjectProperty") reject(`Found a \`${prop.type}\` (spreads and methods are not allowed).`);
			if (prop.value) assertStaticValue(prop.value);
		}
		else if (v.type === "ArrayExpression") {
			for (const el of v.elements ?? []) if (el) assertStaticValue(el);
		}
	};
	assertStaticValue(unwrap(declaration));
}
/**
* Find every extension folder that ships a `config.ts`. The output `config/` directory and
* the locale aggregator's `locales/` directory are siblings of real extensions, so both are
* skipped. Each `config.ts` is validated as a static object literal before it joins the list
* (see `assertStaticConfigModule`). Results are sorted by folder name for stable output.
*/
async function findExtensionsWithConfig(extensionsDir) {
	const extensions = [];
	try {
		const entries = await readdir(extensionsDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory() || entry.name === OUTPUT_DIR_NAME || entry.name === LOCALES_DIR_NAME) continue;
			const configPath = join(extensionsDir, entry.name, "config.ts");
			if (existsSync(configPath)) {
				assertStaticConfigModule(`${entry.name}/config.ts`, await readFile(configPath, "utf8"));
				extensions.push({
					name: entry.name,
					path: `../${entry.name}/config`
				});
			}
		}
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	return extensions.sort((a, b) => a.name.localeCompare(b.name));
}
/**
* Build the barrel that re-exports each extension's config default under its camelCase key.
* Imports are widened (no `as const`) so the merged `app.extension` type stays mutable and
* a value like `apiKey: ''` types as `string`, not the literal `''`.
*
* Throws if two folders collapse to the same camelCase key — config feeds runtime values
* like API keys, so a silent last-wins could route a setting to the wrong extension.
*/
function generateConfigFile(extensions) {
	const header = `${`/**\n${APACHE_LICENSE_HEADER.split("\n").map((line) => line ? ` * ${line}` : " *").join("\n")}\n */`}

// NOTE: This file is auto-generated. Do not edit manually.
// Run 'pnpm config:aggregate-extensions' to regenerate this file.

`;
	if (extensions.length === 0) return `${header}// No extension config files found\nexport default {};\n`;
	const keyByExtension = /* @__PURE__ */ new Map();
	for (const ext of extensions) {
		const key = toCamelCase(ext.name);
		if (ext.name.includes("_")) throw new Error(`Extension folder "${ext.name}" uses underscores. Use hyphens so the name camelCases to the expected config key (e.g. "store-locator" → "storeLocator", not "store_locator").`);
		if (!VALID_CONFIG_KEY.test(key)) throw new Error(`Extension folder "${ext.name}" maps to an invalid config key "${key}". Use a folder name of letters, digits, and hyphens that starts with a letter (e.g. "loqate-address-verification" → "loqateAddressVerification").`);
		const existing = keyByExtension.get(key);
		if (existing) throw new Error(`Extension config key collision: "${existing}" and "${ext.name}" both map to "${key}". Rename one extension folder so each resolves to a distinct config namespace.`);
		keyByExtension.set(key, ext.name);
	}
	return `${header}${extensions.map((ext) => `import ${toCamelCase(ext.name)}Config from '${ext.path}';`).join("\n")}

// Each extension's config.ts default export is namespaced by the camelCase of its folder
// name (e.g. loqate-address-verification -> loqateAddressVerification), making it available
// at config.app.extension.<key> and overridable via PUBLIC__app__extension__<key>__<setting>.
export default {
${extensions.map((ext) => {
		const key = toCamelCase(ext.name);
		return `    ${key}: ${key}Config,`;
	}).join("\n")}
};
`;
}
/**
* Discover every `src/extensions/<name>/config.ts` and regenerate the
* `src/extensions/config/index.ts` barrel that `config.server.ts` merges into
* `app.extension`. Runs as a build prestep (mirrors `sfnext locales aggregate-extensions`).
*/
async function aggregateExtensionConfig(options = {}) {
	const { projectDirectory = process.cwd(), silent = false } = options;
	const { OUTPUT_DIR, EXTENSIONS_DIR } = options.dirs ?? getDefaultDirs(projectDirectory);
	const log = (message, ...args) => {
		if (!silent) logger.debug(message, ...args);
	};
	try {
		log("🔍 Scanning for extension config files...");
		const extensions = await findExtensionsWithConfig(EXTENSIONS_DIR);
		const content = generateConfigFile(extensions);
		await mkdir(OUTPUT_DIR, { recursive: true });
		const filePath = join(OUTPUT_DIR, "index.ts");
		if (await readFile(filePath, "utf8").catch(() => null) !== content) await writeFile(filePath, content, "utf8");
		log(`✅ Generated: src/extensions/config/index.ts (${extensions.length} extension(s))`);
		return {
			extensions: extensions.map((ext) => toCamelCase(ext.name)),
			filePath
		};
	} catch (error) {
		if (!silent) logger.error(`❌ Error generating extension config: ${String(error)}`);
		throw error;
	}
}

//#endregion
//#region src/commands/config/aggregate-extensions.ts
var AggregateExtensions = class AggregateExtensions extends Command {
	static description = "Aggregate extension config.ts files into the app.extension config barrel";
	static examples = [
		"<%= config.bin %> <%= command.id %>",
		"<%= config.bin %> <%= command.id %> -d ./my-project",
		"<%= config.bin %> <%= command.id %> --silent"
	];
	static flags = {
		...commonFlags,
		silent: Flags.boolean({
			description: "Suppress output",
			default: false
		})
	};
	async run() {
		const { flags } = await this.parse(AggregateExtensions);
		await aggregateExtensionConfig({
			projectDirectory: flags["project-directory"],
			silent: flags.silent
		});
	}
};

//#endregion
export { AggregateExtensions as default };