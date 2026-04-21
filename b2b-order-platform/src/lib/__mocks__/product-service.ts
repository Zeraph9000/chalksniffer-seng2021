export const getProduct = jest.fn();
export const reserveVariantStock = jest.fn();
export const restoreVariantStock = jest.fn();
export const createProduct = jest.fn();
export const updateProduct = jest.fn();
export const softDeleteProduct = jest.fn();
export const listProductsForStore = jest.fn();
export const isProductServiceError = jest.fn((x: unknown) =>
  typeof x === "object" && x !== null && "error" in x && "status" in x && "message" in x
);
