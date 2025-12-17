import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

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
export function parseTsconfigPaths(tsconfigPath: string, projectDirectory: string): Record<string, string> {
    const alias: Record<string, string> = {};

    if (!existsSync(tsconfigPath)) {
        return alias;
    }

    try {
        const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
        const tsconfig = JSON.parse(tsconfigContent) as {
            compilerOptions?: {
                paths?: Record<string, string[]>;
                baseUrl?: string;
            };
        };

        const paths = tsconfig.compilerOptions?.paths;
        const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';

        if (paths) {
            for (const [key, values] of Object.entries(paths)) {
                if (values && values.length > 0) {
                    // Convert TypeScript path pattern to jiti alias
                    // e.g., "@/*": ["./src/*"] -> "@/": "<projectDir>/src/"
                    const aliasKey = key.replace(/\/\*$/, '/');
                    const aliasValue = values[0].replace(/\/\*$/, '/').replace(/^\.\//, '');
                    alias[aliasKey] = resolve(projectDirectory, baseUrl, aliasValue);
                }
            }
        }
    } catch {
        // Ignore tsconfig parse errors - caller can work without aliases
    }

    return alias;
}

export interface TsImportOptions {
    /** Project directory for resolving paths */
    projectDirectory: string;
    /** Optional path to tsconfig.json (defaults to projectDirectory/tsconfig.json) */
    tsconfigPath?: string;
}

/**
 * Import a TypeScript file using jiti with proper path alias resolution.
 * This is a cross-platform alternative to tsx that works on Windows.
 *
 * @param filePath - Absolute path to the TypeScript file to import
 * @param options - Import options including project directory
 * @returns The imported module
 */
export async function importTypescript<T = unknown>(filePath: string, options: TsImportOptions): Promise<T> {
    const { projectDirectory, tsconfigPath = resolve(projectDirectory, 'tsconfig.json') } = options;

    const { createJiti } = await import('jiti');
    const alias = parseTsconfigPaths(tsconfigPath, projectDirectory);

    const jiti = createJiti(import.meta.url, {
        fsCache: false,
        interopDefault: true,
        alias,
    });

    return jiti.import(filePath);
}
