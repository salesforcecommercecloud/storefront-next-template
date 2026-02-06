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

/**
 * Storybook Coverage Report Generator
 *
 * Scans /src/components and /src/extensions recursively:
 *  - Detects all *.tsx component files (except *.stories.tsx, *.test.tsx, *.snapshot.tsx, *-snapshot.tsx)
 *  - Detects matching *.stories.tsx files
 *  - Creates coverage %, missing story list
 *  - Emits Markdown + JSON summary
 */
import fs from 'fs';
import path from 'path';
// ---- CONFIG ----
const COMPONENTS_DIR = path.join(process.cwd(), 'src/components');
const EXTENSIONS_DIR = path.join(process.cwd(), 'src/extensions');
const OUTPUT_DIR = path.join(process.cwd(), '.storybook', 'coverage');
const JSON_PATH = path.join(OUTPUT_DIR, 'storybook-component-coverage.json');
const MD_PATH = path.join(OUTPUT_DIR, 'storybook-component-coverage.md');
const COMPONENT_OWNERS_PATH = path.join(process.cwd(), 'config', 'component-owners.json');

// Coverage thresholds
const STORY_COVERAGE_THRESHOLD = 100; // All components must have stories
const CODE_COVERAGE_THRESHOLD = 80; // Minimum acceptable code coverage

// Load component ownership mapping and build reverse lookup
// Structure: { "team-name": { "slack": "@channel", "components": [...] } }
let teamOwners = {};
let componentOwners = {}; // Reverse lookup: component name -> { team, slack }
if (fs.existsSync(COMPONENT_OWNERS_PATH)) {
    try {
        teamOwners = JSON.parse(fs.readFileSync(COMPONENT_OWNERS_PATH, 'utf8'));
        // Build reverse lookup map: component name -> ownership info
        for (const [teamName, teamInfo] of Object.entries(teamOwners)) {
            if (teamInfo.components && Array.isArray(teamInfo.components)) {
                for (const componentName of teamInfo.components) {
                    componentOwners[componentName] = {
                        team: teamName,
                        slack: teamInfo.slack || null,
                    };
                }
            }
        }
    } catch (e) {
        console.warn(`⚠️  Could not load component owners file: ${e.message}`);
    }
}

/**
 * Get ownership info for a component by matching component name or parent directory
 * @param {string} componentName - Component name (e.g., "cart/cart-content" or "checkout/payment-form")
 * @returns {object|null} Ownership info with team and slack, or null if not found
 */
function getComponentOwnership(componentName) {
    // Try exact match first
    if (componentOwners[componentName]) {
        return componentOwners[componentName];
    }
    // Try parent directory match (e.g., "cart/cart-content" -> "cart")
    const parts = componentName.split('/');
    if (parts.length > 1) {
        const parentDir = parts[0];
        if (componentOwners[parentDir]) {
            return componentOwners[parentDir];
        }
    }
    return null;
}

