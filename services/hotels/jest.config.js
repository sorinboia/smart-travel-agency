export default {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.js'],
  coverageDirectory: './coverage',
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};