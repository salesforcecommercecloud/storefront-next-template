import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import YAML from "yaml";

//#region src/scapi/schema-utils.ts
/**
* Convert an API name like "shopper-products" to a camelCase client key like "shopperProducts".
*/
function deriveClientKey(apiName) {
	return apiName.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}
/**
* Derive the SCAPI base path from an OpenAPI schema file.
*
* Parses the `servers[].url` field. SCAPI schemas typically have server URLs like:
*   https://{shortCode}.api.commercecloud.salesforce.com/product/shopper-products/v1
*
* Returns the path portion (e.g., "/product/shopper-products/v1").
*
* @param schemaPath - Path to the OAS YAML/JSON file
* @returns The derived base path, or undefined if it cannot be determined
*/
function deriveBasePath(schemaPath) {
	const content = readFileSync(schemaPath, "utf-8");
	const ext = extname(schemaPath).toLowerCase();
	let schema;
	if (ext === ".yaml" || ext === ".yml") schema = YAML.parse(content);
	else schema = JSON.parse(content);
	const servers = schema.servers;
	if (!servers || servers.length === 0) return void 0;
	const serverUrl = servers[0].url;
	if (!serverUrl) return void 0;
	try {
		const normalizedUrl = serverUrl.replace(/\{[^}]+\}/g, "placeholder");
		const pathname = new URL(normalizedUrl).pathname;
		return pathname && pathname !== "/" ? pathname : void 0;
	} catch {
		if (serverUrl.startsWith("/") && serverUrl !== "/") return serverUrl;
		return serverUrl.match(/(?:https?:\/\/[^/]+)?(\/.+)/)?.[1] ?? void 0;
	}
}
/**
* Read all .meta.json sidecars from a schemas directory.
*/
function readAllSchemaMetadata(schemasDir) {
	if (!existsSync(schemasDir)) return [];
	return readdirSync(schemasDir).filter((f) => f.endsWith(".meta.json")).map((f) => {
		const content = JSON.parse(readFileSync(join(schemasDir, f), "utf-8"));
		const schemaName = f.replace(".meta.json", "");
		return {
			...content,
			schemaName
		};
	});
}
/**
* Write a .meta.json sidecar for a schema file.
*/
function writeSchemaMetadata(schemasDir, schemaName, meta) {
	writeFileSync(join(schemasDir, `${schemaName}.meta.json`), `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
}

//#endregion
export { writeSchemaMetadata as i, deriveClientKey as n, readAllSchemaMetadata as r, deriveBasePath as t };