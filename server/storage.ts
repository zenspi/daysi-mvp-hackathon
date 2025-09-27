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

export const storage = new MemStorage();
