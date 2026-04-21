import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", {}],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testTimeout: 20000,
  // TODO: migrate tests/store-service.test.ts from node:test to jest and remove this ignore
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/tests/store-service.test.ts"],
};

export default config;
