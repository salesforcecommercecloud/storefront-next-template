//#region src/data-store/local-provider.ts
/**
* Create a local data-store provider for development environments.
*
* Environment variables:
* - `SFNEXT_DATA_STORE_DEFAULTS` (optional): JSON map of keys to preference objects.
*   Example: {"custom-global-preferences":{"featureFlag":true}}
* - `SFNEXT_DATA_STORE_WARN_ON_MISSING` (optional): Set to "false" to silence warnings.
*
* @param options - Optional defaults and warning controls for local entries.
* @returns Local provider that supplies preferences from defaults or empty values.
*/
function createLocalDataStoreProvider(options = {}) {
	const defaults = options.defaults ?? readDefaultsFromEnv();
	const warnOnMissing = options.warnOnMissing ?? readWarnOnMissingFromEnv();
	const warnedKeys = /* @__PURE__ */ new Set();
	return {
		kind: "local",
		getEntry(key) {
			const value = defaults[key];
			if (value && typeof value === "object") return Promise.resolve({ value });
			if (warnOnMissing && !warnedKeys.has(key)) {
				warnedKeys.add(key);
				console.warn(`Local data-store provider did not find '${key}'. Returning an empty object for development.`);
			}
			return Promise.resolve({ value: {} });
		}
	};
}
/**
* Read default data-store entries from the environment.
*
* Environment variables:
* - `SFNEXT_DATA_STORE_DEFAULTS` (optional): JSON map of keys to preference objects.
*   Example: {"custom-global-preferences":{"featureFlag":true}}
*
* @returns Parsed defaults map or an empty object.
*/
function readDefaultsFromEnv() {
	const raw = process.env.SFNEXT_DATA_STORE_DEFAULTS;
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") return parsed;
	} catch (error) {
		console.warn("Failed to parse SFNEXT_DATA_STORE_DEFAULTS JSON.", error);
	}
	return {};
}
/**
* Read warn-on-missing behavior from the environment.
*
* Environment variables:
* - `SFNEXT_DATA_STORE_WARN_ON_MISSING` (optional): Set to "false" to silence warnings.
*
* @returns True when warnings should be emitted for missing entries.
*/
function readWarnOnMissingFromEnv() {
	const raw = process.env.SFNEXT_DATA_STORE_WARN_ON_MISSING;
	if (!raw) return true;
	return raw.toLowerCase() !== "false";
}

//#endregion
export { createLocalDataStoreProvider };
//# sourceMappingURL=local-provider.js.map