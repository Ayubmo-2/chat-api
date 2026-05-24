/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@chat-api/db$': '<rootDir>/../../packages/db/src/index.ts',
    '^@chat-api/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  globalSetup: '<rootDir>/tests/setup.ts',
  globalTeardown: '<rootDir>/tests/teardown.ts',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
