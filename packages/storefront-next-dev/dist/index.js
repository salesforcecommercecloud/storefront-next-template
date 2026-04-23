import path, { basename, extname, join, resolve } from "node:path";
import fs from "fs-extra";
import chalk from "chalk";
import path$1, { dirname, join as join$1, relative, resolve as resolve$1 } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { parse } from "@babel/parser";
import { booleanLiteral, identifier, importDeclaration, importSpecifier, isArrayPattern, isClassDeclaration, isExportSpecifier, isFunctionDeclaration, isIdentifier, isJSXAttribute, isJSXElement, isJSXFragment, isJSXIdentifier, isMemberExpression, isObjectPattern, isObjectProperty, isRestElement, isStringLiteral, isVariableDeclaration, jsxAttribute, jsxClosingElement, jsxClosingFragment, jsxElement, jsxExpressionContainer, jsxFragment, jsxIdentifier, jsxOpeningElement, jsxOpeningFragment, jsxText, stringLiteral } from "@babel/types";
import { generate } from "@babel/generator";
import traverseModule from "@babel/traverse";
import fs$1, { existsSync, readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { Node, Project, ts } from "ts-morph";
import fs$2, { existsSync as existsSync$1, readFileSync as readFileSync$1, unlinkSync } from "node:fs";
import { deadCodeElimination, findReferencedIdentifiers } from "babel-dead-code-elimination";
import httpProxy from "http-proxy";
import { brotliDecompressSync, gunzipSync, inflateSync } from "zlib";
import express from "express";
import { createRequestHandler } from "@react-router/express";
import { pathToFileURL as pathToFileURL$1 } from "node:url";
import { createProxyMiddleware } from "http-proxy-middleware";
import compression from "compression";
import zlib from "node:zlib";
import morgan from "morgan";
import { minimatch } from "minimatch";
import { SpanStatusCode, context, trace } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ExportResultCode, hrTimeToTimeStamp } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { npmRunPathEnv } from "npm-run-path";

//#region src/utils/logger.ts
const LEVEL_PRIORITY = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3
};
let overrideLevel;
/**
* Returns true when the `DEBUG` env var targets sfnext or is a general enable flag.
* Avoids accidentally enabling debug mode when DEBUG is set for unrelated libraries
* (e.g. `DEBUG=express:*`).
*/
function debugEnablesSfnext() {
	const raw = process.env.DEBUG?.trim();
	if (!raw) return false;
	const normalized = raw.toLowerCase();
	if ([
		"1",
		"true",
		"yes",
		"on"
	].includes(normalized)) return true;
	return raw.split(",").some((token) => {
		const value = token.trim();
		return value === "*" || value === "sfnext" || value === "sfnext:*";
	});
}
function resolveLevel() {
	if (overrideLevel) return overrideLevel;
	const envLevel = process.env.MRT_LOG_LEVEL ?? process.env.SFCC_LOG_LEVEL;
	if (envLevel && envLevel in LEVEL_PRIORITY) return envLevel;
	if (debugEnablesSfnext()) return "debug";
	if (process.env.NODE_ENV === "production") return "warn";
	return "info";
}
function shouldLog(level) {
	return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[resolveLevel()];
}
const logger = {
	error(msg, ...args) {
		if (!shouldLog("error")) return;
		console.error(chalk.red("[sfnext:error]"), msg, ...args);
	},
	warn(msg, ...args) {
		if (!shouldLog("warn")) return;
		console.warn(chalk.yellow("[sfnext:warn]"), msg, ...args);
	},
	info(msg, ...args) {
		if (!shouldLog("info")) return;
		console.log(chalk.cyan("[sfnext:info]"), msg, ...args);
	},
	debug(msg, ...args) {
		if (!shouldLog("debug")) return;
		console.log(chalk.gray("[sfnext:debug]"), msg, ...args);
	},
	setLevel(level) {
		overrideLevel = level;
	},
	getLevel() {
		return resolveLevel();
	}
};

