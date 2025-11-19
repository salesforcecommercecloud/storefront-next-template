import path, { resolve } from "node:path";
import fs from "fs-extra";
import path$1 from "path";
import { URL as URL$1, fileURLToPath } from "url";
import os from "os";
import archiver from "archiver";
import { Minimatch, minimatch } from "minimatch";
import { execSync } from "child_process";
import dotenv from "dotenv";
import chalk from "chalk";
import express from "express";
import { createRequestHandler } from "@react-router/express";
import { isRunnableDevEnvironment } from "vite";
import { tsImport } from "tsx/esm/api";
import { existsSync } from "node:fs";
import { createProxyMiddleware } from "http-proxy-middleware";
import compression from "compression";
import zlib from "node:zlib";
import morgan from "morgan";
import fs$1 from "fs";
import { parse } from "/home/runner/work/storefront-next/storefront-next/node_modules/.pnpm/@babel+parser@7.28.4/node_modules/@babel/parser/lib/index.js";
import traverseModule from "/home/runner/work/storefront-next/storefront-next/node_modules/.pnpm/@babel+traverse@7.28.4/node_modules/@babel/traverse/lib/index.js";

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
//#region src/plugins/managedRuntimeBundle.ts
const __dirname = path$1.dirname(fileURLToPath(import.meta.url));
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
	* - ssr.js
	* - loader.js
	* - package.json
	*
	* @returns {Promise<void>}
	*/
	const createManagedRuntimeBundleAssets = async () => {
		const loaderPath = path$1.resolve(buildDirectory, "loader.js");
		const ssrPath = path$1.resolve(buildDirectory, "ssr.js");
		await fs.ensureDir(buildDirectory);
		await fs.outputFile(loaderPath, "// This file is intentionally empty");
		const prebuiltSsrPath = path$1.resolve(__dirname, "./mrt/ssr.js");
		await fs.copy(prebuiltSsrPath, ssrPath);
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
	const { readableChunkNames = false } = config;
	const plugins = [
		managedRuntimeBundlePlugin(),
		fixReactRouterManifestUrlsPlugin(),
		patchReactRouterPlugin()
	];
	if (readableChunkNames) plugins.push(readableChunkFileNamesPlugin());
	return plugins;
}

