/**
 * Logging utilities for cartridge deployment
 */

import chalk from 'chalk';

const colors = {
    warn: 'yellow',
    error: 'red',
    success: 'green',
    info: 'gray',
    debug: 'cyan',
} as const;

/**
 * Internal function to log messages with colored output
 *
 * @param level - The log level determining the color
 * @param msg - The message to log
 */
const fancyLog = (level: keyof typeof colors, msg: string) => {
    const color = colors[level];
    const colorFn = chalk[color];
    // eslint-disable-next-line no-console
    console.log(`${colorFn(level)}: ${msg}`);
};

/**
 * Log a warning message in yellow
 *
 * @param msg - The warning message to display
 */
export const warn = (msg: string) => fancyLog('warn', msg);

/**
 * Log an error message in red
 *
 * @param msg - The error message to display
 */
export const error = (msg: string) => fancyLog('error', msg);

/**
 * Log a success message in green
 *
 * @param msg - The success message to display
 */
export const success = (msg: string) => fancyLog('success', msg);

/**
 * Log an informational message in gray
 *
 * @param msg - The informational message to display
 */
export const info = (msg: string) => fancyLog('info', msg);

/**
 * Log a debug message in cyan
 *
 * @param msg - The debug message to display
 */
export const debug = (msg: string) => fancyLog('debug', msg);
