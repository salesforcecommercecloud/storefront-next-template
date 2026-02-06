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

// ============================================================================
// GENERATED FILE - DO NOT EDIT MANUALLY
// ============================================================================
// This file is generated from the parent monorepo's eslint.config.js
// by copying its contents and merging with template-specific Storybook overrides.
// Run 'node scripts/generate-eslint-config.js' to regenerate.
// ============================================================================

import { fileURLToPath } from 'node:url';
import globals from 'globals';
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import { includeIgnoreFile } from '@eslint/compat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import jsonc from 'eslint-plugin-jsonc';
import headersPlugin from 'eslint-plugin-headers';
import { colorLinterRule, noAsyncPageLoaderRule, noClientActionsRule, noClientLoadersRule } from './eslint.rules.js';

const APACHE_LICENSE_HEADER = [
    `Copyright ${new Date().getFullYear()} Salesforce, Inc.`,
    '',
    'Licensed under the Apache License, Version 2.0 (the "License");',
    'you may not use this file except in compliance with the License.',
    'You may obtain a copy of the License at',
    '',
    '    http://www.apache.org/licenses/LICENSE-2.0',
    '',
    'Unless required by applicable law or agreed to in writing, software',
    'distributed under the License is distributed on an "AS IS" BASIS,',
    'WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
    'See the License for the specific language governing permissions and',
    'limitations under the License.',
].join('\n');

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

const baseConfig = defineConfig([
    eslint.configs.recommended,
    /**
     * @see {@link https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/eslintrc/recommended-type-checked.ts}
     */
    tseslint.configs.recommendedTypeChecked,
    importPlugin.flatConfigs.typescript,
    react.configs.flat.recommended,
    react.configs.flat['jsx-runtime'],
    includeIgnoreFile(gitignorePath, 'Imported .gitignore patterns'),
    jsonc.configs['flat/recommended-with-json'],
    {
        // Ignore generated SCAPI client files, ejected shadcn/ui components, and Claude settings
        ignores: ['**/src/scapi-client/generated/**', '**/src/components/ui/**', '.claude/**'],
    },
    {
        files: ['**/*.js'],
        settings: {
            react: {
                version: 'detect', // Auto-detect React version
            },
        },
        extends: [tseslint.configs.disableTypeChecked],
        languageOptions: {
            globals: {
                ...globals.nodeBuiltin,
            },
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        settings: {
            react: {
                version: 'detect', // Auto-detect React version
            },
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.nodeBuiltin,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            custom: {
                rules: {
                    'color-linter': colorLinterRule,
                    'no-async-page-loader': noAsyncPageLoaderRule,
                    'no-client-actions': noClientActionsRule,
                    'no-client-loaders': noClientLoadersRule,
                },
            },
        },
        rules: {
            // Override/extend rules from recommended configs
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
            '@typescript-eslint/dot-notation': [
                'error',
                {
                    allowPrivateClassPropertyAccess: true,
                    allowProtectedClassPropertyAccess: true,
                },
            ],
            '@typescript-eslint/no-dupe-class-members': 'error',
            '@typescript-eslint/no-empty-function': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-redeclare': 'error',
            '@typescript-eslint/no-shadow': 'error',
            '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-useless-constructor': 'error',
            '@typescript-eslint/prefer-promise-reject-errors': [
                'error',
                { allowThrowingAny: true, allowThrowingUnknown: true },
            ],

            // TODO: Disabled for the time being. Should consider turning it on once issues resolved.
            // '@typescript-eslint/explicit-function-return-type': 'error',
            // '@typescript-eslint/explicit-module-boundary-types': 'error',
            // '@typescript-eslint/no-use-before-define': 'error',
            '@typescript-eslint/no-base-to-string': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',

            // TODO: Commerce SDK types migration - turn this on once issues resolved.
            '@typescript-eslint/no-redundant-type-constituents': 'off',

            // React rules (beyond the ones defined by `react.configs.flat.recommended`)
            'react/no-array-index-key': 'error',
            'react/no-danger': 'error',
            'react/no-unsafe': 'error',
            'react/self-closing-comp': 'error',
            'react/style-prop-object': 'error',
            'react/void-dom-elements-no-children': 'error',

            // React Hooks rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // React Refresh rules
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

            // General code quality rules
            'import/no-namespace': 'error',
            'no-console': 'warn',
            'no-debugger': 'error',
            'no-alert': 'warn',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-duplicate-imports': 'error',
            'no-useless-return': 'warn',
            'no-useless-constructor': 'warn',
            'no-useless-rename': 'warn',
            'object-shorthand': 'warn',
            'prefer-arrow-callback': 'warn',
            'prefer-template': 'warn',
            quotes: [
                'error',
                'single',
                {
                    avoidEscape: true,
                    allowTemplateLiterals: true,
                },
            ],
            'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreStrings: true }],

            // Custom color linting rule
            'custom/color-linter': 'error',
        },
    },
    {
        // Ejected/generated shadcn/ui components
        files: ['src/components/ui/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'off',
            '@typescript-eslint/no-shadow': 'off',
            'import/no-namespace': 'off',
        },
    },
    {
        // Build/tooling files
        files: ['**/*.config.{js,ts}', '**/scripts/**/*.{js,ts}'],
        languageOptions: {
            globals: {
                ...globals.nodeBuiltin,
            },
        },
        rules: {
            'no-console': 'off', // Allow console in config/script files
        },
    },
    {
        // Test files - relax some rules
        files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/__tests__/**/*.{ts,tsx,js,jsx}'],
        languageOptions: {
            globals: {
                ...globals.vitest,
            },
        },
        rules: {
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'off',
            'max-len': 'off',
        },
    },
    {
        // Route files - apply custom loader rules
        files: ['**/routes/**/!(*.test).{ts,tsx}'],
        rules: {
            '@typescript-eslint/only-throw-error': ['error', { allow: [{ from: 'lib', name: ['Response'] }] }],
            'custom/no-async-page-loader': 'warn',
            'custom/no-client-actions': 'error',
            'custom/no-client-loaders': 'error',
        },
    },
    {
        // Disable color linting for migration script
        files: ['scripts/migrate-colors.js'],
        rules: {
            'custom/color-linter': 'off',
        },
    },
    {
        // TypeScript declaration files - relax rules for type definitions
        files: ['**/*.d.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        // typescript-eslint was conflicting with json files so had to disable it
        files: ['**/*.json'],
        extends: [tseslint.configs.disableTypeChecked],
    },
    {
        // Apache License 2.0 file headers
        files: ['**/*.{ts,tsx,js,jsx}'],
        plugins: {
            headers: headersPlugin,
        },
        rules: {
            'headers/header-format': [
                'error',
                {
                    source: 'string',
                    content: APACHE_LICENSE_HEADER,
                },
            ],
        },
    },
    // Prettier should be last to override formatting rules
    eslintPluginPrettierRecommended,
]);

// Template-specific overrides (Storybook)
const { storybookOverrides } = await import('./eslint.storybook-overrides.js');

export default [...baseConfig, ...storybookOverrides];
