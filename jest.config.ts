import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        jsx: 'react-jsx',
      },
    }],
  },
  clearMocks: true,
  collectCoverageFrom: [
    'src/lib/xrpl/**/*.ts',
    '!src/lib/xrpl/index.ts',
  ],
};

export default config;
