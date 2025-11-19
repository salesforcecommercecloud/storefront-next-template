import type { Express } from 'express';
// @ts-expect-error: This package does not ship with types
import awsServerlessExpress from 'aws-serverless-express';
import { createServer } from '../server/index';

// @ts-expect-error: This file isn't available during build time, but will be on MRT.
// This is the react-router server build entry point. todo: dynamic import
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

const app = createServer({
    mode: 'production',
    projectDirectory: process.cwd(),
    build,
});

const handler = createLambdaHandler(app);

// Important: The export must be named "get" to be compatible with Managed Runtime
export const get = handler;
