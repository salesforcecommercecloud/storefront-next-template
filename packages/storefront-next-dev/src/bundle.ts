import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import archiver from 'archiver';
import { Minimatch } from 'minimatch';
import { getProjectPkg, getProjectDependencyTree, getPwaKitDependencies } from './utils.js';
import type { Bundle, BundleMetadata, SSRParameters, FilePatterns } from './types.js';

interface CreateBundleOptions {
    message: string;
    ssr_parameters: SSRParameters;
    ssr_only: FilePatterns;
    ssr_shared: FilePatterns;
    buildDirectory: string;
    projectDirectory: string;
    projectSlug: string;
}

/**
 * Create a bundle from the build directory
 */
export const createBundle = async (options: CreateBundleOptions): Promise<Bundle> => {
    const { message, ssr_parameters, ssr_only, ssr_shared, buildDirectory, projectDirectory, projectSlug } = options;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storefront-next-dev-push-'));
    const destination = path.join(tmpDir, 'build.tar');
    const filesInArchive: string[] = [];

    // Validate that SSR file patterns are defined
    if (!ssr_only || ssr_only.length === 0 || !ssr_shared || ssr_shared.length === 0) {
        throw new Error('no ssrOnly or ssrShared files are defined');
    }

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(destination);
        const archive = archiver('tar');

        archive.pipe(output);

        const newRoot = path.join(projectSlug, 'bld', '');

        archive.directory(buildDirectory, '', (entry) => {
            if (entry.stats?.isFile() && entry.name) {
                filesInArchive.push(entry.name);
            }
            entry.prefix = newRoot;
            return entry;
        });

        archive.on('error', reject);

        output.on('finish', () => {
            try {
                const pkg = getProjectPkg(projectDirectory);
                const { dependencies = {}, devDependencies = {} } = pkg;

                const dependencyTree = getProjectDependencyTree(projectDirectory);
                const pwaKitDeps = dependencyTree ? getPwaKitDependencies(dependencyTree) : {};

                const bundle_metadata: BundleMetadata = {
                    dependencies: {
                        ...dependencies,
                        ...devDependencies,
                        ...pwaKitDeps,
                    },
                };

                const data = fs.readFileSync(destination);
                const encoding = 'base64' as const;

                // Clean up temp directory
                fs.rmSync(tmpDir, { recursive: true });

                // Create glob matching function
                const createGlobMatcher = (patterns: string[]) => {
                    const allPatterns = patterns
                        .map((pattern) => new Minimatch(pattern, { nocomment: true }))
                        .filter((pattern) => !pattern.empty);

                    const positivePatterns = allPatterns.filter((pattern) => !pattern.negate);
                    const negativePatterns = allPatterns.filter((pattern) => pattern.negate);

                    return (filePath: string): boolean => {
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
                    bundle_metadata,
                });
            } catch (err) {
                reject(err);
            }
        });

        archive.finalize().catch(reject);
    });
};
