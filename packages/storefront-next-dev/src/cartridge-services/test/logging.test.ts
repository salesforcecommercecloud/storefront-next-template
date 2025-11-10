import { describe, test, expect, vi, beforeEach } from 'vitest';
import chalk from 'chalk';
import { warn, error, success, info, debug } from '../logging.js';

// Mock chalk
vi.mock('chalk', () => ({
    default: {
        yellow: vi.fn((text: string) => `yellow(${text})`),
        red: vi.fn((text: string) => `red(${text})`),
        green: vi.fn((text: string) => `green(${text})`),
        gray: vi.fn((text: string) => `gray(${text})`),
        cyan: vi.fn((text: string) => `cyan(${text})`),
    },
}));

// Mock console.log
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('logging', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        consoleLogSpy.mockClear();
    });

    describe('warn', () => {
        test('should log a warning message with yellow color', () => {
            const message = 'This is a warning';
            warn(message);

            expect(chalk.yellow).toHaveBeenCalledWith('warn');
            expect(consoleLogSpy).toHaveBeenCalledWith('yellow(warn): This is a warning');
        });

        test('should handle empty warning message', () => {
            warn('');

            expect(chalk.yellow).toHaveBeenCalledWith('warn');
            expect(consoleLogSpy).toHaveBeenCalledWith('yellow(warn): ');
        });

        test('should handle warning message with special characters', () => {
            const message = 'Warning: Invalid input! @#$%';
            warn(message);

            expect(chalk.yellow).toHaveBeenCalledWith('warn');
            expect(consoleLogSpy).toHaveBeenCalledWith('yellow(warn): Warning: Invalid input! @#$%');
        });
    });

    describe('error', () => {
        test('should log an error message with red color', () => {
            const message = 'This is an error';
            error(message);

            expect(chalk.red).toHaveBeenCalledWith('error');
            expect(consoleLogSpy).toHaveBeenCalledWith('red(error): This is an error');
        });

        test('should handle empty error message', () => {
            error('');

            expect(chalk.red).toHaveBeenCalledWith('error');
            expect(consoleLogSpy).toHaveBeenCalledWith('red(error): ');
        });

        test('should handle error message with special characters', () => {
            const message = 'Error: Something went wrong! @#$%';
            error(message);

            expect(chalk.red).toHaveBeenCalledWith('error');
            expect(consoleLogSpy).toHaveBeenCalledWith('red(error): Error: Something went wrong! @#$%');
        });
    });

    describe('success', () => {
        test('should log a success message with green color', () => {
            const message = 'This is a success';
            success(message);

            expect(chalk.green).toHaveBeenCalledWith('success');
            expect(consoleLogSpy).toHaveBeenCalledWith('green(success): This is a success');
        });

        test('should handle empty success message', () => {
            success('');

            expect(chalk.green).toHaveBeenCalledWith('success');
            expect(consoleLogSpy).toHaveBeenCalledWith('green(success): ');
        });

        test('should handle success message with special characters', () => {
            const message = 'Success: Operation completed! @#$%';
            success(message);

            expect(chalk.green).toHaveBeenCalledWith('success');
            expect(consoleLogSpy).toHaveBeenCalledWith('green(success): Success: Operation completed! @#$%');
        });
    });

    describe('info', () => {
        test('should log an info message with gray color', () => {
            const message = 'This is an info message';
            info(message);

            expect(chalk.gray).toHaveBeenCalledWith('info');
            expect(consoleLogSpy).toHaveBeenCalledWith('gray(info): This is an info message');
        });

        test('should handle empty info message', () => {
            info('');

            expect(chalk.gray).toHaveBeenCalledWith('info');
            expect(consoleLogSpy).toHaveBeenCalledWith('gray(info): ');
        });

        test('should handle info message with special characters', () => {
            const message = 'Info: Processing data... @#$%';
            info(message);

            expect(chalk.gray).toHaveBeenCalledWith('info');
            expect(consoleLogSpy).toHaveBeenCalledWith('gray(info): Info: Processing data... @#$%');
        });
    });

    describe('debug', () => {
        test('should log a debug message with cyan color', () => {
            const message = 'This is a debug message';
            debug(message);

            expect(chalk.cyan).toHaveBeenCalledWith('debug');
            expect(consoleLogSpy).toHaveBeenCalledWith('cyan(debug): This is a debug message');
        });

        test('should handle empty debug message', () => {
            debug('');

            expect(chalk.cyan).toHaveBeenCalledWith('debug');
            expect(consoleLogSpy).toHaveBeenCalledWith('cyan(debug): ');
        });

        test('should handle debug message with special characters', () => {
            const message = 'Debug: Variable value = 123 @#$%';
            debug(message);

            expect(chalk.cyan).toHaveBeenCalledWith('debug');
            expect(consoleLogSpy).toHaveBeenCalledWith('cyan(debug): Debug: Variable value = 123 @#$%');
        });
    });

    describe('all logging functions', () => {
        test('should use correct colors for each log level', () => {
            warn('warning');
            error('error');
            success('success');
            info('info');
            debug('debug');

            expect(chalk.yellow).toHaveBeenCalledWith('warn');
            expect(chalk.red).toHaveBeenCalledWith('error');
            expect(chalk.green).toHaveBeenCalledWith('success');
            expect(chalk.gray).toHaveBeenCalledWith('info');
            expect(chalk.cyan).toHaveBeenCalledWith('debug');

            expect(consoleLogSpy).toHaveBeenCalledTimes(5);
        });

        test('should format messages consistently', () => {
            const testMessage = 'Test message';

            warn(testMessage);
            error(testMessage);
            success(testMessage);
            info(testMessage);
            debug(testMessage);

            expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'yellow(warn): Test message');
            expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 'red(error): Test message');
            expect(consoleLogSpy).toHaveBeenNthCalledWith(3, 'green(success): Test message');
            expect(consoleLogSpy).toHaveBeenNthCalledWith(4, 'gray(info): Test message');
            expect(consoleLogSpy).toHaveBeenNthCalledWith(5, 'cyan(debug): Test message');
        });

        test('should handle multiline messages', () => {
            const multilineMessage = 'Line 1\nLine 2\nLine 3';

            warn(multilineMessage);
            error(multilineMessage);
            success(multilineMessage);
            info(multilineMessage);
            debug(multilineMessage);

            expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'yellow(warn): Line 1\nLine 2\nLine 3');
            expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 'red(error): Line 1\nLine 2\nLine 3');
            expect(consoleLogSpy).toHaveBeenNthCalledWith(3, 'green(success): Line 1\nLine 2\nLine 3');
            expect(consoleLogSpy).toHaveBeenNthCalledWith(4, 'gray(info): Line 1\nLine 2\nLine 3');
            expect(consoleLogSpy).toHaveBeenNthCalledWith(5, 'cyan(debug): Line 1\nLine 2\nLine 3');
        });

        test('should handle long messages', () => {
            const longMessage = 'A'.repeat(1000);

            warn(longMessage);
            error(longMessage);
            success(longMessage);
            info(longMessage);
            debug(longMessage);

            expect(consoleLogSpy).toHaveBeenNthCalledWith(1, `yellow(warn): ${longMessage}`);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(2, `red(error): ${longMessage}`);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(3, `green(success): ${longMessage}`);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(4, `gray(info): ${longMessage}`);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(5, `cyan(debug): ${longMessage}`);
        });
    });
});