//#endregion
//#region package.json
var version = "0.0.1";

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
	if (!defaultMrtProject || defaultMrtProject.trim() === "") throw new Error("Project name could not be determined. Please either:\n  1. Set MRT_PROJECT in your .env file, or\n  2. Ensure package.json has a valid \"name\" field");
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
	return new Promise((resolve$1, reject) => {
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
				resolve$1({
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
		return new Promise((resolve$1, reject) => {
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
					case "ACTIVE": return resolve$1();
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
	return {
		ssrOnly: [
			"server/**/*",
			"loader.js",
			"ssr.js",
			"!static/**/*",
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
	const shortCode = process.env.PUBLIC_COMMERCE_API_SHORT_CODE;
	const organizationId = process.env.PUBLIC_COMMERCE_API_ORG_ID;
	const clientId = process.env.PUBLIC_COMMERCE_API_CLIENT_ID;
	const siteId = process.env.PUBLIC_COMMERCE_API_SITE_ID;
	const proxy = process.env.PUBLIC_COMMERCE_API_PROXY || "/mobify/proxy/api";
	if (!shortCode) throw new Error("Missing PUBLIC_COMMERCE_API_SHORT_CODE environment variable.\nPlease set it in your .env file or environment.");
	if (!organizationId) throw new Error("Missing PUBLIC_COMMERCE_API_ORG_ID environment variable.\nPlease set it in your .env file or environment.");
	if (!clientId) throw new Error("Missing PUBLIC_COMMERCE_API_CLIENT_ID environment variable.\nPlease set it in your .env file or environment.");
	if (!siteId) throw new Error("Missing PUBLIC_COMMERCE_API_SITE_ID environment variable.\nPlease set it in your .env file or environment.");
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
	if (!existsSync(configPath)) throw new Error(`config.server.ts not found at ${configPath}.\nPlease ensure config.server.ts exists in your project root.`);
	const config = (await tsImport(configPath, {
		parentURL: import.meta.url,
		tsconfig: existsSync(tsconfigPath) ? tsconfigPath : void 0
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
* Used in serve mode to optimize response sizes
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
* Used in dev and serve modes for request visibility
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
* This is needed because the build output uses /assets/ but we serve at /mobify/bundle/{BUNDLE_ID}/client/assets/
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
	serve: {
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
		enableLogging: false,
		enableAssetUrlPatching: true
	}
};

//#endregion
//#region src/server/index.ts
/**
* Create a unified Express server for development, serve, or production mode
*/
function createServer(options) {
	const { mode, projectDirectory, config: providedConfig, vite, build, enableProxy = ServerModeFeatureMap[mode].enableProxy, enableStaticServing = ServerModeFeatureMap[mode].enableStaticServing, enableCompression = ServerModeFeatureMap[mode].enableCompression, enableLogging = ServerModeFeatureMap[mode].enableLogging, enableAssetUrlPatching = ServerModeFeatureMap[mode].enableAssetUrlPatching } = options;
	if (mode === "development" && !vite) throw new Error("Vite dev server instance is required for development mode");
	if ((mode === "serve" || mode === "production") && !build) throw new Error("React Router server build is required for serve/production mode");
	const config = providedConfig ?? loadConfigFromEnv();
	const bundleId = process.env.BUNDLE_ID ?? "local";
	const app = express();
	app.disable("x-powered-by");
	if (enableLogging) app.use(createLoggingMiddleware());
	if (enableCompression) app.use(createCompressionMiddleware());
	if (enableStaticServing && build) {
		const bundlePath = getBundlePath(bundleId);
		app.use(bundlePath, createStaticMiddleware(bundleId, projectDirectory));
	}
	if (mode === "development" && vite) app.use(vite.middlewares);
	if (enableProxy) app.use(config.commerce.api.proxy, createCommerceProxyMiddleware(config));
	app.all("*", createSSRHandler(mode, bundleId, vite, build, enableAssetUrlPatching));
	return app;
}
/**
* Create the SSR request handler based on mode
*/
function createSSRHandler(mode, bundleId, vite, build, enableAssetUrlPatching) {
	if (mode === "development" && vite) return async (req, res, next) => {
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
	else if (build) {
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
let cachedTsconfigPaths = null;
let cachedTsconfigRoot = null;
const FILE_EXTENSIONS = [
	".tsx",
	".ts",
	".d.ts"
];
/**
* Strip the comments from the JSON string
* @param jsonString
* @returns {string}
*/
function stripJsonComments(jsonString) {
	return jsonString.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}
/**
* Load the tsconfig.json paths from the project root
* @param projectRoot
* @returns {Record<string, string[] | string>}
*/
function loadTsconfigPaths(projectRoot) {
	if (cachedTsconfigPaths && cachedTsconfigRoot === projectRoot) return cachedTsconfigPaths;
	const tsconfigPath = path$1.join(projectRoot, "tsconfig.json");
	if (!fs$1.existsSync(tsconfigPath)) {
		cachedTsconfigPaths = {};
		cachedTsconfigRoot = projectRoot;
		return cachedTsconfigPaths;
	}
	try {
		const tsconfigContent = stripJsonComments(fs$1.readFileSync(tsconfigPath, "utf-8"));
		const paths = JSON.parse(tsconfigContent)?.compilerOptions?.paths;
		if (paths && typeof paths === "object") cachedTsconfigPaths = paths;
		else cachedTsconfigPaths = {};
		cachedTsconfigRoot = projectRoot;
		return cachedTsconfigPaths;
	} catch (error$1) {
		throw new Error(`Error parsing tsconfig.json for project ${projectRoot}: ${String(error$1)}`);
	}
}
/**
* Resolve the path from the alias to the real path by consulting tsconfig.json paths configuration
* @param {string} importPath
* @param {string} projectRoot
* @returns {string}
*/
function resolvePathFromAlias(importPath, projectRoot) {
	if (importPath.startsWith(".")) return importPath;
	const paths = loadTsconfigPaths(projectRoot);
	if (!paths || typeof paths !== "object" || Object.keys(paths).length === 0) return importPath;
	for (const [alias, mappings] of Object.entries(paths)) {
		const aliasPattern = alias.replace(/\+/g, "\\+").replace(/\*/g, "(.*)");
		const aliasRegex = /* @__PURE__ */ new RegExp(`^${aliasPattern}$`);
		const match = importPath.match(aliasRegex);
		if (match) {
			const mappingArray = Array.isArray(mappings) ? mappings : [mappings];
			for (const mapping of mappingArray) {
				let resolvedPath = mapping;
				for (let i = 1; i < match.length; i++) resolvedPath = resolvedPath.replace("*", match[i]);
				if (resolvedPath.startsWith("./")) resolvedPath = resolvedPath.substring(2);
				const fullPath = path$1.resolve(projectRoot, resolvedPath);
				for (const ext of FILE_EXTENSIONS) {
					const pathWithExt = fullPath + ext;
					if (fs$1.existsSync(pathWithExt)) return pathWithExt;
				}
				if (fs$1.existsSync(fullPath) && fs$1.statSync(fullPath).isDirectory()) {
					for (const indexFile of [
						"index.ts",
						"index.tsx",
						"index.js",
						"index.jsx"
					]) {
						const indexPath = path$1.join(fullPath, indexFile);
						if (fs$1.existsSync(indexPath)) return indexPath;
					}
					return fullPath;
				}
			}
		}
	}
	return importPath;
}
function isSupportedFileExtension(fileName) {
	return FILE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

//#endregion
//#region src/extensibility/trim-extensions.ts
/**
* Utility to trim the directory to remove unused components and unused extensions.
* This is used to reduce the size of the project by removing the code that is not part of the selected extensions.
*/
const traverse = traverseModule.default || traverseModule;
const removeComponentCandidates = /* @__PURE__ */ new Set();
const SEPARATOR = path$1.sep;
const COMPONENT_SCAN_PATHS = [path$1.join(SEPARATOR, "src", SEPARATOR)];
const SINGLE_LINE_MARKER = "@sfdc-extension-line";
const BLOCK_MARKER_START = "@sfdc-extension-block-start";
const BLOCK_MARKER_END = "@sfdc-extension-block-end";
const FILE_MARKER = "@sfdc-extension-file";
let verbose = false;
function trimExtensions(directory, selectedExtensions, extensionConfig, verboseOverride = false) {
	const startTime = Date.now();
	removeComponentCandidates.clear();
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
				else if (isSupportedFileExtension(file)) processFile(directory, filePath, extensions);
			}
		});
	};
	processDirectory(directory);
	removeUnusedComponents(directory, directory);
	updateExtensionConfig(directory, extensions);
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
	fs$1.writeFileSync(extensionConfigPath, JSON.stringify({ extensions: extensionConfig.extensions }, null, 2), "utf8");
}
function processFile(projectRoot, filePath, extensions) {
	let modified = false;
	const blockMarkers = [];
	const removedBlocks = [];
	let skippingBlock = false;
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
			removeComponentCandidates.add(path$1.resolve(path$1.dirname(filePath)));
			return;
		}
	}
	const extKeys = Object.keys(extensions);
	if (new RegExp(extKeys.join("|"), "g").test(source)) {
		const lines = source.split("\n");
		const newLines = [];
		let i = 0;
		while (i < lines.length) {
			const line = lines[i];
			if (line.includes(SINGLE_LINE_MARKER)) {
				const matchingExtension = Object.keys(extensions).find((extension) => line.includes(extension));
				if (matchingExtension && extensions[matchingExtension] === false) {
					removedBlocks.push(lines[i + 1]);
					i += 2;
					modified = true;
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
						const removedBlock = lines.slice(startMarker.line, i + 1).join("\n");
						removedBlocks.push(removedBlock);
						modified = true;
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
		if (modified) {
			const newSource = newLines.join("\n");
			try {
				fs$1.writeFileSync(filePath, newSource);
				if (verbose) console.log(`Updated file ${filePath}`);
			} catch (e) {
				const error$1 = e;
				console.error(`Error updating file ${filePath}: ${error$1.message}`);
				throw e;
			}
			const addToRemoveComponentCandidates = (importPath) => {
				if (importPath.startsWith(".")) removeComponentCandidates.add(path$1.resolve(path$1.dirname(filePath), importPath));
				else {
					const resolvedPath = resolvePathFromAlias(importPath, projectRoot);
					removeComponentCandidates.add(path$1.dirname(resolvedPath));
				}
			};
			removedBlocks.forEach((block) => {
				if (block.includes("import")) try {
					const ast = parse(block, {
						sourceType: "module",
						plugins: ["jsx", "typescript"]
					});
					if (verbose) console.log(`traversing block ${block}`);
					traverse(ast, {
						noScope: true,
						ImportDeclaration(nodePath) {
							addToRemoveComponentCandidates(nodePath.node.source.value);
						}
					});
				} catch (e) {
					const error$1 = e;
					console.error(`Error parsing block ${block}: ${error$1.message}`);
				}
			});
		}
	}
}
function removeUnusedComponents(directory, projectRoot) {
	const exportedFiles = /* @__PURE__ */ new Set();
	function collectExportedFiles(dir) {
		fs$1.readdirSync(dir).forEach((file) => {
			const filePath = path$1.join(dir, file);
			if (fs$1.statSync(filePath).isDirectory() && !filePath.includes("node_modules")) collectExportedFiles(filePath);
			else if (isSupportedFileExtension(file) && !filePath.includes(".storybook")) {
				const source = fs$1.readFileSync(filePath, "utf-8");
				try {
					const ast = parse(source, {
						sourceType: "module",
						plugins: ["jsx", "typescript"]
					});
					let hasExports = false;
					traverse(ast, {
						noScope: true,
						ExportNamedDeclaration(astPath) {
							hasExports = true;
							astPath.stop();
						},
						ExportDefaultDeclaration(astPath) {
							hasExports = true;
							astPath.stop();
						}
					});
					if (hasExports) {
						const absolutePath = path$1.resolve(filePath);
						const pathWithoutExt = path$1.resolve(path$1.dirname(absolutePath));
						exportedFiles.add(pathWithoutExt);
					}
				} catch (e) {
					const error$1 = e;
					throw new Error(`Error parsing file ${filePath}: ${error$1.message}`);
				}
			}
		});
	}
	function findImports(dir, projectRoot$1) {
		fs$1.readdirSync(dir).forEach((file) => {
			const filePath = path$1.join(dir, file);
			if (fs$1.statSync(filePath).isDirectory() && !filePath.includes("node_modules")) findImports(filePath, projectRoot$1);
			else if (isSupportedFileExtension(file)) traverse(parse(fs$1.readFileSync(filePath, "utf-8"), {
				sourceType: "module",
				plugins: ["jsx", "typescript"]
			}), {
				noScope: true,
				ImportDeclaration(astPath) {
					const importPath = resolvePathFromAlias(astPath.node.source.value, projectRoot$1);
					if (importPath) {
						let absoluteImportPath = path$1.resolve(path$1.dirname(filePath), importPath);
						if (!(fs$1.existsSync(absoluteImportPath) && fs$1.statSync(absoluteImportPath).isDirectory())) absoluteImportPath = path$1.resolve(path$1.dirname(absoluteImportPath));
						const isCandidate = Array.from(removeComponentCandidates).find((candidate) => path$1.resolve(filePath).startsWith(candidate + path$1.sep));
						if (exportedFiles.has(absoluteImportPath) && !isCandidate) {
							exportedFiles.delete(absoluteImportPath);
							let parentPath = absoluteImportPath;
							while (parentPath !== path$1.resolve(directory)) {
								parentPath = path$1.dirname(parentPath);
								exportedFiles.delete(parentPath);
							}
						}
					}
				}
			});
		});
	}
	collectExportedFiles(directory);
	findImports(directory, projectRoot);
	const unusedFiles = Array.from(exportedFiles).filter((filePath) => {
		return COMPONENT_SCAN_PATHS.some((p) => filePath.includes(p));
	}).map((filePath) => {
		const extensions = [...FILE_EXTENSIONS];
		for (const ext of extensions) {
			const fileWithExt = filePath + ext;
			if (fs$1.existsSync(fileWithExt)) return fileWithExt;
		}
		return filePath;
	});
	if (verbose) {
		console.log("\nUnused components:");
		unusedFiles.forEach((file) => {
			console.log(`- ${file}`);
		});
		console.log("Remove component candidates:");
		Array.from(removeComponentCandidates).forEach((file) => {
			console.log(`- ${file}`);
		});
	}
	const filesToRemove = unusedFiles.filter((filePath) => removeComponentCandidates.has(filePath));
	if (verbose) {
		console.log("Files to remove:");
		filesToRemove.forEach((file) => {
			console.log(`- ${file}`);
		});
	}
	if (filesToRemove.length > 0) {
		if (verbose) console.log("\nDeleting unused components:");
		filesToRemove.forEach((file) => {
			if (verbose) console.log(`- ${file}`);
			try {
				if (fs$1.statSync(file).isDirectory()) {
					fs$1.rmSync(file, {
						recursive: true,
						force: true
					});
					if (verbose) console.log(`  ✓ Successfully deleted directory`);
				} else {
					fs$1.unlinkSync(file);
					if (verbose) console.log(`  ✓ Successfully deleted file`);
				}
			} catch (err) {
				const error$1 = err;
				if (error$1.code === "EPERM") console.error(`  ✗ Permission denied - cannot delete. You may need to run with sudo or check permissions.`);
				else console.error(`  ✗ Error deleting: ${error$1.message}`);
			}
		});
		const isEmptyDirectory = (dir) => {
			if (!fs$1.statSync(dir).isDirectory()) return false;
			const files = fs$1.readdirSync(dir);
			if (files.length === 0) return true;
			return files.every((file) => isEmptyDirectory(path$1.join(dir, file)));
		};
		const extensionsDir = path$1.join(projectRoot, "src", "extensions");
		if (fs$1.existsSync(extensionsDir)) fs$1.readdirSync(extensionsDir).forEach((file) => {
			const subDirPath = path$1.join(extensionsDir, file);
			if (isEmptyDirectory(subDirPath)) {
				if (verbose) console.log(`  ✓ Successfully deleted empty directory ${subDirPath}`);
				fs$1.rmSync(subDirPath, {
					recursive: true,
					force: true
				});
			}
		});
	} else if (verbose) console.log("\nNo unused components found.");
	return unusedFiles;
}

//#endregion
export { createServer, storefrontNextPlugins as default, loadConfigFromEnv, loadProjectConfig, push, trimExtensions };
//# sourceMappingURL=index.js.map