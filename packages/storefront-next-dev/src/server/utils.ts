import type { ServerBuild } from 'react-router';
import { getBundlePath } from '../utils/paths';

/**
 * Patch React Router build to rewrite asset URLs with the correct bundle path
 * This is needed because the build output uses /assets/ but we serve at /mobify/bundle/{BUNDLE_ID}/client/assets/
 */
export function patchReactRouterBuild(build: ServerBuild, bundleId: string): ServerBuild {
    const bundlePath = getBundlePath(bundleId);

    // Clone the assets object and replace /assets/ paths with bundle path
    const assetsJson = JSON.stringify(build.assets);
    const patchedAssetsJson = assetsJson.replace(/"\/assets\//g, `"${bundlePath}assets/`);
    const newAssets = JSON.parse(patchedAssetsJson);

    // Return a new build object with patched publicPath and assets
    return Object.assign({}, build, {
        publicPath: bundlePath,
        assets: newAssets,
    });
}
