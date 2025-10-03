/**
 * Jest configuration for Angular with support for external templates.
 */

export default {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: [
    '<rootDir>/setup-jest.ts',
  ],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: [
    'html',
    'text-summary',
  ],
  testMatch: [
    '**/+(*.)+(spec).+(ts)',
  ],
};
