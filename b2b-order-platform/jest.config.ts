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
  testPathIgnorePatterns: [
    "/node_modules/",
    // TODO: migrate tests/store-service.test.ts from node:test to Jest, then drop this entry
    "<rootDir>/tests/store-service.test.ts",
  ],
};

export default config;
