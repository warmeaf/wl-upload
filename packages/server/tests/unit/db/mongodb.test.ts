import { MongoClient } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as mongodb from "../../../src/db/mongodb";
import * as FileModel from "../../../src/models/File";
import * as FileChunkModel from "../../../src/models/FileChunk";

// Use vi.hoisted to ensure mocks are available in vi.mock
const { mockCollection, mockDb, mockClient } = vi.hoisted(() => {
  const collection = {
    createIndex: vi.fn(),
    findOne: vi.fn(),
    insertOne: vi.fn(),
  };

  const db = {
    collection: vi.fn().mockReturnValue(collection),
    databaseName: "wl-upload",
  };

  const client = {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue(db),
  };

  return {
    mockCollection: collection,
    mockDb: db,
    mockClient: client,
  };
});

// Mock MongoDB module
vi.mock("mongodb", () => {
  // Create a class constructor that returns the mock client
  function MockMongoClient() {
    return mockClient;
  }

  // Wrap it with vi.fn() to track calls
  const MockMongoClientFn = vi.fn(MockMongoClient);

  return {
    MongoClient: MockMongoClientFn,
    Db: vi.fn(),
    Collection: vi.fn(),
  };
});

// Mock model index creation functions
vi.mock("../../../src/models/File", () => ({
  createFileIndexes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/models/FileChunk", () => ({
  createFileChunkIndexes: vi.fn().mockResolvedValue(undefined),
}));

describe("MongoDB Connection", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset mock implementations
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.close.mockResolvedValue(undefined);
    mockClient.db.mockReturnValue(mockDb);
    mockDb.collection.mockReturnValue(mockCollection);
    mockDb.databaseName = "wl-upload";
  });

  afterEach(async () => {
    // Clean up: close connection if exists
    try {
      await mongodb.close();
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe("connect", () => {
    it("should connect to MongoDB with default URI", async () => {
      await mongodb.connect();

      expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", expect.any(Object));
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it("should connect to MongoDB with provided URI", async () => {
      const customUri = "mongodb://custom-host:27017";
      await mongodb.connect(customUri);

      expect(MongoClient).toHaveBeenCalledWith(customUri, expect.any(Object));
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it("should connect using MONGODB_URI environment variable", async () => {
      const originalEnv = process.env.MONGODB_URI;
      process.env.MONGODB_URI = "mongodb://env-host:27017";

      await mongodb.connect();

      expect(MongoClient).toHaveBeenCalledWith("mongodb://env-host:27017", expect.any(Object));

      // Restore
      if (originalEnv) {
        process.env.MONGODB_URI = originalEnv;
      } else {
        delete process.env.MONGODB_URI;
      }
    });

    it("should handle connection errors", async () => {
      const error = new Error("Connection failed");
      mockClient.connect.mockRejectedValue(error);

      await expect(mongodb.connect()).rejects.toThrow("Connection failed");
    });

    it("should not reconnect if already connected", async () => {
      await mongodb.connect();
      const firstCallCount = vi.mocked(MongoClient).mock.calls.length;

      await mongodb.connect();
      const secondCallCount = vi.mocked(MongoClient).mock.calls.length;

      // Should not create new client
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe("close", () => {
    it("should close the connection", async () => {
      await mongodb.connect();
      await mongodb.close();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it("should handle close errors gracefully", async () => {
      await mongodb.connect();
      const error = new Error("Close failed");
      mockClient.close.mockRejectedValue(error);

      await expect(mongodb.close()).rejects.toThrow("Close failed");
    });

    it("should handle close when not connected", async () => {
      // Should not throw if not connected
      await expect(mongodb.close()).resolves.not.toThrow();
    });
  });

  describe("isConnected", () => {
    it("should return false when not connected", () => {
      expect(mongodb.isConnected()).toBe(false);
    });

    it("should return true when connected", async () => {
      await mongodb.connect();
      expect(mongodb.isConnected()).toBe(true);
    });

    it("should return false after closing connection", async () => {
      await mongodb.connect();
      expect(mongodb.isConnected()).toBe(true);

      await mongodb.close();
      expect(mongodb.isConnected()).toBe(false);
    });
  });

  describe("getDatabase", () => {
    it("should return database instance with default name", async () => {
      await mongodb.connect();
      const db = mongodb.getDatabase();

      expect(db).toBe(mockDb);
      expect(mockClient.db).toHaveBeenCalledWith("wl-upload");
    });

    it("should return database instance with custom name", async () => {
      await mongodb.connect();
      const db = mongodb.getDatabase("custom-db");

      expect(db).toBe(mockDb);
      expect(mockClient.db).toHaveBeenCalledWith("custom-db");
    });

    it("should use MONGODB_DB_NAME environment variable", async () => {
      const originalEnv = process.env.MONGODB_DB_NAME;
      process.env.MONGODB_DB_NAME = "env-db-name";

      await mongodb.connect();
      mongodb.getDatabase();

      expect(mockClient.db).toHaveBeenCalledWith("env-db-name");

      // Restore
      if (originalEnv) {
        process.env.MONGODB_DB_NAME = originalEnv;
      } else {
        delete process.env.MONGODB_DB_NAME;
      }
    });

    it("should throw error if not connected", () => {
      expect(() => mongodb.getDatabase()).toThrow("Database not connected");
    });
  });

  describe("getFilesCollection", () => {
    it("should return files collection", async () => {
      await mongodb.connect();
      const collection = mongodb.getFilesCollection();

      expect(collection).toBe(mockCollection);
      expect(mockDb.collection).toHaveBeenCalledWith("files");
    });

    it("should throw error if not connected", () => {
      expect(() => mongodb.getFilesCollection()).toThrow("Database not connected");
    });
  });

  describe("getFileChunksCollection", () => {
    it("should return fileChunks collection", async () => {
      await mongodb.connect();
      const collection = mongodb.getFileChunksCollection();

      expect(collection).toBe(mockCollection);
      expect(mockDb.collection).toHaveBeenCalledWith("fileChunks");
    });

    it("should throw error if not connected", () => {
      expect(() => mongodb.getFileChunksCollection()).toThrow("Database not connected");
    });
  });

  describe("initializeIndexes", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.close.mockResolvedValue(undefined);
      mockClient.db.mockReturnValue(mockDb);
      mockDb.collection.mockReturnValue(mockCollection);
      mockDb.databaseName = "wl-upload";
    });

    it("should create indexes for files and fileChunks collections", async () => {
      await mongodb.connect();
      await mongodb.initializeIndexes();

      expect(mockDb.collection).toHaveBeenCalledWith("files");
      expect(mockDb.collection).toHaveBeenCalledWith("fileChunks");
      expect(FileModel.createFileIndexes).toHaveBeenCalledWith(mockCollection);
      expect(FileChunkModel.createFileChunkIndexes).toHaveBeenCalledWith(mockCollection);
    });

    it("should throw error if not connected", async () => {
      await expect(mongodb.initializeIndexes()).rejects.toThrow("Database not connected");
    });

    it("should handle index creation errors", async () => {
      await mongodb.connect();
      const error = new Error("Index creation failed");
      vi.mocked(FileModel.createFileIndexes).mockRejectedValue(error);

      await expect(mongodb.initializeIndexes()).rejects.toThrow("Index creation failed");
    });
  });
});
