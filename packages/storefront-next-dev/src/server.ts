import { createRequestHandler } from '@react-router/express';
import express, { type Express } from 'express';
import { type ServerBuild } from 'react-router';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

export const createServer = (build: ServerBuild): Express => {
    const app = express();
    app.disable('x-powered-by');

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.use(createRequestHandler({ build, mode: process.env.NODE_ENV }));
    return app;
};