// Components that don't require stories (simple icons, internal sub-components, etc.)
const EXCLUDED_COMPONENTS = new Set([
    // Simple icon components
    'icons/amex-icon',
    'icons/discover-icon',
    'icons/generic-card-icon',
    'icons/heart-icon',
    'icons/mastercard-icon',
    'icons/visa-icon',
    'product-carousel/index',
    'product-cart-actions/index',
    'product-image/index',
    'product-item-skeleton/index',
    'product-item/index',
    'product-items-list/index',
    'product-price/index',
    'product-skeleton/index',
    'product-tile/index',
    'product-view/index',
    'theme-switcher/components/footer/index',
    'store-locator/components/footer/index',
    // Page Designer Region and Component Wrapper, there is no value in having storybook stories for these
    'region/component',
    'region/component-data-context',
    'region/index',
    'region/region-wrapper',
]);
// Ensure OUTPUT DIR exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
// Check if at least one directory exists
if (!fs.existsSync(COMPONENTS_DIR) && !fs.existsSync(EXTENSIONS_DIR)) {
    console.error(`❌ Neither components nor extensions directory found: ${COMPONENTS_DIR} or ${EXTENSIONS_DIR}`);
    process.exit(1);
}
function walk(dir, fileCallback) {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full, fileCallback);
        else fileCallback(full);
    }
}
function getComponentName(filePath, componentsDir) {
    // Get relative path from components directory
    const relativePath = path.relative(componentsDir, filePath);
    // Remove extension and get the component identifier
    const withoutExt = relativePath.replace(/\.tsx$/, '');
    // Replace path separators with '/' for consistency
    return withoutExt.split(path.sep).join('/');
}
function generateCoverage() {
    const components = new Map(); // Map<componentName, filePath>
    const stories = new Set();

    // Helper function to collect stories from a directory
    // Stories MUST be in a /stories/ subdirectory
    function collectStories(dir, baseDir, isExtensions = false) {
        if (!fs.existsSync(dir)) return;
        walk(dir, (file) => {
            if (file.endsWith('.stories.tsx')) {
                // Stories MUST be in a /stories/ subdirectory
                if (!file.includes(path.sep + 'stories' + path.sep)) {
                    return;
                }
                // For extensions, only include stories in components/ folders
                if (isExtensions) {
                    const rel = path.relative(baseDir, file);
                    // Check if the relative path contains components/ folder
                    const pathParts = rel.split(path.sep);
                    if (!pathParts.includes('components')) {
                        return;
                    }
                }
                // Extract component name from story path
                // e.g., "components/cart/stories/cart-content.stories.tsx" -> "cart/cart-content"
                const rel = path.relative(baseDir, file);
                const parts = rel.split(path.sep);
                const storiesIndex = parts.indexOf('stories');
                if (storiesIndex === -1) return;

                // Get the component directory path (everything before "stories")
                const componentDir = parts.slice(0, storiesIndex).join('/');
                // Get the story file name without extension
                const storyName = parts[storiesIndex + 1].replace(/\.stories\.tsx$/, '');

                // Build component name: if story is "index.stories.tsx", use the directory name
                // Otherwise use the story name
                const componentName = storyName === 'index' ? componentDir : `${componentDir}/${storyName}`;

                stories.add(componentName);
            }
        });
    }

    // Helper function to collect components from a directory
    function collectComponents(dir, baseDir, isExtensions = false) {
        if (!fs.existsSync(dir)) return;
        walk(dir, (file) => {
            // For extensions, only include components in components/ folders
            if (isExtensions) {
                const rel = path.relative(baseDir, file);
                // Check if the relative path contains components/ folder
                const pathParts = rel.split(path.sep);
                if (!pathParts.includes('components')) {
                    return;
                }
            }

            // Skip story files, test files, and snapshot files
            if (
                file.endsWith('.stories.tsx') ||
                file.endsWith('.test.tsx') ||
                file.endsWith('-snapshot.tsx') ||
                file.includes('/stories/') ||
                file.includes('/__snapshots__/') ||
                file.includes('/__mocks__/')
            ) {
                return;
            }
            // Only process .tsx files
            if (file.endsWith('.tsx')) {
                const componentName = getComponentName(file, baseDir);
                // Store both the name and path for better reporting
                if (!components.has(componentName)) {
                    components.set(componentName, file);
                }
            }
        });
    }

    // Collect all story files first
    collectStories(COMPONENTS_DIR, COMPONENTS_DIR, false);
    collectStories(EXTENSIONS_DIR, EXTENSIONS_DIR, true);

    // Collect all component files
    collectComponents(COMPONENTS_DIR, COMPONENTS_DIR, false);
    collectComponents(EXTENSIONS_DIR, EXTENSIONS_DIR, true);
    // Find missing stories
    const missing = [];
    const excluded = [];
    for (const [componentName, filePath] of components.entries()) {
        // Skip ejected `shadcn/ui` components
        if (filePath.includes('/components/ui/')) {
            excluded.push({ name: componentName, path: filePath });
            continue;
        }

        // Skip excluded components
        if (EXCLUDED_COMPONENTS.has(componentName)) {
            excluded.push({ name: componentName, path: filePath });
            continue;
        }
        // Check if there's a matching story
        // Stories MUST be in a /stories/ subdirectory
        // A story can match by:
        // 1. Component "cart/cart-content" matches story "cart/cart-content" (from "cart/stories/cart-content.stories.tsx")
        // 2. Component "cart/index" matches story "cart" (from "cart/stories/index.stories.tsx")
        const dirName = path.dirname(componentName);
        const hasStory = stories.has(componentName) || (componentName.endsWith('/index') && stories.has(dirName));
        if (!hasStory) {
            const ownership = getComponentOwnership(componentName);
            missing.push({
                name: componentName,
                path: filePath,
                team: ownership?.team || null,
                slack: ownership?.slack || null,
            });
        }
    }
    const totalComponents = components.size;
    const componentsNeedingStories = totalComponents - excluded.length;
    const covered = componentsNeedingStories - missing.length;
    const percent = componentsNeedingStories === 0 ? 100 : Math.round((covered / componentsNeedingStories) * 100);
    // Sort missing components for better readability
    missing.sort((a, b) => a.name.localeCompare(b.name));

    // Determine badge color based on coverage
    let badgeColor = 'red';
    let badgeEmoji = '❌';
    if (percent === 100) {
        badgeColor = 'brightgreen';
        badgeEmoji = '✅';
    } else if (percent >= 90) {
        badgeColor = 'green';
        badgeEmoji = '✅';
    } else if (percent >= 75) {
        badgeColor = 'yellowgreen';
        badgeEmoji = '⚠️';
    } else if (percent >= 50) {
        badgeColor = 'yellow';
        badgeEmoji = '⚠️';
    }

    // Check if thresholds are met
    const storyCoverageMet = percent >= STORY_COVERAGE_THRESHOLD;

    const jsonSummary = {
        timestamp: new Date().toISOString(),
        totalComponents,
        componentsNeedingStories,
        componentsWithStories: covered,
        coveragePercent: percent,
        excludedComponents: excluded.length,
        missingComponents: missing.map((m) => ({
            name: m.name,
            team: m.team,
            slack: m.slack,
        })),
        thresholds: {
            storyCoverage: {
                threshold: STORY_COVERAGE_THRESHOLD,
                met: storyCoverageMet,
            },
            codeCoverage: {
                threshold: CODE_COVERAGE_THRESHOLD,
                met: null, // Will be set after code coverage is loaded
            },
        },
    };

    // Merge Vitest code coverage metrics if available
    const vitestSummaryPath = path.join(
        process.cwd(),
        '.storybook',
        'coverage',
        'coverage-vitest',
        'coverage-summary.json'
    );
    if (fs.existsSync(vitestSummaryPath)) {
        try {
            const vitest = JSON.parse(fs.readFileSync(vitestSummaryPath, 'utf8'));
            jsonSummary.codeCoverage = vitest.total; // {lines:{pct:..}, statements:..., functions:..., branches:...}
            // Calculate average code coverage and check threshold
            const lines = vitest.total.lines?.pct || 0;
            const statements = vitest.total.statements?.pct || 0;
            const functions = vitest.total.functions?.pct || 0;
            const branches = vitest.total.branches?.pct || 0;
            const avgCoverage = (lines + statements + functions + branches) / 4;
            jsonSummary.thresholds.codeCoverage.met = avgCoverage >= CODE_COVERAGE_THRESHOLD;
        } catch (e) {
            console.warn('⚠️  Could not read vitest coverage summary:', e.message);
        }
    }

    // Format date nicely
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    });

    const md = `
<div align="center">

# 📚 Storybook Component Coverage Report


---

</div>

## 📚 Story Coverage

<div align="center">

![Story Coverage](https://img.shields.io/badge/story%20coverage-${percent}%25-${badgeColor}?style=for-the-badge&logo=storybook)
${missing.length === 0 ? '![Status](https://img.shields.io/badge/status-complete-success?style=flat-square)' : `![Status](https://img.shields.io/badge/missing-${missing.length}%20stories-critical?style=flat-square)`}

</div>

| Metric | Value | Status | Threshold |
|:-------|:-----:|:------:|:---------:|
| **Total Components** | \`${totalComponents}\` | ${totalComponents > 0 ? '📦' : '⚠️'} | - |
| **Components Needing Stories** | \`${componentsNeedingStories}\` | ${componentsNeedingStories > 0 ? '📦' : '⚠️'} | - |
| **Components With Stories** | \`${covered}\` | ${covered === componentsNeedingStories ? '✅' : '⚠️'} | - |
| **Excluded Components** | \`${excluded.length}\` | ℹ️ | - |
| **Coverage** | **\`${percent}%\`** | ${badgeEmoji} | \`${STORY_COVERAGE_THRESHOLD}%\` ${storyCoverageMet ? '✅' : '❌'} |

${
    missing.length === 0
        ? `
<div align="center">

### 🎉 Perfect Coverage!

**All \`${componentsNeedingStories}\` components that need stories have Storybook stories!** 

✨ Great job maintaining comprehensive component documentation! ✨

</div>
`
        : `
## ⚠️ Missing Stories (${missing.length})

The following components are missing Storybook stories:

<details>
<summary><b>📋 Click to expand missing components list</b></summary>

${(() => {
    // Group missing components by team
    const byTeam = {};
    const unassigned = [];

    missing.forEach((m) => {
        if (m.team) {
            if (!byTeam[m.team]) {
                byTeam[m.team] = {
                    slack: m.slack,
                    components: [],
                };
            }
            byTeam[m.team].components.push(m);
        } else {
            unassigned.push(m);
        }
    });

    // Build markdown output
    let output = '';

    // Grouped by team
    const sortedTeams = Object.keys(byTeam).sort();
    sortedTeams.forEach((teamName) => {
        const teamData = byTeam[teamName];
        const slackInfo = teamData.slack ? ` ${teamData.slack}` : '';
        output += `\n### 👥 ${teamName}${slackInfo}\n\n`;
        teamData.components
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((m) => {
                output += `- \`${m.name}\`\n`;
            });
    });

    // Unassigned components
    if (unassigned.length > 0) {
        output += `\n### ⚠️ Unassigned Components\n\n`;
        unassigned
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((m) => {
                output += `- \`${m.name}\`\n`;
            });
    }

    return output.trim();
})()}

