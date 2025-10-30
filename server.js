/**
 * Copy of `react-router-serve` CLI
 * Subject to be removed in favor of a production/preview server provided by our vite plugin
 * @see {@link https://github.com/remix-run/react-router/blob/main/packages/react-router-serve/cli.ts}
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import process from 'node:process';
import { createRequestHandler } from '@react-router/express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import sourceMapSupport from 'source-map-support';
import getPort from 'get-port';
import 'dotenv/config';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';
process.env.EXTERNAL_DOMAIN_NAME = process.env.EXTERNAL_DOMAIN_NAME ?? 'localhost:5173';
process.env.BUNDLE_ID = process.env.BUNDLE_ID ?? 'local';

const retrieveSourceMap = function (source) {
    const match = source.startsWith('file://');
    if (match) {
        const filePath = url.fileURLToPath(source);
        const sourceMapPath = `${filePath}.map`;
        if (fs.existsSync(sourceMapPath)) {
            return {
                url: source,
                map: fs.readFileSync(sourceMapPath, 'utf8'),
            };
        }
    }
    return null;
};
sourceMapSupport.install({
    retrieveSourceMap,
});

function parseNumber(raw) {
    if (raw === undefined) return undefined;
    const maybe = Number(raw);
    if (Number.isNaN(maybe)) return undefined;
    return maybe;
}

async function run() {
    const port = parseNumber(process.env.PORT) ?? (await getPort({ port: 3000 }));
    const buildPathArg = process.argv[2];
    const target = `https://${process.env.PUBLIC_COMMERCE_API_SHORT_CODE}.api.commercecloud.salesforce.com`;

    if (!buildPathArg) {
        console.error(`Usage: react-router-serve <server-build-path> - e.g. react-router-serve build/server/index.js`);
        process.exit(1);
    }

    const buildPath = path.resolve(buildPathArg);

    const build = patchReactRouterBuild(await import(url.pathToFileURL(buildPath).href));

    const onListen = () => {
        const address =
            process.env.HOST ||
            Object.values(os.networkInterfaces())
                .flat()
                .find((ip) => String(ip?.family).includes('4') && !ip?.internal)?.address;

        if (!address) {
            console.log(`[react-router-serve] http://localhost:${port} --> ${target}`);
        } else {
            console.log(`[react-router-serve] http://localhost:${port} (http://${address}:${port}) --> ${target}`);
        }
        console.log('Server ready');
    };

    const app = express();
    app.disable('x-powered-by');
    app.use(compression());
    app.use(`/mobify/bundle/${process.env.BUNDLE_ID}/client/`, express.static(build.assetsBuildDirectory));
    app.use(express.static('public', { maxAge: '1h' }));
    app.use(morgan('tiny'));

    // Proxy API requests
    app.use(
        '/mobify/proxy/api',
        createProxyMiddleware({
            target,
            changeOrigin: true,
            // xfwd: true,
            // pathRewrite: { '^/mobify/proxy/api': '' },
        })
    );

    app.all(
        '*',
        createRequestHandler({
            build,
            mode: process.env.NODE_ENV,
        })
    );

    const server = process.env.HOST ? app.listen(port, process.env.HOST, onListen) : app.listen(port, onListen);

    ['SIGTERM', 'SIGINT'].forEach((signal) => {
        process.once(signal, () => server?.close(console.error));
    });
}

/**
 * This is copied from the Vite plugin. We will move this out from user land.
 */
const patchReactRouterBuild = (serverBuild) => {
    const BUNDLE_ID = process.env.BUNDLE_ID;
    const BUNDLE_PATH = `/mobify/bundle/${BUNDLE_ID}/client/`;
    const newAssets = JSON.parse(JSON.stringify(serverBuild.assets).replace(/"\/assets\//g, `"${BUNDLE_PATH}assets/`));
    return Object.assign({}, serverBuild, {
        publicPath: BUNDLE_PATH,
        assets: newAssets,
    });
};

run();
