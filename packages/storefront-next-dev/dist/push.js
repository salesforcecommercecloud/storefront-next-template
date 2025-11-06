import fs from "fs-extra";
import path from "path";
import os from "os";
import archiver from "archiver";
import { Minimatch } from "minimatch";
import { execSync } from "child_process";
import chalk from "chalk";
import dotenv from "dotenv";
import { URL as URL$1 } from "url";

//#region src/utils.ts
const DEFAULT_CLOUD_ORIGIN = "https://cloud.mobify.com";
const getDefaultBuildDir = (targetDir) => path.join(targetDir, "build");
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
const NODE_ENV = process.env.NODE_ENV || "development";
const debug = (msg, data) => {
	if (process.env.DEBUG || NODE_ENV !== "production") {
		fancyLog("debug", msg);
		if (data) console.log(data);
	}
};
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
	if (fs.existsSync(envPath)) {
		dotenv.config({ path: envPath });
		debug("Loaded .env file", { envPath });
	} else debug("No .env file found", { envPath });
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
	return new Promise((resolve, reject) => {
		const output = fs.createWriteStream(destination);
		const archive = archiver("tar");
		archive.pipe(output);
		const newRoot = path.join(projectSlug, "bld", "");
		archive.directory(buildDirectory, "", (entry) => {
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
				resolve({
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
//#region package.json
var version = "0.0.1";

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
		return new Promise((resolve, reject) => {
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
					case "ACTIVE": return resolve();
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
			"!static/**/*"
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
			"**/*.eot"
		],
		ssrParameters: { ssrFunctionNodeVersion: "22.x" }
	};
};

//#endregion
//#region src/push.ts
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
export { push };
//# sourceMappingURL=push.js.map