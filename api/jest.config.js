import { createDefaultPreset } from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset({
  tsconfig: 'tsconfig.test.json',
}).transform;

/** @type {import("jest").Config} **/
const config = {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

export default config;
