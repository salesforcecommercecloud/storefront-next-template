//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let aws_serverless_express = require("aws-serverless-express");
aws_serverless_express = __toESM(aws_serverless_express);
let express = require("express");
express = __toESM(express);
let __react_router_express = require("@react-router/express");
let vite = require("vite");
require("tsx/esm/api");
let http_proxy_middleware = require("http-proxy-middleware");
let path = require("path");
path = __toESM(path);
let chalk = require("chalk");
chalk = __toESM(chalk);
let compression = require("compression");
compression = __toESM(compression);
let node_zlib = require("node:zlib");
node_zlib = __toESM(node_zlib);
let morgan = require("morgan");
morgan = __toESM(morgan);
let minimatch = require("minimatch");
let src_mrt_server_index_js = require("./server/index.js");
src_mrt_server_index_js = __toESM(src_mrt_server_index_js);

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
	return (0, http_proxy_middleware.createProxyMiddleware)({
		target: getCommerceCloudApiUrl(config.commerce.api.shortCode),
		changeOrigin: true
	});
}

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
	const colorFn = chalk.default[colors[level]];
	console.log(`${colorFn(level)}: ${msg}`);
};
const info = (msg) => fancyLog("info", msg);
const warn = (msg) => fancyLog("warn", msg);

//#endregion
//#region src/server/middleware/static.ts
/**
* Create static file serving middleware for client assets
* Serves files from build/client at /mobify/bundle/{BUNDLE_ID}/client/
*/
function createStaticMiddleware(bundleId, projectDirectory) {
	const bundlePath = getBundlePath(bundleId);
	const clientBuildDir = path.default.join(projectDirectory, "build", "client");
	info(`Serving static assets from ${clientBuildDir} at ${bundlePath}`);
	return express.default.static(clientBuildDir, { setHeaders: (res) => {
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
	const DEFAULT = node_zlib.default.constants.Z_DEFAULT_COMPRESSION;
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
	return (0, compression.default)({
		filter: (req, res) => {
			if (req.headers["x-no-compression"]) return false;
			return compression.default.filter(req, res);
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
	morgan.default.token("status-colored", (req, res) => {
		const status = res.statusCode;
		let color = chalk.default.green;
		if (status >= 500) color = chalk.default.red;
		else if (status >= 400) color = chalk.default.yellow;
		else if (status >= 300) color = chalk.default.cyan;
		return color(String(status));
	});
	morgan.default.token("method-colored", (req) => {
		const method = req.method;
		const colors$1 = {
			GET: chalk.default.green,
			POST: chalk.default.blue,
			PUT: chalk.default.yellow,
			DELETE: chalk.default.red,
			PATCH: chalk.default.magenta
		};
		return (method && colors$1[method] || chalk.default.white)(method);
	});
	return (0, morgan.default)((tokens, req, res) => {
		return [
			chalk.default.gray("["),
			tokens["method-colored"](req, res),
			chalk.default.gray("]"),
			tokens.url(req, res),
			"-",
			tokens["status-colored"](req, res),
			chalk.default.gray(`(${tokens["response-time"](req, res)}ms)`)
		].join(" ");
	}, { skip: (req) => {
		return SKIP_PATTERNS.some((pattern) => (0, minimatch.minimatch)(req.url, pattern, { dot: true }));
	} });
}

//#endregion
//#region src/server/utils.ts
/**
* Patch React Router build to rewrite asset URLs with the correct bundle path
* This is needed because the build output uses /assets/ but we serve at /mobify/bundle/{BUNDLE_ID}/client/assets/
*/
function patchReactRouterBuild(build$1, bundleId) {
	const bundlePath = getBundlePath(bundleId);
	const patchedAssetsJson = JSON.stringify(build$1.assets).replace(/"\/assets\//g, `"${bundlePath}assets/`);
	const newAssets = JSON.parse(patchedAssetsJson);
	return Object.assign({}, build$1, {
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
	const { mode, projectDirectory, config: providedConfig, vite: vite$1, build: build$1, enableProxy = ServerModeFeatureMap[mode].enableProxy, enableStaticServing = ServerModeFeatureMap[mode].enableStaticServing, enableCompression = ServerModeFeatureMap[mode].enableCompression, enableLogging = ServerModeFeatureMap[mode].enableLogging, enableAssetUrlPatching = ServerModeFeatureMap[mode].enableAssetUrlPatching } = options;
	if (mode === "development" && !vite$1) throw new Error("Vite dev server instance is required for development mode");
	if ((mode === "serve" || mode === "production") && !build$1) throw new Error("React Router server build is required for serve/production mode");
	const config = providedConfig ?? loadConfigFromEnv();
	const bundleId = process.env.BUNDLE_ID ?? "local";
	const app = (0, express.default)();
	app.disable("x-powered-by");
	if (enableLogging) app.use(createLoggingMiddleware());
	if (enableCompression) app.use(createCompressionMiddleware());
	if (enableStaticServing && build$1) {
		const bundlePath = getBundlePath(bundleId);
		app.use(bundlePath, createStaticMiddleware(bundleId, projectDirectory));
	}
	if (mode === "development" && vite$1) app.use(vite$1.middlewares);
	if (enableProxy) app.use(config.commerce.api.proxy, createCommerceProxyMiddleware(config));
	app.all("*", createSSRHandler(mode, bundleId, vite$1, build$1, enableAssetUrlPatching));
	return app;
}
/**
* Create the SSR request handler based on mode
*/
function createSSRHandler(mode, bundleId, vite$1, build$1, enableAssetUrlPatching) {
	if (mode === "development" && vite$1) return async (req, res, next) => {
		try {
			const ssrEnvironment = vite$1.environments.ssr;
			if (!(0, vite.isRunnableDevEnvironment)(ssrEnvironment)) {
				next(/* @__PURE__ */ new Error("SSR environment is not runnable. Please ensure:\n  1. \"@salesforce/storefront-next-dev\" plugin is added to vite.config.ts\n  2. \"future.unstable_viteEnvironmentApi: true\" is set in react-router.config.ts"));
				return;
			}
			await (0, __react_router_express.createRequestHandler)({
				build: await ssrEnvironment.runner.import("virtual:react-router/server-build"),
				mode: process.env.NODE_ENV
			})(req, res, next);
		} catch (error) {
			vite$1.ssrFixStacktrace(error);
			next(error);
		}
	};
	else if (build$1) {
		let patchedBuild = build$1;
		if (enableAssetUrlPatching) patchedBuild = patchReactRouterBuild(build$1, bundleId);
		return (0, __react_router_express.createRequestHandler)({
			build: patchedBuild,
			mode: process.env.NODE_ENV
		});
	} else throw new Error("Invalid server configuration: no vite or build provided");
}

//#endregion
//#region src/mrt/ssr.ts
const createLambdaHandler = (app) => {
	const server = aws_serverless_express.default.createServer(app);
	return (event, context, callback) => {
		context.callbackWaitsForEmptyEventLoop = false;
		return aws_serverless_express.default.proxy(server, event, context, "CALLBACK", callback);
	};
};
const handler = createLambdaHandler(createServer({
	mode: "production",
	projectDirectory: process.cwd(),
	build: src_mrt_server_index_js.default
}));
const get = handler;

//#endregion
exports.get = get;