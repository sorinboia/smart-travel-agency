/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  roots: ['<rootDir>/test'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  transform: {}
};