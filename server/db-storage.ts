import { eq, desc, and } from "drizzle-orm";
import { getDatabase } from "./db";
import { users, serverLogs, serverConfig, providerClaims } from "@shared/schema";
import type { User, InsertUser, ServerLog, InsertServerLog, ServerConfig, InsertServerConfig, ProviderClaim, InsertProviderClaim } from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  private get db() {
    return getDatabase();
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
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

  // Provider Claims
  async getProviderClaim(id: string): Promise<ProviderClaim | undefined> {
    const result = await this.db.select().from(providerClaims).where(eq(providerClaims.id, id)).limit(1);
    return result[0];
  }

  async getProviderClaimsByUser(userId: string): Promise<ProviderClaim[]> {
    const result = await this.db.select().from(providerClaims).where(eq(providerClaims.userId, userId));
    return result;
  }

  async getProviderClaimsByProvider(providerId: string): Promise<ProviderClaim[]> {
    const result = await this.db.select().from(providerClaims).where(eq(providerClaims.providerId, providerId));
    return result;
  }

  async createProviderClaim(insertClaim: InsertProviderClaim): Promise<ProviderClaim> {
    const result = await this.db.insert(providerClaims).values(insertClaim).returning();
    return result[0];
  }

  async updateProviderClaim(id: string, updates: Partial<ProviderClaim>): Promise<ProviderClaim | undefined> {
    // Get current claim to check status transitions
    const currentClaim = await this.getProviderClaim(id);
    if (!currentClaim) return undefined;
    
    // Manage verifiedAt timestamp based on status changes
    const finalUpdates = { ...updates };
    if (updates.status === 'verified' && currentClaim.status !== 'verified') {
      finalUpdates.verifiedAt = new Date();
    } else if (updates.status && updates.status !== 'verified') {
      finalUpdates.verifiedAt = null;
    }
    
    const result = await this.db.update(providerClaims)
      .set(finalUpdates)
      .where(eq(providerClaims.id, id))
      .returning();
    return result[0];
  }

  async isProviderClaimed(providerId: string): Promise<boolean> {
    const result = await this.db.select().from(providerClaims)
      .where(and(eq(providerClaims.providerId, providerId), eq(providerClaims.status, 'verified')))
      .limit(1);
    return result.length > 0;
  }
}