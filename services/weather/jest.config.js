export default {
  testEnvironment: 'node',
  testTimeout: 30000,
  // Remove moduleNameMapper to avoid interfering with node_modules resolution
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov'],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  transform: {}
};