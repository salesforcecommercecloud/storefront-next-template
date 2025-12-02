// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

// TODO: generator should generate a working eslint config
const baseConfig = await import('../../eslint.config.js');

export default [
    ...baseConfig.default,
    {
        // Ignore Storybook config files from linting (they have their own TS project context)
        // Also ignore other things to minimize memory issues
        ignores: [
            '.storybook/**/*',
            'build/**/*',
            'coverage/**/*',
            'storybook-static/**/*',
            '_local/**/*',
            '**/__snapshots__/**/*',
        ],
    },
    {
        // Storybook story files - apply Storybook-specific rules
        files: ['**/*.stories.{ts,tsx,js,jsx}', '**/*-snapshot.{ts,tsx,js,jsx}'],
        plugins: {
            storybook,
        },
        rules: {
            ...storybook.configs.recommended.rules,
            'import/no-namespace': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/consistent-type-imports': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'custom/color-linter': 'off',
        },
    },
];