</details>
`
}

${
    jsonSummary.codeCoverage
        ? (() => {
              const lines = jsonSummary.codeCoverage.lines?.pct || 0;
              const statements = jsonSummary.codeCoverage.statements?.pct || 0;
              const functions = jsonSummary.codeCoverage.functions?.pct || 0;
              const branches = jsonSummary.codeCoverage.branches?.pct || 0;
              const avgCoverage = (lines + statements + functions + branches) / 4;

              let codeCoverageBadgeColor = 'red';
              if (avgCoverage >= 90) {
                  codeCoverageBadgeColor = 'brightgreen';
              } else if (avgCoverage >= 80) {
                  codeCoverageBadgeColor = 'green';
              } else if (avgCoverage >= 70) {
                  codeCoverageBadgeColor = 'yellowgreen';
              } else if (avgCoverage >= 50) {
                  codeCoverageBadgeColor = 'yellow';
              }

              const getStatusEmoji = (pct) => {
                  if (pct >= 90) return '🟢';
                  if (pct >= 80) return '🟡';
                  if (pct >= 70) return '🟠';
                  return '🔴';
              };

              return `
---
## 💻 Code Coverage (Story Interaction Tests)

<div align="center">

![Code Coverage](https://img.shields.io/badge/code%20coverage-${avgCoverage.toFixed(2)}%25-${codeCoverageBadgeColor}?style=for-the-badge&logo=vitest)

</div>

| Metric | Coverage | Status | Threshold |
|:-------|:--------:|:------:|:---------:|
| **📄 Lines** | \`${lines.toFixed(2)}%\` | ${getStatusEmoji(lines)} | \`${CODE_COVERAGE_THRESHOLD}%\` ${lines >= CODE_COVERAGE_THRESHOLD ? '✅' : '❌'} |
| **📝 Statements** | \`${statements.toFixed(2)}%\` | ${getStatusEmoji(statements)} | \`${CODE_COVERAGE_THRESHOLD}%\` ${statements >= CODE_COVERAGE_THRESHOLD ? '✅' : '❌'} |
| **⚙️ Functions** | \`${functions.toFixed(2)}%\` | ${getStatusEmoji(functions)} | \`${CODE_COVERAGE_THRESHOLD}%\` ${functions >= CODE_COVERAGE_THRESHOLD ? '✅' : '❌'} |
| **🌿 Branches** | \`${branches.toFixed(2)}%\` | ${getStatusEmoji(branches)} | \`${CODE_COVERAGE_THRESHOLD}%\` ${branches >= CODE_COVERAGE_THRESHOLD ? '✅' : '❌'} |
| **📊 Average** | **\`${avgCoverage.toFixed(2)}%\`** | ${getStatusEmoji(avgCoverage)} | \`${CODE_COVERAGE_THRESHOLD}%\` ${avgCoverage >= CODE_COVERAGE_THRESHOLD ? '✅' : '❌'} |
`;
          })()
        : ''
}

