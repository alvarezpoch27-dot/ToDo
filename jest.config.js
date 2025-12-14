module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/www/', '<rootDir>/.angular/'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      isolatedModules: true,
    },
  },
  transform: {
    '^.+\\.(ts|js|mjs)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  // Transform some ESM node_modules (Angular, RxJS) so Jest can run them
  transformIgnorePatterns: ['node_modules/(?!(\@angular|rxjs|tslib)/)'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts', '!src/polyfills.ts'],
  coverageDirectory: 'coverage',
  coverageThreshold: { global: { branches: 70, functions: 70, lines: 70, statements: 70 } },
};
