import type { Express } from 'express';
// @ts-expect-error: This package does not ship with types
import awsServerlessExpress from 'aws-serverless-express';
import { type ServerBuild } from 'react-router';
import { createServer } from '../server';
// @ts-expect-error: This file isn't available during build time, but will be on MRT.
// This is the react-router server build entry point.
import build from './server/index.js';

const createLambdaHandler = (app: Express) => {
    const server = awsServerlessExpress.createServer(app);

    // Future: use the aws lambda async/await handler instead of the callback
    // AWS is deprecating the callback handler starting from Node 24.
    return (event: unknown, context: unknown, callback: unknown) => {
        // Important: It must be set to false to avoid the response
        // being delayed until the event loop is empty
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (context as any).callbackWaitsForEmptyEventLoop = false;
        return awsServerlessExpress.proxy(server, event, context, 'CALLBACK', callback);
    };
};

/**
 * Patches the react-router server build to use the correct assets path.
 * This isn't the best way we want to configure the asset path, but currently
 * react-router doesn't support configuring the asset path in the runtime.
 * @TODO: try if we can use vite.config.ts's experimental.renderBuiltUrl to configure the asset path in the runtime.
 * @returns The patched react-router server build with the Managed Runtime bundle path
 */
const patchReactRouterBuild = (serverBuild: ServerBuild) => {
    const BUNDLE_ID = process.env.BUNDLE_ID;
    const BUNDLE_PATH = `/mobify/bundle/${BUNDLE_ID}/client/`;
    const newAssets = JSON.parse(JSON.stringify(serverBuild.assets).replace(/"\/assets\//g, `"${BUNDLE_PATH}assets/`));
    return Object.assign({}, serverBuild, {
        publicPath: BUNDLE_PATH,
        assets: newAssets,
    });
};

const app = createServer(patchReactRouterBuild(build));

const handler = createLambdaHandler(app);

// Important: The export must be named "get" to be compatible with Managed Runtime
export const get = handler;