---

<div align="right">

<sub>📅 Generated: ${formattedDate}</sub>

</div>
`;

    fs.writeFileSync(JSON_PATH, JSON.stringify(jsonSummary, null, 2));
    fs.writeFileSync(MD_PATH, md.trim());
    console.log('✔️ Coverage report generated');
    console.log(`📄 JSON: ${JSON_PATH}`);
    console.log(`📄 MD: ${MD_PATH}`);
    console.log(
        `📊 Coverage: ${percent}% (${covered}/${componentsNeedingStories} components needing stories, ${excluded.length} excluded)`
    );
    // Exit non-zero for CI enforcement if thresholds not met
    let exitCode = 0;
    if (!storyCoverageMet) {
        console.error(`\n❌ Story coverage threshold not met: ${percent}% < ${STORY_COVERAGE_THRESHOLD}%`);
        console.error(`   Missing stories for ${missing.length} component(s):`);
        missing.slice(0, 10).forEach((m) => {
            const ownership = m.team ? ` (${m.team}${m.slack ? ` ${m.slack}` : ''})` : '';
            console.error(`   - ${m.name}${ownership}`);
        });
        if (missing.length > 10) {
            console.error(`   ... and ${missing.length - 10} more (see report for full list)`);
        }
        exitCode = 1;
    }

    // Check code coverage threshold if available (warning only, does not fail pipeline)
    if (jsonSummary.codeCoverage && jsonSummary.thresholds.codeCoverage.met === false) {
        const lines = jsonSummary.codeCoverage.lines?.pct || 0;
        const statements = jsonSummary.codeCoverage.statements?.pct || 0;
        const functions = jsonSummary.codeCoverage.functions?.pct || 0;
        const branches = jsonSummary.codeCoverage.branches?.pct || 0;
        const avgCoverage = (lines + statements + functions + branches) / 4;
        console.warn(
            `\n⚠️  Code coverage threshold not met: ${avgCoverage.toFixed(2)}% < ${CODE_COVERAGE_THRESHOLD}% (warning only, pipeline will not fail)`
        );
        // Note: exitCode is not set to 1, so pipeline will not fail for code coverage
    }

    process.exit(exitCode);
}
generateCoverage();
