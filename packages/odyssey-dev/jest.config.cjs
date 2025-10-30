module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  transformIgnorePatterns: ['/node_modules/(?!@babel/runtime)'],
  testMatch: ['**/*.test.(ts|tsx|js)'],
  verbose: true,
  testLocationInResults: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/extensibility/create-instructions.ts',
    'src/extensibility/trim-extensions.ts',
    'src/extensibility/path-util.ts'
  ],
  coverageReporters: ['text', 'lcov'],
  testPathIgnorePatterns: ['/dist/']
}


