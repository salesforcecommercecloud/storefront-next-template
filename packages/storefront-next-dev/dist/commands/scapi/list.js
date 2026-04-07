import { t as commonFlags } from "../../flags.js";
import { r as readAllSchemaMetadata } from "../../schema-utils.js";
import { Command } from "@oclif/core";
import { join } from "node:path";

//#region src/commands/scapi/list.ts
/**
* List registered custom SCAPI clients.
*/
var List = class List extends Command {
	static description = "List registered custom SCAPI clients";
	static examples = ["<%= config.bin %> <%= command.id %>", "<%= config.bin %> <%= command.id %> -d ./my-project"];
	static flags = { ...commonFlags };
	async run() {
		const { flags } = await this.parse(List);
		const projectDir = flags["project-directory"];
		const entries = readAllSchemaMetadata(join(projectDir, "src", "scapi", "schemas"));
		if (entries.length === 0) {
			this.log("No custom SCAPI clients registered.");
			this.log("Use `sfnext scapi add` to add one.");
			return;
		}
		this.log(`\nRegistered SCAPI clients (${entries.length}):\n`);
		for (const { clientKey, basePath, supportsLocale, schemaName } of entries) {
			this.log(`  ${clientKey}`);
			this.log(`    Schema:  schemas/${schemaName}.yaml`);
			this.log(`    Base:    ${basePath}`);
			this.log(`    Locale:  ${supportsLocale ? "yes" : "no"}`);
			this.log("");
		}
	}
};

//#endregion
export { List as default };