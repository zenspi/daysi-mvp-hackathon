import { type User, type InsertUser, type ServerLog, type InsertServerLog, type ServerConfig, type InsertServerConfig, type ProviderClaim, type InsertProviderClaim, type Provider, type Appointment, type InsertAppointment } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getServerLogs(): Promise<ServerLog[]>;
  createServerLog(log: InsertServerLog): Promise<ServerLog>;
  
  getServerConfig(): Promise<ServerConfig | undefined>;
  updateServerConfig(config: InsertServerConfig): Promise<ServerConfig>;
  
  // Provider Claims
  getProviderClaim(id: string): Promise<ProviderClaim | undefined>;
  getProviderClaimsByUser(userId: string): Promise<ProviderClaim[]>;
  getProviderClaimsByProvider(providerId: string): Promise<ProviderClaim[]>;
  createProviderClaim(claim: InsertProviderClaim): Promise<ProviderClaim>;
  updateProviderClaim(id: string, updates: Partial<ProviderClaim>): Promise<ProviderClaim | undefined>;
  
  // Check if provider is already claimed
  isProviderClaimed(providerId: string): Promise<boolean>;
  
  // Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsByPhone(phone: string): Promise<Appointment[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private serverLogs: Map<string, ServerLog>;
  private serverConfig: ServerConfig | undefined;
  private providerClaims: Map<string, ProviderClaim>;
  private appointments: Map<string, Appointment>;

  constructor() {
    this.users = new Map();
    this.serverLogs = new Map();
    this.providerClaims = new Map();
    this.appointments = new Map();
    
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phone === phone,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      name: null,
      email: null,
      phone: null,
      language: null,
      borough: null,
      zip: null,
      latitude: null,
      longitude: null,
      role: 'user',
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
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

  // Provider Claims
  async getProviderClaim(id: string): Promise<ProviderClaim | undefined> {
    return this.providerClaims.get(id);
  }

  async getProviderClaimsByUser(userId: string): Promise<ProviderClaim[]> {
    return Array.from(this.providerClaims.values()).filter(
      (claim) => claim.userId === userId
    );
  }

  async getProviderClaimsByProvider(providerId: string): Promise<ProviderClaim[]> {
    return Array.from(this.providerClaims.values()).filter(
      (claim) => claim.providerId === providerId
    );
  }

  async createProviderClaim(insertClaim: InsertProviderClaim): Promise<ProviderClaim> {
    const id = randomUUID();
    const claim: ProviderClaim = {
      status: 'pending',
      ...insertClaim,
      id,
      submittedAt: new Date(),
      verifiedAt: null,
      notes: null,
    };
    this.providerClaims.set(id, claim);
    return claim;
  }

  async updateProviderClaim(id: string, updates: Partial<ProviderClaim>): Promise<ProviderClaim | undefined> {
    const claim = this.providerClaims.get(id);
    if (!claim) return undefined;

    const updatedClaim: ProviderClaim = {
      ...claim,
      ...updates,
    };

    // Manage verifiedAt timestamp based on status changes
    if (updates.status === 'verified' && claim.status !== 'verified') {
      updatedClaim.verifiedAt = new Date();
    } else if (updates.status && updates.status !== 'verified') {
      updatedClaim.verifiedAt = null;
    }

    this.providerClaims.set(id, updatedClaim);
    return updatedClaim;
  }

  async isProviderClaimed(providerId: string): Promise<boolean> {
    const claims = await this.getProviderClaimsByProvider(providerId);
    return claims.some(claim => claim.status === 'verified');
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const now = new Date();
    const newAppointment: Appointment = {
      ...appointment,
      id,
      requestedAt: now,
      scheduledAt: null,
      status: appointment.status || 'pending',
    };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async getAppointmentsByPhone(phone: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(appointment => 
      appointment.patientPhone === phone
    );
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.withFallback(
      () => this.dbStorage.getUserByEmail(email),
      () => this.memStorage.getUserByEmail(email)
    );
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return this.withFallback(
      () => this.dbStorage.getUserByPhone(phone),
      () => this.memStorage.getUserByPhone(phone)
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

  // Provider Claims
  async getProviderClaim(id: string): Promise<ProviderClaim | undefined> {
    return this.withFallback(
      () => this.dbStorage.getProviderClaim(id),
      () => this.memStorage.getProviderClaim(id)
    );
  }

  async getProviderClaimsByUser(userId: string): Promise<ProviderClaim[]> {
    return this.withFallback(
      () => this.dbStorage.getProviderClaimsByUser(userId),
      () => this.memStorage.getProviderClaimsByUser(userId)
    );
  }

  async getProviderClaimsByProvider(providerId: string): Promise<ProviderClaim[]> {
    return this.withFallback(
      () => this.dbStorage.getProviderClaimsByProvider(providerId),
      () => this.memStorage.getProviderClaimsByProvider(providerId)
    );
  }

  async createProviderClaim(claim: InsertProviderClaim): Promise<ProviderClaim> {
    return this.withFallback(
      () => this.dbStorage.createProviderClaim(claim),
      () => this.memStorage.createProviderClaim(claim)
    );
  }

  async updateProviderClaim(id: string, updates: Partial<ProviderClaim>): Promise<ProviderClaim | undefined> {
    return this.withFallback(
      () => this.dbStorage.updateProviderClaim(id, updates),
      () => this.memStorage.updateProviderClaim(id, updates)
    );
  }

  async isProviderClaimed(providerId: string): Promise<boolean> {
    return this.withFallback(
      () => this.dbStorage.isProviderClaimed(providerId),
      () => this.memStorage.isProviderClaimed(providerId)
    );
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    return this.withFallback(
      () => this.dbStorage.createAppointment(appointment),
      () => this.memStorage.createAppointment(appointment)
    );
  }

  async getAppointmentsByPhone(phone: string): Promise<Appointment[]> {
    return this.withFallback(
      () => this.dbStorage.getAppointmentsByPhone(phone),
      () => this.memStorage.getAppointmentsByPhone(phone)
    );
  }
}

export const storage = new HybridStorage();

// Function to set storage mode based on database connectivity
export function setStorageMode(dbConnected: boolean) {
  (storage as HybridStorage).setDatabaseMode(dbConnected);
}