//#endregion
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
				logger.debug(`patched /assets/ references in ${fullPath}`);
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
		name: "storefront-next:fix-react-router-manifest-urls",
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
//#region src/utils/paths.ts
/**
* Copyright 2026 Salesforce, Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
/**
* Normalize a file path to use forward slashes.
* On Windows, Node APIs return backslash-separated paths, but ESM import
* specifiers and Vite module IDs require forward slashes.
*/
function toPosixPath(filePath) {
	return filePath.replace(/\\/g, "/");
}
/**
* Get the Commerce Cloud API URL from a short code
*/
function getCommerceCloudApiUrl(shortCode, proxyHost) {
	return proxyHost || `https://${shortCode}.api.commercecloud.salesforce.com`;
}
/**
* Get the configurable base path for the application.
* Reads from MRT_ENV_BASE_PATH environment variable.
*
* The base path is used for CDN routing to the correct MRT environment.
* It is prepended to all URLs: page routes, /mobify/bundle/ assets, and /mobify/proxy/api.
*
* Validation rules:
* - Must be a single path segment starting with '/'
* - Max 63 characters after the leading slash
* - Only URL-safe characters allowed
* - Returns empty string if not set
*
* @returns The sanitized base path (e.g., '/site-a' or '')
*
* @example
* // No base path configured
* getBasePath() // → ''
*
* // With base path '/storefront'
* getBasePath() // → '/storefront'
*
* // Automatically sanitizes
* // MRT_ENV_BASE_PATH='storefront/' → '/storefront'
*/
function getBasePath() {
	const basePath = process.env.MRT_ENV_BASE_PATH?.trim();
	if (!basePath) return "";
	if (!/^\/[a-zA-Z0-9_.+$~"'@:-]{1,63}$/.test(basePath)) throw new Error(`Invalid base path: "${basePath}". Base path must be a single segment starting with '/' (e.g., '/site-a'), contain only URL-safe characters, and be at most 63 characters after the leading slash.`);
	return basePath;
}
/**
* Get the bundle path for static assets
*/
function getBundlePath(bundleId) {
	return `${getBasePath()}/mobify/bundle/${bundleId}/client/`;
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
		name: "storefront-next:readable-chunk-file-names",
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
/**
* Gets the MRT entry file for the given mode
* @param mode - The mode to get the MRT entry file for
* @returns The MRT entry file for the given mode
*/
const getMrtEntryFile = (mode) => {
	return process.env.MRT_BUNDLE_TYPE !== MRT_BUNDLE_TYPE_SSR && mode === "production" ? MRT_STREAMING_ENTRY_FILE : MRT_BUNDLE_TYPE_SSR;
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
		const prebuiltMrtEntryMapPath = `${prebuiltMrtEntryPath}.map`;
		if (await fs.pathExists(prebuiltMrtEntryMapPath)) await fs.copy(prebuiltMrtEntryMapPath, `${mrtEntryPath}.map`);
		const mrtDir = path$1.resolve(__dirname$1, "./mrt");
		if (await fs.pathExists(mrtDir)) {
			const files = await fs.readdir(mrtDir);
			for (const file of files) if (file.startsWith("sfnext-server-") && file.endsWith(".mjs")) {
				await fs.copy(path$1.join(mrtDir, file), path$1.resolve(buildDirectory, file));
				const mapFile = `${file}.map`;
				if (files.includes(mapFile)) await fs.copy(path$1.join(mrtDir, mapFile), path$1.resolve(buildDirectory, mapFile));
			}
		}
		const packageJsonPath = path$1.resolve(resolvedConfig.root, "package.json");
		const buildPackageJsonPath = path$1.resolve(buildDirectory, "package.json");
		const packageJson = await fs.readJson(packageJsonPath);
		delete packageJson.type;
		await fs.writeJson(buildPackageJsonPath, packageJson, { spaces: 2 });
	};
	return {
		name: "storefront-next:managed-runtime-bundle",
		apply: "build",
		config({ mode }) {
			return {
				build: { rollupOptions: { onLog(level, log, defaultHandler) {
					if (log.code === "SOURCEMAP_ERROR" && log.message.includes("resolve original location")) return;
					defaultHandler(level, log);
				} } },
				environments: { ssr: { resolve: { noExternal: true } } },
				experimental: { renderBuiltUrl(filename, { type }) {
					if (mode !== "preview" && (type === "asset" || type === "public")) return { runtime: `(typeof window !== 'undefined' ? window._BUNDLE_PATH : ((process.env.MRT_ENV_BASE_PATH??'')+'/mobify/bundle/'+(process.env.BUNDLE_ID??'local')+'/client/')) + ${JSON.stringify(filename)}` };
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
	let isTestMode = false;
	let isDevMode = false;
	return {
		name: "storefront-next:patch-react-router",
		enforce: "pre",
		config(_config, { mode }) {
			isTestMode = mode === "test";
			isDevMode = mode === "development";
		},
		configEnvironment(name) {
			if (isTestMode) return;
			if (isDevMode) return;
			if (name === "ssr") return { resolve: { noExternal: ["react-router"] } };
		},
		resolveId(id, importer) {
			if (isTestMode || isDevMode) return null;
			if (id === MODULE_TO_PATCH) {
				if (importer === VIRTUAL_MODULE_ID || importer?.includes("storefront-next-dev")) return null;
				return VIRTUAL_MODULE_ID;
			}
			return null;
		},
		load(id) {
			if (isTestMode || isDevMode) return null;
			if (id === VIRTUAL_MODULE_ID) return `
                    export * from 'react-router';
                    export { Scripts } from '@salesforce/storefront-next-dev/react-router/Scripts';
                `;
			return null;
		}
	};
};

//#endregion
//#region src/extensibility/target-utils.ts
const traverse$2 = traverseModule.default || traverseModule;
const TARGET_COMPONENT_TAG = "UITarget";
const TARGET_PROVIDERS_TAG = "UITargetProviders";
const TARGET_ID_ATTRIBUTE = "targetId";
const TARGET_COMPONENT_JSX_RE = /* @__PURE__ */ new RegExp(`<${TARGET_COMPONENT_TAG}[\\s/>]`);
/**
* Find and replace the TargetProviders tags with the corresponding context providers
* @param element - the AST element to replace
* @param contextProviders - the context providers to replace
*/
function findAndReplaceProviders(element, contextProviders) {
	if (isJSXIdentifier(element.node.openingElement.name, { name: TARGET_PROVIDERS_TAG })) if (contextProviders.length > 0) {
		let nested = element.node.children;
		for (let i = contextProviders.length - 1; i >= 0; i--) {
			const componentName = contextProviders[i].componentName;
			nested = [jsxElement(jsxOpeningElement(jsxIdentifier(componentName), [], false), jsxClosingElement(jsxIdentifier(componentName)), nested, false)];
		}
		element.replaceWithMultiple(nested);
	} else element.replaceWith(jsxFragment(jsxOpeningFragment(), jsxClosingFragment(), element.node.children));
}
/**
* Find and replace the target component with the replacement code
* @param componentName - the name of the component to replace
* @param element - the AST element as the replacement candidate
* @param targetRegistry - the target registry
* @returns the targetId that was replaced, or null if no replacement was found
*/
function findAndReplaceComponent(componentName, element, targetRegistry) {
	let targetIdReplaced = null;
	if (isJSXIdentifier(element.node.openingElement.name, { name: componentName })) {
		let replaced = false;
		if (Array.isArray(element.node.openingElement.attributes)) {
			const attr = element.node.openingElement.attributes.find((a) => isJSXAttribute(a) && isJSXIdentifier(a.name, { name: TARGET_ID_ATTRIBUTE }));
			const targetId = attr && isJSXAttribute(attr) && attr.value && "value" in attr.value ? attr.value.value : void 0;
			if (targetId == null) throw new Error(`UITarget must contain a targetId attribute`);
			if (targetRegistry[targetId] && targetRegistry[targetId].length > 0) {
				if (element.node.children.length > 0) {
					let nestedChildren = element.node.children;
					for (let i = targetRegistry[targetId].length - 1; i >= 0; i--) {
						const targetComponent = targetRegistry[targetId][i];
						nestedChildren = [jsxElement(jsxOpeningElement(jsxIdentifier(targetComponent.componentName), [], false), jsxClosingElement(jsxIdentifier(targetComponent.componentName)), nestedChildren, false)];
					}
					element.replaceWith(nestedChildren[0]);
				} else {
					const components = targetRegistry[targetId].map((targetComponent) => {
						return jsxElement(jsxOpeningElement(jsxIdentifier(targetComponent.componentName), [], true), null, [], true);
					});
					if (components.length > 1) element.replaceWith(jsxFragment(jsxOpeningFragment(), jsxClosingFragment(), components));
					else element.replaceWith(components[0]);
				}
				targetIdReplaced = targetId;
				replaced = true;
			}
		}
		if (!replaced) if (element.node.children && element.node.children.length > 0) element.replaceWith(jsxFragment(jsxOpeningFragment(), jsxClosingFragment(), element.node.children));
		else element.replaceWith(jsxFragment(jsxOpeningFragment(), jsxClosingFragment(), []));
	}
	return targetIdReplaced;
}
/**
* Run a replacement pass on the AST
* @param ast - the AST to traverse
* @param tagName - the name of the tag to replace
* @param targetRegistry - the target registry
* @param contextProviders - the context providers to replace
* @returns a set of targetIds that were replaced
*/
function runReplacementPass(ast, tagName, targetRegistry = null, contextProviders = null) {
	const targetIdsReplaced = /* @__PURE__ */ new Set();
	const applyReplacement = (pathToReplace) => {
		if (targetRegistry) {
			const replacedId = findAndReplaceComponent(tagName, pathToReplace, targetRegistry);
			if (replacedId) targetIdsReplaced.add(replacedId);
		} else if (contextProviders) findAndReplaceProviders(pathToReplace, contextProviders);
	};
	traverse$2(ast, {
		VariableDeclaration(nodePath) {
			const declarationPaths = nodePath.get("declarations");
			const declarationsArray = Array.isArray(declarationPaths) ? declarationPaths : [declarationPaths];
			for (const declarationPath of declarationsArray) {
				const initPath = declarationPath.get("init");
				if (initPath && isJSXElement(initPath.node)) {
					const content = generate(initPath.node).code;
					if ((/* @__PURE__ */ new RegExp(`<(${tagName})(\\s|\\/|>)`)).test(content)) {
						applyReplacement(initPath);
						initPath.traverse({ JSXElement(inner) {
							applyReplacement(inner);
						} });
					}
				}
			}
		},
		ReturnStatement(nodePath) {
			const arg = nodePath.node.argument;
			if (!isJSXElement(arg) && !isJSXFragment(arg)) return;
			nodePath.traverse({ JSXElement(inner) {
				applyReplacement(inner);
			} });
		}
	});
	return targetIdsReplaced;
}
/**
* Build the import statements for the target components
* @param targetIds - the targetIds that were replaced
* @param targetRegistry - the target registry
* @returns the import statements
*/
function buildReplacementImportStatements(targetIds, targetRegistry) {
	const importStatements = /* @__PURE__ */ new Set();
	for (const targetId of targetIds) {
		const targetComponents = targetRegistry[targetId];
		for (const targetComponent of targetComponents) importStatements.add(`import ${targetComponent.componentName} from '@/${targetComponent.path.replace(".tsx", "")}';`);
	}
	return Array.from(importStatements).join("\n");
}
function transformTargets(code, targetRegistry, contextProviders) {
	if (!TARGET_COMPONENT_JSX_RE.test(code) && !code.includes(TARGET_PROVIDERS_TAG)) return null;
	const ast = parse(code, {
		sourceType: "module",
		plugins: [
			"typescript",
			"jsx",
			"decorators-legacy"
		]
	});
	if (TARGET_COMPONENT_JSX_RE.test(code)) {
		const replacementImportStatements = buildReplacementImportStatements(runReplacementPass(ast, TARGET_COMPONENT_TAG, targetRegistry, null), targetRegistry);
		traverse$2(ast, { ImportDeclaration(nodePath) {
			if (nodePath.node.source.value === "@/targets/ui-target") nodePath.replaceWith(jsxText(replacementImportStatements));
		} });
	}
	if (code.includes(TARGET_PROVIDERS_TAG)) {
		const importStatements = /* @__PURE__ */ new Set();
		for (const contextProvider of contextProviders) importStatements.add(`import ${contextProvider.componentName} from '@/${contextProvider.path.replace(".tsx", "")}';`);
		const replacementImportStatements = Array.from(importStatements).join("\n");
		traverse$2(ast, { ImportDeclaration(nodePath) {
			if (nodePath.node.source.value === "@/targets/ui-target-providers") nodePath.replaceWith(jsxText(replacementImportStatements));
		} });
		runReplacementPass(ast, TARGET_PROVIDERS_TAG, null, contextProviders);
	}
	return generate(ast).code;
}
/**
* Build the target registry from the extension directories
* @param rootDir - the root directory of the project
* @param sourceDir - the source directory of the project
* @returns the target registry
*/
function buildTargetRegistry(rootDir, options = {}) {
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
	const TARGET_CONFIG_FILENAME = "target-config.json";
	for (const dir of extensionDirs) if (dir.isDirectory()) {
		const configPath = path$1.join(extensionDirPath, dir.name, TARGET_CONFIG_FILENAME);
		if (fs.existsSync(configPath)) {
			const extensionConfig = fs.readJsonSync(configPath);
			if (options.isProduction && extensionConfig.devOnly === true) continue;
			if (extensionConfig && extensionConfig.components) for (const component of extensionConfig.components) {
				const { targetId, path: componentPath, order = 0 } = component;
				if (targetId && componentPath) {
					if (!componentRegistry[targetId]) componentRegistry[targetId] = [];
					const { namespace, componentName } = getNamespaceAndComponentName(dir, componentPath);
					componentRegistry[targetId].push({
						targetId,
						path: componentPath,
						order,
						namespace,
						componentName
					});
				}
			}
			if (extensionConfig && extensionConfig.contextProviders) for (const contextProvider of extensionConfig.contextProviders) {
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
	for (const targetId in componentRegistry) componentRegistry[targetId].sort((a, b) => a.order - b.order);
	contextProviders.sort((a, b) => a.order - b.order);
	return {
		componentRegistry,
		contextProviders
	};
}

//#endregion
//#region src/plugins/transformTargets.ts
function transformTargetPlaceholderPlugin() {
	let componentRegistry;
	let contextProviders;
	let sourceDir;
	let isProduction = false;
	return {
		name: "storefront-next:transform-target-placeholder",
		enforce: "pre",
		configResolved(config) {
			sourceDir = config.resolve.alias.find((alias) => alias.find === "@")?.replacement || path$1.resolve(__dirname, "./src");
			isProduction = config.mode === "production";
		},
		buildStart() {
			({componentRegistry, contextProviders} = buildTargetRegistry(sourceDir, { isProduction }));
		},
		transform(code, id) {
			if (process.env.VITE_UI_TARGET_DEV_MODE === "true") return null;
			try {
				const transformedCode = transformTargets(code, componentRegistry, contextProviders);
				if (transformedCode) return {
					code: transformedCode,
					map: null
				};
				return null;
			} catch (err) {
				logger.error(`UITarget replace ERROR in ${id}: ${err instanceof Error ? err.stack : String(err)}`);
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
		name: "storefront-next:watch-config-files",
		configResolved(config) {
			viteConfig = config;
		},
		configureServer(server) {
			const aliases = viteConfig.resolve.alias;
			const root = Object.values(aliases).find((alias) => alias.find === "@")?.replacement || "src";
			const glob$1 = path$1.posix.join(root, "extensions", "**", "target-config.json");
			server.watcher.add(glob$1);
			const onChange = (file) => {
				if (file.endsWith("target-config.json")) {
					logger.debug(`🔁 target-config.json changed: ${file}`);
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
const DEFAULT_COMPONENT_GROUP$1 = "storefrontnext_base";
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
async function scanComponents(project, projectRoot, componentPath, registryPath) {
	const componentFiles = await glob(`${componentPath}/**/*.{ts,tsx}`, {
		cwd: projectRoot,
		absolute: true
	});
	logger.debug(`🔍 Scanning ${componentFiles.length} files in ${componentPath}...`);
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
					const exports = [];
					if (hasLoaderExport) exports.push("loader");
					if (hasClientLoaderExport) exports.push("clientLoader");
					if (hasFallback) exports.push("fallback");
					const exportsText = exports.length > 0 ? ` (with ${exports.join(", ")})` : "";
					logger.debug(`  ✅ Found component: ${componentInfo.id} → ${relativePath}${exportsText}`);
				}
			}
		}
	} catch (error) {
		logger.warn(`⚠️  Could not process ${filePath}: ${error.message}`);
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
function updateRegistryFile(registryFilePath, generatedCode) {
	let existingContent;
	if (!existsSync(registryFilePath)) {
		logger.debug("📝 Creating new registry file...");
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
	} catch (error) {
		throw new Error(`Failed to read registry file: ${error.message}`);
	}
	const startMarker = "// STATIC_REGISTRY_START";
	const endMarker = "// STATIC_REGISTRY_END";
	const startIndex = existingContent.indexOf(startMarker);
	const endIndex = existingContent.indexOf(endMarker);
	if (startIndex === -1 || endIndex === -1) throw new Error(`Registry file ${registryFilePath} is missing static registry markers. Please add "${startMarker}" and "${endMarker}" markers to define the generated content area.`);
	const updatedContent = `${existingContent.slice(0, startIndex + 24)}\n${generatedCode}\n${existingContent.slice(endIndex)}`;
	if (updatedContent === existingContent) {
		logger.debug(`⏭️  Registry unchanged, skipping write: ${registryFilePath}`);
		return false;
	}
	try {
		writeFileSync(registryFilePath, updatedContent, "utf-8");
		logger.debug(`💾 Updated registry file: ${registryFilePath}`);
		return true;
	} catch (error) {
		throw new Error(`Failed to write registry file: ${error.message}`);
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
	const { componentPath = "src/components", registryPath = "src/lib/static-registry.ts", registryIdentifier = "registry", failOnError = true } = config;
	let projectRoot;
	const runRegistryGeneration = async () => {
		logger.debug("🚀 Starting static registry generation...");
		const components = await scanComponents(new Project({ compilerOptions: {
			target: ts.ScriptTarget.Latest,
			module: ts.ModuleKind.ESNext,
			jsx: ts.JsxEmit.ReactJSX,
			allowJs: true,
			skipLibCheck: true,
			noEmit: true
		} }), projectRoot, componentPath, registryPath);
		logger.debug(`📦 Found ${components.length} components with @Component decorators`);
		const generatedCode = generateRegistryCode(components, registryIdentifier);
		const registryFilePath = resolve$1(projectRoot, registryPath);
		const changed = updateRegistryFile(registryFilePath, generatedCode);
		logger.debug("✅ Static registry generation complete!");
		return {
			registryFilePath,
			changed
		};
	};
	return {
		name: "storefrontnext:static-registry",
		configResolved(resolvedConfig) {
			projectRoot = resolvedConfig.root;
		},
		async buildStart() {
			try {
				await runRegistryGeneration();
			} catch (error) {
				logger.error(`❌ Static registry generation failed: ${error.message}`);
				if (failOnError) throw error;
				logger.warn("⚠️  Continuing build without static registry...");
			}
		},
		async handleHotUpdate({ file, server }) {
			const normalizedComponentPath = componentPath.replace(/\\/g, "/");
			const normalizedFile = file.replace(/\\/g, "/");
			if (normalizedFile.includes(`/${normalizedComponentPath}/`) && (normalizedFile.endsWith(".ts") || normalizedFile.endsWith(".tsx"))) {
				logger.debug(`🔄 Component file changed: ${file}, regenerating registry...`);
				try {
					const { registryFilePath, changed } = await runRegistryGeneration();
					if (changed) {
						const registryModule = server.moduleGraph.getModuleById(registryFilePath);
						if (registryModule) await server.reloadModule(registryModule);
						logger.debug("✅ Registry regenerated successfully!");
					} else logger.debug("⏭️  Registry unchanged, skipping reload");
				} catch (error) {
					logger.error(`❌ Failed to regenerate registry: ${error.message}`);
				}
				return [];
			}
		}
	};
};

//#endregion
//#region src/plugins/configLoader.ts
/**
* Load the engagement config from config.server.ts
*/
async function loadEngagementConfig(projectRoot, configPath) {
	const absoluteConfigPath = resolve$1(projectRoot, configPath);
	try {
		const config = (await import(pathToFileURL(absoluteConfigPath).href)).default;
		logger.debug(`📄 Loaded config from ${configPath}`);
		const engagement = config?.app?.engagement;
		if (!engagement) {
			logger.debug(`⚠️  No engagement config found in ${configPath}`);
			return null;
		}
		return engagement;
	} catch (error) {
		logger.warn(`⚠️  Could not load config from ${configPath}: ${error.message}`);
		return null;
	}
}

//#endregion
//#region src/plugins/eventInstrumentationValidator.ts
/**
* Extract all trackEvent calls from source files and return the event types found
*/
async function scanForInstrumentedEvents(projectRoot, scanPaths) {
	const instrumentedEvents = /* @__PURE__ */ new Set();
	const trackEventPattern = /trackEvent\s*\([^,]+,[^,]+,[^,]+,\s*['"]([^'"]+)['"]/g;
	const sendViewPagePattern = /sendViewPageEvent\s*\(/g;
	const createEventPattern = /createEvent\s*\(\s*['"]([^'"]+)['"]/g;
	for (const scanPath of scanPaths) {
		const files = await glob(join$1(resolve$1(projectRoot, scanPath), "**/*.{ts,tsx}"), { ignore: [
			"**/*.test.ts",
			"**/*.test.tsx",
			"**/*.spec.ts",
			"**/*.spec.tsx",
			"**/node_modules/**"
		] });
		logger.debug(`📂 Scanning ${files.length} files in ${scanPath}...`);
		for (const file of files) try {
			const content = readFileSync(file, "utf-8");
			let match;
			while ((match = trackEventPattern.exec(content)) !== null) {
				const eventType = match[1];
				instrumentedEvents.add(eventType);
				logger.debug(`  ✓ Found trackEvent('${eventType}') in ${file}`);
			}
			if (sendViewPagePattern.test(content)) {
				instrumentedEvents.add("view_page");
				logger.debug(`  ✓ Found sendViewPageEvent() in ${file}`);
			}
			while ((match = createEventPattern.exec(content)) !== null) {
				const eventType = match[1];
				instrumentedEvents.add(eventType);
				logger.debug(`  ✓ Found createEvent('${eventType}') in ${file}`);
			}
			trackEventPattern.lastIndex = 0;
			sendViewPagePattern.lastIndex = 0;
			createEventPattern.lastIndex = 0;
		} catch (error) {
			logger.warn(`⚠️  Could not read ${file}: ${error.message}`);
		}
	}
	return instrumentedEvents;
}
/**
* Extract enabled event toggles per adapter
* Dynamically iterates over all keys in eventToggles - supports custom event types
*/
function extractEnabledEvents(engagement) {
	const adapterEvents = /* @__PURE__ */ new Map();
	if (!engagement.adapters) return adapterEvents;
	for (const [adapterName, adapterConfig] of Object.entries(engagement.adapters)) {
		if (!adapterConfig.enabled) continue;
		const enabledEvents = /* @__PURE__ */ new Set();
		if (adapterConfig.eventToggles) {
			for (const [eventType, isEnabled] of Object.entries(adapterConfig.eventToggles)) if (isEnabled === true) enabledEvents.add(eventType);
		}
		if (enabledEvents.size > 0) adapterEvents.set(adapterName, enabledEvents);
	}
	return adapterEvents;
}
/**
* Vite plugin that validates event instrumentation at build time.
*
* This plugin scans source files for trackEvent() calls and validates that
* all enabled event toggles in config.server.ts have corresponding instrumentation.
*
* @param config - Configuration options for the plugin
* @returns A Vite plugin that validates event instrumentation
*
* @example
* // In vite.config.ts
* export default defineConfig({
*   plugins: [
*     eventInstrumentationValidatorPlugin({
*       configPath: 'config.server.ts',
*       scanPaths: ['src'],
*       verbose: true
*     })
*   ]
* })
*/
const eventInstrumentationValidatorPlugin = (config = {}) => {
	const { configPath = "config.server.ts", scanPaths = ["src"], failOnMissing = false } = config;
	let resolvedConfig;
	return {
		name: "storefrontnext:event-instrumentation-validator",
		apply: "build",
		configResolved(viteConfig) {
			resolvedConfig = viteConfig;
		},
		async buildStart() {
			const projectRoot = resolvedConfig.root;
			logger.debug("🔍 Validating event instrumentation...");
			const engagement = await loadEngagementConfig(projectRoot, configPath);
			if (!engagement) {
				logger.debug("ℹ️  Skipping validation - no engagement config found");
				return;
			}
			const adapterEvents = extractEnabledEvents(engagement);
			if (adapterEvents.size === 0) {
				logger.debug("ℹ️  No enabled adapters with event toggles found");
				return;
			}
			const instrumentedEvents = await scanForInstrumentedEvents(projectRoot, scanPaths);
			logger.debug(`🔎 Found ${instrumentedEvents.size} instrumented event types: ${[...instrumentedEvents].join(", ")}`);
			const missingInstrumentation = [];
			for (const [adapterName, enabledEvents] of adapterEvents) for (const eventType of enabledEvents) if (!instrumentedEvents.has(eventType)) missingInstrumentation.push({
				adapter: adapterName,
				event: eventType
			});
			if (missingInstrumentation.length === 0) {
				logger.debug("✅ All enabled events are instrumented");
				return;
			}
			for (const { adapter, event } of missingInstrumentation) logger.warn(`⚠️  ${adapter}.${event} is enabled but '${event}' is never instrumented`);
			if (failOnMissing) throw new Error(`[event-instrumentation] ${missingInstrumentation.length} event(s) are enabled but not instrumented. Either add instrumentation or disable the event toggles in config.server.ts.`);
		}
	};
};

//#endregion
//#region src/plugins/buildMiddlewareRegistry.ts
/** Source filename for the middleware registry (project source). */
const MIDDLEWARE_REGISTRY_SOURCE_FILE = "middleware-registry.ts";
/** Subdirectory under build output where the compiled registry is written (must match server/index.ts expectations). */
const SERVER_OUT_SUBDIR = "server";
/**
* Vite plugin that builds the middleware registry file for production.
*
* This plugin reads the template's middleware registry from the app's server directory
* (e.g. `src/server/middleware-registry.ts` when appDirectory is `./src`) and compiles it
* into the build output's server directory so the production server (Managed Runtime)
* can load the custom Express middlewares.
*
* Compilation uses tsdown (single TypeScript file → ESM) instead of a full Vite build.
* Paths are derived from the React Router plugin context (appDirectory, buildDirectory)
* when available; there are no env vars for these paths in this package.
*
* If the middleware registry file does not exist, the plugin silently skips the build step.
*
* @returns {Plugin} A Vite plugin that compiles the middleware registry for production
*
* @example
* // In vite.config.ts
* export default defineConfig({
*   plugins: [
*     buildMiddlewareRegistryPlugin()
*   ]
* })
*/
const buildMiddlewareRegistryPlugin = () => {
	let resolvedConfig;
	let buildDirectory;
	/** App source directory (e.g. 'src' or './src') from React Router config. */
	let appDirectory;
	return {
		name: "storefront-next:build-middleware-registry",
		apply: "build",
		configResolved(config) {
			resolvedConfig = config;
			const rr = config.__reactRouterPluginContext?.reactRouterConfig ?? {};
			buildDirectory = rr.buildDirectory ?? resolve$1(config.root, "build");
			appDirectory = rr.appDirectory ?? "src";
		},
		buildApp: {
			order: "post",
			handler: async () => {
				const projectRoot = resolvedConfig.root;
				const middlewareRegistryPath = resolve$1(projectRoot, appDirectory, SERVER_OUT_SUBDIR, MIDDLEWARE_REGISTRY_SOURCE_FILE);
				if (!existsSync(middlewareRegistryPath)) return;
				const { build } = await import("tsdown");
				const serverOutDir = resolve$1(projectRoot, buildDirectory, SERVER_OUT_SUBDIR);
				await build({
					cwd: projectRoot,
					entry: { [MIDDLEWARE_REGISTRY_SOURCE_FILE.replace(/\.ts$/, "")]: middlewareRegistryPath },
					outDir: serverOutDir,
					format: ["esm"],
					platform: "node",
					outExtensions: () => ({
						js: ".mjs",
						dts: ".d.ts"
					}),
					dts: false,
					clean: false,
					hash: false,
					noExternal: [/.*/],
					external: [/^node:/]
				});
			}
		}
	};
};

//#endregion
//#region src/plugins/platformEntry.ts
/**
* File extensions to search when detecting ejected entry files.
* Matches React Router's `entryExts` in its findEntry function.
*/
const ENTRY_EXTENSIONS = [
	".js",
	".jsx",
	".ts",
	".tsx",
	".mjs",
	".mts"
];
/**
* Query parameter appended to imports of ejected entry files within the
* generated composition code. This creates a distinct module ID so Vite
* treats it as a separate module from the one we intercept in `load`,
* breaking what would otherwise be a circular import.
*
* Vite natively handles query parameters on file imports — it strips the
* query for filesystem access but keeps it in the module ID for deduplication.
*/
const PASSTHROUGH_QUERY = "?platform-passthrough";
/**
* Finds a user-ejected entry file in the app directory.
* Returns the absolute path if found, undefined otherwise.
*/
function findUserEntry(appDirectory, basename$1) {
	for (const ext of ENTRY_EXTENSIONS) {
		const filePath = path.resolve(appDirectory, basename$1 + ext);
		if (fs$2.existsSync(filePath)) return filePath;
	}
}
/**
* Generates the virtual module code for the composed server entry.
*
* The generated module imports the app's entry (user-ejected or SDK default),
* passes it through composeServerEntry(), and re-exports all ServerEntryModule
* fields. This ensures platform features are always applied.
*/
function generateServerEntryCode(appEntryImportPath) {
	const importPath = JSON.stringify(toPosixPath(appEntryImportPath));
	return `
import * as _app from ${importPath};
import { composeServerEntry } from '@salesforce/storefront-next-dev/entry/server';

const _composed = composeServerEntry(_app);

// Forward all named exports from the app entry so that any future
// React Router exports are passed through without requiring a plugin update.
// Explicit exports below take precedence over star re-exports per ESM spec.
export * from ${importPath};

// Override with composed versions for exports the platform layer enhances.
export default _composed.default;
export const handleDataRequest = _composed.handleDataRequest;
export const handleError = _composed.handleError;
export const unstable_instrumentations = _composed.unstable_instrumentations;
export const streamTimeout = _composed.streamTimeout;
`.trim();
}
/**
* Generates the virtual module code for the composed client entry.
*
* Imports the platform client setup as a side-effect (runs before the app entry),
* then re-exports everything from the app's client entry.
*/
function generateClientEntryCode(appEntryImportPath) {
	return `
import '@salesforce/storefront-next-dev/entry/client';
export * from ${JSON.stringify(toPosixPath(appEntryImportPath))};
`.trim();
}
/**
* Vite plugin that composes platform-level features into React Router entry files.
*
* This plugin uses the `load` hook to replace entry file contents with generated
* composition code, while preserving the original file path as the module ID.
* This is critical because React Router's post-build manifest lookup uses the
* original entry file paths to find built chunks — changing the module ID (via
* `resolveId`) would break that lookup.
*
* The plugin supports two modes:
* - **Non-ejected:** No entry files in the app directory. The generated code
*   imports SDK default entries from `@salesforce/storefront-next-dev/entry/defaults/`.
* - **Ejected:** Customer has created their own entry file(s). The generated code
*   imports the customer's file (with a `?platform-passthrough` query to avoid
*   circular imports) and wraps it with the platform layer.
*
* In both cases, the platform composition layer is always present. New platform
* features ship via `npm update` by modifying the composition functions, without
* changes to the plugin or customer code.
*/
function platformEntryPlugin() {
	let isTestMode = false;
	let serverEntryFilePath;
	let clientEntryFilePath;
	let appDirectory;
	let userServerEntryPath;
	let userClientEntryPath;
	return {
		name: "storefront-next:platform-entry",
		enforce: "pre",
		config(_config, { mode }) {
			isTestMode = mode === "test";
		},
		configResolved(config) {
			if (isTestMode) return;
			const ctx = config.__reactRouterPluginContext;
			if (!ctx) return;
			appDirectory = ctx.reactRouterConfig.appDirectory;
			serverEntryFilePath = ctx.entryServerFilePath;
			clientEntryFilePath = ctx.entryClientFilePath;
			userServerEntryPath = findUserEntry(appDirectory, "entry.server");
			userClientEntryPath = findUserEntry(appDirectory, "entry.client");
		},
		load(id) {
			if (isTestMode || !serverEntryFilePath || !clientEntryFilePath || !appDirectory) return null;
			if (id.includes(PASSTHROUGH_QUERY)) return null;
			const idWithoutQuery = id.split("?")[0];
			if (path.normalize(idWithoutQuery) === path.normalize(serverEntryFilePath)) return generateServerEntryCode(userServerEntryPath ? userServerEntryPath + PASSTHROUGH_QUERY : serverEntryFilePath + PASSTHROUGH_QUERY);
			if (path.normalize(idWithoutQuery) === path.normalize(clientEntryFilePath)) return generateClientEntryCode(userClientEntryPath ? userClientEntryPath + PASSTHROUGH_QUERY : clientEntryFilePath + PASSTHROUGH_QUERY);
			return null;
		},
		configureServer(server) {
			if (isTestMode || !appDirectory) return;
			const appDir = appDirectory;
			const watcher = server.watcher;
			const checkEntryChange = (filePath) => {
				const relative$1 = path.relative(appDir, filePath);
				const basename$1 = path.basename(relative$1, path.extname(relative$1));
				if (path.dirname(relative$1) !== "." || basename$1 !== "entry.server" && basename$1 !== "entry.client") return;
				const ext = path.extname(relative$1);
				if (!ENTRY_EXTENSIONS.includes(ext)) return;
				const nowHasServer = findUserEntry(appDir, "entry.server") !== void 0;
				const nowHasClient = findUserEntry(appDir, "entry.client") !== void 0;
				if (nowHasServer !== (userServerEntryPath !== void 0) || nowHasClient !== (userClientEntryPath !== void 0)) server.restart();
			};
			watcher.on("add", checkEntryChange);
			watcher.on("unlink", checkEntryChange);
		}
	};
}

//#endregion
//#region src/plugins/workspace.ts
/**
* Vite plugin that automatically configures workspace-specific settings when
* SCAPI_PROXY_HOST is set. This includes:
* - Disabling DIS (Dynamic Imaging Service) via PUBLIC__app__images__enableDis
* - Adding dev server proxy rules for image paths (/dw/image, /on/demandware.static)
* - Allowing all hosts for the dev server (workspace proxies use dynamic hostnames)
*
* Environment variables:
* - `SCAPI_PROXY_HOST` — (Required) Base URL of the SCAPI proxy in workspace environments.
*    Enables workspace mode when set. Used as the proxy target for SCAPI requests and,
*    if JWEB_TARGET is not set, for static asset/image paths.
*    Example: `http://scw:25010`
* - `JWEB_TARGET` — (Optional) Separate proxy target for JWeb static asset paths
*    (`/dw/image`, `/on/demandware.static`). Falls back to SCAPI_PROXY_HOST if not set.
*    Example: `http://jweb:8080`
* - `PUBLIC__app__images__enableDis` — (Auto-set) Set to `'false'` when SCAPI_PROXY_HOST
*    is present, unless already explicitly configured. Controls whether the template
*    uses DIS for image format conversion and responsive srcsets.
*
* In workspace dev mode, this plugin also configures `optimizeDeps.entries` to scan all
* source files upfront. Without this, Vite discovers deps lazily per-route and invalidates
* the SSR module cache mid-session, leaving React in a partially-initialized state:
*   TypeError: Cannot read properties of null (reading 'useContext'/'useMemo')
*/
const workspacePlugin = () => {
	return {
		name: "storefront-next-workspace",
		config(_, { mode }) {
			const scapiProxyHost = process.env.SCAPI_PROXY_HOST;
			if (!scapiProxyHost) return;
			process.env.PUBLIC__app__images__enableDis ??= "false";
			if (mode !== "development") return;
			const jwebTarget = process.env.JWEB_TARGET;
			return {
				server: {
					allowedHosts: true,
					proxy: Object.fromEntries(["/dw/image", "/on/demandware.static"].map((path$2) => [path$2, {
						target: jwebTarget || scapiProxyHost,
						changeOrigin: true,
						secure: false
					}]))
				},
				optimizeDeps: { entries: [
					"./src/**/*.{ts,tsx}",
					"!./src/**/*.{test,spec}.{ts,tsx}",
					"!./src/**/*.stories.{ts,tsx}",
					"!./src/**/*-snapshot.tsx",
					"!./src/**/*.d.ts"
				] }
			};
		}
	};
};

//#endregion
//#region src/plugins/componentLoaders.ts
const traverse$1 = traverseModule.default || traverseModule;
const generate$1 = generate.default || generate;
/**
* Names of exports to strip per environment.
*
* - `loader` is server-only → strip from the **client** build
* - `clientLoader` is client-only → strip from the **server** build
*/
const STRIP_FROM_CLIENT = ["loader"];
const STRIP_FROM_SERVER = ["clientLoader"];
/**
* Determines which export names should be stripped for a given Vite environment.
*/
function getExportsToStrip(environmentName) {
	if (environmentName === "client") return STRIP_FROM_CLIENT;
	if (environmentName === "ssr") return STRIP_FROM_SERVER;
	return [];
}
/**
* Returns `true` when the source code contains at least one of the given export names as a quick pre-check before
* running the full AST transform.
*/
function hasExportCandidate(code, names) {
	return names.some((name) => code.includes(name));
}
/**
* Checks whether the AST contains at least one class declaration decorated with `@Component(…)`.
*/
function hasComponentDecorator(ast) {
	let found = false;
	traverse$1(ast, { ClassDeclaration(path$2) {
		const decorators = path$2.node.decorators;
		if (!decorators) return;
		for (const decorator of decorators) if (decorator.expression.type === "CallExpression" && isIdentifier(decorator.expression.callee) && decorator.expression.callee.name === "Component") {
			found = true;
			path$2.stop();
			return;
		}
	} });
	return found;
}
/**
* Strips the specified named exports from the given source code using a
* Babel AST transform.
*
* The transform handles the following patterns:
*
* 1. `export const loader = …;`
* 2. `export function loader(…) {…}`
* 3. `export class Loader {…}`
* 4. `export { loader }` / `export { foo as loader }`
* 5. `export { loader } from './loaders'`
*
* Destructured exports (`export const { loader } = …` or
* `export const [loader] = …`) cannot be safely removed and will
* throw an error if encountered (matching React Router behaviour).
*
* After removing an export, the transform also:
* - Removes top-level property assignments to the stripped export
*   (e.g. `clientLoader.hydrate = true`)
* - Removes any import declarations that become unused as a result
*
* @see {@link https://github.com/remix-run/react-router/blob/main/packages/react-router-dev/vite/remove-exports.ts React Router remove-exports}
* @returns The transformed source code, or `null` if nothing was changed.
*/
function stripExports(code, exportsToStrip, preParsedAst) {
	const ast = preParsedAst ?? parse(code, {
		sourceType: "module",
		plugins: [
			"typescript",
			"jsx",
			"decorators"
		]
	});
	let changed = false;
	const previouslyReferencedIdentifiers = findReferencedIdentifiers(ast);
	const removedExportLocalNames = /* @__PURE__ */ new Set();
	traverse$1(ast, { ExportNamedDeclaration(path$2) {
		const { declaration, specifiers } = path$2.node;
		if (declaration && isVariableDeclaration(declaration)) {
			const remaining = declaration.declarations.filter((decl) => {
				if (isIdentifier(decl.id) && exportsToStrip.includes(decl.id.name)) {
					removedExportLocalNames.add(decl.id.name);
					return false;
				}
				if (isArrayPattern(decl.id) || isObjectPattern(decl.id)) validateDestructuredExports(decl.id, exportsToStrip);
				return true;
			});
			if (remaining.length < declaration.declarations.length) {
				changed = true;
				if (remaining.length === 0) {
					removeLeadingEslintDisableComment(path$2);
					path$2.remove();
				} else declaration.declarations = remaining;
			}
			return;
		}
		if (declaration && isFunctionDeclaration(declaration)) {
			if (declaration.id && exportsToStrip.includes(declaration.id.name)) {
				changed = true;
				removedExportLocalNames.add(declaration.id.name);
				removeLeadingEslintDisableComment(path$2);
				path$2.remove();
				return;
			}
		}
		if (declaration && isClassDeclaration(declaration)) {
			if (declaration.id && exportsToStrip.includes(declaration.id.name)) {
				changed = true;
				removedExportLocalNames.add(declaration.id.name);
				removeLeadingEslintDisableComment(path$2);
				path$2.remove();
				return;
			}
		}
		if (specifiers.length > 0) {
			const remaining = specifiers.filter((spec) => {
				if (isExportSpecifier(spec)) {
					const exportedName = isIdentifier(spec.exported) ? spec.exported.name : spec.exported.value;
					if (exportsToStrip.includes(exportedName)) {
						removedExportLocalNames.add(spec.local.name);
						return false;
					}
				}
				return true;
			});
			if (remaining.length < specifiers.length) {
				changed = true;
				if (remaining.length === 0) {
					removeLeadingEslintDisableComment(path$2);
					path$2.remove();
				} else path$2.node.specifiers = remaining;
			}
		}
	} });
	if (changed) traverse$1(ast, { ExpressionStatement(path$2) {
		if (!path$2.parentPath?.isProgram()) return;
		if (path$2.node.expression.type === "AssignmentExpression") {
			const left = path$2.node.expression.left;
			if (isMemberExpression(left) && isIdentifier(left.object) && (exportsToStrip.includes(left.object.name) || removedExportLocalNames.has(left.object.name))) {
				removeLeadingEslintDisableComment(path$2);
				path$2.remove();
			}
		}
	} });
	if (changed) deadCodeElimination(ast, previouslyReferencedIdentifiers);
	if (!changed) return null;
	return generate$1(ast, { retainLines: true }, code).code;
}
/**
* Validates that no destructured export patterns contain names that should
* be stripped. Destructured exports cannot be safely removed, so we throw
* an error instead (matching React Router behaviour).
*/
function validateDestructuredExports(id, exportsToStrip) {
	if (isArrayPattern(id)) for (const element of id.elements) {
		if (!element) continue;
		if (isIdentifier(element) && exportsToStrip.includes(element.name)) throw new Error(`Cannot remove destructured export "${element.name}"`);
		if (isRestElement(element) && isIdentifier(element.argument) && exportsToStrip.includes(element.argument.name)) throw new Error(`Cannot remove destructured export "${element.argument.name}"`);
		if (isArrayPattern(element) || isObjectPattern(element)) validateDestructuredExports(element, exportsToStrip);
	}
	if (isObjectPattern(id)) for (const property of id.properties) {
		if (!property) continue;
		if (isObjectProperty(property) && isIdentifier(property.key)) {
			if (isIdentifier(property.value) && exportsToStrip.includes(property.value.name)) throw new Error(`Cannot remove destructured export "${property.value.name}"`);
			if (isArrayPattern(property.value) || isObjectPattern(property.value)) validateDestructuredExports(property.value, exportsToStrip);
		}
		if (isRestElement(property) && isIdentifier(property.argument) && exportsToStrip.includes(property.argument.name)) throw new Error(`Cannot remove destructured export "${property.argument.name}"`);
	}
}
/**
* Removes a leading `// eslint-disable-next-line …` comment that sits on
* the line immediately before the given path.
*/
function removeLeadingEslintDisableComment(path$2) {
	const leadingComments = path$2.node.leadingComments;
	if (!leadingComments || leadingComments.length === 0) return;
	const last = leadingComments[leadingComments.length - 1];
	if (last.type === "CommentLine" && last.value.includes("eslint-disable")) leadingComments.pop();
}
/**
* Vite plugin that strips environment-specific loader exports from
* component modules.
*
* Following the React Router convention:
* - `export const loader` → server-only, stripped from the **client** bundle
* - `export const clientLoader` → client-only, stripped from the **server** bundle
*
* This ensures that server-only code (e.g. API calls, database access) is
* never included in the client bundle, and vice versa.
*
* The plugin only processes files that:
* 1. Are under the configured `componentPath` directory
* 2. Contain a `@Component` decorator (i.e. are Page Designer components)
* 3. Are not test or story files
*/
function componentLoadersPlugin(config = {}) {
	const { componentPath = "src/components" } = config;
	let isTestMode = false;
	return {
		name: "storefrontnext:component-loaders",
		enforce: "pre",
		configResolved(resolvedConfig) {
			isTestMode = resolvedConfig.mode === "test";
		},
		transform(code, id) {
			if (isTestMode) return null;
			if (!id.includes(componentPath)) return null;
			if (!/\.[mc]?[jt]sx?$/.test(id)) return null;
			if (/\.(test|spec|stories)\.[jt]sx?$/.test(id)) return null;
			const environmentName = this.environment?.name;
			if (!environmentName) return null;
			const exportsToStrip = getExportsToStrip(environmentName);
			if (exportsToStrip.length === 0) return null;
			if (!hasExportCandidate(code, exportsToStrip)) return null;
			const ast = parse(code, {
				sourceType: "module",
				plugins: [
					"typescript",
					"jsx",
					"decorators"
				]
			});
			if (!hasComponentDecorator(ast)) return null;
			const transformed = stripExports(code, exportsToStrip, ast);
			if (!transformed) return null;
			return {
				code: transformed,
				map: null
			};
		}
	};
}

//#endregion
//#region src/plugins/ssrSourcemapFix.ts
const INLINE_SOURCEMAP_PREFIX = "//# sourceMappingURL=data:application/json;base64,";
/**
* Vite plugin that fixes SSR sourcemap `sources` to use full module paths
* instead of bare basenames.
*
* **Problem:** When the React Router `v8_viteEnvironmentApi` future flag is
* enabled, SSR modules are evaluated by Vite's Environment API module runner.
* Vite's `ssrTransform` generates inline sourcemaps with
* `sources: [path.basename(url)]` (e.g., `"search.tsx"` or `"index.tsx"`).
* V8's debugger cannot resolve bare basenames back to files on disk, so
* Chrome DevTools (via `--inspect`) displays the wrong source file content
* when pausing at breakpoints — even for files with unique names.
*
* **Why `fetchModule`:** A Vite transform plugin cannot fix this because
* `ssrTransform` runs *after* the plugin transform pipeline and overwrites
* `map.sources` with `[path.basename(url)]`. The only viable interception
* point is `fetchModule` — the public API method on `DevEnvironment` that
* returns the final transformed code (with inline sourcemaps already embedded)
* to the module runner.
*
* **Removable:** If Vite updates `ssrTransform` to use full paths instead of
* `path.basename()`, this plugin can be deleted with no other changes.
*
* Only active in development mode (`configureServer` does not run in build).
*/
function ssrSourcemapFixPlugin() {
	return {
		name: "storefront-next:ssr-sourcemap-fix",
		configureServer(server) {
			const ssrEnv = server.environments.ssr;
			if (!ssrEnv) return;
			const originalFetchModule = ssrEnv.fetchModule.bind(ssrEnv);
			ssrEnv.fetchModule = async (id, importer, options) => {
				const result = await originalFetchModule(id, importer, options);
				if (!result || "externalize" in result || "cache" in result || !("code" in result)) return result;
				const smIndex = result.code.lastIndexOf(INLINE_SOURCEMAP_PREFIX);
				if (smIndex === -1) return result;
				try {
					const base64Start = smIndex + 50;
					const base64End = result.code.indexOf("\n", base64Start);
					const base64Data = base64End === -1 ? result.code.slice(base64Start).trim() : result.code.slice(base64Start, base64End).trim();
					const mapJson = JSON.parse(Buffer.from(base64Data, "base64").toString("utf-8"));
					if (!mapJson.sources || !Array.isArray(mapJson.sources)) return result;
					const fileId = result.file || result.id;
					if (!fileId) return result;
					if (mapJson.sources.length !== 1) return result;
					const source = mapJson.sources[0];
					if (!source || source.includes("/")) return result;
					mapJson.sources = [fileId];
					const patchedBase64 = Buffer.from(JSON.stringify(mapJson)).toString("base64");
					result.code = result.code.slice(0, base64Start) + patchedBase64 + (base64End === -1 ? "" : result.code.slice(base64End));
				} catch {}
				return result;
			};
		}
	};
}

//#endregion
//#region src/storefront-next-targets.ts
/**
* Storefront Next Vite plugin that powers the React Router app.
* Supports building and optimizing for the managed runtime environment.
*
* @param config - Configuration options for the plugin
* @returns {Plugin[]} An array of Vite plugins for Storefront Next functionality
*
* @example
* // With default options
* export default defineConfig({
*   plugins: [storefrontNextTargets()]
* })
*
* @example
* // Disable readable chunk names
* export default defineConfig({
*   plugins: [storefrontNextTargets({ readableChunkNames: false })]
* })
*/
function storefrontNextTargets(config = {}) {
	const { readableChunkNames = false, staticRegistry = {
		componentPath: "",
		registryPath: ""
	}, eventInstrumentationValidator = {
		configPath: "config.server.ts",
		scanPaths: ["src"],
		failOnMissing: false
	} } = config;
	const plugins = [
		...process.env.SCAPI_PROXY_HOST ? [workspacePlugin()] : [],
		managedRuntimeBundlePlugin(),
		fixReactRouterManifestUrlsPlugin(),
		patchReactRouterPlugin(),
		platformEntryPlugin(),
		transformTargetPlaceholderPlugin(),
		watchConfigFilesPlugin(),
		buildMiddlewareRegistryPlugin(),
		ssrSourcemapFixPlugin()
	];
	if (staticRegistry?.componentPath && staticRegistry?.registryPath) {
		plugins.push(staticRegistryPlugin(staticRegistry));
		plugins.push(componentLoadersPlugin({ componentPath: staticRegistry.componentPath }));
	}
	if (eventInstrumentationValidator !== false) plugins.push(eventInstrumentationValidatorPlugin(eventInstrumentationValidator));
	if (readableChunkNames) plugins.push(readableChunkFileNamesPlugin());
	return plugins;
}

//#endregion
//#region src/plugins/uiTargetDevMode.ts
const traverse = traverseModule.default || traverseModule;
const UI_TARGET_JSX_RE = /<UITarget[\s/>]/;
/**
* Vite plugin that adds visual markers to UITarget components in development.
*
* PRODUCTION: This plugin is completely inactive - zero overhead.
* DEVELOPMENT: Transforms UITarget JSX to add visual debugging markers.
*
* @example
* // Source code:
* <UITarget targetId="pdp.loyalty.badge">
*   <Widget />
* </UITarget>
*
* // Transformed in DEV mode:
* <UITargetDevMarker
*   targetId="pdp.loyalty.badge"
*   __file__="/src/components/product.tsx"
*   __hasChildren__={true}
* >
*   <Widget />
* </UITargetDevMarker>
*/
function uiTargetDevModePlugin(config = {}) {
	if (process.env.NODE_ENV === "production") return { name: "storefront-next:ui-target-dev-mode-noop" };
	if (!(config.enabled ?? process.env.VITE_UI_TARGET_DEV_MODE === "true")) return { name: "storefront-next:ui-target-dev-mode-disabled" };
	logger.info("🎯 UITarget Dev Mode enabled");
	if (config.filterCategory) logger.info(`   Filtering to category: ${config.filterCategory} (build-time)`);
	return {
		name: "storefront-next:ui-target-dev-mode",
		enforce: "pre",
		transform(code, id) {
			if (!id.match(/\.(tsx|jsx)$/)) return null;
			if (id.includes("node_modules")) return null;
			if (id.includes("/targets/ui-target.tsx")) return null;
			if (!UI_TARGET_JSX_RE.test(code) || !code.includes("from '@/targets/ui-target'")) return null;
			try {
				const ast = parse(code, {
					sourceType: "module",
					plugins: [
						"typescript",
						"jsx",
						"decorators-legacy"
					]
				});
				let hasTransforms = false;
				const targetIds = [];
				traverse(ast, { JSXElement(path$2) {
					const openingElement = path$2.node.openingElement;
					if (!isJSXIdentifier(openingElement.name) || openingElement.name.name !== "UITarget") return;
					const targetIdAttr = openingElement.attributes.find((attr) => isJSXAttribute(attr) && isJSXIdentifier(attr.name) && attr.name.name === "targetId");
					if (!targetIdAttr) {
						logger.warn(`UITarget without targetId in ${id}`);
						return;
					}
					const targetId = isStringLiteral(targetIdAttr.value) ? targetIdAttr.value.value : null;
					if (!targetId) {
						logger.warn(`UITarget with non-string targetId in ${id}`);
						return;
					}
					if (config.filterCategory && !targetId.startsWith(`${config.filterCategory}.`)) return;
					const hasChildren = path$2.node.children.length > 0;
					openingElement.name = jsxIdentifier("UITargetDevMarker");
					if (path$2.node.closingElement) path$2.node.closingElement.name = jsxIdentifier("UITargetDevMarker");
					const hint = config.hintMap?.[targetId];
					openingElement.attributes.push(jsxAttribute(jsxIdentifier("__file__"), stringLiteral(id)), jsxAttribute(jsxIdentifier("__hasChildren__"), jsxExpressionContainer(booleanLiteral(hasChildren))), ...hint ? [jsxAttribute(jsxIdentifier("__hint__"), stringLiteral(hint))] : []);
					hasTransforms = true;
					targetIds.push(targetId);
				} });
				if (!hasTransforms) return null;
				const devMarkerImport = importDeclaration([importSpecifier(identifier("UITargetDevMarker"), identifier("UITargetDevMarker"))], stringLiteral("@/lib/ui-target-dev-mode/marker"));
				ast.program.body.unshift(devMarkerImport);
				const output = generate(ast, {
					retainLines: true,
					compact: false
				}, code);
				logger.debug(`Transformed ${targetIds.length} targets in ${id.split("/").pop()}`);
				return {
					code: output.code,
					map: output.map
				};
			} catch (error) {
				logger.error(`Failed to transform UITarget in ${id}:`, error);
				return null;
			}
		}
	};
}

//#endregion
//#region src/plugins/hybridProxy.ts
/**
* Check if a request path should skip proxying (Vite internals, assets, etc.)
*
* @param pathname - URL pathname to check
* @returns true if the request should NOT be proxied
*/
function shouldSkipProxy(pathname) {
	if (pathname.startsWith("/@")) return true;
	if (pathname.startsWith("/__")) return true;
	if (pathname.startsWith("/src/")) return true;
	if (pathname.startsWith("/node_modules/")) return true;
	if (pathname.endsWith(".data")) return true;
	if (pathname.startsWith("/mobify/")) return true;
	if (pathname.startsWith("/on/demandware.")) return false;
	if (/\.(js|jsx|ts|tsx|css|json|map|woff2?|ttf|svg|png|jpe?g|gif|webp|ico|mp4)$/i.test(pathname)) return true;
	return false;
}
/**
* Rewrite Set-Cookie header for localhost development.
*
* Rewrites SFCC Set-Cookie headers so they work on localhost during local development.
*
* **LOCAL DEVELOPMENT ONLY** — This function is part of the hybrid proxy Vite plugin
* which only runs during `pnpm dev`. In production (MRT deployments), SFCC cookies
* flow through the eCDN unmodified.
*
* Rewrites applied:
* - **Domain**: `.salesforce.com` → `localhost` (browsers reject cross-domain cookies)
*
* Attributes intentionally preserved:
* - **Secure**: Kept. Localhost is a secure context — browsers accept `Secure` cookies
*   on `http://localhost` (see https://w3c.github.io/webappsec-secure-contexts/).
* - **SameSite**: Kept. `SameSite=None; Secure` is valid on localhost since `Secure`
*   is accepted. This keeps SFCC cookies transparent and in sync with Storefront Next
*   cookies, which is critical for hybrid auth session bridging.
*
* @param cookie - Original Set-Cookie header value from SFCC
* @returns Rewritten cookie suitable for localhost
*
* @example
* Input:  "dwsid=abc123; Domain=.salesforce.com; Path=/; Secure; SameSite=None; HttpOnly"
* Output: "dwsid=abc123; Domain=localhost; Path=/; Secure; SameSite=None; HttpOnly"
*/
function rewriteCookieForLocalhost(cookie) {
	let rewritten = cookie;
	rewritten = rewritten.replace(/Domain=[^;]+/gi, "Domain=localhost");
	if (!/Domain=/i.test(cookie)) rewritten = rewritten.replace(/^([^;]+)/, "$1; Domain=localhost");
	return rewritten.trim();
}
/**
* Inline script injected into proxied HTML responses to intercept `document.cookie` writes.
*
* **Why this is needed (Layer 3 cookie rewriting):**
*
* The hybrid proxy rewrites Set-Cookie headers from SFCC responses (Layer 1), but after
* the SFRA page fully loads, client-side JavaScript sets cookies via `document.cookie`.
* These writes bypass the proxy entirely.
*
* SFRA's JS typically checks `window.location.protocol` to decide whether to add `Secure`.
* On `http://localhost`, it sees `http:` and omits `Secure`, producing cookies like:
*
*     document.cookie = "dwsid=abc; SameSite=None"   // No Secure → browser rejects
*
* This interceptor patches `document.cookie` to:
* 1. Rewrite `Domain=...` → `Domain=localhost`
* 2. Ensure `Secure` is present (localhost is a secure context)
* 3. If `SameSite=None` is present without `Secure`, add `Secure`
*
* This keeps client-side cookie writes consistent with the proxy's Layer 1 rewrites
* and ensures hybrid auth cookies (dwsid, cc-*) stay in sync between Storefront Next
* and SFRA.
*
* **LOCAL DEVELOPMENT ONLY** — This script is only injected by the Vite dev server proxy.
*/
const COOKIE_INTERCEPTOR_SCRIPT = `<script data-hybrid-proxy="cookie-interceptor">
(function() {
    var desc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    if (!desc || !desc.set) return;
    Object.defineProperty(document, 'cookie', {
        get: function() { return desc.get.call(this); },
        set: function(val) {
            // Rewrite Domain to localhost
            val = val.replace(/Domain=[^;]+/gi, 'Domain=localhost');
            // Ensure Secure is present if SameSite=None (localhost is a secure context)
            if (/SameSite=None/i.test(val) && !/;\\s*Secure\\b/i.test(val)) {
                val += '; Secure';
            }
            desc.set.call(this, val);
        },
        configurable: true
    });
})();
<\/script>`;
/**
* Escape special regex characters in a string for use in `new RegExp()`.
*/
function escapeRegExp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
* Vite plugin for hybrid proxying between Storefront Next and legacy SFRA.
*
* Uses http-proxy to silently forward non-matching requests to SFCC without visible
* redirects. Rewrites Set-Cookie headers, Location headers, and HTML/JSON response
* bodies to keep all navigation within the localhost proxy.
*
* Routing decisions are delegated to the `routeMatcher` callback injected via options,
* keeping the SDK free of template-specific routing logic.
*
* @param options - Plugin configuration
* @returns Vite plugin
*/
function hybridProxyPlugin(options) {
	if (!options.enabled) {
		logger.debug("Hybrid proxy disabled (HYBRID_PROXY_ENABLED is not true)");
		return { name: "hybrid-proxy" };
	}
	if (!options.targetOrigin) {
		logger.warn("Hybrid proxy: no target origin configured (SFCC_ORIGIN required)");
		return { name: "hybrid-proxy" };
	}
	logger.info(`Hybrid proxy enabled → ${options.targetOrigin}`);
	logger.debug(`Hybrid proxy routing rules: ${options.routingRules.slice(0, 100)}...`);
	const locale = options.locale || "default";
	logger.debug(`Hybrid proxy path transformation: / → /s/${options.siteId}, /path → /s/${options.siteId}/${locale}/path`);
	const targetOriginPattern = new RegExp(escapeRegExp(options.targetOrigin), "g");
	const proxy = httpProxy.createProxyServer({
		changeOrigin: true,
		followRedirects: false,
		selfHandleResponse: true
	});
	proxy.on("proxyReq", (proxyReq, req) => {
		const url = new URL(req.url || "", `http://${req.headers.host}`);
		const pathname = url.pathname;
		if (!pathname.startsWith("/s/") && !pathname.startsWith("/on/demandware.")) {
			const originalPath = proxyReq.path;
			/**
			* "/" maps to the SFRA/SiteGenesis site root — no locale in the path
			* This would simply proxy to SFCC hostname (eg.: https://zzrf-001.dx.commercecloud.salesforce.com/s/{siteId}/{locale}/) which is not a valid storefront URL.
			* We need to rewrite the path to /s/{siteId} so that it can be proxied to the correct SFCC URL.
			*/
			if (pathname === "/") proxyReq.path = `/s/${options.siteId}${url.search}`;
			else proxyReq.path = `/s/${options.siteId}/${locale}${pathname}${url.search}`;
			logger.debug(`Hybrid proxy path rewrite: ${originalPath} → ${proxyReq.path}`);
		}
	});
	proxy.on("proxyRes", (proxyRes, req, res) => {
		const clientRes = res;
		const locationHeader = proxyRes.headers.location;
		const statusCode = proxyRes.statusCode || 200;
		if (statusCode >= 300 && statusCode < 400 && typeof locationHeader === "string" && /\/404\b/.test(locationHeader)) {
			logger.warn(`⚠️  SFCC returned a redirect to 404 for ${req.url}. This usually means your HYBRID_ROUTING_RULES are missing a pattern for this path. Stripping Set-Cookie headers to prevent session cookie corruption. Fix: add a matching pattern to HYBRID_ROUTING_RULES (e.g., "^${req.url?.split("?")[0]}.*")`);
			delete proxyRes.headers["set-cookie"];
		}
		const setCookieHeaders = proxyRes.headers["set-cookie"];
		if (setCookieHeaders && Array.isArray(setCookieHeaders)) proxyRes.headers["set-cookie"] = setCookieHeaders.map((cookie) => {
			const rewritten = rewriteCookieForLocalhost(cookie);
			logger.debug(`Hybrid proxy cookie rewrite: ${cookie.slice(0, 50)}... → ${rewritten.slice(0, 50)}...`);
			return rewritten;
		});
		if (locationHeader && typeof locationHeader === "string") try {
			const locationUrl = new URL(locationHeader, options.targetOrigin);
			if (locationUrl.origin === options.targetOrigin) {
				const localUrl = `http://${req.headers.host}${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`;
				proxyRes.headers.location = localUrl;
				logger.debug(`Hybrid proxy location rewrite: ${locationHeader} → ${localUrl}`);
			}
		} catch {
			logger.warn(`Hybrid proxy: invalid Location header: ${locationHeader}`);
		}
		const contentType = (proxyRes.headers["content-type"] || "").split(";")[0].trim();
		if (!(contentType === "text/html" || contentType === "application/json")) {
			clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
			proxyRes.pipe(clientRes);
			return;
		}
		const chunks = [];
		proxyRes.on("data", (chunk) => chunks.push(chunk));
		proxyRes.on("end", () => {
			let body = Buffer.concat(chunks);
			const encoding = proxyRes.headers["content-encoding"];
			if (encoding === "gzip") body = gunzipSync(body);
			else if (encoding === "br") body = brotliDecompressSync(body);
			else if (encoding === "deflate") body = inflateSync(body);
			const proxyOrigin = `http://${req.headers.host}`;
			let text = body.toString("utf8");
			targetOriginPattern.lastIndex = 0;
			text = text.replace(targetOriginPattern, proxyOrigin);
			if (contentType === "text/html") {
				const headIndex = text.indexOf("<head");
				if (headIndex !== -1) {
					const insertAfter = text.indexOf(">", headIndex);
					if (insertAfter !== -1) text = text.slice(0, insertAfter + 1) + COOKIE_INTERCEPTOR_SCRIPT + text.slice(insertAfter + 1);
				}
			}
			const headers = { ...proxyRes.headers };
			delete headers["content-encoding"];
			delete headers["transfer-encoding"];
			headers["content-length"] = String(Buffer.byteLength(text, "utf8"));
			clientRes.writeHead(proxyRes.statusCode || 200, headers);
			clientRes.end(text);
			logger.debug(`Hybrid proxy rewrote ${contentType} body URLs for ${req.url}`);
		});
	});
	proxy.on("error", (err, req, res) => {
		logger.error(`Hybrid proxy error: ${err.message} ${req.url}`);
		if ("writeHead" in res && !res.headersSent) {
			res.writeHead(502, { "Content-Type": "text/plain" });
			res.end("Bad Gateway: Failed to proxy to SFCC");
		}
	});
	return {
		name: "hybrid-proxy",
		enforce: "pre",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const pathname = req.url?.split("?")[0] || "";
				if (shouldSkipProxy(pathname)) return next();
				const isSFCCPath = pathname.startsWith("/on/demandware.");
				let shouldRouteToNextApp = false;
				if (!isSFCCPath) {
					try {
						shouldRouteToNextApp = options.routeMatcher(pathname, options.routingRules);
					} catch (error) {
						logger.error(`Hybrid proxy error checking routing rules: ${String(error)}`);
						return next();
					}
					if (shouldRouteToNextApp) return next();
				}
				logger.debug(`Hybrid proxy: ${req.method} ${pathname} → ${options.targetOrigin}`);
				try {
					proxy.web(req, res, { target: options.targetOrigin });
				} catch (error) {
					logger.error(`Hybrid proxy failed to proxy request: ${String(error)}`);
					if (!res.headersSent) {
						res.writeHead(502, { "Content-Type": "text/plain" });
						res.end("Bad Gateway: Failed to proxy to SFCC");
					}
				}
			});
		}
	};
}

//#endregion
//#region src/plugins/ecdnMatcher.ts
/**
* Cloudflare eCDN Routing Rule Matcher
*
* Parses Cloudflare-style routing expressions and tests pathnames against them.
* This utility is environment-agnostic and works in both Node.js and browser contexts.
*
* @example
* ```typescript
* const rules = '(http.request.uri.path matches "^/$" or http.request.uri.path matches "^/search.*")';
* shouldRouteToNext('/', rules);          // true - route to Storefront Next
* shouldRouteToNext('/search', rules);    // true - route to Storefront Next
* shouldRouteToNext('/checkout', rules);  // false - proxy to SFRA/legacy
* ```
*
* Environment variables used:
* - HYBRID_PROXY_ENABLED (optional) - Boolean flag to enable/disable hybrid proxy
* - HYBRID_ROUTING_RULES (optional) - Cloudflare routing expression string
* - SFCC_ORIGIN (optional) - Base URL for SFCC sandbox redirects
*/
const regexCache = /* @__PURE__ */ new Map();
/**
* Extracts regex patterns from a Cloudflare routing expression.
*
* Parses Cloudflare "matches" expressions like:
*   (http.request.uri.path matches "^/$" or http.request.uri.path matches "^/category.*")
*
* And extracts the regex patterns: ["^/$", "^/category.*"]
*
* @param expression - Cloudflare expression string
* @returns Array of regex pattern strings
*
* @example
* ```typescript
* extractPatterns('(http.request.uri.path matches "^/$")');
* // Returns: ["^/$"]
*
* extractPatterns('(http.request.uri.path matches "^/$" or http.request.uri.path matches "^/search.*")');
* // Returns: ["^/$", "^/search.*"]
* ```
*/
function extractPatterns(expression) {
	if (!expression || typeof expression !== "string") return [];
	const regex = /http\.request\.uri\.path\s+matches\s+["']([^"']+)["']/gi;
	const patterns = [];
	let match;
	while ((match = regex.exec(expression)) !== null) patterns.push(match[1]);
	return patterns;
}
/**
* Tests if a pathname matches any of the provided regex patterns (logical OR).
* Uses caching to optimize repeated pattern compilations.
*
* @param pathname - URL pathname to test (e.g., "/search", "/category/shoes")
* @param patterns - Array of regex pattern strings
* @returns true if pathname matches any pattern, false otherwise
*
* @example
* ```typescript
* testPatterns('/category/shoes', ['^/category.*', '^/search.*']);
* // Returns: true (matches first pattern)
*
* testPatterns('/checkout', ['^/category.*', '^/search.*']);
* // Returns: false (matches no patterns)
* ```
*/
function testPatterns(pathname, patterns) {
	if (!pathname || !patterns || patterns.length === 0) return false;
	for (const pattern of patterns) try {
		let regex = regexCache.get(pattern);
		if (!regex) {
			regex = new RegExp(pattern);
			regexCache.set(pattern, regex);
		}
		if (regex.test(pathname)) return true;
	} catch (error) {
		logger.warn(`Invalid regex pattern: ${pattern} ${String(error)}`);
		continue;
	}
	return false;
}
/**
* Main function: Determines if a pathname should route to Storefront Next
* or be proxied/redirected to SFRA/legacy backend.
*
* @param pathname - URL pathname (e.g., "/search", "/checkout")
* @param routingRules - Cloudflare routing expression string (optional)
* @returns true if should route to Storefront Next, false if should proxy to SFRA
*
* @example
* ```typescript
* const rules = '(http.request.uri.path matches "^/$" or http.request.uri.path matches "^/category.*")';
*
* shouldRouteToNext('/', rules);              // true - route to Next
* shouldRouteToNext('/category/mens', rules); // true - route to Next
* shouldRouteToNext('/checkout', rules);      // false - proxy to SFRA
* shouldRouteToNext('/any-path', undefined);  // true - no rules = default to Next
* ```
*/
function shouldRouteToNext(pathname, routingRules) {
	if (!routingRules) return true;
	const patterns = extractPatterns(routingRules);
	if (patterns.length === 0) {
		logger.warn("No valid patterns found in routing rules");
		return true;
	}
	return testPatterns(pathname, patterns);
}
/**
* Clears the regex cache. Useful for testing or when routing rules change.
*
* @example
* ```typescript
* clearCache();
* // All cached regex patterns are removed
* ```
*/
function clearCache() {
	regexCache.clear();
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
	const sortedAlias = {};
	Object.keys(alias).sort((a, b) => b.length - a.length).forEach((key) => {
		sortedAlias[key] = alias[key];
	});
	return sortedAlias;
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
	const proxy = process.env.PUBLIC__app__commerce__api__proxy || "/mobify/proxy/api";
	const proxyHost = process.env.SCAPI_PROXY_HOST;
	if (!shortCode && !proxyHost) throw new Error("Missing PUBLIC__app__commerce__api__shortCode environment variable.\nPlease set it in your .env file or environment.");
	if (!organizationId) throw new Error("Missing PUBLIC__app__commerce__api__organizationId environment variable.\nPlease set it in your .env file or environment.");
	if (!clientId) throw new Error("Missing PUBLIC__app__commerce__api__clientId environment variable.\nPlease set it in your .env file or environment.");
	return { commerce: { api: {
		shortCode: shortCode || "",
		organizationId,
		clientId,
		proxy,
		proxyHost
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
	const proxyHost = process.env.SCAPI_PROXY_HOST;
	if (!api.shortCode && !proxyHost) throw new Error("Missing shortCode in config.server.ts commerce.api configuration");
	if (!api.organizationId) throw new Error("Missing organizationId in config.server.ts commerce.api configuration");
	if (!api.clientId) throw new Error("Missing clientId in config.server.ts commerce.api configuration");
	return { commerce: { api: {
		shortCode: api.shortCode || "",
		organizationId: api.organizationId,
		clientId: api.clientId,
		proxy: api.proxy || "/mobify/proxy/api",
		proxyHost
	} } };
}

//#endregion
//#region src/config.ts
const SFNEXT_BASE_CARTRIDGE_NAME = "app_storefrontnext_base";
const SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR = `${SFNEXT_BASE_CARTRIDGE_NAME}/cartridge/experience`;

//#endregion
//#region src/server/middleware/proxy.ts
/**
* Create proxy middleware for Commerce Cloud API
* Proxies requests from /mobify/proxy/api to the Commerce Cloud API
*/
function createCommerceProxyMiddleware(config) {
	return createProxyMiddleware({
		target: getCommerceCloudApiUrl(config.commerce.api.shortCode, config.commerce.api.proxyHost),
		changeOrigin: true,
		secure: !config.commerce.api.proxyHost
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
	logger.info(`Serving static assets from ${clientBuildDir} at ${bundlePath}`);
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
		logger.warn(`[compression] Invalid COMPRESSION_LEVEL="${raw}". Using default (${DEFAULT}).`);
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
		const colors = {
			GET: chalk.green,
			POST: chalk.blue,
			PUT: chalk.yellow,
			DELETE: chalk.red,
			PATCH: chalk.magenta
		};
		return (method && colors[method] || chalk.white)(method);
	});
	return morgan((tokens, req, res) => {
		return [
			tokens["method-colored"](req, res),
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
//#region src/server/middleware/host-header.ts
/**
* Normalizes the X-Forwarded-Host header to support React Router's CSRF validation features.
*
* NOTE: This middleware performs header manipulation as a temporary, internal
* solution for MRT/Lambda environments. It may be updated or removed if React Router
* introduces a first-class configuration for validating against forwarded headers.
*
* React Router v7.12+ uses the X-Forwarded-Host header (preferring it over Host)
* to validate request origins for security. In Managed Runtime (MRT) with a vanity
* domain, the eCDN automatically sets the X-Forwarded-Host to the vanity domain.
* React Router handles cases where this header contains multiple comma-separated
* values by prioritizing the first entry.
*
* This middleware ensures that X-Forwarded-Host is always present by falling back
* to a configured public domain if the header is missing (e.g., local development).
* By only modifying X-Forwarded-Host, we provide a consistent environment for
* React Router's security checks without modifying the internal 'Host' header,
* which is required for environment-specific routing logic (e.g., Hybrid Proxy).
*
* Priority order:
* 1. X-Forwarded-Host: Automatically set by eCDN for vanity domains.
* 2. EXTERNAL_DOMAIN_NAME: Fallback environment variable for the public domain
*    used when no forwarded headers are present (e.g., local development).
*/
function createHostHeaderMiddleware() {
	return (req, _res, next) => {
		if (!req.get("x-forwarded-host") && process.env.EXTERNAL_DOMAIN_NAME) req.headers["x-forwarded-host"] = process.env.EXTERNAL_DOMAIN_NAME;
		next();
	};
}

//#endregion
//#region src/server/utils.ts
/**
* Patch React Router build to rewrite asset URLs with the correct bundle path
* This is needed because the build output uses /assets/ but we preview at /mobify/bundle/{BUNDLE_ID}/client/assets/
*/
function patchReactRouterBuild(build, bundleId) {
	const bundlePath = getBundlePath(bundleId);
	const basePath = getBasePath();
	const patchedAssetsJson = JSON.stringify(build.assets).replace(/"\/assets\//g, `"${bundlePath}assets/`);
	const newAssets = JSON.parse(patchedAssetsJson);
	return Object.assign({}, build, {
		publicPath: bundlePath,
		assets: newAssets,
		...basePath && { basename: basePath }
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
//#region src/otel/mrt-console-span-exporter.ts
var MrtConsoleSpanExporter = class extends ConsoleSpanExporter {
	export(spans, resultCallback) {
		for (const span of spans) try {
			const ctx = span.spanContext();
			const spanData = {
				traceId: ctx.traceId,
				parentId: span.parentSpanId,
				name: span.name,
				id: ctx.spanId,
				kind: span.kind,
				timestamp: hrTimeToTimeStamp(span.startTime),
				duration: span.duration,
				attributes: span.attributes,
				status: span.status,
				events: span.events,
				links: span.links,
				start_time: span.startTime,
				end_time: span.endTime,
				forwardTrace: process.env.SFNEXT_OTEL_ENABLED === "true"
			};
			console.info(JSON.stringify(spanData));
		} catch {}
		resultCallback({ code: ExportResultCode.SUCCESS });
	}
};

//#endregion
//#region src/otel/setup.ts
const SERVICE_NAME = "storefront-next";
/**
* Initializes OpenTelemetry and returns a Tracer from the provider directly.
*
* Returns the tracer via `provider.getTracer()` instead of the global
* `trace.getTracer()` API. In the Vite SSR module runner, the built
* dist/entry/server.js and the externalized @opentelemetry/sdk-trace-node
* resolve @opentelemetry/api to different module instances (different paths
* through pnpm's strict node_modules). Each instance has its own
* ProxyTracerProvider singleton, so `provider.register()` sets the delegate
* on sdk-trace-node's API instance while our code's `trace.getTracer()`
* reads from a separate API instance with no delegate — returning a tracer
* backed by a bare BasicTracerProvider with NoopSpanProcessor.
*
* Getting the tracer directly from the provider bypasses the global registry
* entirely, guaranteeing the tracer uses our configured span processors.
*/
let cachedTracer = null;
const UNDICI_REGISTERED_KEY = Symbol.for("sfnext.otel.undici_registered");
function initTelemetry() {
	if (cachedTracer) return cachedTracer;
	try {
		const provider = new NodeTracerProvider({ resource: new Resource({ [ATTR_SERVICE_NAME]: SERVICE_NAME }) });
		provider.addSpanProcessor(new SimpleSpanProcessor(new MrtConsoleSpanExporter()));
		provider.register();
		if (!globalThis[UNDICI_REGISTERED_KEY]) {
			globalThis[UNDICI_REGISTERED_KEY] = true;
			registerInstrumentations({
				tracerProvider: provider,
				instrumentations: [new UndiciInstrumentation({ requestHook(span, request) {
					try {
						const method = request.method.toUpperCase();
						const url = `${request.origin}${request.path}`;
						span.updateName(`${method} ${url}`);
					} catch {}
				} })]
			});
		}
		cachedTracer = provider.getTracer(SERVICE_NAME);
		return cachedTracer;
	} catch (error) {
		logger.error("[otel] Failed to initialize OpenTelemetry:", error);
		return null;
	}
}

//#endregion
//#region src/otel/express/middleware.ts
function createOtelExpressMiddleware() {
	const maybeTracer = initTelemetry();
	if (!maybeTracer) return (_req, _res, next) => next();
	const tracer = maybeTracer;
	return (req, res, next) => {
		try {
			const url = new URL(req.originalUrl || req.url, "http://localhost").pathname;
			const method = req.method;
			tracer.startActiveSpan(`[sfnext] server ${method} ${url}`, { attributes: {
				"http.request.method": method,
				"url.path": url
			} }, (serverSpan) => {
				try {
					const spanContext = trace.getSpan(context.active())?.spanContext();
					if (spanContext) {
						const flags = spanContext.traceFlags.toString(16).padStart(2, "0");
						const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`;
						res.setHeader("traceparent", traceparent);
					}
				} catch {}
				const serverCtx = context.active();
				const startTime = performance.now();
				let streamingSpan = null;
				let ttfbMs = 0;
				let ended = false;
				function recordTTFB() {
					if (streamingSpan) return;
					try {
						ttfbMs = Math.round(performance.now() - startTime);
						serverSpan.setAttribute("sfnext.ttfb_ms", ttfbMs);
						streamingSpan = tracer.startSpan(`[sfnext] response streaming ${method} ${url}`, { attributes: {
							"http.request.method": method,
							"url.path": url,
							"sfnext.ttfb_ms": ttfbMs
						} }, serverCtx);
					} catch {}
				}
				const origWriteHead = res.writeHead.bind(res);
				res.writeHead = ((...args) => {
					recordTTFB();
					return origWriteHead(...args);
				});
				const origWrite = res.write.bind(res);
				res.write = ((...args) => {
					recordTTFB();
					return origWrite(...args);
				});
				function endSpans() {
					if (ended) return;
					ended = true;
					try {
						const totalMs = Math.round(performance.now() - startTime);
						const statusCode = res.statusCode;
						if (streamingSpan) {
							streamingSpan.setAttribute("http.streaming_duration_ms", totalMs - ttfbMs);
							streamingSpan.setAttribute("http.response.status_code", statusCode);
							if (statusCode >= 500) streamingSpan.setStatus({ code: SpanStatusCode.ERROR });
							streamingSpan.end();
						}
						serverSpan.setAttribute("http.response.status_code", statusCode);
						serverSpan.setAttribute("http.total_duration_ms", totalMs);
						if (statusCode >= 500) serverSpan.setStatus({ code: SpanStatusCode.ERROR });
						serverSpan.end();
					} catch {}
				}
				res.once("close", endSpans);
				res.once("finish", endSpans);
				next();
			});
		} catch {
			next();
		}
	};
}

//#endregion
//#region src/server/handlers/health-check.ts
const DEFAULT_HEALTH_DESCRIPTION = "storefront-next-dev server health";
const PACKAGE_JSON_NAME = "package.json";
const RUNTIME_PACKAGE_NAME = "@salesforce/storefront-next-runtime";
const DEV_PACKAGE_NAME = "@salesforce/storefront-next-dev";
const BUILD_FOLDER_NAME = "build";
const LOCAL_BUNDLE_ID = "local";
const HEALTH_ENDPOINT_PATH = "/sfdc-health";
/**
* Reads a package.json file and returns selected metadata.
*
* @param path - Absolute path to a package.json file
* @returns Parsed metadata, or null if missing/unreadable
*
* @example
* ```ts
* const metadata = readPackageMetadata('/app/package.json');
* console.log(metadata?.version);
* ```
*/
function readPackageMetadata(path$2) {
	if (!existsSync$1(path$2)) return null;
	try {
		return JSON.parse(readFileSync$1(path$2, "utf8"));
	} catch (error) {
		logger.debug(`Health check: failed to parse package.json at ${path$2}`, error);
		return null;
	}
}
/**
* Creates an Express handler that returns Health+JSON for the project.
*
* @param options - Handler options
* @returns Express request handler for the health endpoint
*
* @example
* ```ts
* app.get(HEALTH_ENDPOINT_PATH, createHealthCheckHandler({
*     projectDirectory: process.cwd(),
*     bundleId: LOCAL_BUNDLE_ID,
* }));
* ```
*/
function createHealthCheckHandler(options) {
	const { projectDirectory, bundleId } = options;
	const projectPackage = readPackageMetadata(bundleId === LOCAL_BUNDLE_ID ? resolve(projectDirectory, PACKAGE_JSON_NAME) : resolve(projectDirectory, BUILD_FOLDER_NAME, PACKAGE_JSON_NAME));
	const allDependencies = {
		...projectPackage?.dependencies,
		...projectPackage?.devDependencies
	};
	const devVersion = allDependencies?.[DEV_PACKAGE_NAME];
	const runtimeVersion = allDependencies?.[RUNTIME_PACKAGE_NAME];
	const notes = [devVersion ? `Built using ${DEV_PACKAGE_NAME}@${devVersion}.` : null, runtimeVersion ? `Running ${RUNTIME_PACKAGE_NAME}@${runtimeVersion}.` : null].filter(Boolean);
	return (_req, res) => {
		const healthResponse = {
			status: "pass",
			version: projectPackage?.version,
			bundleId,
			description: projectPackage?.description ?? DEFAULT_HEALTH_DESCRIPTION,
			notes: notes.length > 0 ? notes : void 0
		};
		res.status(200).type("application/health+json").json(healthResponse);
	};
}

//#endregion
//#region src/server/index.ts
/** Relative path to the middleware registry TypeScript source (development). Must match appDirectory + server dir + filename used by buildMiddlewareRegistry plugin. */
const RELATIVE_MIDDLEWARE_REGISTRY_SOURCE = "src/server/middleware-registry.ts";
/** Extensions to try for the built middlewares module (ESM first, then CJS for backwards compatibility). */
const MIDDLEWARE_REGISTRY_BUILT_EXTENSIONS = [
	".mjs",
	".js",
	".cjs"
];
/** All paths to try when loading the built middlewares (base + extension). */
const RELATIVE_MIDDLEWARE_REGISTRY_BUILT_PATHS = ["bld/server/middleware-registry", "build/server/middleware-registry"].flatMap((base) => MIDDLEWARE_REGISTRY_BUILT_EXTENSIONS.map((ext) => `${base}${ext}`));
const DEFAULT_BUNDLE_ID = "local";
/**
* Create a unified Express server for development, preview, or production mode
*/
async function createServer(options) {
	const { mode, projectDirectory = process.cwd(), config: providedConfig, vite, build, streaming = false, enableProxy = ServerModeFeatureMap[mode].enableProxy, enableStaticServing = ServerModeFeatureMap[mode].enableStaticServing, enableCompression = ServerModeFeatureMap[mode].enableCompression, enableLogging = ServerModeFeatureMap[mode].enableLogging, enableAssetUrlPatching = ServerModeFeatureMap[mode].enableAssetUrlPatching } = options;
	if (mode === "development" && !vite) throw new Error("Vite dev server instance is required for development mode");
	if ((mode === "preview" || mode === "production") && !build) throw new Error("React Router server build is required for preview/production mode");
	const config = providedConfig ?? loadConfigFromEnv();
	const bundleId = process.env.BUNDLE_ID ?? DEFAULT_BUNDLE_ID;
	const app = express();
	app.disable("x-powered-by");
	if (process.env.SFNEXT_OTEL_ENABLED === "true") app.use(createOtelExpressMiddleware());
	app.get(HEALTH_ENDPOINT_PATH, createHealthCheckHandler({
		projectDirectory,
		bundleId
	}));
	if (enableLogging) app.use(createLoggingMiddleware());
	if (enableCompression && !streaming) app.use(createCompressionMiddleware());
	if (enableStaticServing && build) {
		const bundlePath = getBundlePath(bundleId);
		app.use(bundlePath, createStaticMiddleware(bundleId, projectDirectory));
	}
	let registry = null;
	if (mode === "development") {
		const middlewareRegistryPath = resolve(projectDirectory, RELATIVE_MIDDLEWARE_REGISTRY_SOURCE);
		if (existsSync$1(middlewareRegistryPath)) registry = await importTypescript(middlewareRegistryPath, { projectDirectory });
	} else {
		const possiblePaths = RELATIVE_MIDDLEWARE_REGISTRY_BUILT_PATHS.map((p) => resolve(projectDirectory, p));
		let builtRegistryPath = null;
		for (const path$2 of possiblePaths) if (existsSync$1(path$2)) {
			builtRegistryPath = path$2;
			break;
		}
		if (builtRegistryPath) registry = await import(pathToFileURL$1(builtRegistryPath).href);
	}
	if (registry?.customMiddlewares && Array.isArray(registry.customMiddlewares)) registry.customMiddlewares.forEach((entry) => {
		app.use(entry.handler);
	});
	if (mode === "development" && vite) app.use(vite.middlewares);
	if (enableProxy) app.use(config.commerce.api.proxy, createCommerceProxyMiddleware(config));
	const basePath = getBasePath();
	if (basePath) app.use((req, res, next) => {
		if (req.path.startsWith(`${basePath}/`) || req.path === basePath) return next();
		if (req.path.startsWith("/mobify/")) return next();
		res.redirect(`${basePath}${req.originalUrl}`);
	});
	app.use(createHostHeaderMiddleware());
	app.all("*splat", await createSSRHandler(mode, bundleId, vite, build, enableAssetUrlPatching));
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
					next(/* @__PURE__ */ new Error("SSR environment is not runnable. Please ensure:\n  1. \"@salesforce/storefront-next-dev\" plugin is added to vite.config.ts\n  2. React Router config uses the Storefront Next preset"));
					return;
				}
				await createRequestHandler({
					build: await ssrEnvironment.runner.import("virtual:react-router/server-build"),
					mode: process.env.NODE_ENV
				})(req, res, next);
			} catch (error) {
				vite.ssrFixStacktrace(error);
				next(error);
			}
		};
	} else if (build) {
		let patchedBuild = build;
		if (enableAssetUrlPatching) patchedBuild = patchReactRouterBuild(build, bundleId);
		const requestHandlerMode = process.env.NODE_OPTIONS?.includes("--enable-source-maps") ? "development" : process.env.NODE_ENV;
		return createRequestHandler({
			build: patchedBuild,
			mode: requestHandlerMode
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
const SINGLE_LINE_MARKER = "@sfdc-extension-line";
const BLOCK_MARKER_START = "@sfdc-extension-block-start";
const BLOCK_MARKER_END = "@sfdc-extension-block-end";
const FILE_MARKER = "@sfdc-extension-file";
function trimExtensions(directory, selectedExtensions, extensionConfig) {
	const startTime = Date.now();
	const configuredExtensions = extensionConfig?.extensions || {};
	const extensions = {};
	Object.keys(configuredExtensions).forEach((targetKey) => {
		extensions[targetKey] = Boolean(selectedExtensions?.[targetKey]) || false;
	});
	if (Object.keys(extensions).length === 0) {
		logger.debug("No targets found, skipping trim");
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
	logger.debug(`Trim extensions took ${endTime - startTime}ms`);
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
		if (!extMatch) logger.warn(`File ${filePath} is marked with ${markerLine} but it does not match any known extensions`);
		else if (extensions[extMatch] === false) {
			try {
				fs$1.unlinkSync(filePath);
				logger.debug(`Deleted file ${filePath}`);
			} catch (e) {
				const error = e;
				logger.error(`Error deleting file ${filePath}: ${error.message}`);
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
				} else logger.warn(`Unknown marker found in ${filePath} at line ${i}: \n${line}`);
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
			logger.debug(`Updated file ${filePath}`);
		} catch (e) {
			const error = e;
			logger.error(`Error updating file ${filePath}: ${error.message}`);
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
				logger.debug(`Deleted extension folder: ${extensionFolderPath}`);
			} catch (err) {
				const error = err;
				if (error.code === "EPERM") logger.error(`Permission denied - cannot delete ${extensionFolderPath}. You may need to run with sudo or check permissions.`);
				else logger.error(`Error deleting ${extensionFolderPath}: ${error.message}`);
			}
		}
	});
}

//#endregion
//#region src/cartridge-services/react-router-config.ts
let isCliAvailable = null;
function checkReactRouterCli(projectDirectory) {
	if (isCliAvailable !== null) return isCliAvailable;
	try {
		execSync("react-router --version", {
			cwd: projectDirectory,
			env: npmRunPathEnv(),
			stdio: "pipe"
		});
		isCliAvailable = true;
	} catch {
		isCliAvailable = false;
	}
	return isCliAvailable;
}
/**
* Get the fully resolved routes from React Router by invoking its CLI.
* This ensures we get the exact same route resolution as React Router uses internally,
* including all presets, file-system routes, and custom route configurations.
* @param projectDirectory - The project root directory
* @returns Array of resolved route config entries
* @example
* const routes = getReactRouterRoutes('/path/to/project');
* // Returns the same structure as `react-router routes --json`
*/
function getReactRouterRoutes(projectDirectory) {
	if (!checkReactRouterCli(projectDirectory)) throw new Error("React Router CLI is not available. Please make sure @react-router/dev is installed and accessible.");
	const tempFile = join(tmpdir(), `react-router-routes-${randomUUID()}.json`);
	try {
		execSync(`react-router routes --json > "${tempFile}"`, {
			cwd: projectDirectory,
			env: npmRunPathEnv(),
			encoding: "utf-8",
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		});
		const output = readFileSync$1(tempFile, "utf-8");
		return JSON.parse(output);
	} catch (error) {
		throw new Error(`Failed to get routes from React Router CLI: ${error.message}`);
	} finally {
		try {
			if (existsSync$1(tempFile)) unlinkSync(tempFile);
		} catch {}
	}
}
/**
* Convert a file path to its corresponding route path using React Router's CLI.
* This ensures we get the exact same route resolution as React Router uses internally.
* @param filePath - Absolute path to the route file
* @param projectRoot - The project root directory
* @returns The route path (e.g., '/cart', '/product/:productId')
* @example
* const route = filePathToRoute('/path/to/project/src/routes/_app.cart.tsx', '/path/to/project');
* // Returns: '/cart'
*/
function filePathToRoute(filePath, projectRoot) {
	const filePathPosix = filePath.replace(/\\/g, "/");
	const flatRoutes = flattenRoutes(getReactRouterRoutes(projectRoot));
	for (const route of flatRoutes) {
		const routeFilePosix = route.file.replace(/\\/g, "/");
		if (filePathPosix.endsWith(routeFilePosix) || filePathPosix.endsWith(`/${routeFilePosix}`)) return route.path;
		const routeFileNormalized = routeFilePosix.replace(/^\.\//, "");
		if (filePathPosix.endsWith(routeFileNormalized) || filePathPosix.endsWith(`/${routeFileNormalized}`)) return route.path;
	}
	logger.warn(`Could not find route for file: ${filePath}`);
	return "/unknown";
}
/**
* Flatten a nested route tree into a flat array with computed paths.
* Each route will have its full path computed from parent paths.
* @param routes - The nested route config entries
* @param parentPath - The parent path prefix (used internally for recursion)
* @returns Flat array of routes with their full paths
*/
function flattenRoutes(routes, parentPath = "") {
	const result = [];
	for (const route of routes) {
		let fullPath;
		if (route.index) fullPath = parentPath || "/";
		else if (route.path) {
			const pathSegment = route.path.startsWith("/") ? route.path : `/${route.path}`;
			fullPath = parentPath ? `${parentPath}${pathSegment}`.replace(/\/+/g, "/") : pathSegment;
		} else fullPath = parentPath || "/";
		if (route.id) result.push({
			id: route.id,
			path: fullPath,
			file: route.file,
			index: route.index
		});
		if (route.children && route.children.length > 0) {
			const childPath = route.path ? fullPath : parentPath;
			result.push(...flattenRoutes(route.children, childPath));
		}
	}
	return result;
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
const DEFAULT_COMPONENT_GROUP = "storefrontnext_base";
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
			logger.error(`Invalid attribute type '${decoratorType}' for field '${fieldName || "unknown"}'. Valid types are: ${VALID_ATTRIBUTE_TYPES.join(", ")}`);
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
/**
* Resolve a variable's initializer expression from the same source file,
* unwrapping `as const` type assertions.
*/
function resolveVariableInitializer(sourceFile, name) {
	const varDecl = sourceFile.getVariableDeclaration(name);
	if (!varDecl) return void 0;
	let initializer = varDecl.getInitializer();
	if (initializer && Node.isAsExpression(initializer)) initializer = initializer.getExpression();
	return initializer;
}
/**
* Check whether an AST node is a type that `parseExpression` can resolve to a
* concrete JS value (as opposed to falling through to `getText()`).
*/
function isResolvableLiteral(node) {
	return Node.isStringLiteral(node) || Node.isNumericLiteral(node) || Node.isTrueLiteral(node) || Node.isFalseLiteral(node) || Node.isObjectLiteralExpression(node) || Node.isArrayLiteralExpression(node);
}
var UnresolvedConstantReferenceError = class extends Error {
	constructor(reference) {
		super(`Cannot resolve constant reference '${reference}'. Ensure the variable is declared in the same file as a literal value.`);
		this.name = "UnresolvedConstantReferenceError";
	}
};
function parseExpression(expression) {
	if (Node.isStringLiteral(expression)) return expression.getLiteralValue();
	else if (Node.isNumericLiteral(expression)) return expression.getLiteralValue();
	else if (Node.isTrueLiteral(expression)) return true;
	else if (Node.isFalseLiteral(expression)) return false;
	else if (Node.isObjectLiteralExpression(expression)) return parseNestedObject(expression);
	else if (Node.isArrayLiteralExpression(expression)) return parseArrayLiteral(expression);
	else if (Node.isPropertyAccessExpression(expression)) {
		const obj = expression.getExpression();
		const propName = expression.getName();
		if (Node.isIdentifier(obj)) {
			const resolved = resolveVariableInitializer(expression.getSourceFile(), obj.getText());
			if (resolved && Node.isObjectLiteralExpression(resolved)) {
				const prop = resolved.getProperty(propName);
				if (prop && Node.isPropertyAssignment(prop)) {
					const propInit = prop.getInitializer();
					if (propInit) return parseExpression(propInit);
				}
			}
			throw new UnresolvedConstantReferenceError(expression.getText());
		}
		return expression.getText();
	} else if (Node.isIdentifier(expression)) {
		const resolved = resolveVariableInitializer(expression.getSourceFile(), expression.getText());
		if (resolved && isResolvableLiteral(resolved)) return parseExpression(resolved);
		return expression.getText();
	} else return expression.getText();
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
	} catch (error) {
		logger.warn(`Could not parse nested object: ${error.message}`);
		return result;
	}
	return result;
}
function parseArrayLiteral(arrayLiteral) {
	const result = [];
	try {
		const elements = arrayLiteral.getElements();
		for (const element of elements) result.push(parseExpression(element));
	} catch (error) {
		logger.warn(`Could not parse array literal: ${error.message}`);
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
	} catch (error) {
		if (error instanceof UnresolvedConstantReferenceError) throw error;
		logger.warn(`Could not parse decorator arguments: ${error.message}`);
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
	} catch (error) {
		if (error instanceof UnresolvedConstantReferenceError) throw error;
		logger.warn(`Could not extract attributes from class ${className}: ${error.message}`);
	}
	return attributes;
}
function normalizeComponentTypeId(typeId, defaultGroup) {
	return typeId.includes(".") ? typeId : `${defaultGroup}.${typeId}`;
}
function extractRegionDefinitionsFromSource(sourceFile, className, defaultComponentGroup = DEFAULT_COMPONENT_GROUP) {
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
						if (Array.isArray(regionConfig.componentTypeInclusions)) regionDefinition.component_type_inclusions = regionConfig.componentTypeInclusions.map((incl) => ({ type_id: normalizeComponentTypeId(String(incl), defaultComponentGroup) }));
						if (Array.isArray(regionConfig.componentTypeExclusions)) regionDefinition.component_type_exclusions = regionConfig.componentTypeExclusions.map((excl) => ({ type_id: normalizeComponentTypeId(String(excl), defaultComponentGroup) }));
						if (regionConfig.maxComponents !== void 0) regionDefinition.max_components = regionConfig.maxComponents;
						if (regionConfig.minComponents !== void 0) regionDefinition.min_components = regionConfig.minComponents;
						if (regionConfig.allowMultiple !== void 0) regionDefinition.allow_multiple = regionConfig.allowMultiple;
						if (regionConfig.defaultComponentConstructors) regionDefinition.default_component_constructors = regionConfig.defaultComponentConstructors;
						regionDefinitions.push(regionDefinition);
					}
				}
			}
		}
	} catch (error) {
		logger.warn(`Warning: Could not extract region definitions from class ${className}: ${error.message}`);
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
				const componentGroup = String(componentConfig.group || DEFAULT_COMPONENT_GROUP);
				const attributes = extractAttributesFromSource(sourceFile, className);
				const regionDefinitions = extractRegionDefinitionsFromSource(sourceFile, className, componentGroup);
				const componentMetadata = {
					typeId: componentConfig.id || className.toLowerCase(),
					name: componentConfig.name || toHumanReadableName(className),
					group: componentGroup,
					description: componentConfig.description || `Custom component: ${className}`,
					regionDefinitions,
					attributes
				};
				components.push(componentMetadata);
			}
		} catch (error) {
			if (error instanceof UnresolvedConstantReferenceError) throw error;
			logger.warn(`Could not process file ${filePath}:`, error.message);
		}
		return components;
	} catch (error) {
		if (error instanceof UnresolvedConstantReferenceError) throw error;
		logger.warn(`Could not read file ${filePath}:`, error.message);
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
		} catch (error) {
			logger.warn(`Could not process file ${filePath}:`, error.message);
		}
		return pageTypes;
	} catch (error) {
		logger.warn(`Could not read file ${filePath}:`, error.message);
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
			logger.warn(`Could not parse JSON in file ${filePath}:`, parseError.message);
		}
		return aspects;
	} catch (error) {
		logger.warn(`Could not read file ${filePath}:`, error.message);
		return [];
	}
}
async function generateComponentCartridge(component, outputDir, dryRun = false) {
	const fileName = toCamelCaseFileName(component.typeId);
	const groupDir = join(outputDir, component.group);
	const outputPath = join(groupDir, `${fileName}.json`);
	if (!dryRun) {
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
	}
	const prefix = dryRun ? "   - [DRY RUN]" : "   -";
	logger.debug(`${prefix} ${String(component.typeId)}: ${String(component.name)} (${String(component.attributes.length)} attributes) → ${fileName}.json`);
}
async function generatePageTypeCartridge(pageType, outputDir, dryRun = false) {
	const fileName = toCamelCaseFileName(pageType.name);
	const outputPath = join(outputDir, `${fileName}.json`);
	if (!dryRun) {
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
	}
	const prefix = dryRun ? "   - [DRY RUN]" : "   -";
	logger.debug(`${prefix} ${String(pageType.name)}: ${String(pageType.description)} (${String(pageType.attributes.length)} attributes) → ${fileName}.json`);
}
async function generateAspectCartridge(aspect, outputDir, dryRun = false) {
	const fileName = toCamelCaseFileName(aspect.id);
	const outputPath = join(outputDir, `${fileName}.json`);
	if (!dryRun) {
		const cartridgeData = {
			name: aspect.name,
			description: aspect.description,
			arch_type: ARCH_TYPE_HEADLESS,
			attribute_definitions: aspect.attributeDefinitions || []
		};
		if (aspect.supportedObjectTypes) cartridgeData.supported_object_types = aspect.supportedObjectTypes;
		await writeFile(outputPath, JSON.stringify(cartridgeData, null, 2));
	}
	const prefix = dryRun ? "   - [DRY RUN]" : "   -";
	logger.debug(`${prefix} ${String(aspect.name)}: ${String(aspect.description)} (${String(aspect.attributeDefinitions.length)} attributes) → ${fileName}.json`);
}
/**
* Runs ESLint with --fix on the specified directory to format JSON files.
* This ensures generated JSON files match the project's Prettier/ESLint configuration.
*/
function lintGeneratedFiles(metadataDir, projectRoot) {
	try {
		logger.debug("🔧 Running ESLint --fix on generated JSON files...");
		execSync(`npx eslint "${metadataDir}/**/*.json" --fix --no-error-on-unmatched-pattern`, {
			cwd: projectRoot,
			stdio: "pipe",
			encoding: "utf-8"
		});
		logger.debug("✅ JSON files formatted successfully");
	} catch (error) {
		const execError = error;
		if (execError.status === 2) {
			const errMsg = execError.stderr || execError.stdout || "Unknown error";
			logger.warn(`⚠️  Could not run ESLint --fix: ${errMsg}`);
		} else if (execError.stderr && execError.stderr.includes("error")) logger.warn(`⚠️  Some linting issues could not be auto-fixed. Run ESLint manually to review.`);
		else logger.debug("✅ JSON files formatted successfully");
	}
}
async function generateMetadata(projectDirectory, metadataDirectory, options) {
	try {
		const filePaths = options?.filePaths;
		const isIncrementalMode = filePaths && filePaths.length > 0;
		const dryRun = options?.dryRun || false;
		if (dryRun) logger.debug("🔍 [DRY RUN] Scanning for decorated components and page types...");
		else if (isIncrementalMode) logger.debug(`🔍 Generating metadata for ${filePaths.length} specified file(s)...`);
		else logger.debug("🔍 Generating metadata for decorated components and page types...");
		const projectRoot = resolve(projectDirectory);
		const srcDir = join(projectRoot, "src");
		const metadataDir = resolve(metadataDirectory);
		const componentsOutputDir = join(metadataDir, "components");
		const pagesOutputDir = join(metadataDir, "pages");
		const aspectsOutputDir = join(metadataDir, "aspects");
		if (!dryRun) {
			if (!isIncrementalMode) {
				logger.debug("🗑️  Cleaning existing output directories...");
				for (const outputDir of [
					componentsOutputDir,
					pagesOutputDir,
					aspectsOutputDir
				]) try {
					await rm(outputDir, {
						recursive: true,
						force: true
					});
					logger.debug(`   - Deleted: ${outputDir}`);
				} catch {
					logger.debug(`   - Directory not found (skipping): ${outputDir}`);
				}
			} else logger.debug("📝 Incremental mode: existing cartridge files will be preserved/overwritten");
			logger.debug("Creating output directories...");
			for (const outputDir of [
				componentsOutputDir,
				pagesOutputDir,
				aspectsOutputDir
			]) try {
				await mkdir(outputDir, { recursive: true });
			} catch (error) {
				try {
					await access(outputDir);
				} catch {
					const err = error;
					logger.error(`❌ Failed to create output directory ${outputDir}: ${err.message}`);
					process.exit(1);
					throw err;
				}
			}
		} else if (isIncrementalMode) logger.debug(`📝 [DRY RUN] Would process ${filePaths.length} specific file(s)`);
		else logger.debug("📝 [DRY RUN] Would clean and regenerate all metadata files");
		let files = [];
		if (isIncrementalMode && filePaths) {
			files = filePaths.map((fp) => resolve(projectRoot, fp));
			logger.debug(`📂 Processing ${files.length} specified file(s)...`);
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
			const configMetadataDir = join(projectRoot, "config-metadata");
			try {
				await access(configMetadataDir);
				await scanDirectory(configMetadataDir);
			} catch (error) {
				if (error.code === "ENOENT") logger.debug(`   - Directory not found (skipping): ${configMetadataDir}`);
				else logger.warn(`   - Unable to access ${configMetadataDir}:`, error.message);
			}
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
			logger.info("⚠️  No decorated components, page types, or aspect files found.");
			return {
				componentsGenerated: 0,
				pageTypesGenerated: 0,
				aspectsGenerated: 0,
				totalFiles: 0
			};
		}
		if (allComponents.length > 0) {
			logger.debug(`✅ Found ${allComponents.length} decorated component(s)`);
			for (const component of allComponents) await generateComponentCartridge(component, componentsOutputDir, dryRun);
			if (dryRun) logger.info(`[DRY RUN] Would generate ${allComponents.length} component metadata file(s)`);
			else logger.info(`Generated ${allComponents.length} component metadata file(s)`);
		}
		if (allPageTypes.length > 0) {
			logger.debug(`✅ Found ${allPageTypes.length} decorated page type(s)`);
			for (const pageType of allPageTypes) await generatePageTypeCartridge(pageType, pagesOutputDir, dryRun);
			if (dryRun) logger.info(`[DRY RUN] Would generate ${allPageTypes.length} page type metadata file(s)`);
			else logger.info(`Generated ${allPageTypes.length} page type metadata file(s)`);
		}
		if (allAspects.length > 0) {
			logger.debug(`✅ Found ${allAspects.length} decorated aspect(s)`);
			for (const aspect of allAspects) await generateAspectCartridge(aspect, aspectsOutputDir, dryRun);
			if (dryRun) logger.info(`[DRY RUN] Would generate ${allAspects.length} aspect metadata file(s)`);
			else logger.info(`Generated ${allAspects.length} aspect metadata file(s)`);
		}
		const shouldLintFix = options?.lintFix !== false;
		if (!dryRun && shouldLintFix && (allComponents.length > 0 || allPageTypes.length > 0 || allAspects.length > 0)) lintGeneratedFiles(metadataDir, projectRoot);
		return {
			componentsGenerated: allComponents.length,
			pageTypesGenerated: allPageTypes.length,
			aspectsGenerated: allAspects.length,
			totalFiles: allComponents.length + allPageTypes.length + allAspects.length
		};
	} catch (error) {
		const err = error;
		logger.error("❌ Error:", err.message);
		process.exit(1);
		throw err;
	}
}

//#endregion
export { clearCache, createServer, storefrontNextTargets as default, extractPatterns, generateMetadata, hybridProxyPlugin, loadConfigFromEnv, loadProjectConfig, shouldRouteToNext, testPatterns, transformTargetPlaceholderPlugin, trimExtensions, uiTargetDevModePlugin };
//# sourceMappingURL=index.js.map