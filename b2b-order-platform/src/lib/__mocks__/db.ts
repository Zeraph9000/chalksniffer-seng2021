export const mockFindOne = jest.fn();
export const mockInsertOne = jest.fn();
export const mockUpdateOne = jest.fn();
export const mockFindOneAndUpdate = jest.fn();

const mockDb = {
  collection: jest.fn(() => ({
    findOne: mockFindOne,
    find: jest.fn(() => ({ sort: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })) })),
    insertOne: mockInsertOne,
    updateOne: mockUpdateOne,
    findOneAndUpdate: mockFindOneAndUpdate,
    createIndex: jest.fn(),
  })),
};

const mockClient = {
  db: jest.fn(() => mockDb),
};

const clientPromise = Promise.resolve(mockClient);

export default clientPromise;
