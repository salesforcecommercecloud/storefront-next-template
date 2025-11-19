import express, { type RequestHandler } from 'express';
import path from 'path';
import { getBundlePath } from '../../utils/paths';
import { info } from '../../utils/logger';

/**
 * Create static file serving middleware for client assets
 * Serves files from build/client at /mobify/bundle/{BUNDLE_ID}/client/
 */
export function createStaticMiddleware(bundleId: string, projectDirectory: string): RequestHandler {
    const bundlePath = getBundlePath(bundleId);
    const clientBuildDir = path.join(projectDirectory, 'build', 'client');

    info(`Serving static assets from ${clientBuildDir} at ${bundlePath}`);

    return express.static(clientBuildDir, {
        setHeaders: (res) => {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('x-local-static-cache-control', '1');
        },
    });
}
