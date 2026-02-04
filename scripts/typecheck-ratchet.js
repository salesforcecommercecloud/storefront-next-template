#!/usr/bin/env node

/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                           ⚠️  READ ME FIRST  ⚠️                              │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  WHY THIS EXISTS:                                                           │
 * │  This codebase has accumulated TypeScript errors over time. Rather than     │
 * │  disable type checking entirely, we use a "ratchet" mechanism that:         │
 * │    • Allows the current number of errors (the baseline)                     │
 * │    • FAILS if new errors are introduced (regression)                        │
 * │    • PASSES if errors are fixed (improvement)                               │
 * │                                                                             │
 * │  IF YOUR PR FAILS THIS CHECK:                                               │
 * │  Your changes introduced new TypeScript errors. This is NOT acceptable.     │
 * │    1. Run `pnpm typecheck` locally to see the errors                        │
 * │    2. Fix the TypeScript errors in YOUR code                                │
 * │    3. Do NOT increase BASELINE_ERROR_COUNT to make CI pass                  │
 * │                                                                             │
 * │  OUR COLLECTIVE RESPONSIBILITY:                                             │
 * │  Everyone must prevent regression. When possible, fix existing errors       │
 * │  in files you touch. If you reduce the error count, update the baseline     │
 * │  to lock in the improvement and prevent future regressions.                 │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

/**
 * TypeScript Error Ratchet Script
 *
 * How it works:
 * - Runs react-router typegen followed by tsc --noEmit
 * - Counts the number of "error TS" occurrences in output
 * - FAILS if count > BASELINE_ERROR_COUNT (regression detected)
 * - PASSES if count <= BASELINE_ERROR_COUNT (no regression)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = join(__dirname, '..');

// Baseline error count - update this when fixing TypeScript errors
const BASELINE_ERROR_COUNT = 751;

/**
 * Run a command and capture its output
 * @param {string} command
 * @param {string[]} args
 * @param {object} options
 * @param {boolean} options.streamOutput - If true, stream output to console in real-time
 */
function runCommand(command, args, options = {}) {
    const { streamOutput, ...spawnOptions } = options;
    return new Promise((resolve) => {
        const proc = spawn(command, args, {
            cwd: packageDir,
            ...spawnOptions,
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
            const str = data.toString();
            stdout += str;
            if (streamOutput) {
                process.stdout.write(str);
            }
        });

        proc.stderr?.on('data', (data) => {
            const str = data.toString();
            stderr += str;
            if (streamOutput) {
                process.stderr.write(str);
            }
        });

        proc.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });
    });
}

/**
 * Count TypeScript errors in the output
 */
function countErrors(output) {
    const errorPattern = /error TS\d+/g;
    const matches = output.match(errorPattern);
    return matches ? matches.length : 0;
}

async function main() {
    console.log('Running react-router typegen...');
    const typegenResult = await runCommand('pnpm', ['react-router', 'typegen']);

    if (typegenResult.code !== 0) {
        console.error('react-router typegen failed:');
        console.error(typegenResult.stderr || typegenResult.stdout);
        process.exit(1);
    }

    console.log('Running TypeScript type check...');
    const tscResult = await runCommand('pnpm', ['tsc', '--noEmit'], {
        env: {
            ...process.env,
            NODE_OPTIONS: '--max-old-space-size=8192',
        },
        streamOutput: true,
    });

    // Combine stdout and stderr for error counting
    const fullOutput = tscResult.stdout + tscResult.stderr;
    const errorCount = countErrors(fullOutput);

    console.log(`\nTypeScript errors found: ${errorCount}`);
    console.log(`Baseline error count: ${BASELINE_ERROR_COUNT}`);

    // Detect likely tsc crash (e.g., out-of-memory) - if baseline expects errors but we found none
    if (errorCount === 0 && BASELINE_ERROR_COUNT > 0) {
        console.error(`\n❌ FAIL: Found 0 errors but baseline is ${BASELINE_ERROR_COUNT}.`);
        console.error('This likely means TypeScript crashed (e.g., out of memory) before reporting errors.');
        console.error('If all errors have truly been fixed, remove this ratchet script and use standard tsc.');
        process.exit(1);
    }

    if (errorCount > BASELINE_ERROR_COUNT) {
        console.error(`\n❌ FAIL: Error count (${errorCount}) exceeds baseline (${BASELINE_ERROR_COUNT})`);
        console.error('New TypeScript errors have been introduced.');
        process.exit(1);
    }

    if (errorCount < BASELINE_ERROR_COUNT) {
        console.log(`\n✅ PASS: Error count (${errorCount}) is below baseline (${BASELINE_ERROR_COUNT})`);
        console.log(`Consider updating BASELINE_ERROR_COUNT in scripts/typecheck-ratchet.js to ${errorCount}`);
    } else {
        console.log(`\n✅ PASS: Error count matches baseline`);
    }

    process.exit(0);
}

main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
