import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  phone: text("phone").unique(),
  name: text("name"),
  language: text("language"),
  borough: text("borough"),
  zip: text("zip"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  role: text("role", { enum: ["user", "provider", "admin"] }).default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serverLogs = pgTable("server_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  method: text("method").notNull(),
  path: text("path").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const serverConfig = pgTable("server_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  port: integer("port").notNull(),
  environment: text("environment").notNull(),
  corsEnabled: text("cors_enabled").notNull(),
  bodyParserLimit: text("body_parser_limit").notNull(),
  staticDirectory: text("static_directory").notNull(),
  uptime: text("uptime").notNull(),
});

export const providers = pgTable("providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  practiceName: text("practice_name"),
  specialty: text("specialty"),
  borough: text("borough"),
  zip: text("zip"),
  phone: text("phone"),
  website: text("website"),
  languages: text("languages").array(),
  insurance: text("insurance").array(),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category"),
  address: text("address"),
  borough: text("borough"),
  zip: text("zip"),
  phone: text("phone"),
  website: text("website"),
  languages: text("languages").array(),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  source: text("source"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pulses = pgTable("pulses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerClaims = pgTable("provider_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull(),
  userId: varchar("user_id").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  license: text("license").notNull(),
  npi: text("npi").notNull(),
  status: text("status", { enum: ["pending", "verified", "rejected"] }).default("pending"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertServerLogSchema = createInsertSchema(serverLogs).omit({
  id: true,
  timestamp: true,
});

export const insertServerConfigSchema = createInsertSchema(serverConfig).omit({
  id: true,
});

export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  createdAt: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
});

export const insertPulseSchema = createInsertSchema(pulses).omit({
  id: true,
  createdAt: true,
});

export const insertProviderClaimSchema = createInsertSchema(providerClaims).omit({
  id: true,
  submittedAt: true,
  verifiedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertServerLog = z.infer<typeof insertServerLogSchema>;
export type ServerLog = typeof serverLogs.$inferSelect;

export type InsertServerConfig = z.infer<typeof insertServerConfigSchema>;
export type ServerConfig = typeof serverConfig.$inferSelect;

export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providers.$inferSelect;

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

export type InsertPulse = z.infer<typeof insertPulseSchema>;
export type Pulse = typeof pulses.$inferSelect;

export type InsertProviderClaim = z.infer<typeof insertProviderClaimSchema>;
export type ProviderClaim = typeof providerClaims.$inferSelect;

// API Response Types
export const serverStatusResponseSchema = z.object({
  status: z.string(),
  uptime: z.string(),
  port: z.union([z.string(), z.number()]),
  environment: z.string(),
});

export type ServerStatusResponse = z.infer<typeof serverStatusResponseSchema>;
