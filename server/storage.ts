import { type User, type InsertUser, type ServerLog, type InsertServerLog, type ServerConfig, type InsertServerConfig } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getServerLogs(): Promise<ServerLog[]>;
  createServerLog(log: InsertServerLog): Promise<ServerLog>;
  
  getServerConfig(): Promise<ServerConfig | undefined>;
  updateServerConfig(config: InsertServerConfig): Promise<ServerConfig>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private serverLogs: Map<string, ServerLog>;
  private serverConfig: ServerConfig | undefined;

  constructor() {
    this.users = new Map();
    this.serverLogs = new Map();
    
    // Initialize with default server config
    this.serverConfig = {
      id: randomUUID(),
      port: 5000,
      environment: "Development",
      corsEnabled: "Yes - All Origins",
      bodyParserLimit: "JSON (limit: 50mb)",
      staticDirectory: "./public",
      uptime: "0m"
    };

    // Add some initial log entries
    this.addInitialLogs();
  }

  private addInitialLogs() {
    const logs = [
      { method: "GET", path: "/api/users", statusCode: 200, responseTime: 45 },
      { method: "POST", path: "/api/auth/login", statusCode: 201, responseTime: 120 },
      { method: "GET", path: "/public/styles.css", statusCode: 304, responseTime: 12 },
      { method: "GET", path: "/api/invalid-endpoint", statusCode: 404, responseTime: 8 }
    ];

    logs.forEach(log => {
      const id = randomUUID();
      const serverLog: ServerLog = {
        ...log,
        id,
        timestamp: new Date()
      };
      this.serverLogs.set(id, serverLog);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getServerLogs(): Promise<ServerLog[]> {
    return Array.from(this.serverLogs.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async createServerLog(insertLog: InsertServerLog): Promise<ServerLog> {
    const id = randomUUID();
    const log: ServerLog = {
      ...insertLog,
      id,
      timestamp: new Date()
    };
    this.serverLogs.set(id, log);
    return log;
  }

  async getServerConfig(): Promise<ServerConfig | undefined> {
    return this.serverConfig;
  }

  async updateServerConfig(config: InsertServerConfig): Promise<ServerConfig> {
    const id = this.serverConfig?.id || randomUUID();
    this.serverConfig = { ...config, id };
    return this.serverConfig;
  }
}

import { DatabaseStorage } from "./db-storage";

// Hybrid storage that can fallback to in-memory if database fails
class HybridStorage implements IStorage {
  private dbStorage: DatabaseStorage;
  private memStorage: MemStorage;
  private useDatabase: boolean = true;

  constructor() {
    this.dbStorage = new DatabaseStorage();
    this.memStorage = new MemStorage();
  }

  setDatabaseMode(enabled: boolean) {
    this.useDatabase = enabled;
    if (!enabled) {
      console.log("📝 Switching to in-memory storage mode");
    }
  }

  private async withFallback<T>(dbOperation: () => Promise<T>, memOperation: () => Promise<T>): Promise<T> {
    if (!this.useDatabase) {
      return memOperation();
    }

    try {
      return await dbOperation();
    } catch (error) {
      console.warn("Database operation failed, falling back to memory storage:", error instanceof Error ? error.message : String(error));
      this.useDatabase = false;
      return memOperation();
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.withFallback(
      () => this.dbStorage.getUser(id),
      () => this.memStorage.getUser(id)
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.withFallback(
      () => this.dbStorage.getUserByUsername(username),
      () => this.memStorage.getUserByUsername(username)
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.withFallback(
      () => this.dbStorage.createUser(user),
      () => this.memStorage.createUser(user)
    );
  }

  async getServerLogs(): Promise<ServerLog[]> {
    return this.withFallback(
      () => this.dbStorage.getServerLogs(),
      () => this.memStorage.getServerLogs()
    );
  }

  async createServerLog(log: InsertServerLog): Promise<ServerLog> {
    return this.withFallback(
      () => this.dbStorage.createServerLog(log),
      () => this.memStorage.createServerLog(log)
    );
  }

  async getServerConfig(): Promise<ServerConfig | undefined> {
    return this.withFallback(
      () => this.dbStorage.getServerConfig(),
      () => this.memStorage.getServerConfig()
    );
  }

  async updateServerConfig(config: InsertServerConfig): Promise<ServerConfig> {
    return this.withFallback(
      () => this.dbStorage.updateServerConfig(config),
      () => this.memStorage.updateServerConfig(config)
    );
  }
}

export const storage = new HybridStorage();

// Function to set storage mode based on database connectivity
export function setStorageMode(dbConnected: boolean) {
  (storage as HybridStorage).setDatabaseMode(dbConnected);
}
