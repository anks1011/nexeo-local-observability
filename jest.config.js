module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@nexeo-local-observability/log-types$': '<rootDir>/packages/log-types/src/index.ts',
    '^@nexeo-local-observability/log-parser$': '<rootDir>/packages/log-parser/src/index.ts',
  },
  moduleDirectories: ['node_modules', '<rootDir>/packages/log-parser/node_modules'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
