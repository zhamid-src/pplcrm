import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  globalSetup: 'jest-preset-angular/global-setup',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      { tsconfig: '<rootDir>/tsconfig.spec.json' }
    ],
  },
  moduleNameMapper: {
    '^common/(.*)$': '<rootDir>/../../common/$1',
    '^@uxcommon/(.*)$': '<rootDir>/src/app/uxcommon/$1',
    '^@services/(.*)$': '<rootDir>/src/app/services/$1',
    '^@pipes/(.*)$': '<rootDir>/src/app/pipes/$1',
    '^@common$': '<rootDir>/../../common/src/index.ts',
    '^apps/frontend/(.*)$': '<rootDir>/$1'
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  coverageDirectory: '../../coverage/apps/frontend'
};

export default config;
