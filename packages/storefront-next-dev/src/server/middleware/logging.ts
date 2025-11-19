import type { RequestHandler } from 'express';
import morgan from 'morgan';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

/**
 * Patterns for URLs to skip logging (static assets and Vite internals)
 */
const SKIP_PATTERNS = [
    '/@vite/**',
    '/@id/**',
    '/@fs/**',
    '/@react-router/**',
    '/src/**',
    '/node_modules/**',
    '**/*.js',
    '**/*.css',
    '**/*.ts',
    '**/*.tsx',
    '**/*.js.map',
    '**/*.css.map',
];

/**
 * Create request logging middleware
 * Used in dev and serve modes for request visibility
 */
export function createLoggingMiddleware(): RequestHandler {
    // Custom format with colors
    morgan.token('status-colored', (req, res) => {
        const status = res.statusCode;
        let color = chalk.green;

        if (status >= 500) {
            color = chalk.red;
        } else if (status >= 400) {
            color = chalk.yellow;
        } else if (status >= 300) {
            color = chalk.cyan;
        }

        return color(String(status));
    });

    morgan.token('method-colored', (req) => {
        const method = req.method;
        const colors: Record<string, typeof chalk.green> = {
            GET: chalk.green,
            POST: chalk.blue,
            PUT: chalk.yellow,
            DELETE: chalk.red,
            PATCH: chalk.magenta,
        };
        const color = (method && colors[method]) || chalk.white;
        return color(method);
    });

    // Format: [METHOD] /path - STATUS (response-time ms)
    return morgan(
        (tokens, req, res) => {
            return [
                chalk.gray('['),
                tokens['method-colored'](req, res),
                chalk.gray(']'),
                tokens.url(req, res),
                '-',
                tokens['status-colored'](req, res),
                chalk.gray(`(${tokens['response-time'](req, res)}ms)`),
            ].join(' ');
        },
        {
            // Skip logging for static assets to reduce noise
            skip: (req) => {
                return SKIP_PATTERNS.some((pattern) => minimatch(req.url, pattern, { dot: true }));
            },
        }
    );
}
