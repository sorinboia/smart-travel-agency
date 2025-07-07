export default {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true
};