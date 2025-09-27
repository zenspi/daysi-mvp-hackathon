import { eq, desc } from "drizzle-orm";
import { getDatabase } from "./db";
import { users, serverLogs, serverConfig } from "@shared/schema";
import type { User, InsertUser, ServerLog, InsertServerLog, ServerConfig, InsertServerConfig } from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  private get db() {
    return getDatabase();
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getServerLogs(): Promise<ServerLog[]> {
    const result = await this.db.select().from(serverLogs).orderBy(desc(serverLogs.timestamp)).limit(50);
    return result;
  }

  async createServerLog(insertLog: InsertServerLog): Promise<ServerLog> {
    const result = await this.db.insert(serverLogs).values(insertLog).returning();
    return result[0];
  }

  async getServerConfig(): Promise<ServerConfig | undefined> {
    const result = await this.db.select().from(serverConfig).limit(1);
    if (result.length === 0) {
      // Initialize with default config if none exists
      return await this.createDefaultServerConfig();
    }
    return result[0];
  }

  async updateServerConfig(config: InsertServerConfig): Promise<ServerConfig> {
    // Check if config exists
    const existing = await this.db.select().from(serverConfig).limit(1);
    
    if (existing.length === 0) {
      // Create new config
      const result = await this.db.insert(serverConfig).values(config).returning();
      return result[0];
    } else {
      // Update existing config
      const result = await this.db.update(serverConfig)
        .set(config)
        .where(eq(serverConfig.id, existing[0].id))
        .returning();
      return result[0];
    }
  }

  private async createDefaultServerConfig(): Promise<ServerConfig> {
    const defaultConfig: InsertServerConfig = {
      port: 5000,
      environment: "Development",
      corsEnabled: "Yes - All Origins",
      bodyParserLimit: "JSON (limit: 50mb)",
      staticDirectory: "./public",
      uptime: "0m"
    };
    
    const result = await this.db.insert(serverConfig).values(defaultConfig).returning();
    return result[0];
  }
}