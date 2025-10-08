export default {
    arrowParens: 'always',
    bracketSameLine: true,
    bracketSpacing: true,
    htmlWhitespaceSensitivity: 'ignore',
    printWidth: 120,
    quoteProps: 'as-needed',
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'es5',
    useTabs: false,
    overrides: [
        {
            files: '*.yml',
            options: {
                tabWidth: 2,
            },
        },
    ],
};
