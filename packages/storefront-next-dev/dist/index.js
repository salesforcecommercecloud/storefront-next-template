import path, { resolve } from "node:path";
import fs from "fs-extra";
import path$1, { basename, dirname, extname, join, posix, relative, resolve as resolve$1 } from "path";
import { URL as URL$1, fileURLToPath } from "url";
import { parse } from "@babel/parser";
import { isJSXAttribute, isJSXElement, isJSXFragment, isJSXIdentifier, jsxClosingElement, jsxClosingFragment, jsxElement, jsxFragment, jsxIdentifier, jsxOpeningElement, jsxOpeningFragment, jsxText } from "@babel/types";
import { generate } from "@babel/generator";
import traverseModule from "@babel/traverse";
import fs$1, { existsSync, readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { Node, Project, ts } from "ts-morph";
import os from "os";
import archiver from "archiver";
import { Minimatch, minimatch } from "minimatch";
import { execSync } from "child_process";
import dotenv from "dotenv";
import chalk from "chalk";
import express from "express";
import { createRequestHandler } from "@react-router/express";
import { existsSync as existsSync$1, readFileSync as readFileSync$1 } from "node:fs";
import { createProxyMiddleware } from "http-proxy-middleware";
import compression from "compression";
import zlib from "node:zlib";
import morgan from "morgan";
import { access, mkdir, readFile, readdir, rm, writeFile } from "fs/promises";

//#region src/plugins/fixReactRouterManifestUrls.ts
function patchAssetsPaths(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) patchAssetsPaths(fullPath);
		else if (entry.isFile() && entry.name.endsWith(".js")) {
			const content = fs.readFileSync(fullPath, "utf-8");
			if (content.includes("\"/assets/") || content.includes("'/assets/")) {
				fs.writeFileSync(fullPath, content.replace(/["']\/assets\//g, "(window._BUNDLE_PATH || \"/\") + \"assets/"));
				console.log(`patched /assets/ references in ${fullPath}`);
			}
		}
	}
}
/**
* Plugin to transform React Router client manifest URLs to use dynamic bundle paths
*/
function fixReactRouterManifestUrlsPlugin() {
	let resolvedConfig;
	return {
		name: "odyssey:fix-react-router-manifest-urls",
		enforce: "post",
		configResolved(config) {
			resolvedConfig = config;
		},
		closeBundle() {
			const clientBuildDir = resolvedConfig.environments.client.build.outDir;
			if (fs.existsSync(clientBuildDir)) patchAssetsPaths(clientBuildDir);
		}
	};
}

//#endregion
//#region src/plugins/readableChunkFileNames.ts
/**
* Generates human-readable chunk file names for better debugging in production builds.
*
* Transforms Rollup's default hash-based chunk names into structured paths that reflect
* the original source location, making it easier to identify and debug specific chunks.
*
* @param chunkInfo - Rollup's pre-rendered chunk information containing module IDs and metadata
* @returns A formatted string pattern for the chunk filename with one of these formats:
*   - `assets/(folder1)-(folder2)-filename.[hash].js` for source files in /src/
*   - `assets/(package)-(pkg-name)-(subfolder)-filename.[hash].js` for node_modules
*   - `assets/(chunk)-[name].[hash].js` as fallback for chunks without identifiable paths
*
* @example
* // Source file: /src/components/ui/Button.tsx
* // Output: assets/(components)-(ui)-Button.[hash].js
*
* @example
* // Node module: /node_modules/@radix-ui/react-dialog/dist/index.js
* // Output: assets/(package)-(@radix-ui)-(react-dialog)-(dist)-index.[hash].js
*/
const readableChunkFileNames = (chunkInfo) => {
	const moduleIds = chunkInfo.moduleIds;
	const defaultName = "assets/(chunk)-[name].[hash].js";
	if (!moduleIds || moduleIds.length === 0) return defaultName;
	const lastModuleId = moduleIds[moduleIds.length - 1];
	const toPosixPath = (pathname) => {
		return pathname.replace(/\\/g, "/");
	};
	const getFileName = (pathname) => {
		const posixPath = toPosixPath(pathname);
		return path$1.posix.parse(posixPath).base.split("?")[0].replace(/\.(tsx?|jsx?|mjs|js)$/, "");
	};
	const cleanPath = (pathname) => {
		return pathname?.split("?")[0];
	};
	const normalizedModuleId = toPosixPath(lastModuleId);
	if (normalizedModuleId.includes("/src/")) {
		const match = toPosixPath(cleanPath(lastModuleId)).match(/\/src\/(.+)$/);
		if (match) {
			const parts = match[1].split("/");
			const fileName = getFileName(parts[parts.length - 1]);
			return `assets/${parts.slice(0, -1).map((f) => `(${f})`).join("-")}-${fileName}.[hash].js`;
		}
	}
	if (normalizedModuleId.includes("/node_modules/")) {
		const parts = toPosixPath(cleanPath(lastModuleId)).split("/node_modules/");
		const pathParts = parts[parts.length - 1].split("/");
		let packageName;
		let remainingPath;
		if (pathParts[0].startsWith("@")) {
			packageName = `${pathParts[0]}-${pathParts[1]}`;
			remainingPath = pathParts.slice(2);
		} else {
			packageName = pathParts[0];
			remainingPath = pathParts.slice(1);
		}
		const fileName = getFileName(remainingPath[remainingPath.length - 1]);
		const folders = remainingPath.slice(0, -1);
		return `assets/${[
			"package",
			packageName,
			...folders
		].map((s) => `(${s})`).join("-")}-${fileName}.[hash].js`;
	}
	return defaultName;
};
/**
* Vite plugin that configures Rollup to use human-readable chunk file names in production builds.
*
* Applies the `readableChunkFileNames` naming strategy to both code-split chunks and entry files,
* making it easier to identify the source of specific chunks when debugging production builds.
*
* @returns A Vite plugin that configures chunk naming for the client build environment
*
* @example
* // In vite.config.ts
* export default defineConfig({
*   plugins: [readableChunkFileNamesPlugin()]
* })
*/
const readableChunkFileNamesPlugin = () => {
	return {
		name: "odyssey:readable-chunk-file-names",
		apply: "build",
		config() {
			return { environments: { client: { build: { rollupOptions: { output: {
				chunkFileNames: readableChunkFileNames,
				entryFileNames: readableChunkFileNames
			} } } } } };
		}
	};
};

//#endregion
//#region src/mrt/utils.ts
const MRT_BUNDLE_TYPE_SSR = "ssr";
const MRT_STREAMING_ENTRY_FILE = "streamingHandler";
const MRT_BUNDLE_TYPE_STREAMING = "streaming";
/**
* Gets the MRT entry file for the given mode
* @param mode - The mode to get the MRT entry file for
* @returns The MRT entry file for the given mode
*/
const getMrtEntryFile = (mode) => {
	return process.env.MRT_BUNDLE_TYPE === MRT_BUNDLE_TYPE_STREAMING && mode === "production" ? MRT_STREAMING_ENTRY_FILE : MRT_BUNDLE_TYPE_SSR;
};

//#endregion
//#region src/plugins/managedRuntimeBundle.ts
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
/**
* This is a Vite plugin specifically for building the Managed Runtime production bundle.
* This plugin relies on the @react-router/dev/vite plugin to work.
* This plugin creates the Managed Runtime production bundle from the build output of the @react-router/dev/vite plugin.
*
* @returns {Plugin} A Vite plugin for building the Managed Runtime production react-router bundle
*/
const managedRuntimeBundlePlugin = () => {
	let resolvedConfig;
	let buildDirectory;
	/**
	* Creates the Managed Runtime production bundle assets
	* - ssr.mjs or streamingHandler.mjs
	* - loader.js
	* - package.json
	*
	* @returns {Promise<void>}
	*/
	const createManagedRuntimeBundleAssets = async () => {
		const loaderPath = path$1.resolve(buildDirectory, "loader.js");
		const mrtEntryFile = `${getMrtEntryFile(resolvedConfig?.mode)}.mjs`;
		const mrtEntryPath = path$1.resolve(buildDirectory, mrtEntryFile);
		await fs.ensureDir(buildDirectory);
		await fs.outputFile(loaderPath, "// This file is intentionally empty");
		const prebuiltMrtEntryPath = path$1.resolve(__dirname$1, `./mrt/${mrtEntryFile}`);
		await fs.copy(prebuiltMrtEntryPath, mrtEntryPath);
		const mrtDir = path$1.resolve(__dirname$1, "./mrt");
		if (await fs.pathExists(mrtDir)) {
			const files = await fs.readdir(mrtDir);
			for (const file of files) if (file.startsWith("sfnext-server-") && file.endsWith(".mjs")) await fs.copy(path$1.join(mrtDir, file), path$1.resolve(buildDirectory, file));
		}
		const packageJsonPath = path$1.resolve(resolvedConfig.root, "package.json");
		const buildPackageJsonPath = path$1.resolve(buildDirectory, "package.json");
		const packageJson = await fs.readJson(packageJsonPath);
		delete packageJson.type;
		await fs.writeJson(buildPackageJsonPath, packageJson, { spaces: 2 });
	};
	return {
		name: "odyssey:managed-runtime-bundle",
		apply: "build",
		config({ mode }) {
			return {
				environments: { ssr: { resolve: { noExternal: true } } },
				experimental: { renderBuiltUrl(filename, { type }) {
					if (mode !== "preview" && (type === "asset" || type === "public")) return { runtime: `(typeof window !== 'undefined' ? window._BUNDLE_PATH : ('/mobify/bundle/'+process.env.BUNDLE_ID+'/client/')) + ${JSON.stringify(filename)}` };
				} }
			};
		},
		configResolved(config) {
			resolvedConfig = config;
			buildDirectory = config.__reactRouterPluginContext.reactRouterConfig.buildDirectory;
		},
		buildApp: {
			order: "post",
			handler: async () => {
				await createManagedRuntimeBundleAssets();
			}
		}
	};
};

//#endregion
//#region src/plugins/patchReactRouter.ts
const VIRTUAL_MODULE_ID = "\0patched-react-router";
const MODULE_TO_PATCH = "react-router";
/**
* This plugin intercepts imports of 'react-router' and provides patched versions
* of specific components (like Scripts) with custom logic.
*
* @returns {Plugin} A Vite plugin for patching react-router components
*/
const patchReactRouterPlugin = () => {
	return {
		name: "odyssey:patch-react-router",
		enforce: "pre",
		configEnvironment(name) {
			if (name === "ssr") return { resolve: { noExternal: ["react-router"] } };
		},
		resolveId(id, importer) {
			if (id === MODULE_TO_PATCH) {
				if (importer === VIRTUAL_MODULE_ID || importer?.includes("storefront-next-dev")) return null;
				return VIRTUAL_MODULE_ID;
			}
			return null;
		},
		load(id) {
			if (id === VIRTUAL_MODULE_ID) return `
                    export * from 'react-router';
                    export { Scripts } from '@salesforce/storefront-next-dev/react-router/Scripts';
                `;
			return null;
		}
	};
};

//#endregion
//#region src/extensibility/plugin-utils.ts
const traverse = traverseModule.default || traverseModule;
const PLUGIN_COMPONENT_TAG = "PluginComponent";
const PLUGIN_ID_ATTRIBUTE = "pluginId";
const COMPOSE_PROVIDERS_TAG = "ComposeProviders";
/**
* Find and replace the plugin component with the replacement code
* @param componentName - the name of the component to replace
* @param element - the AST element as the replacement candidate
* @param pluginRegistry - the plugin registry
* @returns the pluginId that was replaced, or null if no replacement was found
*/
function findAndReplace(componentName, element, pluginRegistry) {
	let pluginIdReplaced = null;
	if (isJSXIdentifier(element.node.openingElement.name, { name: componentName })) {
		let replaced = false;
		if (Array.isArray(element.node.openingElement.attributes)) {
			const attr = element.node.openingElement.attributes.find((a) => isJSXAttribute(a) && isJSXIdentifier(a.name, { name: PLUGIN_ID_ATTRIBUTE }));
			const pluginId = attr && isJSXAttribute(attr) && attr.value && "value" in attr.value ? attr.value.value : void 0;
			if (pluginId == null) throw new Error(`PluginComponent must contain a pluginId attribute`);
			if (pluginRegistry[pluginId] && pluginRegistry[pluginId].length > 0) {
				const components = pluginRegistry[pluginId].map((pluginComponent) => {
					return jsxElement(jsxOpeningElement(jsxIdentifier(pluginComponent.componentName), [], true), null, [], true);
				});
				if (components.length > 1) element.replaceWith(jsxFragment(jsxOpeningFragment(), jsxClosingFragment(), components));
				else element.replaceWith(components[0]);
				pluginIdReplaced = pluginId;
				replaced = true;
			}
		}
		if (!replaced) if (element.node.children && element.node.children.length > 0) element.replaceWithMultiple(element.node.children);
		else element.remove();
	}
	return pluginIdReplaced;
}
/**
* Run a replacement pass on the AST
* @param ast - the AST to traverse
* @param tagName - the name of the tag to replace
* @param pluginRegistry - the plugin registry
* @returns a set of pluginIds that were replaced
*/
function runReplacementPass(ast, tagName, pluginRegistry) {
	const pluginIdsReplaced = /* @__PURE__ */ new Set();
	traverse(ast, {
		VariableDeclaration(nodePath) {
			const declarationPaths = nodePath.get("declarations");
			const declarationsArray = Array.isArray(declarationPaths) ? declarationPaths : [declarationPaths];
			for (const declarationPath of declarationsArray) {
				const initPath = declarationPath.get("init");
				if (initPath && isJSXElement(initPath.node)) {
					const content = generate(initPath.node).code;
					if ((/* @__PURE__ */ new RegExp(`<(${tagName})(\\s|\\/|>)`)).test(content)) {
						const pluginIdReplaced = findAndReplace(tagName, initPath, pluginRegistry);
						if (pluginIdReplaced) pluginIdsReplaced.add(pluginIdReplaced);
						initPath.traverse({ JSXElement(inner) {
							const nestedPluginIdReplaced = findAndReplace(tagName, inner, pluginRegistry);
							if (nestedPluginIdReplaced) pluginIdsReplaced.add(nestedPluginIdReplaced);
						} });
					}
				}
			}
		},
		ReturnStatement(nodePath) {
			const arg = nodePath.node.argument;
			if (!isJSXElement(arg) && !isJSXFragment(arg)) return;
			nodePath.traverse({ JSXElement(inner) {
				const pluginIdReplaced = findAndReplace(tagName, inner, pluginRegistry);
				if (pluginIdReplaced) pluginIdsReplaced.add(pluginIdReplaced);
			} });
		}
	});
	return pluginIdsReplaced;
}
/**
* Build the import statements for the plugin components
* @param pluginIds - the pluginIds that were replaced
* @param pluginRegistry - the plugin registry
* @returns the import statements
*/
function buildReplacementImportStatements(pluginIds, pluginRegistry) {
	const importStatements = /* @__PURE__ */ new Set();
	for (const pluginId of pluginIds) {
		const pluginComponents = pluginRegistry[pluginId];
		for (const pluginComponent of pluginComponents) importStatements.add(`import ${pluginComponent.componentName} from '@/${pluginComponent.path.replace(".tsx", "")}';`);
	}
	return Array.from(importStatements).join("\n");
}
/**
* Transform the plugin component within the replacement code from the plugin registry
* @param code - the code to transform
* @param pluginRegistry - the plugin registry
* @returns the transformed code, or null if no transformation was needed
*/
function transformPluginComponent(code, pluginRegistry) {
	if (!code.includes(PLUGIN_COMPONENT_TAG)) return null;
	const ast = parse(code, {
		sourceType: "module",
		plugins: [
			"typescript",
			"jsx",
			"decorators-legacy"
		]
	});
	const replacementImportStatements = buildReplacementImportStatements(runReplacementPass(ast, PLUGIN_COMPONENT_TAG, pluginRegistry), pluginRegistry);
	traverse(ast, { ImportDeclaration(nodePath) {
		if (nodePath.node.source.value.includes("@/plugins/plugin-components")) nodePath.replaceWith(jsxText(replacementImportStatements));
	} });
	return generate(ast).code;
}
/**
* Inject the plugin context providers into the root component (root.tsx)
* @param code - the code to inject the context providers into, typically root.tsx
* @param contextProviders - the context providers to inject
* @returns the code with the context providers injected, or null if no injection was needed
*/
function injectPluginContextproviders(code, contextProviders) {
	if (contextProviders == null || contextProviders.length === 0 || !code.includes(COMPOSE_PROVIDERS_TAG)) return null;
	const ast = parse(code, {
		sourceType: "module",
		plugins: [
			"typescript",
			"jsx",
			"decorators-legacy"
		]
	});
	const importStatements = /* @__PURE__ */ new Set();
	for (const contextProvider of contextProviders) importStatements.add(`import ${contextProvider.componentName} from '@/${contextProvider.path.replace(".tsx", "")}';`);
	const replacementImportStatements = Array.from(importStatements).join("\n");
	ast.program.body.unshift(...parse(replacementImportStatements, {
		sourceType: "module",
		plugins: [
			"typescript",
			"jsx",
			"decorators-legacy"
		]
	}).program.body);
	traverse(ast, { ReturnStatement(nodePath) {
		const arg = nodePath.node.argument;
		if (!isJSXElement(arg)) return;
		nodePath.traverse({ JSXElement(inner) {
			if (isJSXIdentifier(inner.node.openingElement.name, { name: COMPOSE_PROVIDERS_TAG })) {
				let nested = inner.node.children;
				for (let i = contextProviders.length - 1; i >= 0; i--) {
					const componentName = contextProviders[i].componentName;
					nested = [jsxElement(jsxOpeningElement(jsxIdentifier(componentName), [], false), jsxClosingElement(jsxIdentifier(componentName)), nested, false)];
				}
				inner.node.children = nested;
			}
		} });
	} });
	return generate(ast).code;
}
/**
* Build the plugin registry from the extension directories
* @param rootDir - the root directory of the project
* @param sourceDir - the source directory of the project
* @returns the plugin registry
*/
function buildPluginRegistry(rootDir) {
	const componentRegistry = {};
	const contextProviders = [];
	const extensionDirPath = path$1.join(rootDir, "extensions");
	const extensionDirs = fs.readdirSync(extensionDirPath, { withFileTypes: true });
	const getNamespaceAndComponentName = (dir, filePath) => {
		const namespace = dir.name.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
		return {
			namespace,
			componentName: `${namespace}_${(filePath.split("/").pop()?.replace(".tsx", ""))?.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("")}`
		};
	};
	for (const dir of extensionDirs) if (dir.isDirectory()) {
		const configPath = path$1.join(extensionDirPath, dir.name, "plugin-config.json");
		if (fs.existsSync(configPath)) {
			const pluginConfig = fs.readJsonSync(configPath);
			if (pluginConfig && pluginConfig.components) for (const pluginComponent of pluginConfig.components) {
				const { pluginId, path: componentPath, order = 0 } = pluginComponent;
				if (pluginId && componentPath) {
					if (!componentRegistry[pluginId]) componentRegistry[pluginId] = [];
					const { namespace, componentName } = getNamespaceAndComponentName(dir, componentPath);
					componentRegistry[pluginId].push({
						pluginId,
						path: componentPath,
						order,
						namespace,
						componentName
					});
				}
			}
			if (pluginConfig && pluginConfig.contextProviders) for (const contextProvider of pluginConfig.contextProviders) {
				const { path: providerPath, order = 0 } = contextProvider;
				if (providerPath) {
					const { namespace, componentName } = getNamespaceAndComponentName(dir, providerPath);
					contextProviders.push({
						path: providerPath,
						namespace,
						componentName,
						order
					});
				}
			}
		}
	}
	for (const pluginId in componentRegistry) componentRegistry[pluginId].sort((a, b) => a.order - b.order);
	contextProviders.sort((a, b) => a.order - b.order);
	return {
		componentRegistry,
		contextProviders
	};
}

//#endregion
//#region src/plugins/transformPlugins.ts
function transformPluginPlaceholderPlugin() {
	let componentRegistry;
	let contextProviders;
	let sourceDir;
	return {
		name: "odyssey:transform-plugin-placeholder",
		enforce: "pre",
		configResolved(config) {
			sourceDir = config.resolve.alias.find((alias) => alias.find === "@")?.replacement || path$1.resolve(__dirname, "./src");
		},
		buildStart() {
			({componentRegistry, contextProviders} = buildPluginRegistry(sourceDir));
		},
		transform(code, id) {
			let transformedCode = null;
			try {
				if (id.includes(path$1.join(sourceDir, "root.tsx"))) transformedCode = injectPluginContextproviders(code, contextProviders);
				else transformedCode = transformPluginComponent(code, componentRegistry);
				if (transformedCode) return {
					code: transformedCode,
					map: null
				};
				return null;
			} catch (err) {
				console.error(`PluginComponent replace ERROR in ${id}: ${err instanceof Error ? err.stack : String(err)}`);
				throw err;
			}
		}
	};
}

//#endregion
//#region src/plugins/watchConfigFiles.ts
const watchConfigFilesPlugin = () => {
	let viteConfig;
	return {
		name: "odyssey:watch-config-files",
		configResolved(config) {
			viteConfig = config;
		},
		configureServer(server) {
			const aliases = viteConfig.resolve.alias;
			const root = Object.values(aliases).find((alias) => alias.find === "@")?.replacement || "src";
			const glob$1 = path$1.posix.join(root, "extensions", "**", "plugin-config.json");
			server.watcher.add(glob$1);
			const onChange = (file) => {
				if (file.endsWith("plugin-config.json")) {
					console.log(`🔁 plugin-config.json changed: ${file}`);
					server.restart();
				}
			};
			server.watcher.on("add", onChange);
			server.watcher.on("change", onChange);
			server.watcher.on("unlink", onChange);
		}
	};
};

//#endregion
//#region src/plugins/staticRegistry.ts
const DEFAULT_COMPONENT_GROUP$1 = "odyssey_base";
/**
* Extracts component ID and group from @Component decorator using ts-morph AST parsing
*/
function extractComponentInfo(decorator) {
	const callExpression = decorator.getCallExpression();
	if (!callExpression) return null;
	const args = callExpression.getArguments();
	if (args.length === 0) return null;
	const firstArg = args[0];
	let baseComponentId;
	if (Node.isStringLiteral(firstArg)) baseComponentId = firstArg.getLiteralValue();
	else if (Node.isNoSubstitutionTemplateLiteral(firstArg)) baseComponentId = firstArg.getText().slice(1, -1);
	else if (Node.isTemplateExpression(firstArg)) throw new Error(`@Component id must be a simple string literal or backtick string without interpolation. Found: ${firstArg.getText()}`);
	else return null;
	let group = DEFAULT_COMPONENT_GROUP$1;
	if (args.length > 1) {
		const secondArg = args[1];
		if (Node.isObjectLiteralExpression(secondArg)) {
			const groupProperty = secondArg.getProperty("group");
			if (groupProperty && Node.isPropertyAssignment(groupProperty)) {
				const initializer = groupProperty.getInitializer();
				if (initializer && Node.isStringLiteral(initializer)) group = initializer.getLiteralValue();
			}
		}
	}
	return {
		id: `${group}.${baseComponentId}`,
		group
	};
}
/**
* Checks if a source file has a specific named export using ts-morph AST parsing
*/
function hasNamedExport(sourceFile, exportName) {
	if (sourceFile.getFunctions().filter((func) => func.hasExportKeyword() && func.getName() === exportName).length > 0) return true;
	const variableStatements = sourceFile.getVariableStatements().filter((stmt) => stmt.hasExportKeyword());
	for (const stmt of variableStatements) {
		const declarations = stmt.getDeclarations();
		for (const decl of declarations) if (decl.getName() === exportName) return true;
	}
	const exportDeclarations = sourceFile.getExportDeclarations();
	for (const exportDecl of exportDeclarations) {
		const namedExports = exportDecl.getNamedExports();
		for (const namedExport of namedExports) {
			const localName = namedExport.getName();
			const aliasName = namedExport.getAliasNode()?.getText();
			if (localName === exportName || aliasName === exportName) return true;
		}
	}
	return false;
}
/**
* Checks if a source file has a fallback export (including default exports with 'fallback' in name)
*/
function hasFallbackExport(sourceFile) {
	if (hasNamedExport(sourceFile, "fallback")) return true;
	const functions = sourceFile.getFunctions().filter((func) => func.hasExportKeyword() && func.hasDefaultKeyword());
	for (const func of functions) {
		const name = func.getName();
		if (name && name.toLowerCase().includes("fallback")) return true;
	}
	return false;
}
/**
* Scans all files in the component directory for @Component decorators and extracts metadata using ts-morph
*/
async function scanComponents(project, projectRoot, componentPath, registryPath, verbose$1) {
	const componentFiles = await glob(`${componentPath}/**/*.{ts,tsx}`, {
		cwd: projectRoot,
		absolute: true
	});
	if (verbose$1) console.log(`🔍 Scanning ${componentFiles.length} files in ${componentPath}...`);
	const components = [];
	const registryDir = dirname(resolve$1(projectRoot, registryPath));
	for (const filePath of componentFiles) try {
		const content = readFileSync(filePath, "utf-8");
		const sourceFile = project.createSourceFile(filePath, content, { overwrite: true });
		const classes = sourceFile.getClasses();
		for (const classDeclaration of classes) {
			const decorators = classDeclaration.getDecorators();
			for (const decorator of decorators) if (decorator.getName() === "Component") {
				const componentInfo = extractComponentInfo(decorator);
				if (componentInfo) {
					let relativePath = relative(registryDir, filePath).replace(/\\/g, "/").replace(/\.(ts|tsx)$/, "");
					if (!relativePath.startsWith(".")) relativePath = `./${relativePath}`;
					const hasLoaderExport = hasNamedExport(sourceFile, "loader");
					const hasClientLoaderExport = hasNamedExport(sourceFile, "clientLoader");
					const hasFallback = hasFallbackExport(sourceFile);
					components.push({
						id: componentInfo.id,
						filePath,
						relativePath,
						hasLoader: hasLoaderExport,
						hasClientLoader: hasClientLoaderExport,
						hasFallback
					});
					if (verbose$1) {
						const exports = [];
						if (hasLoaderExport) exports.push("loader");
						if (hasClientLoaderExport) exports.push("clientLoader");
						if (hasFallback) exports.push("fallback");
						const exportsText = exports.length > 0 ? ` (with ${exports.join(", ")})` : "";
						console.log(`  ✅ Found component: ${componentInfo.id} → ${relativePath}${exportsText}`);
					}
				}
			}
		}
	} catch (error$1) {
		if (verbose$1) console.warn(`⚠️  Could not process ${filePath}:`, error$1.message);
	}
	return components;
}
/**
* Generates the initializeRegistry function code
*/
function generateRegistryCode(components, registryIdentifier = "registry") {
	const sorted = [...components].sort((a, b) => a.id.localeCompare(b.id) || a.relativePath.localeCompare(b.relativePath));
	if (sorted.length === 0) return `
/* eslint-disable */
/**
 * Initialize the static component registry.
 * This function is auto-generated by the staticRegistry Vite plugin.
 * 
 * DO NOT EDIT THIS FUNCTION MANUALLY - it will be overwritten on next build.
 */
export function initializeRegistry(targetRegistry = ${registryIdentifier}): void {
    // No components found with @Component decorators
}
`;
	const registrations = sorted.map(({ id, relativePath, hasLoader, hasClientLoader, hasFallback }) => {
		if (hasLoader || hasClientLoader || hasFallback) {
			const metadata = [];
			if (hasLoader) metadata.push(`loader: 'loader'`);
			if (hasClientLoader) metadata.push(`clientLoader: 'clientLoader'`);
			if (hasFallback) metadata.push(`fallback: 'fallback'`);
			return `    targetRegistry.registerImporter('${id}', () => import('${relativePath}'), { ${metadata.join(", ")} });`;
		} else return `    targetRegistry.registerImporter('${id}', () => import('${relativePath}'));`;
	}).join("\n");
	return `
/* eslint-disable */
/**
 * Initialize the static component registry.
 * This function is auto-generated by the staticRegistry Vite plugin.
 * 
 * DO NOT EDIT THIS FUNCTION MANUALLY - it will be overwritten on next build.
 * 
 * Components registered: ${sorted.map((c) => c.id).join(", ")}
 */
export function initializeRegistry(targetRegistry = ${registryIdentifier}): void {
${registrations}
}
`;
}
/**
* Updates the registry.ts file with the generated code
*/
function updateRegistryFile(registryFilePath, generatedCode, verbose$1) {
	let existingContent;
	if (!existsSync(registryFilePath)) {
		if (verbose$1) console.log(`📝 Creating new registry file...`);
		const basicRegistryContent = `import { ComponentRegistry } from '@/lib/component-registry';

// Create the component registry instance
export const registry = new ComponentRegistry();

// STATIC_REGISTRY_START
// Generated content will be inserted here by the static registry plugin
// STATIC_REGISTRY_END
`;
		writeFileSync(registryFilePath, basicRegistryContent, "utf-8");
		existingContent = basicRegistryContent;
	} else try {
		existingContent = readFileSync(registryFilePath, "utf-8");
	} catch (error$1) {
		throw new Error(`Failed to read registry file: ${error$1.message}`);
	}
	const startMarker = "// STATIC_REGISTRY_START";
	const endMarker = "// STATIC_REGISTRY_END";
	const startIndex = existingContent.indexOf(startMarker);
	const endIndex = existingContent.indexOf(endMarker);
	if (startIndex === -1 || endIndex === -1) throw new Error(`Registry file ${registryFilePath} is missing static registry markers. Please add "${startMarker}" and "${endMarker}" markers to define the generated content area.`);
	const updatedContent = `${existingContent.slice(0, startIndex + 24)}\n${generatedCode}\n${existingContent.slice(endIndex)}`;
	try {
		writeFileSync(registryFilePath, updatedContent, "utf-8");
		if (verbose$1) console.log(`💾 Updated registry file: ${registryFilePath}`);
	} catch (error$1) {
		throw new Error(`Failed to write registry file: ${error$1.message}`);
	}
}
/**
* Vite plugin that generates static component registry based on @Component decorators.
*
* This plugin scans component files for @Component decorators and automatically generates
* a static registry function that pre-registers all components with their import paths.
* This eliminates the need for manual component registration and provides build-time
* optimization for component discovery.
*
* @param config - Configuration options for the plugin
* @returns A Vite plugin that generates static component registrations
*
* @example
* // In vite.config.ts
* export default defineConfig({
*   plugins: [
*     staticRegistryPlugin({
*       componentPath: 'src/components',
*       registryPath: 'src/lib/registry.ts',
*       verbose: true
*     })
*   ]
* })
*/
const staticRegistryPlugin = (config = {}) => {
	const { componentPath = "src/components", registryPath = "src/lib/static-registry.ts", registryIdentifier = "registry", failOnError = true, verbose: verbose$1 = false } = config;
	let projectRoot;
	const runRegistryGeneration = async () => {
		if (verbose$1) console.log("🚀 Starting static registry generation...");
		const components = await scanComponents(new Project({ compilerOptions: {
			target: ts.ScriptTarget.Latest,
			module: ts.ModuleKind.ESNext,
			jsx: ts.JsxEmit.ReactJSX,
			allowJs: true,
			skipLibCheck: true,
			noEmit: true
		} }), projectRoot, componentPath, registryPath, verbose$1);
		if (verbose$1) console.log(`📦 Found ${components.length} components with @Component decorators`);
		const generatedCode = generateRegistryCode(components, registryIdentifier);
		const registryFilePath = resolve$1(projectRoot, registryPath);
		updateRegistryFile(registryFilePath, generatedCode, verbose$1);
		if (verbose$1) console.log("✅ Static registry generation complete!");
		return registryFilePath;
	};
	return {
		name: "storefrontnext:static-registry",
		configResolved(resolvedConfig) {
			projectRoot = resolvedConfig.root;
		},
		async buildStart() {
			try {
				await runRegistryGeneration();
			} catch (error$1) {
				console.error(`❌ Static registry generation failed: ${error$1.message}`);
				if (failOnError) throw error$1;
				console.warn("⚠️  Continuing build without static registry...");
			}
		},
		async handleHotUpdate({ file, server }) {
			const normalizedComponentPath = componentPath.replace(/\\/g, "/");
			const normalizedFile = file.replace(/\\/g, "/");
			if (normalizedFile.includes(`/${normalizedComponentPath}/`) && (normalizedFile.endsWith(".ts") || normalizedFile.endsWith(".tsx"))) {
				if (verbose$1) console.log(`🔄 Component file changed: ${file}, regenerating registry...`);
				try {
					const registryFilePath = await runRegistryGeneration();
					const registryModule = server.moduleGraph.getModuleById(registryFilePath);
					if (registryModule) await server.reloadModule(registryModule);
					if (verbose$1) console.log("✅ Registry regenerated successfully!");
				} catch (error$1) {
					console.error(`❌ Failed to regenerate registry: ${error$1.message}`);
				}
				return [];
			}
		}
	};
};

//#endregion
//#region src/plugin.ts
/**
* Storefront Next Vite plugin that powers the React Router RSC app.
* Supports building and optimizing for the managed runtime environment.
*
* @param config - Configuration options for the plugin
* @returns {Plugin[]} An array of Vite plugins for Storefront Next functionality
*
* @example
* // With default options
* export default defineConfig({
*   plugins: [storefrontNextPlugins()]
* })
*
* @example
* // Disable readable chunk names
* export default defineConfig({
*   plugins: [storefrontNextPlugins({ readableChunkNames: false })]
* })
*/
function storefrontNextPlugins(config = {}) {
	const { readableChunkNames = false, staticRegistry = {
		componentPath: "",
		registryPath: "",
		verbose: false
	} } = config;
	const plugins = [
		managedRuntimeBundlePlugin(),
		fixReactRouterManifestUrlsPlugin(),
		patchReactRouterPlugin(),
		transformPluginPlaceholderPlugin(),
		watchConfigFilesPlugin()
	];
	if (staticRegistry?.componentPath && staticRegistry?.registryPath) plugins.push(staticRegistryPlugin(staticRegistry));
	if (readableChunkNames) plugins.push(readableChunkFileNamesPlugin());
	return plugins;
}

//#endregion
//#region package.json
var version = "0.2.0-dev";

//#endregion
//#region src/utils/logger.ts
/**
* Logger utilities
*/
const colors = {
	warn: "yellow",
	error: "red",
	success: "cyan",
	info: "green",
	debug: "gray"
};
const fancyLog = (level, msg) => {
	const colorFn = chalk[colors[level]];
	console.log(`${colorFn(level)}: ${msg}`);
};
const info = (msg) => fancyLog("info", msg);
const success = (msg) => fancyLog("success", msg);
const warn = (msg) => fancyLog("warn", msg);
const error = (msg) => fancyLog("error", msg);
const debug = (msg, data) => {
	if (process.env.DEBUG || process.env.NODE_ENV !== "production") {
		fancyLog("debug", msg);
		if (data) console.log(data);
	}
};

//#endregion
//#region src/utils.ts
const DEFAULT_CLOUD_ORIGIN = "https://cloud.mobify.com";
const getDefaultBuildDir = (targetDir) => path$1.join(targetDir, "build");
const NODE_ENV = process.env.NODE_ENV || "development";
/**
* Get credentials file path based on cloud origin
*/
const getCredentialsFile = (cloudOrigin, credentialsFile) => {
	if (credentialsFile) return credentialsFile;
	const host = new URL(cloudOrigin).host;
	const suffix = host === "cloud.mobify.com" ? "" : `--${host}`;
	return path$1.join(os.homedir(), `.mobify${suffix}`);
};
/**
* Read credentials from file
*/
const readCredentials = async (filepath) => {
	try {
		const data = await fs.readJSON(filepath);
		return {
			username: data.username,
			api_key: data.api_key
		};
	} catch {
		throw new Error(`Credentials file "${filepath}" not found.\nVisit https://runtime.commercecloud.com/account/settings for steps on authorizing your computer to push bundles.`);
	}
};
/**
* Get project package.json
*/
const getProjectPkg = (projectDir) => {
	const packagePath = path$1.join(projectDir, "package.json");
	try {
		return fs.readJSONSync(packagePath);
	} catch {
		throw new Error(`Could not read project package at "${packagePath}"`);
	}
};
/**
* Load .env file from project directory
*/
const loadEnvFile = (projectDir) => {
	const envPath = path$1.join(projectDir, ".env");
	if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
	else warn("No .env file found");
};
/**
* Get MRT configuration with priority logic: .env -> package.json -> defaults
*/
const getMrtConfig = (projectDir) => {
	loadEnvFile(projectDir);
	const pkg = getProjectPkg(projectDir);
	const defaultMrtProject = process.env.MRT_PROJECT ?? pkg.name;
	if (!defaultMrtProject || defaultMrtProject.trim() === "") throw new Error("Project name couldn't be determined. Do one of these options:\n  1. Set MRT_PROJECT in your .env file, or\n  2. Ensure package.json has a valid \"name\" field.");
	const defaultMrtTarget = process.env.MRT_TARGET ?? void 0;
	debug("MRT configuration resolved", {
		projectDir,
		envMrtProject: process.env.MRT_PROJECT,
		envMrtTarget: process.env.MRT_TARGET,
		packageName: pkg.name,
		resolvedProject: defaultMrtProject,
		resolvedTarget: defaultMrtTarget
	});
	return {
		defaultMrtProject,
		defaultMrtTarget
	};
};
/**
* Get project dependency tree (simplified version)
*/
const getProjectDependencyTree = (projectDir) => {
	try {
		const tmpFile = path$1.join(os.tmpdir(), `npm-ls-${Date.now()}.json`);
		execSync(`npm ls --all --json > ${tmpFile}`, {
			stdio: "ignore",
			cwd: projectDir
		});
		const data = fs.readJSONSync(tmpFile);
		fs.unlinkSync(tmpFile);
		return data;
	} catch {
		return null;
	}
};
/**
* Get PWA Kit dependencies from dependency tree
*/
const getPwaKitDependencies = (dependencyTree) => {
	if (!dependencyTree) return {};
	const pwaKitDependencies = ["@salesforce/storefront-next-dev"];
	const result = {};
	const searchDeps = (tree) => {
		if (tree.dependencies) for (const [name, dep] of Object.entries(tree.dependencies)) {
			if (pwaKitDependencies.includes(name)) result[name] = dep.version || "unknown";
			if (dep.dependencies) searchDeps({ dependencies: dep.dependencies });
		}
	};
	searchDeps(dependencyTree);
	return result;
};
/**
* Get default commit message from git
*/
const getDefaultMessage = (projectDir) => {
	try {
		return `${execSync("git rev-parse --abbrev-ref HEAD", {
			encoding: "utf8",
			cwd: projectDir
		}).trim()}: ${execSync("git rev-parse --short HEAD", {
			encoding: "utf8",
			cwd: projectDir
		}).trim()}`;
	} catch {
		debug("Using default bundle message as no message was provided and not in a Git repo.");
		return "PWA Kit Bundle";
	}
};

//#endregion
//#region src/bundle.ts
/**
* Create a bundle from the build directory
*/
const createBundle = async (options) => {
	const { message, ssr_parameters, ssr_only, ssr_shared, buildDirectory, projectDirectory, projectSlug } = options;
	const tmpDir = fs.mkdtempSync(path$1.join(os.tmpdir(), "storefront-next-dev-push-"));
	const destination = path$1.join(tmpDir, "build.tar");
	const filesInArchive = [];
	if (!ssr_only || ssr_only.length === 0 || !ssr_shared || ssr_shared.length === 0) throw new Error("no ssrOnly or ssrShared files are defined");
	return new Promise((resolve$2, reject) => {
		const output = fs.createWriteStream(destination);
		const archive = archiver("tar");
		archive.pipe(output);
		const newRoot = path$1.join(projectSlug, "bld", "");
		const storybookExclusionMatchers = [
			"**/*.stories.tsx",
			"**/*.stories.ts",
			"**/*-snapshot.tsx",
			".storybook/**/*",
			"storybook-static/**/*",
			"**/__mocks__/**/*",
			"**/__snapshots__/**/*"
		].map((pattern) => new Minimatch(pattern, { nocomment: true }));
		archive.directory(buildDirectory, "", (entry) => {
			if (entry.name && storybookExclusionMatchers.some((matcher) => matcher.match(entry.name))) return false;
			if (entry.stats?.isFile() && entry.name) filesInArchive.push(entry.name);
			entry.prefix = newRoot;
			return entry;
		});
		archive.on("error", reject);
		output.on("finish", () => {
			try {
				const { dependencies = {}, devDependencies = {} } = getProjectPkg(projectDirectory);
				const dependencyTree = getProjectDependencyTree(projectDirectory);
				const pwaKitDeps = dependencyTree ? getPwaKitDependencies(dependencyTree) : {};
				const bundle_metadata = { dependencies: {
					...dependencies,
					...devDependencies,
					...pwaKitDeps
				} };
				const data = fs.readFileSync(destination);
				const encoding = "base64";
				fs.rmSync(tmpDir, { recursive: true });
				const createGlobMatcher = (patterns) => {
					const allPatterns = patterns.map((pattern) => new Minimatch(pattern, { nocomment: true })).filter((pattern) => !pattern.empty);
					const positivePatterns = allPatterns.filter((pattern) => !pattern.negate);
					const negativePatterns = allPatterns.filter((pattern) => pattern.negate);
					return (filePath) => {
						if (filePath) {
							const positive = positivePatterns.some((pattern) => pattern.match(filePath));
							const negative = negativePatterns.some((pattern) => !pattern.match(filePath));
							return positive && !negative;
						}
						return false;
					};
				};
				resolve$2({
					message,
					encoding,
					data: data.toString(encoding),
					ssr_parameters,
					ssr_only: filesInArchive.filter(createGlobMatcher(ssr_only)),
					ssr_shared: filesInArchive.filter(createGlobMatcher(ssr_shared)),
					bundle_metadata
				});
			} catch (err) {
				reject(err);
			}
		});
		archive.finalize().catch(reject);
	});
};

//#endregion
//#region src/cloud-api.ts
var CloudAPIClient = class {
	credentials;
	origin;
	constructor({ credentials, origin }) {
		this.credentials = credentials;
		this.origin = origin;
	}
	getAuthHeader() {
		const { username, api_key } = this.credentials;
		return { Authorization: `Basic ${Buffer.from(`${username}:${api_key}`, "binary").toString("base64")}` };
	}
	getHeaders() {
		return {
			"User-Agent": `storefront-next-dev@${version}`,
			...this.getAuthHeader()
		};
	}
	/**
	* Push bundle to Managed Runtime
	*/
	async push(bundle, projectSlug, target) {
		const base = `api/projects/${projectSlug}/builds/`;
		const pathname = target ? `${base}${target}/` : base;
		const url = new URL$1(this.origin);
		url.pathname = pathname;
		const body = Buffer.from(JSON.stringify(bundle));
		const headers = {
			...this.getHeaders(),
			"Content-Length": body.length.toString()
		};
		const res = await fetch(url.toString(), {
			body,
			method: "POST",
			headers
		});
		if (res.status >= 400) {
			const bodyText = await res.text();
			let errorData;
			try {
				errorData = JSON.parse(bodyText);
			} catch {
				errorData = { message: bodyText };
			}
			throw new Error(`HTTP ${res.status}: ${errorData.message || bodyText}\nFor more information visit https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/pushing-and-deploying-bundles.html`);
		}
		return await res.json();
	}
	/**
	* Wait for deployment to complete
	*/
	async waitForDeploy(project, environment) {
		return new Promise((resolve$2, reject) => {
			const delay = 3e4;
			const check = async () => {
				const url = new URL$1(`/api/projects/${project}/target/${environment}`, this.origin);
				const res = await fetch(url, { headers: this.getHeaders() });
				if (!res.ok) {
					const text = await res.text();
					let json;
					try {
						if (text) json = JSON.parse(text);
					} catch {}
					const message = json?.detail ?? text;
					const detail = message ? `: ${message}` : "";
					throw new Error(`${res.status} ${res.statusText}${detail}`);
				}
				const data = await res.json();
				if (typeof data.state !== "string") return reject(/* @__PURE__ */ new Error("An unknown state occurred when polling the deployment."));
				switch (data.state) {
					case "CREATE_IN_PROGRESS":
					case "PUBLISH_IN_PROGRESS":
						setTimeout(() => {
							check().catch(reject);
						}, delay);
						return;
					case "CREATE_FAILED":
					case "PUBLISH_FAILED": return reject(/* @__PURE__ */ new Error("Deployment failed."));
					case "ACTIVE": return resolve$2();
					default: return reject(/* @__PURE__ */ new Error(`Unknown deployment state "${data.state}".`));
				}
			};
			setTimeout(() => {
				check().catch(reject);
			}, delay);
		});
	}
};

//#endregion
//#region src/config.ts
const SFNEXT_BASE_CARTRIDGE_NAME = "app_storefrontnext_base";
const SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR = `${SFNEXT_BASE_CARTRIDGE_NAME}/cartridge/experience`;
/**
* Build MRT SSR configuration for bundle deployment
*
* Defines which files should be:
* - Server-only (ssrOnly): Deployed only to Lambda functions
* - Shared (ssrShared): Deployed to both Lambda and CDN
*
* @param buildDirectory - Path to the build output directory
* @param projectDirectory - Path to the project root (reserved for future use)
* @returns MRT SSR configuration with glob patterns
*/
const buildMrtConfig = (_buildDirectory, _projectDirectory) => {
	const ssrEntryPoint = getMrtEntryFile("production");
	return {
		ssrOnly: [
			"server/**/*",
			"loader.js",
			`${ssrEntryPoint}.{js,mjs,cjs}`,
			`${ssrEntryPoint}.{js,mjs,cjs}.map`,
			"!static/**/*",
			"sfnext-server-*.mjs",
			"!**/*.stories.tsx",
			"!**/*.stories.ts",
			"!**/*-snapshot.tsx",
			"!.storybook/**/*",
			"!storybook-static/**/*",
			"!**/__mocks__/**/*",
			"!**/__snapshots__/**/*"
		],
		ssrShared: [
			"client/**/*",
			"static/**/*",
			"**/*.css",
			"**/*.png",
			"**/*.jpg",
			"**/*.jpeg",
			"**/*.gif",
			"**/*.svg",
			"**/*.ico",
			"**/*.woff",
			"**/*.woff2",
			"**/*.ttf",
			"**/*.eot",
			"!**/*.stories.tsx",
			"!**/*.stories.ts",
			"!**/*-snapshot.tsx",
			"!.storybook/**/*",
			"!storybook-static/**/*",
			"!**/__mocks__/**/*",
			"!**/__snapshots__/**/*"
		],
		ssrParameters: { ssrFunctionNodeVersion: "22.x" }
	};
};

//#endregion
//#region src/commands/push.ts
/**
* Main function to push bundle to Managed Runtime
*/
async function push(options) {
	const mrtConfig = getMrtConfig(options.projectDirectory);
	const resolvedTarget = options.target ?? mrtConfig.defaultMrtTarget;
	if (options.wait && !resolvedTarget) throw new Error("You must provide a target to deploy to when using --wait (via --target flag or .env MRT_TARGET)");
	if (options.user && !options.key || !options.user && options.key) throw new Error("You must provide both --user and --key together, or neither");
	if (!fs.existsSync(options.projectDirectory)) throw new Error(`Project directory "${options.projectDirectory}" does not exist!`);
	const projectSlug = options.projectSlug ?? mrtConfig.defaultMrtProject;
	if (!projectSlug || projectSlug.trim() === "") throw new Error("Project slug could not be determined from CLI, .env, or package.json");
	const target = resolvedTarget;
	const buildDirectory = options.buildDirectory ?? getDefaultBuildDir(options.projectDirectory);
	if (!fs.existsSync(buildDirectory)) throw new Error(`Build directory "${buildDirectory}" does not exist!`);
	try {
		if (target) process.env.DEPLOY_TARGET = target;
		let credentials;
		if (options.user && options.key) credentials = {
			username: options.user,
			api_key: options.key
		};
		else credentials = await readCredentials(getCredentialsFile(options.cloudOrigin ?? DEFAULT_CLOUD_ORIGIN, options.credentialsFile));
		const config = buildMrtConfig(buildDirectory, options.projectDirectory);
		const message = options.message ?? getDefaultMessage(options.projectDirectory);
		info(`Creating bundle for project: ${projectSlug}`);
		if (options.projectSlug) debug("Using project slug from CLI argument");
		else if (process.env.MRT_PROJECT) debug("Using project slug from .env MRT_PROJECT");
		else debug("Using project slug from package.json name");
		if (target) {
			info(`Target environment: ${target}`);
			if (options.target) debug("Using target from CLI argument");
			else debug("Using target from .env");
		}
		debug("SSR shared files", config.ssrShared);
		debug("SSR only files", config.ssrOnly);
		const bundle = await createBundle({
			message,
			ssr_parameters: config.ssrParameters,
			ssr_only: config.ssrOnly,
			ssr_shared: config.ssrShared,
			buildDirectory,
			projectDirectory: options.projectDirectory,
			projectSlug
		});
		const client = new CloudAPIClient({
			credentials,
			origin: options.cloudOrigin ?? DEFAULT_CLOUD_ORIGIN
		});
		info(`Beginning upload to ${options.cloudOrigin ?? DEFAULT_CLOUD_ORIGIN}`);
		const data = await client.push(bundle, projectSlug, target);
		debug("API response", data);
		(data.warnings || []).forEach(warn);
		if (options.wait && target) {
			success("Bundle uploaded - waiting for deployment to complete");
			await client.waitForDeploy(projectSlug, target);
			success("Deployment complete!");
		} else success("Bundle uploaded successfully!");
		if (data.url) info(`Bundle URL: ${data.url}`);
	} catch (err) {
		error(err.message || err?.toString() || "Unknown error");
		throw err;
	}
}

//#endregion
//#region src/server/ts-import.ts
/**
* Parse TypeScript paths from tsconfig.json and convert to jiti alias format.
*
* @param tsconfigPath - Path to tsconfig.json
* @param projectDirectory - Project root directory for resolving relative paths
* @returns Record of alias mappings for jiti
*
* @example
* // tsconfig.json: { "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
* // Returns: { "@/": "/absolute/path/to/src/" }
*/
function parseTsconfigPaths(tsconfigPath, projectDirectory) {
	const alias = {};
	if (!existsSync$1(tsconfigPath)) return alias;
	try {
		const tsconfigContent = readFileSync$1(tsconfigPath, "utf-8");
		const tsconfig = JSON.parse(tsconfigContent);
		const paths = tsconfig.compilerOptions?.paths;
		const baseUrl = tsconfig.compilerOptions?.baseUrl || ".";
		if (paths) {
			for (const [key, values] of Object.entries(paths)) if (values && values.length > 0) {
				const aliasKey = key.replace(/\/\*$/, "/");
				alias[aliasKey] = resolve(projectDirectory, baseUrl, values[0].replace(/\/\*$/, "/").replace(/^\.\//, ""));
			}
		}
	} catch {}
	return alias;
}
/**
* Import a TypeScript file using jiti with proper path alias resolution.
* This is a cross-platform alternative to tsx that works on Windows.
*
* @param filePath - Absolute path to the TypeScript file to import
* @param options - Import options including project directory
* @returns The imported module
*/
async function importTypescript(filePath, options) {
	const { projectDirectory, tsconfigPath = resolve(projectDirectory, "tsconfig.json") } = options;
	const { createJiti } = await import("jiti");
	const alias = parseTsconfigPaths(tsconfigPath, projectDirectory);
	return createJiti(import.meta.url, {
		fsCache: false,
		interopDefault: true,
		alias
	}).import(filePath);
}

//#endregion
//#region src/server/config.ts
/**
* This is a temporary function before we move the config implementation from
* template-retail-rsc-app to the SDK.
*
* @ TODO: Remove this function after we move the config implementation from
* template-retail-rsc-app to the SDK.
*
*/
function loadConfigFromEnv() {
	const shortCode = process.env.PUBLIC__app__commerce__api__shortCode;
	const organizationId = process.env.PUBLIC__app__commerce__api__organizationId;
	const clientId = process.env.PUBLIC__app__commerce__api__clientId;
	const siteId = process.env.PUBLIC__app__commerce__api__siteId;
	const proxy = process.env.PUBLIC__app__commerce__api__proxy || "/mobify/proxy/api";
	if (!shortCode) throw new Error("Missing PUBLIC__app__commerce__api__shortCode environment variable.\nPlease set it in your .env file or environment.");
	if (!organizationId) throw new Error("Missing PUBLIC__app__commerce__api__organizationId environment variable.\nPlease set it in your .env file or environment.");
	if (!clientId) throw new Error("Missing PUBLIC__app__commerce__api__clientId environment variable.\nPlease set it in your .env file or environment.");
	if (!siteId) throw new Error("Missing PUBLIC__app__commerce__api__siteId environment variable.\nPlease set it in your .env file or environment.");
	return { commerce: { api: {
		shortCode,
		organizationId,
		clientId,
		siteId,
		proxy
	} } };
}
/**
* Load storefront-next project configuration from config.server.ts.
* Requires projectDirectory to be provided.
*
* @param projectDirectory - Project directory to load config.server.ts from
* @throws Error if config.server.ts is not found or invalid
*/
async function loadProjectConfig(projectDirectory) {
	const configPath = resolve(projectDirectory, "config.server.ts");
	const tsconfigPath = resolve(projectDirectory, "tsconfig.json");
	if (!existsSync$1(configPath)) throw new Error(`config.server.ts not found at ${configPath}.\nPlease ensure config.server.ts exists in your project root.`);
	const config = (await importTypescript(configPath, {
		projectDirectory,
		tsconfigPath
	})).default;
	if (!config?.app?.commerce?.api) throw new Error("Invalid config.server.ts: missing app.commerce.api configuration.\nPlease ensure your config.server.ts has the commerce API configuration.");
	const api = config.app.commerce.api;
	if (!api.shortCode) throw new Error("Missing shortCode in config.server.ts commerce.api configuration");
	if (!api.organizationId) throw new Error("Missing organizationId in config.server.ts commerce.api configuration");
	if (!api.clientId) throw new Error("Missing clientId in config.server.ts commerce.api configuration");
	if (!api.siteId) throw new Error("Missing siteId in config.server.ts commerce.api configuration");
	return { commerce: { api: {
		shortCode: api.shortCode,
		organizationId: api.organizationId,
		clientId: api.clientId,
		siteId: api.siteId,
		proxy: api.proxy || "/mobify/proxy/api"
	} } };
}

//#endregion
//#region src/utils/paths.ts
/**
* Get the Commerce Cloud API URL from a short code
*/
function getCommerceCloudApiUrl(shortCode) {
	return `https://${shortCode}.api.commercecloud.salesforce.com`;
}
/**
* Get the bundle path for static assets
*/
function getBundlePath(bundleId) {
	return `/mobify/bundle/${bundleId}/client/`;
}

//#endregion
//#region src/server/middleware/proxy.ts
/**
* Create proxy middleware for Commerce Cloud API
* Proxies requests from /mobify/proxy/api to the Commerce Cloud API
*/
function createCommerceProxyMiddleware(config) {
	return createProxyMiddleware({
		target: getCommerceCloudApiUrl(config.commerce.api.shortCode),
		changeOrigin: true
	});
}

//#endregion
//#region src/server/middleware/static.ts
/**
* Create static file serving middleware for client assets
* Serves files from build/client at /mobify/bundle/{BUNDLE_ID}/client/
*/
function createStaticMiddleware(bundleId, projectDirectory) {
	const bundlePath = getBundlePath(bundleId);
	const clientBuildDir = path$1.join(projectDirectory, "build", "client");
	info(`Serving static assets from ${clientBuildDir} at ${bundlePath}`);
	return express.static(clientBuildDir, { setHeaders: (res) => {
		res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
		res.setHeader("x-local-static-cache-control", "1");
	} });
}

//#endregion
//#region src/server/middleware/compression.ts
/**
* Parse and validate COMPRESSION_LEVEL environment variable
* @returns Valid compression level (0-9) or default compression level
*/
function getCompressionLevel() {
	const raw = process.env.COMPRESSION_LEVEL;
	const DEFAULT = zlib.constants.Z_DEFAULT_COMPRESSION;
	if (raw == null || raw.trim() === "") return DEFAULT;
	const level = Number(raw);
	if (!(Number.isInteger(level) && level >= 0 && level <= 9)) {
		warn(`[compression] Invalid COMPRESSION_LEVEL="${raw}". Using default (${DEFAULT}).`);
		return DEFAULT;
	}
	return level;
}
/**
* Create compression middleware for gzip/brotli compression
* Used in preview mode to optimize response sizes
*/
function createCompressionMiddleware() {
	return compression({
		filter: (req, res) => {
			if (req.headers["x-no-compression"]) return false;
			return compression.filter(req, res);
		},
		level: getCompressionLevel()
	});
}

//#endregion
//#region src/server/middleware/logging.ts
/**
* Patterns for URLs to skip logging (static assets and Vite internals)
*/
const SKIP_PATTERNS = [
	"/@vite/**",
	"/@id/**",
	"/@fs/**",
	"/@react-router/**",
	"/src/**",
	"/node_modules/**",
	"**/*.js",
	"**/*.css",
	"**/*.ts",
	"**/*.tsx",
	"**/*.js.map",
	"**/*.css.map"
];
/**
* Create request logging middleware
* Used in dev and preview modes for request visibility
*/
function createLoggingMiddleware() {
	morgan.token("status-colored", (req, res) => {
		const status = res.statusCode;
		let color = chalk.green;
		if (status >= 500) color = chalk.red;
		else if (status >= 400) color = chalk.yellow;
		else if (status >= 300) color = chalk.cyan;
		return color(String(status));
	});
	morgan.token("method-colored", (req) => {
		const method = req.method;
		const colors$1 = {
			GET: chalk.green,
			POST: chalk.blue,
			PUT: chalk.yellow,
			DELETE: chalk.red,
			PATCH: chalk.magenta
		};
		return (method && colors$1[method] || chalk.white)(method);
	});
	return morgan((tokens, req, res) => {
		return [
			chalk.gray("["),
			tokens["method-colored"](req, res),
			chalk.gray("]"),
			tokens.url(req, res),
			"-",
			tokens["status-colored"](req, res),
			chalk.gray(`(${tokens["response-time"](req, res)}ms)`)
		].join(" ");
	}, { skip: (req) => {
		return SKIP_PATTERNS.some((pattern) => minimatch(req.url, pattern, { dot: true }));
	} });
}

//#endregion
//#region src/server/utils.ts
/**
* Patch React Router build to rewrite asset URLs with the correct bundle path
* This is needed because the build output uses /assets/ but we preview at /mobify/bundle/{BUNDLE_ID}/client/assets/
*/
function patchReactRouterBuild(build, bundleId) {
	const bundlePath = getBundlePath(bundleId);
	const patchedAssetsJson = JSON.stringify(build.assets).replace(/"\/assets\//g, `"${bundlePath}assets/`);
	const newAssets = JSON.parse(patchedAssetsJson);
	return Object.assign({}, build, {
		publicPath: bundlePath,
		assets: newAssets
	});
}

//#endregion
//#region src/server/modes.ts
/**
* Default feature configuration for each server mode
*/
const ServerModeFeatureMap = {
	development: {
		enableProxy: true,
		enableStaticServing: false,
		enableCompression: false,
		enableLogging: true,
		enableAssetUrlPatching: false
	},
	preview: {
		enableProxy: true,
		enableStaticServing: true,
		enableCompression: true,
		enableLogging: true,
		enableAssetUrlPatching: true
	},
	production: {
		enableProxy: false,
		enableStaticServing: false,
		enableCompression: true,
		enableLogging: true,
		enableAssetUrlPatching: true
	}
};

//#endregion
//#region src/server/index.ts
/**
* Create a unified Express server for development, preview, or production mode
*/
async function createServer(options) {
	const { mode, projectDirectory = process.cwd(), config: providedConfig, vite, build, streaming = false, enableProxy = ServerModeFeatureMap[mode].enableProxy, enableStaticServing = ServerModeFeatureMap[mode].enableStaticServing, enableCompression = ServerModeFeatureMap[mode].enableCompression, enableLogging = ServerModeFeatureMap[mode].enableLogging, enableAssetUrlPatching = ServerModeFeatureMap[mode].enableAssetUrlPatching } = options;
	if (mode === "development" && !vite) throw new Error("Vite dev server instance is required for development mode");
	if ((mode === "preview" || mode === "production") && !build) throw new Error("React Router server build is required for preview/production mode");
	const config = providedConfig ?? loadConfigFromEnv();
	const bundleId = process.env.BUNDLE_ID ?? "local";
	const app = express();
	app.disable("x-powered-by");
	if (enableLogging) app.use(createLoggingMiddleware());
	if (enableCompression && !streaming) app.use(createCompressionMiddleware());
	if (enableStaticServing && build) {
		const bundlePath = getBundlePath(bundleId);
		app.use(bundlePath, createStaticMiddleware(bundleId, projectDirectory));
	}
	const middlewareRegistryPath = resolve(projectDirectory, "src/server/middleware-registry.ts");
	if (existsSync$1(middlewareRegistryPath)) {
		const registry = await importTypescript(middlewareRegistryPath, { projectDirectory });
		if (registry.customMiddlewares && Array.isArray(registry.customMiddlewares)) registry.customMiddlewares.forEach((middleware) => {
			app.use(middleware);
		});
	}
	if (mode === "development" && vite) app.use(vite.middlewares);
	if (enableProxy) app.use(config.commerce.api.proxy, createCommerceProxyMiddleware(config));
	app.all("*", await createSSRHandler(mode, bundleId, vite, build, enableAssetUrlPatching));
	return app;
}
/**
* Create the SSR request handler based on mode
*/
async function createSSRHandler(mode, bundleId, vite, build, enableAssetUrlPatching) {
	if (mode === "development" && vite) {
		const { isRunnableDevEnvironment } = await import("vite");
		return async (req, res, next) => {
			try {
				const ssrEnvironment = vite.environments.ssr;
				if (!isRunnableDevEnvironment(ssrEnvironment)) {
					next(/* @__PURE__ */ new Error("SSR environment is not runnable. Please ensure:\n  1. \"@salesforce/storefront-next-dev\" plugin is added to vite.config.ts\n  2. \"future.unstable_viteEnvironmentApi: true\" is set in react-router.config.ts"));
					return;
				}
				await createRequestHandler({
					build: await ssrEnvironment.runner.import("virtual:react-router/server-build"),
					mode: process.env.NODE_ENV
				})(req, res, next);
			} catch (error$1) {
				vite.ssrFixStacktrace(error$1);
				next(error$1);
			}
		};
	} else if (build) {
		let patchedBuild = build;
		if (enableAssetUrlPatching) patchedBuild = patchReactRouterBuild(build, bundleId);
		return createRequestHandler({
			build: patchedBuild,
			mode: process.env.NODE_ENV
		});
	} else throw new Error("Invalid server configuration: no vite or build provided");
}

//#endregion
//#region src/extensibility/path-util.ts
const FILE_EXTENSIONS = [
	".tsx",
	".ts",
	".d.ts"
];
function isSupportedFileExtension(fileName) {
	return FILE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

//#endregion
//#region src/extensibility/trim-extensions.ts
/**
* Utility to trim the directory to remove unused components and unused extensions.
* This is used to reduce the size of the project by removing the code that is not part of the selected extensions.
*/
const SINGLE_LINE_MARKER = "@sfdc-extension-line";
const BLOCK_MARKER_START = "@sfdc-extension-block-start";
const BLOCK_MARKER_END = "@sfdc-extension-block-end";
const FILE_MARKER = "@sfdc-extension-file";
let verbose = false;
function trimExtensions(directory, selectedExtensions, extensionConfig, verboseOverride = false) {
	const startTime = Date.now();
	verbose = verboseOverride ?? false;
	const configuredExtensions = extensionConfig?.extensions || {};
	const extensions = {};
	Object.keys(configuredExtensions).forEach((pluginKey) => {
		extensions[pluginKey] = Boolean(selectedExtensions?.[pluginKey]) || false;
	});
	if (Object.keys(extensions).length === 0) {
		if (verbose) console.log("No plugins found, skipping trim");
		return;
	}
	const processDirectory = (dir) => {
		fs$1.readdirSync(dir).forEach((file) => {
			const filePath = path$1.join(dir, file);
			const stats = fs$1.statSync(filePath);
			if (!filePath.includes("node_modules")) {
				if (stats.isDirectory()) processDirectory(filePath);
				else if (isSupportedFileExtension(file)) processFile(filePath, extensions);
			}
		});
	};
	processDirectory(directory);
	if (extensionConfig?.extensions) {
		deleteExtensionFolders(directory, extensions, extensionConfig);
		updateExtensionConfig(directory, extensions);
	}
	const endTime = Date.now();
	if (verbose) console.log(`Trim extensions took ${endTime - startTime}ms`);
}
/**
* Update the extension config file to only include the selected extensions.
* @param projectDirectory - The project directory
* @param extensionSelections - The selected extensions
*/
function updateExtensionConfig(projectDirectory, extensionSelections) {
	const extensionConfigPath = path$1.join(projectDirectory, "src", "extensions", "config.json");
	const extensionConfig = JSON.parse(fs$1.readFileSync(extensionConfigPath, "utf8"));
	Object.keys(extensionConfig.extensions).forEach((extensionKey) => {
		if (!extensionSelections[extensionKey]) delete extensionConfig.extensions[extensionKey];
	});
	fs$1.writeFileSync(extensionConfigPath, JSON.stringify({ extensions: extensionConfig.extensions }, null, 4), "utf8");
}
/**
* Process a file to trim extension-specific code based on markers.
* @param filePath - The file path to process
* @param extensions - The extension selections
*/
function processFile(filePath, extensions) {
	const source = fs$1.readFileSync(filePath, "utf-8");
	if (source.includes(FILE_MARKER)) {
		const markerLine = source.split("\n").find((line) => line.includes(FILE_MARKER));
		const extMatch = Object.keys(extensions).find((ext) => markerLine.includes(ext));
		if (!extMatch) {
			if (verbose) console.warn(`File ${filePath} is marked with ${markerLine} but it does not match any known extensions`);
		} else if (extensions[extMatch] === false) {
			try {
				fs$1.unlinkSync(filePath);
				if (verbose) console.log(`Deleted file ${filePath}`);
			} catch (e) {
				const error$1 = e;
				console.error(`Error deleting file ${filePath}: ${error$1.message}`);
				throw e;
			}
			return;
		}
	}
	const extKeys = Object.keys(extensions);
	if (new RegExp(extKeys.join("|"), "g").test(source)) {
		const lines = source.split("\n");
		const newLines = [];
		const blockMarkers = [];
		let skippingBlock = false;
		let i = 0;
		while (i < lines.length) {
			const line = lines[i];
			if (line.includes(SINGLE_LINE_MARKER)) {
				const matchingExtension = Object.keys(extensions).find((extension) => line.includes(extension));
				if (matchingExtension && extensions[matchingExtension] === false) {
					i += 2;
					continue;
				}
			} else if (line.includes(BLOCK_MARKER_START)) {
				const matchingExtension = Object.keys(extensions).find((extension) => line.includes(extension));
				if (matchingExtension) {
					blockMarkers.push({
						extension: matchingExtension,
						line: i
					});
					skippingBlock = extensions[matchingExtension] === false;
				} else if (verbose) console.warn(`Warning: Unknown marker found in ${filePath} at line ${i}: \n${line}`);
			} else if (line.includes(BLOCK_MARKER_END)) {
				if (Object.keys(extensions).find((extension) => line.includes(extension))) {
					const extension = Object.keys(extensions).find((p) => line.includes(p));
					if (blockMarkers.length === 0) throw new Error(`Block marker mismatch in ${filePath}, encountered end marker ${extension} without a matching start marker at line ${i}:\n${lines[i]}`);
					const startMarker = blockMarkers.pop();
					if (!extension || startMarker.extension !== extension) throw new Error(`Block marker mismatch in ${filePath}, expected end marker for ${startMarker.extension} but got ${extension} at line ${i}:\n${lines[i]}`);
					if (extensions[extension] === false) {
						skippingBlock = false;
						i++;
						continue;
					}
				}
			}
			if (!skippingBlock) newLines.push(line);
			i++;
		}
		if (blockMarkers.length > 0) throw new Error(`Unclosed end marker found in ${filePath}: ${blockMarkers[blockMarkers.length - 1].extension}`);
		const newSource = newLines.join("\n");
		if (newSource !== source) try {
			fs$1.writeFileSync(filePath, newSource);
			if (verbose) console.log(`Updated file ${filePath}`);
		} catch (e) {
			const error$1 = e;
			console.error(`Error updating file ${filePath}: ${error$1.message}`);
			throw e;
		}
	}
}
/**
* Delete extension folders for disabled extensions.
* @param projectRoot - The project root directory
* @param extensions - The extension selections
* @param extensionConfig - The extension configuration
*/
function deleteExtensionFolders(projectRoot, extensions, extensionConfig) {
	const extensionsDir = path$1.join(projectRoot, "src", "extensions");
	if (!fs$1.existsSync(extensionsDir)) return;
	const configuredExtensions = extensionConfig.extensions;
	Object.keys(extensions).filter((ext) => extensions[ext] === false).forEach((extKey) => {
		const extensionMeta = configuredExtensions[extKey];
		if (extensionMeta?.folder) {
			const extensionFolderPath = path$1.join(extensionsDir, extensionMeta.folder);
			if (fs$1.existsSync(extensionFolderPath)) try {
				fs$1.rmSync(extensionFolderPath, {
					recursive: true,
					force: true
				});
				if (verbose) console.log(`Deleted extension folder: ${extensionFolderPath}`);
			} catch (err) {
				const error$1 = err;
				if (error$1.code === "EPERM") console.error(`Permission denied - cannot delete ${extensionFolderPath}. You may need to run with sudo or check permissions.`);
				else console.error(`Error deleting ${extensionFolderPath}: ${error$1.message}`);
			}
		}
	});
}

//#endregion
//#region src/cartridge-services/generate-cartridge.ts
const SKIP_DIRECTORIES = [
	"build",
	"dist",
	"node_modules",
	".git",
	".next",
	"coverage"
];
const DEFAULT_COMPONENT_GROUP = "odyssey_base";
const ARCH_TYPE_HEADLESS = "headless";
const VALID_ATTRIBUTE_TYPES = [
	"string",
	"text",
	"markup",
	"integer",
	"boolean",
	"product",
	"category",
	"file",
	"page",
	"image",
	"url",
	"enum",
	"custom",
	"cms_record"
];
const TYPE_MAPPING = {
	String: "string",
	string: "string",
	Number: "integer",
	number: "integer",
	Boolean: "boolean",
	boolean: "boolean",
	Date: "string",
	URL: "url",
	CMSRecord: "cms_record"
};
function resolveAttributeType(decoratorType, tsMorphType, fieldName) {
	if (decoratorType) {
		if (!VALID_ATTRIBUTE_TYPES.includes(decoratorType)) {
			console.error(`Error: Invalid attribute type '${decoratorType}' for field '${fieldName || "unknown"}'. Valid types are: ${VALID_ATTRIBUTE_TYPES.join(", ")}`);
			process.exit(1);
		}
		return decoratorType;
	}
	if (tsMorphType && TYPE_MAPPING[tsMorphType]) return TYPE_MAPPING[tsMorphType];
	return "string";
}
function toHumanReadableName(fieldName) {
	return fieldName.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
}
function toCamelCaseFileName(name) {
	if (!/[\s-]/.test(name)) return name;
	return name.split(/[\s-]+/).map((word, index) => {
		if (index === 0) return word.toLowerCase();
		return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
	}).join("");
}
function getTypeFromTsMorph(property, _sourceFile) {
	try {
		const typeNode = property.getTypeNode();
		if (typeNode) return typeNode.getText().split("|")[0].split("&")[0].trim();
	} catch {}
	return "string";
}
function parseExpression(expression) {
	if (Node.isStringLiteral(expression)) return expression.getLiteralValue();
	else if (Node.isNumericLiteral(expression)) return expression.getLiteralValue();
	else if (Node.isTrueLiteral(expression)) return true;
	else if (Node.isFalseLiteral(expression)) return false;
	else if (Node.isObjectLiteralExpression(expression)) return parseNestedObject(expression);
	else if (Node.isArrayLiteralExpression(expression)) return parseArrayLiteral(expression);
	else return expression.getText();
}
function parseNestedObject(objectLiteral) {
	const result = {};
	try {
		const properties = objectLiteral.getProperties();
		for (const property of properties) if (Node.isPropertyAssignment(property)) {
			const name = property.getName();
			const initializer = property.getInitializer();
			if (initializer) result[name] = parseExpression(initializer);
		}
	} catch (error$1) {
		console.warn(`Warning: Could not parse nested object: ${error$1.message}`);
		return result;
	}
	return result;
}
function filePathToRoute(filePath, projectRoot) {
	const filePathPosix = filePath.replace(/\\/g, "/");
	const projectRootPosix = projectRoot.replace(/\\/g, "/");
	const routesRoot = posix.join(projectRootPosix, "src/routes");
	const marker = "/src/routes/";
	let routePath = (filePathPosix.includes(marker) ? filePathPosix.slice(filePathPosix.indexOf(marker) + 12) : posix.relative(routesRoot, filePathPosix)).replace(/\.(tsx|ts|jsx|js)$/i, "");
	routePath = routePath.replace(/^_index$/i, "").replace(/^index$/i, "").replace(/\/_index$/i, "").replace(/\/index$/i, "").replace(/\$([^/]+)/g, ":$1");
	return routePath.startsWith("/") ? routePath : `/${routePath}`;
}
function parseArrayLiteral(arrayLiteral) {
	const result = [];
	try {
		const elements = arrayLiteral.getElements();
		for (const element of elements) result.push(parseExpression(element));
	} catch (error$1) {
		console.warn(`Warning: Could not parse array literal: ${error$1.message}`);
	}
	return result;
}
function parseDecoratorArgs(decorator) {
	const result = {};
	try {
		const args = decorator.getArguments();
		if (args.length === 0) return result;
		const firstArg = args[0];
		if (Node.isObjectLiteralExpression(firstArg)) {
			const properties = firstArg.getProperties();
			for (const property of properties) if (Node.isPropertyAssignment(property)) {
				const name = property.getName();
				const initializer = property.getInitializer();
				if (initializer) result[name] = parseExpression(initializer);
			}
		} else if (Node.isStringLiteral(firstArg)) {
			result.id = parseExpression(firstArg);
			if (args.length > 1) {
				const secondArg = args[1];
				if (Node.isObjectLiteralExpression(secondArg)) {
					const properties = secondArg.getProperties();
					for (const property of properties) if (Node.isPropertyAssignment(property)) {
						const name = property.getName();
						const initializer = property.getInitializer();
						if (initializer) result[name] = parseExpression(initializer);
					}
				}
			}
		}
		return result;
	} catch (error$1) {
		console.warn(`Warning: Could not parse decorator arguments: ${error$1.message}`);
		return result;
	}
}
function extractAttributesFromSource(sourceFile, className) {
	const attributes = [];
	try {
		const classDeclaration = sourceFile.getClass(className);
		if (!classDeclaration) return attributes;
		const properties = classDeclaration.getProperties();
		for (const property of properties) {
			const attributeDecorator = property.getDecorator("AttributeDefinition");
			if (!attributeDecorator) continue;
			const fieldName = property.getName();
			const config = parseDecoratorArgs(attributeDecorator);
			const isRequired = !property.hasQuestionToken();
			const inferredType = config.type || getTypeFromTsMorph(property, sourceFile);
			const attribute = {
				id: config.id || fieldName,
				name: config.name || toHumanReadableName(fieldName),
				type: resolveAttributeType(config.type, inferredType, fieldName),
				required: config.required !== void 0 ? config.required : isRequired,
				description: config.description || `Field: ${fieldName}`
			};
			if (config.values) attribute.values = config.values;
			if (config.defaultValue !== void 0) attribute.default_value = config.defaultValue;
			attributes.push(attribute);
		}
	} catch (error$1) {
		console.warn(`Warning: Could not extract attributes from class ${className}: ${error$1.message}`);
	}
	return attributes;
}
function extractRegionDefinitionsFromSource(sourceFile, className) {
	const regionDefinitions = [];
	try {
		const classDeclaration = sourceFile.getClass(className);
		if (!classDeclaration) return regionDefinitions;
		const classRegionDecorator = classDeclaration.getDecorator("RegionDefinition");
		if (classRegionDecorator) {
			const args = classRegionDecorator.getArguments();
			if (args.length > 0) {
				const firstArg = args[0];
				if (Node.isArrayLiteralExpression(firstArg)) {
					const elements = firstArg.getElements();
					for (const element of elements) if (Node.isObjectLiteralExpression(element)) {
						const regionConfig = parseDecoratorArgs({ getArguments: () => [element] });
						const regionDefinition = {
							id: regionConfig.id || "region",
							name: regionConfig.name || "Region"
						};
						if (regionConfig.componentTypes) regionDefinition.component_types = regionConfig.componentTypes;
						if (Array.isArray(regionConfig.componentTypeInclusions)) regionDefinition.component_type_inclusions = regionConfig.componentTypeInclusions.map((incl) => ({ type_id: incl }));
						if (Array.isArray(regionConfig.componentTypeExclusions)) regionDefinition.component_type_exclusions = regionConfig.componentTypeExclusions.map((excl) => ({ type_id: excl }));
						if (regionConfig.maxComponents !== void 0) regionDefinition.max_components = regionConfig.maxComponents;
						if (regionConfig.minComponents !== void 0) regionDefinition.min_components = regionConfig.minComponents;
						if (regionConfig.allowMultiple !== void 0) regionDefinition.allow_multiple = regionConfig.allowMultiple;
						if (regionConfig.defaultComponentConstructors) regionDefinition.default_component_constructors = regionConfig.defaultComponentConstructors;
						regionDefinitions.push(regionDefinition);
					}
				}
			}
		}
	} catch (error$1) {
		console.warn(`Warning: Could not extract region definitions from class ${className}: ${error$1.message}`);
	}
	return regionDefinitions;
}
async function processComponentFile(filePath, _projectRoot) {
	try {
		const content = await readFile(filePath, "utf-8");
		const components = [];
		if (!content.includes("@Component")) return components;
		try {
			const sourceFile = new Project({
				useInMemoryFileSystem: true,
				skipAddingFilesFromTsConfig: true
			}).createSourceFile(filePath, content);
			const classes = sourceFile.getClasses();
			for (const classDeclaration of classes) {
				const componentDecorator = classDeclaration.getDecorator("Component");
				if (!componentDecorator) continue;
				const className = classDeclaration.getName();
				if (!className) continue;
				const componentConfig = parseDecoratorArgs(componentDecorator);
				const attributes = extractAttributesFromSource(sourceFile, className);
				const regionDefinitions = extractRegionDefinitionsFromSource(sourceFile, className);
				const componentMetadata = {
					typeId: componentConfig.id || className.toLowerCase(),
					name: componentConfig.name || toHumanReadableName(className),
					group: componentConfig.group || DEFAULT_COMPONENT_GROUP,
					description: componentConfig.description || `Custom component: ${className}`,
					regionDefinitions,
					attributes
				};
				components.push(componentMetadata);
			}
		} catch (error$1) {
			console.warn(`Warning: Could not process file ${filePath}:`, error$1.message);
		}
		return components;
	} catch (error$1) {
		console.warn(`Warning: Could not read file ${filePath}:`, error$1.message);
		return [];
	}
}
async function processPageTypeFile(filePath, projectRoot) {
	try {
		const content = await readFile(filePath, "utf-8");
		const pageTypes = [];
		if (!content.includes("@PageType")) return pageTypes;
		try {
			const sourceFile = new Project({
				useInMemoryFileSystem: true,
				skipAddingFilesFromTsConfig: true
			}).createSourceFile(filePath, content);
			const classes = sourceFile.getClasses();
			for (const classDeclaration of classes) {
				const pageTypeDecorator = classDeclaration.getDecorator("PageType");
				if (!pageTypeDecorator) continue;
				const className = classDeclaration.getName();
				if (!className) continue;
				const pageTypeConfig = parseDecoratorArgs(pageTypeDecorator);
				const attributes = extractAttributesFromSource(sourceFile, className);
				const regionDefinitions = extractRegionDefinitionsFromSource(sourceFile, className);
				const route = filePathToRoute(filePath, projectRoot);
				const pageTypeMetadata = {
					typeId: pageTypeConfig.id || className.toLowerCase(),
					name: pageTypeConfig.name || toHumanReadableName(className),
					description: pageTypeConfig.description || `Custom page type: ${className}`,
					regionDefinitions,
					supportedAspectTypes: pageTypeConfig.supportedAspectTypes || [],
					attributes,
					route
				};
				pageTypes.push(pageTypeMetadata);
			}
		} catch (error$1) {
			console.warn(`Warning: Could not process file ${filePath}:`, error$1.message);
		}
		return pageTypes;
	} catch (error$1) {
		console.warn(`Warning: Could not read file ${filePath}:`, error$1.message);
		return [];
	}
}
async function processAspectFile(filePath, _projectRoot) {
	try {
		const content = await readFile(filePath, "utf-8");
		const aspects = [];
		if (!filePath.endsWith(".json") || !content.trim().startsWith("{")) return aspects;
		if (!filePath.includes("/aspects/") && !filePath.includes("\\aspects\\")) return aspects;
		try {
			const aspectData = JSON.parse(content);
			const fileName = basename(filePath, ".json");
			if (!aspectData.name || !aspectData.attribute_definitions) return aspects;
			const aspectMetadata = {
				id: fileName,
				name: aspectData.name,
				description: aspectData.description || `Aspect type: ${aspectData.name}`,
				attributeDefinitions: aspectData.attribute_definitions || [],
				supportedObjectTypes: aspectData.supported_object_types || []
			};
			aspects.push(aspectMetadata);
		} catch (parseError) {
			console.warn(`Warning: Could not parse JSON in file ${filePath}:`, parseError.message);
		}
		return aspects;
	} catch (error$1) {
		console.warn(`Warning: Could not read file ${filePath}:`, error$1.message);
		return [];
	}
}
async function generateComponentCartridge(component, outputDir) {
	const fileName = toCamelCaseFileName(component.typeId);
	const groupDir = join(outputDir, component.group);
	const outputPath = join(groupDir, `${fileName}.json`);
	try {
		await mkdir(groupDir, { recursive: true });
	} catch {}
	const attributeDefinitionGroups = [{
		id: component.typeId,
		name: component.name,
		description: component.description,
		attribute_definitions: component.attributes
	}];
	const cartridgeData = {
		name: component.name,
		description: component.description,
		group: component.group,
		arch_type: ARCH_TYPE_HEADLESS,
		region_definitions: component.regionDefinitions || [],
		attribute_definition_groups: attributeDefinitionGroups
	};
	await writeFile(outputPath, JSON.stringify(cartridgeData, null, 2));
	console.log(`   - ${String(component.typeId)}: ${String(component.name)} (${String(component.attributes.length)} attributes) → ${fileName}.json`);
}
async function generatePageTypeCartridge(pageType, outputDir) {
	const fileName = toCamelCaseFileName(pageType.name);
	const outputPath = join(outputDir, `${fileName}.json`);
	const cartridgeData = {
		name: pageType.name,
		description: pageType.description,
		arch_type: ARCH_TYPE_HEADLESS,
		region_definitions: pageType.regionDefinitions || []
	};
	if (pageType.attributes && pageType.attributes.length > 0) cartridgeData.attribute_definition_groups = [{
		id: pageType.typeId || fileName,
		name: pageType.name,
		description: pageType.description,
		attribute_definitions: pageType.attributes
	}];
	if (pageType.supportedAspectTypes) cartridgeData.supported_aspect_types = pageType.supportedAspectTypes;
	if (pageType.route) cartridgeData.route = pageType.route;
	await writeFile(outputPath, JSON.stringify(cartridgeData, null, 2));
	console.log(`   - ${String(pageType.name)}: ${String(pageType.description)} (${String(pageType.attributes.length)} attributes) → ${fileName}.json`);
}
async function generateAspectCartridge(aspect, outputDir) {
	const fileName = toCamelCaseFileName(aspect.id);
	const outputPath = join(outputDir, `${fileName}.json`);
	const cartridgeData = {
		name: aspect.name,
		description: aspect.description,
		arch_type: ARCH_TYPE_HEADLESS,
		attribute_definitions: aspect.attributeDefinitions || []
	};
	if (aspect.supportedObjectTypes) cartridgeData.supported_object_types = aspect.supportedObjectTypes;
	await writeFile(outputPath, JSON.stringify(cartridgeData, null, 2));
	console.log(`   - ${String(aspect.name)}: ${String(aspect.description)} (${String(aspect.attributeDefinitions.length)} attributes) → ${fileName}.json`);
}
async function generateMetadata(projectDirectory, metadataDirectory, options) {
	try {
		const filePaths = options?.filePaths;
		const isIncrementalMode = filePaths && filePaths.length > 0;
		if (isIncrementalMode) console.log(`🔍 Generating metadata for ${filePaths.length} specified file(s)...`);
		else console.log("🔍 Generating metadata for decorated components and page types...");
		const projectRoot = resolve$1(projectDirectory);
		const srcDir = join(projectRoot, "src");
		const metadataDir = resolve$1(metadataDirectory);
		const componentsOutputDir = join(metadataDir, "components");
		const pagesOutputDir = join(metadataDir, "pages");
		const aspectsOutputDir = join(metadataDir, "aspects");
		if (!isIncrementalMode) {
			console.log("🗑️  Cleaning existing output directories...");
			for (const outputDir of [
				componentsOutputDir,
				pagesOutputDir,
				aspectsOutputDir
			]) try {
				await rm(outputDir, {
					recursive: true,
					force: true
				});
				console.log(`   - Deleted: ${outputDir}`);
			} catch {
				console.log(`   - Directory not found (skipping): ${outputDir}`);
			}
		} else console.log("📝 Incremental mode: existing cartridge files will be preserved/overwritten");
		console.log("📁 Creating output directories...");
		for (const outputDir of [
			componentsOutputDir,
			pagesOutputDir,
			aspectsOutputDir
		]) try {
			await mkdir(outputDir, { recursive: true });
		} catch (error$1) {
			try {
				await access(outputDir);
			} catch {
				console.error(`❌ Error: Failed to create output directory ${outputDir}: ${error$1.message}`);
				process.exit(1);
			}
		}
		let files = [];
		if (isIncrementalMode && filePaths) {
			files = filePaths.map((fp) => resolve$1(projectRoot, fp));
			console.log(`📂 Processing ${files.length} specified file(s)...`);
		} else {
			const scanDirectory = async (dir) => {
				const entries = await readdir(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = join(dir, entry.name);
					if (entry.isDirectory()) {
						if (!SKIP_DIRECTORIES.includes(entry.name)) await scanDirectory(fullPath);
					} else if (entry.isFile() && (extname(entry.name) === ".ts" || extname(entry.name) === ".tsx" || extname(entry.name) === ".json")) files.push(fullPath);
				}
			};
			await scanDirectory(srcDir);
		}
		const allComponents = [];
		const allPageTypes = [];
		const allAspects = [];
		for (const file of files) {
			const components = await processComponentFile(file, projectRoot);
			allComponents.push(...components);
			const pageTypes = await processPageTypeFile(file, projectRoot);
			allPageTypes.push(...pageTypes);
			const aspects = await processAspectFile(file, projectRoot);
			allAspects.push(...aspects);
		}
		if (allComponents.length === 0 && allPageTypes.length === 0 && allAspects.length === 0) {
			console.log("⚠️  No decorated components, page types, or aspect files found.");
			return;
		}
		if (allComponents.length > 0) {
			console.log(`✅ Found ${allComponents.length} decorated component(s):`);
			for (const component of allComponents) await generateComponentCartridge(component, componentsOutputDir);
			console.log(`📄 Generated ${allComponents.length} component metadata file(s) in: ${componentsOutputDir}`);
		}
		if (allPageTypes.length > 0) {
			console.log(`✅ Found ${allPageTypes.length} decorated page type(s):`);
			for (const pageType of allPageTypes) await generatePageTypeCartridge(pageType, pagesOutputDir);
			console.log(`📄 Generated ${allPageTypes.length} page type metadata file(s) in: ${pagesOutputDir}`);
		}
		if (allAspects.length > 0) {
			console.log(`✅ Found ${allAspects.length} decorated aspect(s):`);
			for (const aspect of allAspects) await generateAspectCartridge(aspect, aspectsOutputDir);
			console.log(`📄 Generated ${allAspects.length} aspect metadata file(s) in: ${aspectsOutputDir}`);
		}
	} catch (error$1) {
		console.error("❌ Error:", error$1.message);
		process.exit(1);
	}
}

//#endregion
export { createServer, storefrontNextPlugins as default, generateMetadata, loadConfigFromEnv, loadProjectConfig, push, trimExtensions };
//# sourceMappingURL=index.js.map