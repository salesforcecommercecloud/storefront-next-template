/* eslint-disable no-console */
import os from 'os';
import chalk from 'chalk';
import { createRequire } from 'module';
import type { ServerMode } from '../server/modes';
import pkg from '../../package.json' with { type: 'json' };

/**
 * Get the local network IPv4 address
 */
export function getNetworkAddress(): string | undefined {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const iface = interfaces[name];
        if (!iface) continue;
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return undefined;
}

/**
 * Get the version of a package from the project's package.json
 */
export function getPackageVersion(packageName: string, projectDir: string): string {
    try {
        const require = createRequire(import.meta.url);
        const pkgPath = require.resolve(`${packageName}/package.json`, { paths: [projectDir] });
        const pkgJson = require(pkgPath) as { version: string };
        return pkgJson.version;
    } catch {
        return 'unknown';
    }
}

/**
 * Logger utilities
 */
const colors = {
    warn: 'yellow',
    error: 'red',
    success: 'cyan',
    info: 'green',
    debug: 'gray',
} as const;

const fancyLog = (level: keyof typeof colors, msg: string) => {
    const color = colors[level];
    const colorFn = chalk[color];
    console.log(`${colorFn(level)}: ${msg}`);
};

export const info = (msg: string) => fancyLog('info', msg);
export const success = (msg: string) => fancyLog('success', msg);
export const warn = (msg: string) => fancyLog('warn', msg);
export const error = (msg: string) => fancyLog('error', msg);

export const debug = (msg: string, data?: unknown) => {
    // Only log debug messages if DEBUG environment variable is set or not in production
    if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
        fancyLog('debug', msg);
        if (data) {
            console.log(data);
        }
    }
};

/**
 * Print the server information banner with URLs and versions
 */
export function printServerInfo(mode: ServerMode, port: number, startTime: number, projectDir: string): void {
    const elapsed = Date.now() - startTime;
    const sfnextVersion = pkg.version;
    const reactVersion = getPackageVersion('react', projectDir);
    const reactRouterVersion = getPackageVersion('react-router', projectDir);

    const modeLabel = mode === 'development' ? 'Development Mode' : 'Serve (Preview) Mode';

    console.log();
    console.log(`  ${chalk.cyan.bold('⚡ SFCC Storefront Next')} ${chalk.dim(`v${sfnextVersion}`)}`);
    console.log(`  ${chalk.green.bold(modeLabel)}`);
    console.log();
    console.log(
        `  ${chalk.dim('react')} ${chalk.green(`v${reactVersion}`)} ${chalk.dim('│')} ` +
            `${chalk.dim('react-router')} ${chalk.green(`v${reactRouterVersion}`)} ${chalk.dim('│')} ` +
            `${chalk.green(`ready in ${elapsed}ms`)}`
    );
    console.log();
}

/**
 * Print server configuration details (proxy, static, etc.)
 */
export function printServerConfig(config: {
    mode: ServerMode;
    port: number;
    enableProxy?: boolean;
    enableStaticServing?: boolean;
    enableCompression?: boolean;
    proxyPath?: string;
    proxyTarget?: string;
    shortCode?: string;
    organizationId?: string;
    clientId?: string;
    siteId?: string;
}): void {
    const {
        port,
        enableProxy,
        enableStaticServing,
        enableCompression,
        proxyPath,
        proxyTarget,
        shortCode,
        organizationId,
        clientId,
        siteId,
    } = config;

    console.log(`  ${chalk.bold('Environment Configuration:')}`);

    if (enableProxy && proxyPath && proxyTarget && shortCode) {
        console.log(
            `    ${chalk.green('✓')} ${chalk.bold('Proxy:')} ${chalk.cyan(`localhost:${port}${proxyPath}`)} ${chalk.dim('→')} ${chalk.cyan(proxyTarget)}`
        );
        console.log(`      ${chalk.dim('Short Code:     ')} ${chalk.dim(shortCode)}`);
        if (organizationId) {
            console.log(`      ${chalk.dim('Organization ID:')} ${chalk.dim(organizationId)}`);
        }
        if (clientId) {
            console.log(`      ${chalk.dim('Client ID:      ')} ${chalk.dim(clientId)}`);
        }
        if (siteId) {
            console.log(`      ${chalk.dim('Site ID:        ')} ${chalk.dim(siteId)}`);
        }
    } else {
        console.log(`    ${chalk.gray('○')} ${chalk.bold('Proxy:           ')} ${chalk.dim('disabled')}`);
    }

    if (enableStaticServing) {
        console.log(`    ${chalk.green('✓')} ${chalk.bold('Static:          ')} ${chalk.dim('enabled')}`);
    }

    if (enableCompression) {
        console.log(`    ${chalk.green('✓')} ${chalk.bold('Compression:     ')} ${chalk.dim('enabled')}`);
    }

    // URLs
    const localUrl = `http://localhost:${port}`;
    const networkAddress = getNetworkAddress();
    const networkUrl = networkAddress ? `http://${networkAddress}:${port}` : null;

    console.log();
    console.log(`  ${chalk.green('➜')}  ${chalk.bold('Local:  ')} ${chalk.cyan(localUrl)}`);
    if (networkUrl) {
        console.log(`  ${chalk.green('➜')}  ${chalk.bold('Network:')} ${chalk.cyan(networkUrl)}`);
    }

    console.log();
    console.log(`  ${chalk.dim('Press')} ${chalk.bold('Ctrl+C')} ${chalk.dim('to stop the server')}`);
    console.log();
}

/**
 * Print shutdown message
 */
export function printShutdownMessage(): void {
    console.log(`\n  ${chalk.yellow('⚡')} ${chalk.dim('Server shutting down...')}\n`);
}
