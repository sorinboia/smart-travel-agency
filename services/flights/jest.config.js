/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.js'],
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  transform: {}
};