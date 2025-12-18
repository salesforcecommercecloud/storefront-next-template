import type { Plugin, ResolvedConfig } from 'vite';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { loadEngagementConfig, type EngagementConfig } from './configLoader';

/**
 * Configuration options for the event instrumentation validator plugin
 */
export interface EventInstrumentationValidatorConfig {
    /**
     * Path to config module relative to project root
     * @default 'config.server.ts'
     */
    configPath?: string;

    /**
     * Directories to scan for trackEvent calls relative to project root
     * @default ['src']
     */
    scanPaths?: string[];

    /**
     * Whether to fail the build on missing instrumentation
     * @default false (warning only)
     */
    failOnMissing?: boolean;

    /**
     * Enable verbose logging
     * @default false
     */
    verbose?: boolean;
}

/**
 * Extract all trackEvent calls from source files and return the event types found
 */
async function scanForInstrumentedEvents(
    projectRoot: string,
    scanPaths: string[],
    verbose: boolean
): Promise<Set<string>> {
    const instrumentedEvents = new Set<string>();

    // Regex patterns to match trackEvent calls
    // Pattern 1: trackEvent(..., ..., ..., 'event_type', ...)
    // The event type is the 4th argument
    const trackEventPattern = /trackEvent\s*\([^,]+,[^,]+,[^,]+,\s*['"]([^'"]+)['"]/g;

    // Pattern 2: sendViewPageEvent (special case for view_page)
    const sendViewPagePattern = /sendViewPageEvent\s*\(/g;

    // Pattern 3: createEvent('event_type', ...) - backup pattern
    const createEventPattern = /createEvent\s*\(\s*['"]([^'"]+)['"]/g;

    for (const scanPath of scanPaths) {
        const absoluteScanPath = resolve(projectRoot, scanPath);
        const pattern = join(absoluteScanPath, '**/*.{ts,tsx}');

        const files = await glob(pattern, {
            ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/node_modules/**'],
        });

        if (verbose) {
            console.log(`  📂 Scanning ${files.length} files in ${scanPath}...`);
        }

        for (const file of files) {
            try {
                const content = readFileSync(file, 'utf-8');

                // Find trackEvent calls
                let match;
                while ((match = trackEventPattern.exec(content)) !== null) {
                    const eventType = match[1];
                    instrumentedEvents.add(eventType);
                    if (verbose) {
                        console.log(`    ✓ Found trackEvent('${eventType}') in ${file}`);
                    }
                }

                // Check for sendViewPageEvent (implies view_page is instrumented)
                if (sendViewPagePattern.test(content)) {
                    instrumentedEvents.add('view_page');
                    if (verbose) {
                        console.log(`    ✓ Found sendViewPageEvent() in ${file}`);
                    }
                }

                // Find createEvent calls as backup
                while ((match = createEventPattern.exec(content)) !== null) {
                    const eventType = match[1];
                    instrumentedEvents.add(eventType);
                    if (verbose) {
                        console.log(`    ✓ Found createEvent('${eventType}') in ${file}`);
                    }
                }

                // Reset regex lastIndex for next file
                trackEventPattern.lastIndex = 0;
                sendViewPagePattern.lastIndex = 0;
                createEventPattern.lastIndex = 0;
            } catch (error) {
                if (verbose) {
                    console.warn(`    ⚠️  Could not read ${file}: ${(error as Error).message}`);
                }
            }
        }
    }

    return instrumentedEvents;
}

/**
 * Extract enabled event toggles per adapter
 * Dynamically iterates over all keys in eventToggles - supports custom event types
 */
function extractEnabledEvents(engagement: EngagementConfig): Map<string, Set<string>> {
    const adapterEvents = new Map<string, Set<string>>();

    if (!engagement.adapters) {
        return adapterEvents;
    }

    for (const [adapterName, adapterConfig] of Object.entries(engagement.adapters)) {
        // Skip disabled adapters
        if (!adapterConfig.enabled) {
            continue;
        }

        const enabledEvents = new Set<string>();

        if (adapterConfig.eventToggles) {
            // Dynamically iterate over all keys in eventToggles
            for (const [eventType, isEnabled] of Object.entries(adapterConfig.eventToggles)) {
                if (isEnabled === true) {
                    enabledEvents.add(eventType);
                }
            }
        }

        if (enabledEvents.size > 0) {
            adapterEvents.set(adapterName, enabledEvents);
        }
    }

    return adapterEvents;
}

/**
 * Vite plugin that validates event instrumentation at build time.
 *
 * This plugin scans source files for trackEvent() calls and validates that
 * all enabled event toggles in config.server.ts have corresponding instrumentation.
 *
 * @param config - Configuration options for the plugin
 * @returns A Vite plugin that validates event instrumentation
 *
 * @example
 * // In vite.config.ts
 * export default defineConfig({
 *   plugins: [
 *     eventInstrumentationValidatorPlugin({
 *       configPath: 'config.server.ts',
 *       scanPaths: ['src'],
 *       verbose: true
 *     })
 *   ]
 * })
 */
export const eventInstrumentationValidatorPlugin = (config: EventInstrumentationValidatorConfig = {}): Plugin => {
    const { configPath = 'config.server.ts', scanPaths = ['src'], failOnMissing = false, verbose = false } = config;

    let resolvedConfig: ResolvedConfig;

    return {
        name: 'storefrontnext:event-instrumentation-validator',
        apply: 'build',

        configResolved(viteConfig) {
            resolvedConfig = viteConfig;
        },

        async buildStart() {
            const projectRoot = resolvedConfig.root;

            if (verbose) {
                console.log('\n🔍 [event-instrumentation] Validating event instrumentation...');
            }

            // Load engagement config
            const engagement = await loadEngagementConfig(projectRoot, configPath, verbose);

            if (!engagement) {
                if (verbose) {
                    console.log('  ℹ️  Skipping validation - no engagement config found\n');
                }
                return;
            }

            // Extract enabled events per adapter
            const adapterEvents = extractEnabledEvents(engagement);

            if (adapterEvents.size === 0) {
                if (verbose) {
                    console.log('  ℹ️  No enabled adapters with event toggles found\n');
                }
                return;
            }

            // Scan source files for instrumented events
            const instrumentedEvents = await scanForInstrumentedEvents(projectRoot, scanPaths, verbose);

            if (verbose) {
                console.log(`\n  🔎 Found ${instrumentedEvents.size} instrumented event types:`);
                for (const event of instrumentedEvents) {
                    console.log(`     - ${event}`);
                }
            }

            // Validate each adapter's enabled events
            const missingInstrumentation: Array<{ adapter: string; event: string }> = [];

            for (const [adapterName, enabledEvents] of adapterEvents) {
                for (const eventType of enabledEvents) {
                    if (!instrumentedEvents.has(eventType)) {
                        missingInstrumentation.push({
                            adapter: adapterName,
                            event: eventType,
                        });
                    }
                }
            }

            // Report results
            if (missingInstrumentation.length === 0) {
                if (verbose) {
                    console.log('\n  ✅ All enabled events are instrumented\n');
                }
                return;
            }

            // Report missing instrumentation
            console.log('\n');
            for (const { adapter, event } of missingInstrumentation) {
                console.warn(
                    `  ⚠️  [event-instrumentation] ${adapter}.${event} is enabled but '${event}' is never instrumented`
                );
            }
            console.log('\n');

            if (failOnMissing) {
                throw new Error(
                    `[event-instrumentation] ${missingInstrumentation.length} event(s) are enabled but not instrumented. ` +
                        `Either add instrumentation or disable the event toggles in config.server.ts.`
                );
            }
        },
    };
};
