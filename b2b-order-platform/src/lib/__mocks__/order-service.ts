export const createMapping = jest.fn();
export const getMapping = jest.fn();
export const transitionStatus = jest.fn();
export const setMappingField = jest.fn();
export const listMappingsForStore = jest.fn();
export const listMappingsForBuyer = jest.fn();
export const isOrderServiceError = jest.fn((x: unknown) =>
  typeof x === "object" && x !== null && "error" in x && "status" in x && "message" in x
);
