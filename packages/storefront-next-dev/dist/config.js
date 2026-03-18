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
			"**/*.json",
			"loader.js",
			`${ssrEntryPoint}.{js,mjs,cjs}`,
			`${ssrEntryPoint}.{js,mjs,cjs}.map`,
			"!static/**/*",
			"sfnext-server-*.mjs",
			"sfnext-server-*.mjs.map",
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
export { buildMrtConfig as a, SFNEXT_BASE_CARTRIDGE_OUTPUT_DIR as i, GENERATE_AND_DEPLOY_CARTRIDGE_ON_MRT_PUSH as n, SFNEXT_BASE_CARTRIDGE_NAME as r, CARTRIDGES_BASE_DIR as t };