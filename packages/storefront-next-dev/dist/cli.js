#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs-extra";
import path, { dirname, extname } from "path";
import os from "os";
import archiver from "archiver";
import { Minimatch, minimatch } from "minimatch";
import { execSync } from "child_process";
import dotenv from "dotenv";
import chalk from "chalk";
import { createRequire } from "module";
import { URL as URL$1, fileURLToPath, pathToFileURL } from "url";
import zlib from "zlib";
import { promisify } from "util";
import { createServer } from "vite";
import express from "express";
import { createRequestHandler } from "@react-router/express";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { basename, extname as extname$1, join, resolve } from "node:path";
import { pathToFileURL as pathToFileURL$1 } from "node:url";
import { createProxyMiddleware } from "http-proxy-middleware";
import compression from "compression";
import zlib$1 from "node:zlib";
import morgan from "morgan";
import fs$1 from "fs";
import Handlebars from "handlebars";
import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execSync as execSync$1 } from "node:child_process";
import { Node, Project } from "ts-morph";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { npmRunPathEnv } from "npm-run-path";
import prompts from "prompts";
import { z } from "zod";

//#region package.json
var version = "0.2.0-dev";

//#endregion
//#region src/utils/logger.ts
/**
* Get the local network IPv4 address
*/
function getNetworkAddress() {
	const interfaces = os.networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		const iface = interfaces[name];
		if (!iface) continue;
		for (const alias of iface) if (alias.family === "IPv4" && !alias.internal) return alias.address;
	}
}
/**
* Get the version of a package from the project's package.json
*/
function getPackageVersion(packageName, projectDir) {
	try {
		const require = createRequire(import.meta.url);
		return require(require.resolve(`${packageName}/package.json`, { paths: [projectDir] })).version;
	} catch {
		return "unknown";
	}
}
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
/**
* Print the server information banner with URLs and versions
*/
function printServerInfo(mode, port, startTime, projectDir) {
	const elapsed = Date.now() - startTime;
	const sfnextVersion = version;
	const reactVersion = getPackageVersion("react", projectDir);
	const reactRouterVersion = getPackageVersion("react-router", projectDir);
	const modeLabel = mode === "development" ? "Development Mode" : "Preview Mode";
	console.log();
	console.log(`  ${chalk.cyan.bold("⚡ SFCC Storefront Next")} ${chalk.dim(`v${sfnextVersion}`)}`);
	console.log(`  ${chalk.green.bold(modeLabel)}`);
	console.log();
	console.log(`  ${chalk.dim("react")} ${chalk.green(`v${reactVersion}`)} ${chalk.dim("│")} ${chalk.dim("react-router")} ${chalk.green(`v${reactRouterVersion}`)} ${chalk.dim("│")} ${chalk.green(`ready in ${elapsed}ms`)}`);
	console.log();
}
/**
* Print server configuration details (proxy, static, etc.)
*/
function printServerConfig(config) {
	const { port, enableProxy, enableStaticServing, enableCompression, proxyPath, proxyTarget, shortCode, organizationId, clientId, siteId } = config;
	console.log(`  ${chalk.bold("Environment Configuration:")}`);
	if (enableProxy && proxyPath && proxyTarget && shortCode) {
		console.log(`    ${chalk.green("✓")} ${chalk.bold("Proxy:")} ${chalk.cyan(`localhost:${port}${proxyPath}`)} ${chalk.dim("→")} ${chalk.cyan(proxyTarget)}`);
		console.log(`      ${chalk.dim("Short Code:     ")} ${chalk.dim(shortCode)}`);
		if (organizationId) console.log(`      ${chalk.dim("Organization ID:")} ${chalk.dim(organizationId)}`);
		if (clientId) console.log(`      ${chalk.dim("Client ID:      ")} ${chalk.dim(clientId)}`);
		if (siteId) console.log(`      ${chalk.dim("Site ID:        ")} ${chalk.dim(siteId)}`);
	} else console.log(`    ${chalk.gray("○")} ${chalk.bold("Proxy:           ")} ${chalk.dim("disabled")}`);
	if (enableStaticServing) console.log(`    ${chalk.green("✓")} ${chalk.bold("Static:          ")} ${chalk.dim("enabled")}`);
	if (enableCompression) console.log(`    ${chalk.green("✓")} ${chalk.bold("Compression:     ")} ${chalk.dim("enabled")}`);
	const localUrl = `http://localhost:${port}`;
	const networkAddress = process.env.SHOW_NETWORK === "true" ? getNetworkAddress() : void 0;
	const networkUrl = networkAddress ? `http://${networkAddress}:${port}` : void 0;
	console.log();
	console.log(`  ${chalk.green("➜")}  ${chalk.bold("Local:  ")} ${chalk.cyan(localUrl)}`);
	if (networkUrl) console.log(`  ${chalk.green("➜")}  ${chalk.bold("Network:")} ${chalk.cyan(networkUrl)}`);
	console.log();
	console.log(`  ${chalk.dim("Press")} ${chalk.bold("Ctrl+C")} ${chalk.dim("to stop the server")}`);
	console.log();
}
/**
* Print shutdown message
*/
function printShutdownMessage() {
	console.log(`\n  ${chalk.yellow("⚡")} ${chalk.dim("Server shutting down...")}\n`);
}

