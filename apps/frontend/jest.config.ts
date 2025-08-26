import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.(ts|mjs|js)$': [
      'jest-preset-angular',
      { tsconfig: '<rootDir>/tsconfig.spec.json' }
    ],
  },
  moduleNameMapper: {
    '^common/(.*)$': '<rootDir>/../../common/$1',
    '^@uxcommon/(.*)$': '<rootDir>/src/app/uxcommon/$1',
    '^@icons/(.*)$': '<rootDir>/src/app/uxcommon/components/icons/$1',
    '^@services/(.*)$': '<rootDir>/src/app/services/$1',
    '^@pipes/(.*)$': '<rootDir>/src/app/pipes/$1',
    '^@common$': '<rootDir>/../../common/src/index.ts',
    '^apps/frontend/(.*)$': '<rootDir>/$1',
    '\\.(html)$': '<rootDir>/src/__mocks__/html.mock.ts',
    '\\.svg\\?raw$': '<rootDir>/src/__mocks__/svg.mock.ts'
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  coverageDirectory: '../../coverage/apps/frontend'
};

export default config;