//#endregion
//#region src/utils.ts
const DEFAULT_CLOUD_ORIGIN = "https://cloud.mobify.com";
const getDefaultBuildDir = (targetDir) => path.join(targetDir, "build");
const NODE_ENV = process.env.NODE_ENV || "development";
/**
* Get credentials file path based on cloud origin
*/
const getCredentialsFile = (cloudOrigin, credentialsFile) => {
	if (credentialsFile) return credentialsFile;
	const host = new URL(cloudOrigin).host;
	const suffix = host === "cloud.mobify.com" ? "" : `--${host}`;
	return path.join(os.homedir(), `.mobify${suffix}`);
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
	const packagePath = path.join(projectDir, "package.json");
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
	const envPath = path.join(projectDir, ".env");
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
		const tmpFile = path.join(os.tmpdir(), `npm-ls-${Date.now()}.json`);
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
/**
* Given a project directory and a record of config overrides, generate a new .env file with the overrides based on the .env.default file.
* @param projectDir
* @param configOverrides
*/
const generateEnvFile = (projectDir, configOverrides) => {
	const envDefaultPath = path.join(projectDir, ".env.default");
	const envPath = path.join(projectDir, ".env");
	if (!fs.existsSync(envDefaultPath)) {
		console.warn(`${envDefaultPath} not found`);
		return;
	}
	const envOutputLines = fs.readFileSync(envDefaultPath, "utf8").split("\n").map((line) => {
		if (!line || line.trim().startsWith("#")) return line;
		const eqIndex = line.indexOf("=");
		if (eqIndex === -1) return line;
		const key = line.slice(0, eqIndex);
		const originalValue = line.slice(eqIndex + 1);
		return `${key}=${(Object.prototype.hasOwnProperty.call(configOverrides, key) ? configOverrides[key] : void 0) ?? originalValue}`;
	});
	fs.writeFileSync(envPath, envOutputLines.join("\n"));
};

//#endregion
//#region src/bundle.ts
/**
* Create a bundle from the build directory
*/
const createBundle = async (options) => {
	const { message, ssr_parameters, ssr_only, ssr_shared, buildDirectory, projectDirectory, projectSlug } = options;
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "storefront-next-dev-push-"));
	const destination = path.join(tmpDir, "build.tar");
	const filesInArchive = [];
	if (!ssr_only || ssr_only.length === 0 || !ssr_shared || ssr_shared.length === 0) throw new Error("no ssrOnly or ssrShared files are defined");
	return new Promise((resolve$1, reject) => {
		const output = fs.createWriteStream(destination);
		const archive = archiver("tar");
		archive.pipe(output);
		const newRoot = path.join(projectSlug, "bld", "");
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
//#region src/config.ts
const CARTRIDGES_BASE_DIR = "cartridges";
const SFNEXT_BASE_CARTRIDGE_NAME = "app_storefrontnext_base";
const SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR = `${SFNEXT_BASE_CARTRIDGE_NAME}/cartridge/experience`;
/**
* When enabled, automatically generates and deploys cartridge metadata before an MRT push.
* This is useful for keeping Page Designer metadata in sync with component changes.
*
* When enabled:
* 1. Generates cartridge metadata from decorated components
* 2. Deploys the cartridge to Commerce Cloud (requires dw.json configuration)
* 3. Proceeds with the MRT push
*
* To enable: Set this to `true` in your local config.ts
* Default: false (manual cartridge generation/deployment via `sfnext generate-cartridge` and `sfnext deploy-cartridge`)
*/
const GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH = false;
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
		ssrParameters: { ssrFunctionNodeVersion: "24.x" }
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
//#region src/commands/create-bundle.ts
const gzip = promisify(zlib.gzip);
/**
* Create a bundle and save it to disk without pushing to Managed Runtime
*/
async function createBundleCommand(options) {
	if (!fs.existsSync(options.projectDirectory)) throw new Error(`Project directory "${options.projectDirectory}" does not exist!`);
	const mrtConfig = getMrtConfig(options.projectDirectory);
	const projectSlug = options.projectSlug ?? mrtConfig.defaultMrtProject;
	if (!projectSlug || projectSlug.trim() === "") throw new Error("Project slug could not be determined from CLI, .env, or package.json");
	const buildDirectory = options.buildDirectory ?? getDefaultBuildDir(options.projectDirectory);
	if (!fs.existsSync(buildDirectory)) throw new Error(`Build directory "${buildDirectory}" does not exist!`);
	const outputDirectory = options.outputDirectory ?? path.join(options.projectDirectory, ".bundle");
	await fs.ensureDir(outputDirectory);
	const message = options.message ?? getDefaultMessage(options.projectDirectory);
	const config = buildMrtConfig(buildDirectory, options.projectDirectory);
	info(`Creating bundle for project: ${projectSlug}`);
	info(`Build directory: ${buildDirectory}`);
	info(`Output directory: ${outputDirectory}`);
	const bundle = await createBundle({
		message,
		ssr_parameters: config.ssrParameters,
		ssr_only: config.ssrOnly,
		ssr_shared: config.ssrShared,
		buildDirectory,
		projectDirectory: options.projectDirectory,
		projectSlug
	});
	const bundleTgzPath = path.join(outputDirectory, "bundle.tgz");
	const bundleJsonPath = path.join(outputDirectory, "bundle.json");
	const bundleData = Buffer.from(bundle.data, "base64");
	const compressedData = await gzip(bundleData);
	await fs.writeFile(bundleTgzPath, compressedData);
	const bundleMetadata = {
		message: bundle.message,
		encoding: bundle.encoding,
		ssr_parameters: bundle.ssr_parameters,
		ssr_only: bundle.ssr_only,
		ssr_shared: bundle.ssr_shared,
		bundle_metadata: bundle.bundle_metadata,
		data_size: bundleData.length
	};
	await fs.writeJson(bundleJsonPath, bundleMetadata, { spaces: 2 });
	success(`Bundle created successfully!`);
	info(`Bundle tgz file: ${bundleTgzPath}`);
	info(`Bundle metadata: ${bundleJsonPath}`);
	info(`Uncompressed size: ${(bundleData.length / 1024 / 1024).toFixed(2)} MB`);
	info(`Compressed size: ${(compressedData.length / 1024 / 1024).toFixed(2)} MB`);
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
	if (!existsSync(tsconfigPath)) return alias;
	try {
		const tsconfigContent = readFileSync(tsconfigPath, "utf-8");
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
	if (!existsSync(configPath)) throw new Error(`config.server.ts not found at ${configPath}.\nPlease ensure config.server.ts exists in your project root.`);
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
	const clientBuildDir = path.join(projectDirectory, "build", "client");
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
	const DEFAULT = zlib$1.constants.Z_DEFAULT_COMPRESSION;
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
/**
* Create a unified Express server for development, preview, or production mode
*/
async function createServer$1(options) {
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
	let registry = null;
	if (mode === "development") {
		const middlewareRegistryPath = resolve(projectDirectory, RELATIVE_MIDDLEWARE_REGISTRY_SOURCE);
		if (existsSync(middlewareRegistryPath)) registry = await importTypescript(middlewareRegistryPath, { projectDirectory });
	} else {
		const possiblePaths = RELATIVE_MIDDLEWARE_REGISTRY_BUILT_PATHS.map((p) => resolve(projectDirectory, p));
		let builtRegistryPath = null;
		for (const path$1 of possiblePaths) if (existsSync(path$1)) {
			builtRegistryPath = path$1;
			break;
		}
		if (builtRegistryPath) registry = await import(pathToFileURL$1(builtRegistryPath).href);
	}
	if (registry?.customMiddlewares && Array.isArray(registry.customMiddlewares)) registry.customMiddlewares.forEach((entry) => {
		app.use(entry.handler);
	});
	if (mode === "development" && vite) app.use(vite.middlewares);
	if (enableProxy) app.use(config.commerce.api.proxy, createCommerceProxyMiddleware(config));
	app.use(createHostHeaderMiddleware());
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
					next(/* @__PURE__ */ new Error("SSR environment is not runnable. Please ensure:\n  1. \"@salesforce/storefront-next-dev\" plugin is added to vite.config.ts\n  2. React Router config uses the Storefront Next preset"));
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
//#region src/commands/dev.ts
/**
* Start the development server with Vite in middleware mode
*/
async function dev(options = {}) {
	const startTime = Date.now();
	const projectDir = path.resolve(options.projectDirectory || process.cwd());
	const port = options.port || 5173;
	process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
	process.env.EXTERNAL_DOMAIN_NAME = process.env.EXTERNAL_DOMAIN_NAME ?? `localhost:${port}`;
	loadEnvFile(projectDir);
	const config = await loadProjectConfig(projectDir);
	const vite = await createServer({
		root: projectDir,
		server: { middlewareMode: true }
	});
	const server = (await createServer$1({
		mode: "development",
		projectDirectory: projectDir,
		config,
		port,
		vite
	})).listen(port, () => {
		printServerInfo("development", port, startTime, projectDir);
		printServerConfig({
			mode: "development",
			port,
			enableProxy: true,
			enableStaticServing: false,
			enableCompression: false,
			proxyPath: config.commerce.api.proxy,
			proxyTarget: getCommerceCloudApiUrl(config.commerce.api.shortCode),
			shortCode: config.commerce.api.shortCode,
			organizationId: config.commerce.api.organizationId,
			clientId: config.commerce.api.clientId,
			siteId: config.commerce.api.siteId
		});
	});
	["SIGTERM", "SIGINT"].forEach((signal) => {
		process.once(signal, () => {
			printShutdownMessage();
			server?.close(() => {
				vite.close();
				process.exit(0);
			});
		});
	});
}

//#endregion
//#region src/commands/preview.ts
/**
* Start the preview server with production build
*/
async function preview(options = {}) {
	const startTime = Date.now();
	const projectDir = path.resolve(options.projectDirectory || process.cwd());
	const port = options.port || 3e3;
	process.env.NODE_ENV = process.env.NODE_ENV ?? "production";
	process.env.EXTERNAL_DOMAIN_NAME = process.env.EXTERNAL_DOMAIN_NAME ?? `localhost:${port}`;
	loadEnvFile(projectDir);
	const buildPath = path.join(projectDir, "build", "server", "index.js");
	if (!fs$1.existsSync(buildPath)) {
		warn("Production build not found. Building project...");
		info("Running: pnpm build");
		try {
			execSync("pnpm build", {
				cwd: projectDir,
				stdio: "inherit"
			});
			info("Build completed successfully");
		} catch (err) {
			error(`Build failed: ${err instanceof Error ? err.message : String(err)}`);
			process.exit(1);
		}
		if (!fs$1.existsSync(buildPath)) {
			error(`Build still not found at ${buildPath} after running build command`);
			process.exit(1);
		}
	}
	info(`Loading production build from ${buildPath}`);
	const build = (await import(pathToFileURL(buildPath).href)).default;
	const config = await loadProjectConfig(projectDir);
	const server = (await createServer$1({
		mode: "preview",
		projectDirectory: projectDir,
		config,
		port,
		build
	})).listen(port, () => {
		printServerInfo("preview", port, startTime, projectDir);
		printServerConfig({
			mode: "preview",
			port,
			enableProxy: true,
			enableStaticServing: true,
			enableCompression: true,
			proxyPath: config.commerce.api.proxy,
			proxyTarget: getCommerceCloudApiUrl(config.commerce.api.shortCode),
			shortCode: config.commerce.api.shortCode,
			organizationId: config.commerce.api.organizationId,
			clientId: config.commerce.api.clientId,
			siteId: config.commerce.api.siteId
		});
	});
	["SIGTERM", "SIGINT"].forEach((signal) => {
		process.once(signal, () => {
			printShutdownMessage();
			server?.close(() => {
				process.exit(0);
			});
		});
	});
}

//#endregion
//#region src/extensibility/create-instructions.ts
const SKIP_DIRS = [
	"node_modules",
	"dist",
	"build"
];
const INSTALL_INSTRUCTIONS_TEMPLATE = "install-instructions.mdc.hbs";
const UNINSTALL_INSTRUCTIONS_TEMPLATE = "uninstall-instructions.mdc.hbs";
/**
* Build the context for the instructions template.
*/
function getContext(projectRoot, markerValue, pwaRepo = "https://github.com/SalesforceCommerceCloud/storefront-next-template.git", branch = "main", filesToCopy = [], extensionConfigPath = "") {
	const extensionConfig = JSON.parse(fs$1.readFileSync(extensionConfigPath, "utf8"));
	if (!extensionConfig.extensions[markerValue]) throw new Error(`Extension ${markerValue} not found in extension config`);
	filesToCopy.forEach((file) => {
		const fullPath = path.join(projectRoot, file);
		if (!fs$1.existsSync(fullPath)) throw new Error(`File or directory ${fullPath} not found`);
	});
	const { mergeFiles, newFiles } = findMarkedFiles(projectRoot, markerValue);
	filesToCopy.push(...newFiles);
	const extensionMeta = extensionConfig.extensions[markerValue];
	const dependencies = (extensionMeta.dependencies || []).map((depKey) => ({
		key: depKey,
		name: extensionConfig.extensions[depKey]?.name || depKey
	}));
	return {
		extensionName: extensionMeta.name,
		pwaRepo,
		branch,
		markerValue,
		mergeFiles,
		newFiles,
		copy: getFilesToCopyContext(projectRoot, filesToCopy),
		dependencies
	};
}
/**
* Get the context for the files to copy.
*/
const getFilesToCopyContext = (projectRoot, filesToCopy) => {
	filesToCopy.forEach((file) => {
		const fullPath = path.join(projectRoot, file);
		if (!fs$1.existsSync(fullPath)) throw new Error(`File or directory ${fullPath} not found`);
	});
	return filesToCopy.map((file) => ({
		src: file,
		dest: file,
		isDirectory: fs$1.statSync(path.join(projectRoot, file)).isDirectory()
	}));
};
/**
* Find all the files that contain the marker value in the project folder.
* @param {string} markerValue
* @returns {string[]} The files that are marked with the marker value
*/
const findMarkedFiles = (projectRoot, markerValue) => {
	const fileTypes = [
		"jsx",
		"tsx",
		"ts",
		"js"
	];
	const mergeFiles = [];
	const newFiles = [];
	const lineRegex = /* @__PURE__ */ new RegExp(`@sfdc-extension-line\\s+${markerValue}`);
	const blockStartRegex = /* @__PURE__ */ new RegExp(`@sfdc-extension-block-start\\s+${markerValue}`);
	const blockEndRegex = /* @__PURE__ */ new RegExp(`@sfdc-extension-block-end\\s+${markerValue}`);
	const fileRegex = /* @__PURE__ */ new RegExp(`@sfdc-extension-file\\s+${markerValue}`);
	const searchFiles = (dir) => {
		const entries = fs$1.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory() && !SKIP_DIRS.includes(entry.name)) searchFiles(fullPath);
			else if (entry.isFile() && fileTypes.some((ext) => fullPath.endsWith(`.${ext}`))) {
				const content = fs$1.readFileSync(fullPath, "utf8");
				if (lineRegex.test(content) || blockStartRegex.test(content) || blockEndRegex.test(content)) mergeFiles.push(path.relative(projectRoot, fullPath));
				else if (fileRegex.test(content)) newFiles.push(path.relative(projectRoot, fullPath));
			}
		}
	};
	searchFiles(projectRoot);
	console.log(`Found ${mergeFiles.length} files to merge for marker value ${markerValue}:`);
	console.log(mergeFiles.join("\n"));
	console.log(`Found ${newFiles.length} files to add for marker value ${markerValue}:`);
	console.log(newFiles.join("\n"));
	return {
		mergeFiles,
		newFiles
	};
};
/**
* Generate the MDC instructions file based on user inputs.
*/
const generateInstructions = (projectRoot, markerValue, outputDir, pwaRepo, branch, filesToCopy, extensionConfig = "", templateDir = "") => {
	const context = getContext(projectRoot, markerValue, pwaRepo, branch, filesToCopy, extensionConfig);
	const instructionsDir = path.join(projectRoot, outputDir || "instructions");
	if (!fs$1.existsSync(instructionsDir)) fs$1.mkdirSync(instructionsDir);
	genertaeAndWriteInstructions(path.join(templateDir, INSTALL_INSTRUCTIONS_TEMPLATE), context, path.join(instructionsDir, `install-${context.extensionName.toLowerCase().replace(/ /g, "-")}.mdc`));
	genertaeAndWriteInstructions(path.join(templateDir, UNINSTALL_INSTRUCTIONS_TEMPLATE), context, path.join(instructionsDir, `uninstall-${context.extensionName.toLowerCase().replace(/ /g, "-")}.mdc`));
};
/**
* Generate the MDC instructions file based on the template file and context.
*/
const genertaeAndWriteInstructions = (templateFile, context, outputFile) => {
	const templateContent = fs$1.readFileSync(templateFile, "utf8");
	const mdcContent = Handlebars.compile(templateContent)(context);
	fs$1.writeFileSync(outputFile, mdcContent, "utf8");
	console.log(`MDC instructions written to ${outputFile}`);
};

//#endregion
//#region src/cartridge-services/react-router-config.ts
let isCliAvailable = null;
function checkReactRouterCli(projectDirectory) {
	if (isCliAvailable !== null) return isCliAvailable;
	try {
		execSync$1("react-router --version", {
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
		execSync$1(`react-router routes --json > "${tempFile}"`, {
			cwd: projectDirectory,
			env: npmRunPathEnv(),
			encoding: "utf-8",
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		});
		const output = readFileSync(tempFile, "utf-8");
		return JSON.parse(output);
	} catch (error$1) {
		throw new Error(`Failed to get routes from React Router CLI: ${error$1.message}`);
	} finally {
		try {
			if (existsSync(tempFile)) unlinkSync(tempFile);
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
	console.warn(`Warning: Could not find route for file: ${filePath}`);
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
	console.log(`${prefix} ${String(component.typeId)}: ${String(component.name)} (${String(component.attributes.length)} attributes) → ${fileName}.json`);
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
	console.log(`${prefix} ${String(pageType.name)}: ${String(pageType.description)} (${String(pageType.attributes.length)} attributes) → ${fileName}.json`);
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
	console.log(`${prefix} ${String(aspect.name)}: ${String(aspect.description)} (${String(aspect.attributeDefinitions.length)} attributes) → ${fileName}.json`);
}
/**
* Runs ESLint with --fix on the specified directory to format JSON files.
* This ensures generated JSON files match the project's Prettier/ESLint configuration.
*/
function lintGeneratedFiles(metadataDir, projectRoot) {
	try {
		console.log("🔧 Running ESLint --fix on generated JSON files...");
		execSync$1(`npx eslint "${metadataDir}/**/*.json" --fix --no-error-on-unmatched-pattern`, {
			cwd: projectRoot,
			stdio: "pipe",
			encoding: "utf-8"
		});
		console.log("✅ JSON files formatted successfully");
	} catch (error$1) {
		const execError = error$1;
		if (execError.status === 2) {
			const errMsg = execError.stderr || execError.stdout || "Unknown error";
			console.warn(`⚠️  Warning: Could not run ESLint --fix: ${errMsg}`);
		} else if (execError.stderr && execError.stderr.includes("error")) console.warn(`⚠️  Warning: Some linting issues could not be auto-fixed. Run ESLint manually to review.`);
		else console.log("✅ JSON files formatted successfully");
	}
}
async function generateMetadata(projectDirectory, metadataDirectory, options) {
	try {
		const filePaths = options?.filePaths;
		const isIncrementalMode = filePaths && filePaths.length > 0;
		const dryRun = options?.dryRun || false;
		if (dryRun) console.log("🔍 [DRY RUN] Scanning for decorated components and page types...");
		else if (isIncrementalMode) console.log(`🔍 Generating metadata for ${filePaths.length} specified file(s)...`);
		else console.log("🔍 Generating metadata for decorated components and page types...");
		const projectRoot = resolve(projectDirectory);
		const srcDir = join(projectRoot, "src");
		const metadataDir = resolve(metadataDirectory);
		const componentsOutputDir = join(metadataDir, "components");
		const pagesOutputDir = join(metadataDir, "pages");
		const aspectsOutputDir = join(metadataDir, "aspects");
		if (!dryRun) {
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
		} else if (isIncrementalMode) console.log(`📝 [DRY RUN] Would process ${filePaths.length} specific file(s)`);
		else console.log("📝 [DRY RUN] Would clean and regenerate all metadata files");
		let files = [];
		if (isIncrementalMode && filePaths) {
			files = filePaths.map((fp) => resolve(projectRoot, fp));
			console.log(`📂 Processing ${files.length} specified file(s)...`);
		} else {
			const scanDirectory = async (dir) => {
				const entries = await readdir(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = join(dir, entry.name);
					if (entry.isDirectory()) {
						if (!SKIP_DIRECTORIES.includes(entry.name)) await scanDirectory(fullPath);
					} else if (entry.isFile() && (extname$1(entry.name) === ".ts" || extname$1(entry.name) === ".tsx" || extname$1(entry.name) === ".json")) files.push(fullPath);
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
			return {
				componentsGenerated: 0,
				pageTypesGenerated: 0,
				aspectsGenerated: 0,
				totalFiles: 0
			};
		}
		if (allComponents.length > 0) {
			console.log(`✅ Found ${allComponents.length} decorated component(s):`);
			for (const component of allComponents) await generateComponentCartridge(component, componentsOutputDir, dryRun);
			if (dryRun) console.log(`📄 [DRY RUN] Would generate ${allComponents.length} component metadata file(s) in: ${componentsOutputDir}`);
			else console.log(`📄 Generated ${allComponents.length} component metadata file(s) in: ${componentsOutputDir}`);
		}
		if (allPageTypes.length > 0) {
			console.log(`✅ Found ${allPageTypes.length} decorated page type(s):`);
			for (const pageType of allPageTypes) await generatePageTypeCartridge(pageType, pagesOutputDir, dryRun);
			if (dryRun) console.log(`📄 [DRY RUN] Would generate ${allPageTypes.length} page type metadata file(s) in: ${pagesOutputDir}`);
			else console.log(`📄 Generated ${allPageTypes.length} page type metadata file(s) in: ${pagesOutputDir}`);
		}
		if (allAspects.length > 0) {
			console.log(`✅ Found ${allAspects.length} decorated aspect(s):`);
			for (const aspect of allAspects) await generateAspectCartridge(aspect, aspectsOutputDir, dryRun);
			if (dryRun) console.log(`📄 [DRY RUN] Would generate ${allAspects.length} aspect metadata file(s) in: ${aspectsOutputDir}`);
			else console.log(`📄 Generated ${allAspects.length} aspect metadata file(s) in: ${aspectsOutputDir}`);
		}
		const shouldLintFix = options?.lintFix !== false;
		if (!dryRun && shouldLintFix && (allComponents.length > 0 || allPageTypes.length > 0 || allAspects.length > 0)) lintGeneratedFiles(metadataDir, projectRoot);
		return {
			componentsGenerated: allComponents.length,
			pageTypesGenerated: allPageTypes.length,
			aspectsGenerated: allAspects.length,
			totalFiles: allComponents.length + allPageTypes.length + allAspects.length
		};
	} catch (error$1) {
		console.error("❌ Error:", error$1.message);
		process.exit(1);
	}
}

//#endregion
//#region src/cartridge-services/types.ts
const WEBDAV_BASE = "/on/demandware.servlet/webdav/Sites";
const CARTRIDGES_PATH = "Cartridges";
const HTTP_METHODS = {
	PUT: "PUT",
	POST: "POST",
	DELETE: "DELETE"
};
const CONTENT_TYPES = {
	APPLICATION_ZIP: "application/zip",
	APPLICATION_FORM_URLENCODED: "application/x-www-form-urlencoded",
	APPLICATION_JSON: "application/json"
};
const WEBDAV_OPERATIONS = {
	UNZIP: "UNZIP",
	TARGET_CARTRIDGES: "cartridges"
};

//#endregion
//#region src/cartridge-services/sfcc-client.ts
/**
* Create HTTP request options for WebDAV operations (file upload/download)
*
* @param instance - The Commerce Cloud instance hostname
* @param path - The WebDAV path (e.g., '/cartridges')
* @param basicAuth - Base64 encoded basic authentication credentials (required)
* @param method - HTTP method (PUT, DELETE, UNZIP, etc.)
* @param formData - Optional form data for the request
* @returns Configured HTTP request options for WebDAV operations
*/
function getWebdavOptions(instance, path$1, basicAuth, method, formData) {
	const endpoint = `${WEBDAV_BASE}/${path$1}`;
	return {
		baseUrl: `https://${instance}`,
		uri: endpoint,
		auth: { basic: basicAuth },
		method,
		...formData && { form: formData }
	};
}
/**
* Check if an HTTP response indicates an authentication error and throw if so
*
* @param response - The HTTP response to check
* @throws Error with authentication message if status code is 401
*/
function checkAuthenticationError(response) {
	if (response.statusCode === 401) throw new Error("Authentication failed. Please login again.");
}
/**
* Execute an HTTP request using the native fetch API with default SSL validation
*
* This function handles general HTTP requests and does not automatically set Content-Type headers.
* Callers must set the appropriate Content-Type header in opts.headers based on their body type
*
* @param opts - HTTP request configuration including URL, method, headers, and body
* @returns Promise resolving to an object containing the HTTP response and parsed body
* @throws Error if the HTTP request fails or cannot be completed
*/
async function makeRequest(opts) {
	const url = opts.uri;
	const fetchOptions = {
		...opts,
		headers: {
			Authorization: `Basic ${opts.auth.basic}`,
			...opts.headers
		}
	};
	if (opts.form) {
		const formData = new URLSearchParams();
		Object.entries(opts.form).forEach(([key, value]) => {
			formData.append(key, String(value));
		});
		fetchOptions.body = formData;
		fetchOptions.headers = {
			...fetchOptions.headers,
			"Content-Type": CONTENT_TYPES.APPLICATION_FORM_URLENCODED
		};
	}
	try {
		const response = await fetch(url, fetchOptions);
		const body = response.headers.get("content-type")?.includes(CONTENT_TYPES.APPLICATION_JSON) ? await response.json() : await response.text();
		const headers = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});
		return {
			response: {
				statusCode: response.status,
				statusMessage: response.statusText,
				headers
			},
			body
		};
	} catch (error$1) {
		throw new Error(`HTTP request failed: ${error$1 instanceof Error ? error$1.message : String(error$1)}`);
	}
}

//#endregion
//#region src/cartridge-services/validation.ts
/**
* Validation error class for cartridge service parameter validation
*/
var ValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ValidationError";
	}
};
/**
* Validate Commerce Cloud instance hostname
*
* @param instance - The instance hostname to validate
* @throws ValidationError if instance is invalid
*/
function validateInstance(instance) {
	if (!instance || typeof instance !== "string") throw new ValidationError("Instance parameter is required and must be a string");
	if (instance.trim().length === 0) throw new ValidationError("Instance parameter cannot be empty");
	if (!instance.includes(".")) throw new ValidationError("Parameter instance must be a valid domain name");
}
/**
* Validate cartridge file (must be a ZIP file)
*
* @param cartridgePath - The cartridge file path to validate
* @throws ValidationError if cartridge is invalid
*/
function validateCartridgePath(cartridgePath) {
	if (!cartridgePath || typeof cartridgePath !== "string") throw new ValidationError("cartridge parameter is required and must be a string");
	if (cartridgePath.trim().length === 0) throw new ValidationError("cartridge parameter cannot be empty");
	const ext = extname(cartridgePath).toLowerCase();
	if (ext !== "") throw new ValidationError(`cartridge must be a directory, got: ${ext}`);
}
/**
* Validate Basic Auth credentials
*
* @param basicAuth - The base64 encoded basic auth credentials to validate
* @throws ValidationError if credentials are invalid
*/
function validateBasicAuth(basicAuth) {
	if (!basicAuth || typeof basicAuth !== "string") throw new ValidationError("Basic auth credentials parameter is required and must be a string");
	if (basicAuth.trim().length === 0) throw new ValidationError("Basic auth credentials parameter cannot be empty");
	if (basicAuth.length < 10) throw new ValidationError("Basic auth credentials appear to be too short to be valid");
}
/**
* Validate code version name
*
* @param version - The code version name to validate
* @throws ValidationError if version is invalid
*/
function validateVersion(version$1) {
	if (!version$1 || typeof version$1 !== "string") throw new ValidationError("Version parameter is required and must be a string");
	if (version$1.trim().length === 0) throw new ValidationError("Version parameter cannot be empty");
	if (!/^[a-zA-Z0-9._-]+$/.test(version$1)) throw new ValidationError("Version parameter contains invalid characters. Only alphanumeric, dots, hyphens, and underscores are allowed");
}
/**
* Validate WebDAV path
*
* @param webdavPath - The WebDAV path to validate
* @throws ValidationError if path is invalid
*/
function validateWebdavPath(webdavPath) {
	if (!webdavPath || typeof webdavPath !== "string") throw new ValidationError("WebDAV path parameter is required and must be a string");
	if (!webdavPath.startsWith("/")) throw new ValidationError("WebDAV path must start with a forward slash");
}
/**
* Validate all parameters for deployCode function
*
* @param instance - Commerce Cloud instance hostname
* @param codeVersionName - Target code version name
* @param cartridgeDirectoryPath - Path to the source directory
* @param basicAuth - Base64 encoded basic auth credentials
* @param cartridgeWebDevPath - WebDAV path for cartridge deployment
* @throws ValidationError if any parameter is invalid
*/
function validateDeployCodeParams(instance, codeVersionName, cartridgeDirectoryPath, basicAuth, cartridgeWebDevPath) {
	validateInstance(instance);
	validateVersion(codeVersionName);
	validateCartridgePath(cartridgeDirectoryPath);
	validateBasicAuth(basicAuth);
	validateWebdavPath(cartridgeWebDevPath);
}

//#endregion
//#region src/cartridge-services/deploy-cartridge.ts
/**
* Extract the filename (including extension) from a file path
*
* @param filePath - The full path to the file
* @returns The filename portion of the path (e.g., 'archive.zip' from '/path/to/archive.zip')
*/
function getFilename(filePath) {
	return path.basename(filePath);
}
/**
* Create a ZIP cartridge from a directory
*
* @param sourceDir - The directory to zip
* @param outputPath - The output ZIP file path (can be same as sourceDir)
* @returns Promise resolving when the ZIP file is created
*/
async function zipCartridge(sourceDir, outputPath) {
	const archive = archiver("zip", { zlib: { level: 9 } });
	const output = fs$1.createWriteStream(outputPath);
	archive.pipe(output);
	archive.directory(sourceDir, false);
	await archive.finalize();
}
/**
* Build the WebDAV endpoint URL for a file
*
* @param instance - The Commerce Cloud instance hostname
* @param path - The WebDAV path (e.g., 'Cartridges/local_metadata')
* @param file - The local file path (filename will be extracted)
* @returns The complete WebDAV endpoint URL
*/
function buildWebdavEndpoint(instance, webdavPath, file) {
	return `https://${instance}${WEBDAV_BASE}/${webdavPath}/${getFilename(file)}`;
}
/**
* Unzip an uploaded archive file on Commerce Cloud via WebDAV
*
* @param instance - The Commerce Cloud instance hostname
* @param path - The WebDAV path where the file was uploaded
* @param file - The local file path (used to determine the remote filename)
* @param basicAuth - Base64 encoded basic authentication credentials
* @returns Promise resolving to HTTP response and body from the unzip operation
*/
async function unzip(instance, webdavPath, file, basicAuth) {
	const endpoint = buildWebdavEndpoint(instance, webdavPath, file);
	const opts = getWebdavOptions(instance, webdavPath, basicAuth, HTTP_METHODS.POST, {
		method: WEBDAV_OPERATIONS.UNZIP,
		target: WEBDAV_OPERATIONS.TARGET_CARTRIDGES
	});
	opts.uri = endpoint;
	const result = await makeRequest(opts);
	checkAuthenticationError(result.response);
	return result;
}
/**
* Delete a file from Commerce Cloud via WebDAV
*
* @param instance - The Commerce Cloud instance hostname
* @param path - The WebDAV path where the file is located
* @param file - The local file path (used to determine the remote filename)
* @param basicAuth - Base64 encoded basic authentication credentials
* @returns Promise resolving to HTTP response and body from the delete operation
*/
async function deleteFile(instance, webdavPath, file, basicAuth) {
	const endpoint = buildWebdavEndpoint(instance, webdavPath, file);
	const opts = getWebdavOptions(instance, webdavPath, basicAuth, HTTP_METHODS.DELETE);
	opts.uri = endpoint;
	const result = await makeRequest(opts);
	checkAuthenticationError(result.response);
	return result;
}
/**
* Upload a file to a specific cartridge version on Commerce Cloud via WebDAV (internal function)
*
* @param instance - The Commerce Cloud instance hostname
* @param codeVersionName - The target code version name
* @param filePath - The local file path to upload
* @param basicAuth - Base64 encoded basic authentication credentials
* @returns Promise resolving to HTTP response and body from the upload operation
*/
async function postFile(instance, codeVersionName, filePath, basicAuth) {
	const targetPath = `${CARTRIDGES_PATH}/${codeVersionName}`;
	try {
		const endpoint = buildWebdavEndpoint(instance, targetPath, filePath);
		const opts = getWebdavOptions(instance, targetPath, basicAuth, HTTP_METHODS.PUT);
		opts.uri = endpoint;
		opts.body = fs$1.createReadStream(filePath);
		opts.duplex = "half";
		opts.headers = {
			...opts.headers,
			"Content-Type": CONTENT_TYPES.APPLICATION_ZIP
		};
		const result = await makeRequest(opts);
		checkAuthenticationError(result.response);
		if (![
			200,
			201,
			204
		].includes(result.response.statusCode)) throw new Error(`Post file "${filePath}" failed: ${result.response.statusCode} (${result.response.statusMessage})`);
		return result;
	} catch (error$1) {
		throw new Error(`Post file "${filePath}" failed: ${error$1 instanceof Error ? error$1.message : String(error$1)}`);
	}
}
/**
* Deploy code to Commerce Cloud by uploading, unzipping, and cleaning up
*
* This function performs a complete code deployment workflow:
* 1. Uploads the archive file via WebDAV to the specified cartridge version
* 2. Unzips the archive on the server
* 3. Deletes the uploaded archive file
* 4. Returns the deployed version name
*
* @param instance - The Commerce Cloud instance hostname
* @param codeVersionName - The target code version name
* @param sourceDir - The local directory containing the source files to deploy
* @param basicAuth - Base64 encoded basic authentication credentials
* @returns Promise resolving to deployment result with the version name
* @throws Error if any step of the deployment process fails
*/
async function deployCode(instance, codeVersionName, sourceDir, basicAuth) {
	validateDeployCodeParams(instance, codeVersionName, sourceDir, basicAuth, `/${CARTRIDGES_PATH}/${codeVersionName}/cartridges`);
	const tempZipPath = path.join(path.dirname(sourceDir), `metadata-${Date.now()}.zip`);
	try {
		await zipCartridge(sourceDir, tempZipPath);
		const file = path.basename(tempZipPath);
		await postFile(instance, codeVersionName, tempZipPath, basicAuth);
		const unzipResult = await unzip(instance, `${CARTRIDGES_PATH}/${codeVersionName}`, file, basicAuth);
		if (![
			200,
			201,
			202
		].includes(unzipResult.response.statusCode)) throw new Error(`Deploy code ${file} failed (unzip step): ${unzipResult.response.statusCode} (${unzipResult.response.statusMessage})`);
		const deleteResult = await deleteFile(instance, `${CARTRIDGES_PATH}/${codeVersionName}`, file, basicAuth);
		if (![200, 204].includes(deleteResult.response.statusCode)) throw new Error(`Delete ZIP file ${file} after deployment failed (deleteFile step): ${deleteResult.response.statusCode} (${deleteResult.response.statusMessage})`);
		return { version: getFilename(file).replace(".zip", "") };
	} catch (error$1) {
		if (error$1 instanceof Error) throw error$1;
		throw new Error(`Deploy code ${sourceDir} failed: ${String(error$1)}`);
	} finally {
		if (fs$1.existsSync(tempZipPath)) fs$1.unlinkSync(tempZipPath);
	}
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
let verbose = false;
function trimExtensions(directory, selectedExtensions, extensionConfig, verboseOverride = false) {
	const startTime = Date.now();
	verbose = verboseOverride ?? false;
	const configuredExtensions = extensionConfig?.extensions || {};
	const extensions = {};
	Object.keys(configuredExtensions).forEach((targetKey) => {
		extensions[targetKey] = Boolean(selectedExtensions?.[targetKey]) || false;
	});
	if (Object.keys(extensions).length === 0) {
		if (verbose) console.log("No targets found, skipping trim");
		return;
	}
	const processDirectory = (dir) => {
		fs$1.readdirSync(dir).forEach((file) => {
			const filePath = path.join(dir, file);
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
	const extensionConfigPath = path.join(projectDirectory, "src", "extensions", "config.json");
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
	const extensionsDir = path.join(projectRoot, "src", "extensions");
	if (!fs$1.existsSync(extensionsDir)) return;
	const configuredExtensions = extensionConfig.extensions;
	Object.keys(extensions).filter((ext) => extensions[ext] === false).forEach((extKey) => {
		const extensionMeta = configuredExtensions[extKey];
		if (extensionMeta?.folder) {
			const extensionFolderPath = path.join(extensionsDir, extensionMeta.folder);
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
//#region src/extensibility/dependency-utils.ts
/**
* Resolve full transitive dependency chain in topological order (dependencies first).
* Example: resolveDependencies('BOPIS', config) → ['Store Locator', 'BOPIS']
*
* @param extensionKey - The extension key to resolve dependencies for
* @param config - The extension configuration
* @returns Array of extension keys in topological order (dependencies first, then the extension itself)
*/
function resolveDependencies(extensionKey, config) {
	const visited = /* @__PURE__ */ new Set();
	const result = [];
	function visit(key) {
		if (visited.has(key)) return;
		visited.add(key);
		const extension = config.extensions[key];
		if (!extension) return;
		const dependencies = extension.dependencies || [];
		for (const dep of dependencies) visit(dep);
		result.push(key);
	}
	visit(extensionKey);
	return result;
}
/**
* Reverse lookup: find immediate extensions that depend on this one.
* Example: getDependents('Store Locator', config) → ['BOPIS']
*
* @param extensionKey - The extension key to find dependents for
* @param config - The extension configuration
* @returns Array of extension keys that directly depend on this extension
*/
function getDependents(extensionKey, config) {
	const dependents = [];
	for (const [key, extension] of Object.entries(config.extensions)) if ((extension.dependencies || []).includes(extensionKey)) dependents.push(key);
	return dependents;
}
/**
* Resolve full transitive dependent chain in reverse topological order (dependents first).
* Example: resolveDependents('Store Locator', config) → ['BOPIS', 'Store Locator']
*
* @param extensionKey - The extension key to resolve dependents for
* @param config - The extension configuration
* @returns Array of extension keys in reverse topological order (dependents first, then the extension itself)
*/
function resolveDependents(extensionKey, config) {
	const visited = /* @__PURE__ */ new Set();
	const result = [];
	function visit(key) {
		if (visited.has(key)) return;
		visited.add(key);
		const dependents = getDependents(key, config);
		for (const dep of dependents) visit(dep);
		result.push(key);
	}
	visit(extensionKey);
	return result;
}
/**
* Validate that no circular dependencies exist in the configuration.
* Throws a descriptive error if a cycle is found.
*
* @param config - The extension configuration to validate
* @throws Error if a circular dependency is detected
*/
function validateNoCycles(config) {
	const visiting = /* @__PURE__ */ new Set();
	const visited = /* @__PURE__ */ new Set();
	function visit(key, path$1) {
		if (visited.has(key)) return;
		if (visiting.has(key)) {
			const cycleStart = path$1.indexOf(key);
			const cyclePath = [...path$1.slice(cycleStart), key];
			throw new Error(`Circular dependency detected: ${cyclePath.join(" -> ")}`);
		}
		visiting.add(key);
		path$1.push(key);
		const extension = config.extensions[key];
		if (extension) {
			const dependencies = extension.dependencies || [];
			for (const dep of dependencies) visit(dep, path$1);
		}
		path$1.pop();
		visiting.delete(key);
		visited.add(key);
	}
	for (const key of Object.keys(config.extensions)) visit(key, []);
}
/**
* Filter resolved dependencies to only those not yet installed.
* Returns dependencies in topological order (install order).
*
* @param extensionKey - The extension key to check dependencies for
* @param installedExtensions - Array of already installed extension keys
* @param config - The extension configuration
* @returns Array of missing extension keys in topological order (install order)
*/
function getMissingDependencies(extensionKey, installedExtensions, config) {
	const allDependencies = resolveDependencies(extensionKey, config);
	const installedSet = new Set(installedExtensions);
	return allDependencies.filter((key) => !installedSet.has(key));
}
/**
* Resolve dependencies for multiple extensions, merging and deduplicating the results.
* Returns all dependencies in topological order.
*
* @param extensionKeys - Array of extension keys to resolve dependencies for
* @param config - The extension configuration
* @returns Array of all extension keys in topological order (dependencies first)
*/
function resolveDependenciesForMultiple(extensionKeys, config) {
	const allDeps = /* @__PURE__ */ new Set();
	const result = [];
	for (const key of extensionKeys) {
		const deps = resolveDependencies(key, config);
		for (const dep of deps) if (!allDeps.has(dep)) {
			allDeps.add(dep);
			result.push(dep);
		}
	}
	return result;
}
/**
* Resolve dependents for multiple extensions, merging and deduplicating the results.
* Returns all dependents in reverse topological order (uninstall order).
*
* @param extensionKeys - Array of extension keys to resolve dependents for
* @param config - The extension configuration
* @returns Array of all extension keys in reverse topological order (dependents first)
*/
function resolveDependentsForMultiple(extensionKeys, config) {
	const allDeps = /* @__PURE__ */ new Set();
	const result = [];
	for (const key of extensionKeys) {
		const deps = resolveDependents(key, config);
		for (const dep of deps) if (!allDeps.has(dep)) {
			allDeps.add(dep);
			result.push(dep);
		}
	}
	return result;
}

//#endregion
//#region src/utils/local-dev-setup.ts
/**
* Prepares a cloned template for standalone use outside the monorepo.
* Prompts user for local package paths and replaces workspace:* dependencies with file: references.
*/
async function prepareForLocalDev(options) {
	const { projectDirectory, sourcePackagesDir } = options;
	const packageJsonPath = path.join(projectDirectory, "package.json");
	if (!fs.existsSync(packageJsonPath)) throw new Error(`package.json not found in ${projectDirectory}`);
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const workspaceDeps = [];
	for (const depType of [
		"dependencies",
		"devDependencies",
		"peerDependencies"
	]) {
		const deps = packageJson[depType];
		if (!deps) continue;
		for (const [pkg, version$1] of Object.entries(deps)) if (typeof version$1 === "string" && version$1.startsWith("workspace:")) workspaceDeps.push({
			pkg,
			depType
		});
	}
	if (workspaceDeps.length === 0) {
		info("No workspace:* dependencies found. Project is ready for standalone use.");
		return;
	}
	console.log("\n🔗 Found workspace dependencies that need to be linked to local packages:\n");
	for (const { pkg } of workspaceDeps) console.log(`   • ${pkg}`);
	console.log("");
	const defaultPaths = {};
	if (sourcePackagesDir) {
		defaultPaths["@salesforce/storefront-next-dev"] = path.join(sourcePackagesDir, "storefront-next-dev");
		defaultPaths["@salesforce/storefront-next-runtime"] = path.join(sourcePackagesDir, "storefront-next-runtime");
	}
	const resolvedPaths = {};
	for (const { pkg } of workspaceDeps) {
		if (resolvedPaths[pkg]) continue;
		const defaultPath = defaultPaths[pkg] || "";
		const defaultExists = defaultPath && fs.existsSync(defaultPath);
		const { localPath } = await prompts({
			type: "text",
			name: "localPath",
			message: `📦 Path to ${pkg}:`,
			initial: defaultExists ? defaultPath : "",
			validate: (value) => {
				if (!value) return "Path is required";
				if (!fs.existsSync(value)) return `Directory not found: ${value}`;
				if (!fs.existsSync(path.join(value, "package.json"))) return `No package.json found in: ${value}`;
				return true;
			}
		});
		if (!localPath) {
			warn(`Skipping ${pkg} - no path provided`);
			continue;
		}
		resolvedPaths[pkg] = localPath;
	}
	let modified = false;
	for (const depType of [
		"dependencies",
		"devDependencies",
		"peerDependencies"
	]) {
		const deps = packageJson[depType];
		if (!deps) continue;
		for (const [pkg, version$1] of Object.entries(deps)) if (typeof version$1 === "string" && version$1.startsWith("workspace:")) {
			const localPath = resolvedPaths[pkg];
			if (localPath) {
				const fileRef = `file:${localPath}`;
				info(`Linked ${pkg} → ${fileRef}`);
				deps[pkg] = fileRef;
				modified = true;
			} else {
				warn(`Removing unresolved workspace dependency: ${pkg}`);
				delete deps[pkg];
				modified = true;
			}
		}
	}
	if (packageJson.volta?.extends) {
		delete packageJson.volta.extends;
		if (Object.keys(packageJson.volta).length === 0) delete packageJson.volta;
		modified = true;
	}
	if (modified) {
		fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);
		success("package.json updated with local package links");
		patchViteConfigForLinkedPackages(projectDirectory, Object.keys(resolvedPaths));
	}
}
/**
* Patches vite.config.ts to fix "You must render this element inside a <HydratedRouter>" errors
* that occur when using file: linked packages.
*
* The fix adds:
* 1. resolve.dedupe for react, react-dom, react-router (helps with non-linked duplicates)
* 2. ssr.noExternal for file-linked packages (key fix - bundles them so they use host's dependencies)
*
* When packages are in ssr.noExternal, Vite bundles them during SSR instead of externalizing.
* During bundling, their imports resolve through the host project's node_modules,
* ensuring all code uses the same react-router instance with the same context.
*/
function patchViteConfigForLinkedPackages(projectDirectory, linkedPackages) {
	const viteConfigPath = path.join(projectDirectory, "vite.config.ts");
	if (!fs.existsSync(viteConfigPath)) {
		warn("vite.config.ts not found, skipping patch for file-linked packages");
		return;
	}
	if (linkedPackages.length === 0) return;
	let viteConfig = fs.readFileSync(viteConfigPath, "utf8");
	let modified = false;
	if (!viteConfig.includes("dedupe:")) {
		const resolveMatch = viteConfig.match(/resolve:\s*\{/);
		if (resolveMatch && resolveMatch.index !== void 0) {
			const insertPos = resolveMatch.index + resolveMatch[0].length;
			viteConfig = viteConfig.slice(0, insertPos) + `
            // Deduplicates packages to prevent context issues with file-linked packages
            dedupe: ['react', 'react-dom', 'react-router'],` + viteConfig.slice(insertPos);
			modified = true;
		}
	}
	const packageList = linkedPackages.map((p) => `'${p}'`).join(", ");
	if (/ssr:\s*\{[^}]*noExternal:/.test(viteConfig)) {
		const noExternalArrayRegex = /noExternal:\s*\[([^\]]*)\]/;
		const noExternalMatch = viteConfig.match(noExternalArrayRegex);
		if (noExternalMatch) {
			const existingPackages = noExternalMatch[1];
			const packagesToAdd = linkedPackages.filter((p) => !existingPackages.includes(p));
			if (packagesToAdd.length > 0) {
				const newPackageList = packagesToAdd.map((p) => `'${p}'`).join(", ");
				const newArray = existingPackages.trim() ? `[${existingPackages.trim()}, ${newPackageList}]` : `[${newPackageList}]`;
				viteConfig = viteConfig.replace(noExternalArrayRegex, `noExternal: ${newArray}`);
				modified = true;
			}
		}
	} else {
		const ssrMatch = viteConfig.match(/ssr:\s*\{/);
		if (ssrMatch && ssrMatch.index !== void 0) {
			const insertPos = ssrMatch.index + ssrMatch[0].length;
			const noExternalBlock = `
            // Bundle file-linked packages so they use host project's dependencies
            // This prevents "You must render this element inside a <HydratedRouter>" errors
            noExternal: [${packageList}],`;
			viteConfig = viteConfig.slice(0, insertPos) + noExternalBlock + viteConfig.slice(insertPos);
			modified = true;
		} else {
			const returnMatch = viteConfig.match(/return\s*\{/);
			if (returnMatch && returnMatch.index !== void 0) {
				const insertPos = returnMatch.index + returnMatch[0].length;
				const ssrBlock = `
        // SSR config for file-linked packages
        ssr: {
            // Bundle file-linked packages so they use host project's dependencies
            // This prevents "You must render this element inside a <HydratedRouter>" errors
            noExternal: [${packageList}],
            target: 'node',
        },`;
				viteConfig = viteConfig.slice(0, insertPos) + ssrBlock + viteConfig.slice(insertPos);
				modified = true;
			}
		}
	}
	if (modified) {
		fs.writeFileSync(viteConfigPath, viteConfig);
		success("vite.config.ts patched for file-linked packages (ssr.noExternal + resolve.dedupe)");
	} else info("vite.config.ts already configured for file-linked packages");
}

//#endregion
//#region src/create-storefront.ts
const DEFAULT_STOREFRONT = "sfcc-storefront";
const STOREFRONT_NEXT_GITHUB_URL = "https://github.com/SalesforceCommerceCloud/storefront-next-template";
const createStorefront = async (options = {}) => {
	try {
		execSync("git --version", { stdio: "ignore" });
	} catch (e) {
		error(`❌ git isn't installed or found in your PATH. Install git before running this command: ${String(e)}`);
		process.exit(1);
	}
	let storefront = options.name;
	if (!storefront) storefront = (await prompts({
		type: "text",
		name: "storefront",
		message: "🏪 What would you like to name your storefront?\n",
		initial: DEFAULT_STOREFRONT
	})).storefront;
	if (!storefront) {
		error("Storefront name is required.");
		process.exit(1);
	}
	console.log("\n");
	let template = options.template;
	if (!template) {
		template = (await prompts({
			type: "select",
			name: "template",
			message: "📄 Which template would you like to use for your storefront?\n",
			choices: [{
				title: "Salesforce B2C Commerce Retail Storefront",
				value: STOREFRONT_NEXT_GITHUB_URL
			}, {
				title: "A different template (I will provide the Github URL)",
				value: "custom"
			}]
		})).template;
		console.log("\n");
		if (template === "custom") {
			const { githubUrl } = await prompts({
				type: "text",
				name: "githubUrl",
				message: "🌐 What is the Github URL for your template?\n"
			});
			if (!githubUrl) {
				error("Github URL is required.");
				process.exit(1);
			}
			template = githubUrl;
		}
	}
	if (!template) {
		error("Template is required.");
		process.exit(1);
	}
	execSync(`git clone --depth 1 ${template} ${storefront}`);
	const gitDir = path.join(storefront, ".git");
	if (fs.existsSync(gitDir)) fs.rmSync(gitDir, {
		recursive: true,
		force: true
	});
	if (template.startsWith("file://") || options.localPackagesDir) {
		const templatePath = template.replace("file://", "");
		const sourcePackagesDir = options.localPackagesDir || path.dirname(templatePath);
		await prepareForLocalDev({
			projectDirectory: storefront,
			sourcePackagesDir
		});
	}
	console.log("\n");
	if (fs.existsSync(path.join(storefront, "src", "extensions", "config.json"))) {
		const extensionConfigText = fs.readFileSync(path.join(storefront, "src", "extensions", "config.json"), "utf8");
		const extensionConfig = JSON.parse(extensionConfigText);
		if (extensionConfig.extensions) {
			try {
				validateNoCycles(extensionConfig);
			} catch (e) {
				error(`Extension configuration error: ${e.message}`);
				process.exit(1);
			}
			const { selectedExtensions } = await prompts({
				type: "multiselect",
				name: "selectedExtensions",
				message: "🔌 Which extension would you like to enable? (Use arrow keys to select, space to toggle, and enter to confirm.)\n",
				choices: Object.keys(extensionConfig.extensions).map((extension) => ({
					title: `${extensionConfig.extensions[extension].name} - ${extensionConfig.extensions[extension].description}`,
					value: extension,
					selected: extensionConfig.extensions[extension].defaultOn ?? true
				})),
				instructions: false
			});
			const resolvedExtensions = resolveDependenciesForMultiple(selectedExtensions, extensionConfig);
			const selectedSet = new Set(selectedExtensions);
			const autoAdded = resolvedExtensions.filter((ext) => !selectedSet.has(ext));
			if (autoAdded.length > 0) for (const addedExt of autoAdded) {
				const dependentExts = selectedExtensions.filter((selected) => {
					return (extensionConfig.extensions[selected]?.dependencies || []).includes(addedExt) || resolvedExtensions.indexOf(addedExt) < resolvedExtensions.indexOf(selected);
				});
				if (dependentExts.length > 0) {
					const addedName = extensionConfig.extensions[addedExt]?.name || addedExt;
					warn(`${dependentExts.map((ext) => extensionConfig.extensions[ext]?.name || ext).join(", ")} requires ${addedName}. ${addedName} has been automatically added.`);
				}
			}
			const enabledExtensions = Object.fromEntries(resolvedExtensions.map((ext) => [ext, true]));
			trimExtensions(storefront, enabledExtensions, { extensions: extensionConfig.extensions }, options?.verbose || false);
		}
	}
	const configMeta = JSON.parse(fs.readFileSync(path.join(storefront, "src", "config", "config-meta.json"), "utf8"));
	const envDefaultPath = path.join(storefront, ".env.default");
	let envDefaultValues = {};
	if (fs.existsSync(envDefaultPath)) envDefaultValues = dotenv.parse(fs.readFileSync(envDefaultPath, "utf8"));
	console.log("\n⚙️ We will now configure your storefront before it will be ready to run.\n");
	const configOverrides = {};
	for (const config of configMeta.configs) {
		const answer = await prompts({
			type: "text",
			name: config.key,
			message: `What is the value for ${config.name}? (default: ${envDefaultValues[config.key]})\n`,
			initial: envDefaultValues[config.key] ?? ""
		});
		configOverrides[config.key] = answer[config.key];
	}
	generateEnvFile(storefront, configOverrides);
	const BANNER = `
    ╔══════════════════════════════════════════════════════════════════╗
    ║                       CONGRATULATIONS                            ║
    ╚══════════════════════════════════════════════════════════════════╝

        🎉 Congratulations! Your storefront is ready to use! 🎉
        What's next:
        - Navigate to the storefront directory: cd ${storefront}
        - Install dependencies: pnpm install
        - Build the storefront: pnpm run build
        - Run the development server: pnpm run dev
    `;
	console.log(BANNER);
};

//#endregion
//#region src/extensibility/manage-extensions.ts
const EXTENSIONS_DIR = ["src", "extensions"];
const CONFIG_PATH = [...EXTENSIONS_DIR, "config.json"];
const EXTENSION_FOLDERS = [
	"components",
	"locales",
	"hooks",
	"routes"
];
/**
* Console log a message with a specific type
* @param message string
* @param type
*/
const consoleLog = (message, type) => {
	switch (type) {
		case "error":
			console.error(`❌ ${message}`);
			break;
		case "success":
			console.log(`✅ ${message}`);
			break;
		default:
			console.log(message);
			break;
	}
};
/**
* Get the path to the extension config file
*/
const getExtensionConfigPath = (projectDirectory) => {
	return path.join(projectDirectory, ...CONFIG_PATH);
};
/**
* Check if the project directory contains the extensions directory and config.json file
*/
const getExtensionConfig = (projectDirectory) => {
	const extensionConfigPath = getExtensionConfigPath(projectDirectory);
	if (!fs.existsSync(extensionConfigPath)) {
		consoleLog(`Extension config file not found: ${extensionConfigPath}. Are you running this command in the correct project directory?`, "error");
		process.exit(1);
	}
	return JSON.parse(fs.readFileSync(extensionConfigPath, "utf8")).extensions;
};
/**
* Common function to get the extension selection from the user
* @param type 'multiselect' | 'select'
* @param extensionConfig Record<string, ExtensionMeta>
* @param message string
* @param installedExtensions string[]
* @param excludeExtensions string[] extensions to exclude from the list, so we can filter out extensions that are already installed
* @returns string[]
*/
const getExtensionSelection = async (type, extensionConfig, message, installedExtensions, excludeExtensions = []) => {
	consoleLog("\n", "info");
	const { selectedExtensions } = await prompts({
		type,
		name: "selectedExtensions",
		message,
		choices: installedExtensions.filter((extensionKey) => !excludeExtensions.includes(extensionKey)).map((extensionKey) => ({
			title: `${extensionConfig[extensionKey].name} - ${extensionConfig[extensionKey].description}`,
			value: extensionKey
		})),
		instructions: false
	});
	return type === "multiselect" ? selectedExtensions : [selectedExtensions];
};
/**
* Handle the uninstallation of extensions
* @param extensionConfig Record<string, ExtensionMeta>
* @param options {
projectDirectory: string;
extensions?: string[];
verbose?: boolean;
}
* @returns void
*/
const handleUninstall = async (extensionConfig, options) => {
	let installedExtensions = Object.keys(extensionConfig);
	if (installedExtensions.length === 0) {
		consoleLog("\n You have not installed any extensions yet.", "error");
		return;
	}
	const selectedExtensions = options.extensions ? options.extensions : await getExtensionSelection("multiselect", extensionConfig, "🔌 Which extensions would you like to uninstall?", installedExtensions);
	if (selectedExtensions == null || selectedExtensions.length === 0) {
		consoleLog("\n Please select at least one extension to uninstall.", "error");
		return;
	}
	const allToUninstall = resolveDependentsForMultiple(selectedExtensions, { extensions: extensionConfig });
	const installedSet = new Set(installedExtensions);
	const extensionsToUninstall = allToUninstall.filter((key) => installedSet.has(key));
	const selectedSet = new Set(selectedExtensions);
	const additionalDependents = extensionsToUninstall.filter((key) => !selectedSet.has(key));
	if (additionalDependents.length > 0) {
		consoleLog("\n", "info");
		consoleLog(`Uninstalling the selected extension(s) will also uninstall the following dependent extensions:`, "info");
		additionalDependents.forEach((depKey) => {
			const depExtension = extensionConfig[depKey];
			const dependsOn = selectedExtensions.find((selKey) => {
				return extensionConfig[selKey] && extensionConfig[depKey]?.dependencies?.includes(selKey);
			});
			const dependsOnName = dependsOn ? extensionConfig[dependsOn]?.name : "selected extension";
			consoleLog(` • ${depExtension?.name || depKey} (depends on ${dependsOnName})`, "info");
		});
		consoleLog("\n", "info");
		const { confirmUninstall } = await prompts({
			type: "confirm",
			name: "confirmUninstall",
			message: `Uninstall all ${extensionsToUninstall.length} extensions?`,
			initial: true
		});
		if (!confirmUninstall) {
			consoleLog("Uninstallation aborted.", "info");
			return;
		}
	}
	extensionsToUninstall.forEach((ext) => {
		if (extensionConfig[ext]?.folder) fs.rmSync(path.join(options.projectDirectory, ...EXTENSIONS_DIR, extensionConfig[ext].folder), {
			recursive: true,
			force: true
		});
	});
	const extensionsToUninstallSet = new Set(extensionsToUninstall);
	installedExtensions = installedExtensions.filter((ext) => !extensionsToUninstallSet.has(ext));
	trimExtensions(options.projectDirectory, Object.fromEntries(installedExtensions.map((ext) => [ext, true])), { extensions: extensionConfig }, options.verbose ?? false);
	consoleLog(" Extensions uninstalled.", "success");
};
/**
* Install a single extension (internal helper)
* @returns true if installation succeeded, false otherwise
*/
const installSingleExtension = (extensionKey, srcExtensionConfig, extensionConfig, tmpDir, projectDirectory) => {
	const extension = srcExtensionConfig[extensionKey];
	const startTime = Date.now();
	if (extension.folder) fs.copySync(path.join(tmpDir, ...EXTENSIONS_DIR, extension.folder), path.join(projectDirectory, ...EXTENSIONS_DIR, extension.folder));
	if (extension.installationInstructions) {
		console.log(`\n⏳ Installing ${extension.name}, this will take a few minutes...`);
		try {
			execSync(`cursor-agent -p --force 'Execute the steps specified in the installation instructions file: ${extension.installationInstructions}' --output-format text`, {
				cwd: projectDirectory,
				stdio: "inherit"
			});
		} catch (e) {
			consoleLog(`Error installing ${extension.name}. ${e.message}`, "error");
			return false;
		}
	}
	extensionConfig[extensionKey] = extension;
	fs.writeFileSync(getExtensionConfigPath(projectDirectory), JSON.stringify({ extensions: extensionConfig }, null, 4));
	consoleLog(`${extension.name} was installed successfully. (${Date.now() - startTime}ms)`, "success");
	return true;
};
/**
* Handle the installation of extensions
* @param extensionConfig
* @param options {
sourceGithubUrl?: string;
projectDirectory: string;
extensions?: string[];
verbose?: boolean;
}
* @returns
*/
const handleInstall = async (extensionConfig, options) => {
	const { sourceGitUrl } = await prompts({
		type: "text",
		name: "sourceGitUrl",
		message: "🌐 What is the Git URL for the extensions project?",
		initial: options.sourceGitUrl
	});
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `sfnext-extensions-${Date.now()}`));
	execSync(`git clone ${sourceGitUrl} ${tmpDir}`);
	const srcExtensionConfig = getExtensionConfig(tmpDir);
	if (srcExtensionConfig == null || Object.keys(srcExtensionConfig).length === 0) {
		consoleLog(`No extensions found in the source project, please check ${path.join(...CONFIG_PATH)} exists in ${sourceGitUrl} and contains at least one extension.`, "error");
		return;
	}
	const selectedExtensions = options.extensions ? options.extensions : await getExtensionSelection("select", srcExtensionConfig, "🔌 Which extension would you like to install?", Object.keys(srcExtensionConfig), Object.keys(extensionConfig));
	if (selectedExtensions == null || selectedExtensions.length !== 1 || selectedExtensions[0] == null) {
		consoleLog("Please select exactly one extension to install.", "error");
		return;
	}
	const extensionKey = selectedExtensions[0];
	const extension = srcExtensionConfig[extensionKey];
	if (Object.values(srcExtensionConfig).some((ext) => ext.installationInstructions)) try {
		execSync("cursor-agent -v", { stdio: "ignore" });
	} catch (e) {
		consoleLog("This extension contains LLM instructions, please install cursor cli and try again. (https://cursor.com/docs/cli/overview)", "error");
		return;
	}
	const srcConfig = { extensions: srcExtensionConfig };
	const missingDeps = getMissingDependencies(extensionKey, Object.keys(extensionConfig), srcConfig);
	const dependenciesToInstall = missingDeps.slice(0, -1);
	let hasError = false;
	try {
		if (dependenciesToInstall.length > 0) {
			consoleLog("\n", "info");
			consoleLog(`Installing ${extension.name} requires the following dependencies:`, "info");
			dependenciesToInstall.forEach((depKey) => {
				const depExtension = srcExtensionConfig[depKey];
				consoleLog(` • ${depExtension?.name || depKey} (not installed)`, "info");
			});
			consoleLog("\n", "info");
			const estimatedMinutes = missingDeps.length * 5;
			const { confirmInstall } = await prompts({
				type: "confirm",
				name: "confirmInstall",
				message: `Install all ${missingDeps.length} extensions? (~${estimatedMinutes} minutes total)`,
				initial: true
			});
			if (!confirmInstall) {
				consoleLog("Installation aborted.", "info");
				return;
			}
		}
		for (const depKey of missingDeps) if (!installSingleExtension(depKey, srcExtensionConfig, extensionConfig, tmpDir, options.projectDirectory)) hasError = true;
	} finally {
		fs.rmSync(tmpDir, {
			recursive: true,
			force: true
		});
	}
	const originalFiles = fs.readdirSync(path.join(options.projectDirectory, "src"), { recursive: true }).filter((file) => file.toString().endsWith(".original"));
	if (originalFiles.length > 0) {
		consoleLog("\n📄 The following files were modified. The original files are still available in the same location with the \".original\" extension.:", "info");
		originalFiles.forEach((file) => {
			consoleLog(`- ${file.toString().replace(".original", "")}`, "info");
		});
	}
	if (!hasError) consoleLog("\n🚀 Installation completed successfully.", "info");
};
const manageExtensions = async (options) => {
	if (options.install && options.uninstall) {
		consoleLog("Please select either install or uninstall, not both.", "error");
		return;
	}
	let operation = options.install ? "install" : options.uninstall ? "uninstall" : void 0;
	const extensionConfig = getExtensionConfig(options.projectDirectory);
	if (operation == null) operation = (await prompts({
		type: "select",
		name: "operation",
		message: "🤔 What would you like to do?",
		choices: [{
			title: "Install extensions",
			value: "install"
		}, {
			title: "Uninstall extensions",
			value: "uninstall"
		}]
	})).operation;
	if (operation === "uninstall") await handleUninstall(extensionConfig, options);
	else await handleInstall(extensionConfig, options);
};
const getExtensionMarker = (val) => {
	return `SFDC_EXT_${val.toUpperCase().replaceAll(" ", "_").replaceAll("-", "_")}`;
};
const getExtensionFolderName = (val) => {
	return val.toLowerCase().replaceAll(" ", "-").trim();
};
const getExtensionNameSchema = (projectDirectory, extensionConfig) => {
	return z.object({ name: z.string().regex(/^[a-zA-Z0-9 _-]+$/, { message: "Extension name can only contain alphanumeric characters, spaces, dashes, or underscores" }) }).superRefine((data, ctx) => {
		if (extensionConfig[getExtensionMarker(data.name)]) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Extension "${data.name}" already exists`
		});
		if (fs.existsSync(path.join(projectDirectory, ...EXTENSIONS_DIR, getExtensionFolderName(data.name)))) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Extension directory ${getExtensionFolderName(data.name)} already exists`
		});
	});
};
const listExtensions = (options) => {
	const extensionConfig = getExtensionConfig(options.projectDirectory);
	consoleLog("The following extensions are installed:", "info");
	Object.keys(extensionConfig).forEach((key) => {
		consoleLog(`- ${extensionConfig[key].name}: ${extensionConfig[key].description}`, "info");
	});
};
const createExtension = async (options) => {
	const { projectDirectory, name, description } = options;
	const extensionConfig = getExtensionConfig(projectDirectory);
	let extensionName = name;
	let extensionDescription = description;
	if (extensionName == null || extensionName.trim() === "") extensionName = (await prompts({
		type: "text",
		name: "extensionName",
		message: "What would you like to name the extension? (e.g., \"My Extension\")"
	})).extensionName;
	const result = getExtensionNameSchema(projectDirectory, extensionConfig).safeParse({ name: extensionName });
	if (!result.success) {
		const firstIssueMessage = result.error.issues?.[0]?.message;
		consoleLog(firstIssueMessage, "error");
		return;
	}
	if (extensionDescription == null || extensionDescription.trim() === "") extensionDescription = (await prompts({
		type: "text",
		name: "extensionDescription",
		message: "How would you describe the extension?"
	})).extensionDescription;
	const folderName = getExtensionFolderName(extensionName);
	const extensionFolderPath = path.join(projectDirectory, ...EXTENSIONS_DIR, folderName);
	fs.mkdirSync(extensionFolderPath, { recursive: true });
	EXTENSION_FOLDERS.forEach((folder) => {
		fs.mkdirSync(path.join(extensionFolderPath, folder), { recursive: true });
	});
	fs.writeFileSync(path.join(extensionFolderPath, "README.md"), `# ${extensionName}\n\n${extensionDescription}`);
	const marker = getExtensionMarker(extensionName);
	extensionConfig[marker] = {
		name: extensionName,
		description: extensionDescription,
		installationInstructions: "",
		uninstallationInstructions: "",
		folder: folderName,
		dependencies: []
	};
	fs.writeFileSync(path.join(projectDirectory, ...CONFIG_PATH), JSON.stringify({ extensions: extensionConfig }, null, 4));
	consoleLog(`Extension "${extensionName}" scaffolding was created successfully.`, "success");
};

//#endregion
//#region src/cli.ts
const __dirname = dirname(fileURLToPath(import.meta.url));
function validateAndBuildPaths(options) {
	if (!options.projectDirectory) {
		error("--project-directory is required.");
		process.exit(1);
	}
	if (!fs.existsSync(options.projectDirectory)) {
		error(`Project directory doesn't exist: ${options.projectDirectory}`);
		process.exit(1);
	}
	const cartridgeBaseDir = path.join(options.projectDirectory, CARTRIDGES_BASE_DIR);
	const metadataDir = path.join(options.projectDirectory, CARTRIDGES_BASE_DIR, SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR);
	return {
		projectDirectory: options.projectDirectory,
		cartridgeBaseDir,
		metadataDir
	};
}
/**
* Shared function to generate cartridge metadata
* Used by both the generate-cartridge command and the push command (when enabled)
*/
async function runGenerateCartridge(projectDirectory) {
	const { projectDirectory: validatedProjectDir, metadataDir } = validateAndBuildPaths({ projectDirectory });
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
async function runDeployCartridge(projectDirectory) {
	const dwJsonPath = path.join(__dirname, "..", "dw.json");
	if (!fs.existsSync(dwJsonPath)) throw new Error(`The dw.json file not found in storefront-next-dev directory. Make sure dw.json exists at ${dwJsonPath}`);
	const dwConfig = JSON.parse(fs.readFileSync(dwJsonPath, "utf8"));
	const { cartridgeBaseDir, metadataDir } = validateAndBuildPaths({ projectDirectory });
	if (!fs.existsSync(metadataDir)) throw new Error(`Metadata directory doesn't exist: ${metadataDir}. Run 'generate-cartridge' first.`);
	if (!dwConfig.username || !dwConfig.password) throw new Error("Username and password are required in the dw.json file.");
	const instance = dwConfig.hostname;
	if (!instance) throw new Error("Instance is required. Add \"hostname\" to the dw.json file.");
	const codeVersion = dwConfig["code-version"];
	if (!codeVersion) throw new Error("Code version is required. Add \"code-version\" to the dw.json file.");
	const credentials = `${dwConfig.username}:${dwConfig.password}`;
	success(`Code deployed to version "${(await deployCode(instance, codeVersion, cartridgeBaseDir, Buffer.from(credentials).toString("base64"))).version}" successfully!`);
}
const program = new Command();
const DEFAULT_TEMPLATE_GIT_URL = process.env.DEFAULT_TEMPLATE_GIT_URL || "https://github.com/SalesforceCommerceCloud/storefront-next-template.git";
const handleCommandError = (label, err) => {
	if (err instanceof Error) {
		error(err.stack || err.message);
		error(`${label} failed: ${err.message}`);
	} else {
		error(String(err));
		error(`${label} failed`);
	}
	process.exit(1);
};
program.name("sfnext").description("Dev and build tools for Storefront Next.").version(version);
program.command("create-storefront").description("Create a storefront project.").option("-v --verbose", "Verbose mode").option("-n, --name <name>", "Name for the storefront (skips interactive prompt)").option("-t, --template <template>", "Template URL or path (e.g., file:///path/to/template or GitHub URL)").option("-l, --local-packages-dir <dir>", "Local monorepo packages directory for file:// templates (pre-fills dependency paths)").action(async (options) => {
	try {
		await createStorefront({
			verbose: options.verbose,
			name: options.name,
			template: options.template,
			localPackagesDir: options.localPackagesDir
		});
	} catch (err) {
		handleCommandError("create-storefront", err);
	}
});
program.command("prepare-local").description("Prepare a storefront project for local development with file-linked packages. Converts workspace:* dependencies to file: references and patches vite.config.ts.").option("-d, --project-directory <dir>", "Project directory to prepare", process.cwd()).option("-s, --source-packages-dir <dir>", "Source monorepo packages directory (for default path suggestions)").action(async (options) => {
	try {
		await prepareForLocalDev({
			projectDirectory: options.projectDirectory,
			sourcePackagesDir: options.sourcePackagesDir
		});
		process.exit(0);
	} catch (err) {
		handleCommandError("prepare-local", err);
	}
});
program.command("push").description("Create and push bundle to Managed Runtime.").requiredOption("-d, --project-directory <dir>", "Project directory").option("-b, --build-directory <dir>", "Build directory to push (default: auto-detected)").option("-m, --message <message>", "Bundle message (default: git branch:commit)").option("-s, --project-slug <slug>", "Project slug - the unique identifier for your project on Managed Runtime (default: from .env MRT_PROJECT or package.json name.)").option("-t, --target <target>", "Deploy target environment (default: from .env MRT_TARGET).").option("-w, --wait", "Wait for deployment to complete.", false).option("--cloud-origin <origin>", "API origin", DEFAULT_CLOUD_ORIGIN).option("-c, --credentials-file <file>", "Credentials file location.").option("-u, --user <email>", "User email for Managed Runtime.").option("-k, --key <api-key>", "API key for Managed Runtime.").action(async (options) => {
	try {
		if (GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH) try {
			info("Generating cartridge metadata before MRT push...");
			await runGenerateCartridge(options.projectDirectory);
			success("Cartridge metadata generated successfully!");
			info("Deploying cartridge to Commerce Cloud...");
			await runDeployCartridge(options.projectDirectory);
			success("Cartridge deployed successfully!");
		} catch (cartridgeError) {
			error(`Warning: Failed to generate or deploy cartridge: ${cartridgeError.message}`);
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
			key: options.key
		});
		process.exit(0);
	} catch (err) {
		handleCommandError("Push", err);
	}
});
program.command("dev").description("Start Vite development server with SSR.").option("-d, --project-directory <dir>", "Project directory (default: current directory).").option("-p, --port <port>", "Port number (default: 5173)", (val) => parseInt(val, 10)).action(async (options) => {
	try {
		await dev({
			projectDirectory: options.projectDirectory,
			port: options.port
		});
	} catch (err) {
		handleCommandError("Dev", err);
	}
});
program.command("preview").description("Start preview server with production build (auto-builds if needed).").option("-d, --project-directory <dir>", "Project directory (default: current directory).").option("-p, --port <port>", "Port number (default: 3000)", (val) => parseInt(val, 10)).action(async (options) => {
	try {
		await preview({
			projectDirectory: options.projectDirectory,
			port: options.port
		});
	} catch (err) {
		handleCommandError("Serve", err);
	}
});
program.command("create-instructions").description("Generate LLM instructions using prompt templating for installing and uninstalling Storefront Next feature extensions.").requiredOption("-d, --project-directory <dir>", "Project directory.").requiredOption("-c, --extension-config <config>", "Extension config JSON file location.").requiredOption("-e, --extension <extension>", "Extension marker value (e.g. SFDC_EXT_featureA).").option("-p, --template-repo <repo>", "Storefront template repo URL (default: https://github.com/SalesforceCommerceCloud/storefront-next-template.git)").option("-b, --branch <branch>", "Storefront template repo branch (default: main).").option("-f, --files <files...>", "Specific files to include (relative to project directory).").option("-o, --output-dir <dir>", "Output directory (default: ./instructions).").action((options) => {
	try {
		const baseDir = process.cwd();
		const projectDirectory = path.resolve(baseDir, options.projectDirectory);
		const extensionConfig = path.resolve(baseDir, options.extensionConfig);
		const files = options.files ?? void 0;
		generateInstructions(projectDirectory, options.extension, options.outputDir, options.templateRepo, options.branch, files, extensionConfig, `${__dirname}/extensibility/templates`);
		process.exit(0);
	} catch (err) {
		handleCommandError("create-instructions", err);
	}
});
const extensionsCommand = program.command("extensions").description("Manage features extensions for a storefront project.");
extensionsCommand.command("list").description("List all installed extensions.").option("-d, --project-directory <dir>", "Target project directory", process.cwd()).action((options) => {
	try {
		listExtensions(options);
	} catch (err) {
		handleCommandError("extensions list", err);
	}
});
extensionsCommand.command("install").description("Install an extension.").option("-d, --project-directory <dir>", "Target project directory.", process.cwd()).option("-e, --extension <extension>", "Extension marker value (e.g. SFDC_EXT_STORE_LOCATOR).").option("-s, --source-git-url <url>", "Git URL of the source template project", DEFAULT_TEMPLATE_GIT_URL).option("-v, --verbose", "Verbose mode.").action(async (options) => {
	try {
		await manageExtensions({
			projectDirectory: options.projectDirectory,
			install: true,
			extensions: options.extension ? [options.extension] : void 0,
			sourceGitUrl: options.sourceGitUrl,
			verbose: options.verbose
		});
	} catch (err) {
		handleCommandError("extensions install", err);
	}
});
extensionsCommand.command("remove").description("Remove one or more installed extensions.").option("-d, --project-directory <dir>", "Target project directory", process.cwd()).option("-e, --extensions <extensions>", "Comma-separated list of extension marker values (e.g. SFDC_EXT_STORE_LOCATOR,SFDC_EXT_INTERNAL_THEME_SWITCHER).").option("-v, --verbose", "Verbose mode.").action(async (options) => {
	try {
		await manageExtensions({
			projectDirectory: options.projectDirectory,
			uninstall: true,
			extensions: options.extensions?.split(","),
			verbose: options.verbose
		});
	} catch (err) {
		handleCommandError("extensions remove", err);
	}
});
extensionsCommand.command("create").description("Create an extension.").option("-p, --project-directory <projectDirectory>", "Target project directory", process.cwd()).option("-n, --name <name>", "Name of the extension to create, e.g., \"My Extension\".").option("-d, --description <description>", "Description of the extension.").action(async (options) => {
	try {
		await createExtension(options);
	} catch (err) {
		handleCommandError("extensions create", err);
	}
});
program.command("create-bundle").description("Create a bundle from the build directory without pushing to Managed Runtime.").requiredOption("-d, --project-directory <dir>", "Project directory").option("-b, --build-directory <dir>", "Build directory to bundle (default: auto-detected)").option("-o, --output-directory <dir>", "Output directory for bundle files (default: .bundle)").option("-m, --message <message>", "Bundle message (default: git branch:commit)").option("-s, --project-slug <slug>", "Project slug - the unique identifier for your project on Managed Runtime (default: from .env MRT_PROJECT or package.json name.)").action(async (options) => {
	try {
		await createBundleCommand({
			projectDirectory: options.projectDirectory,
			buildDirectory: options.buildDirectory,
			outputDirectory: options.outputDirectory,
			message: options.message,
			projectSlug: options.projectSlug
		});
		process.exit(0);
	} catch (err) {
		handleCommandError("create-bundle", err);
	}
});
program.command("generate-cartridge").description("Generate component cartridge metadata from decorated components.").requiredOption("-d, --project-directory <dir>", "Project directory containing the source code.").action(async (options) => {
	try {
		await runGenerateCartridge(options.projectDirectory);
		process.exit(0);
	} catch (err) {
		error(`Generate metadata failed: ${err.message}`);
		process.exit(1);
	}
});
program.command("deploy-cartridge").description("Deploy a cartridge to Commerce Cloud (zips and uploads the metadata directory).").requiredOption("-d, --project-directory <dir>", "Project directory containing the source code.").action(async (options) => {
	try {
		await runDeployCartridge(options.projectDirectory);
		process.exit(0);
	} catch (err) {
		error(`Deploy failed: ${err.message}`);
		process.exit(1);
	}
});
process.on("unhandledRejection", (reason, promise) => {
	error(`Unhandled Rejection at: ${String(promise)}, reason: ${String(reason)}`);
	process.exit(1);
});
program.parse();
if (!process.argv.slice(2).length) program.outputHelp();

//#endregion
export {  };