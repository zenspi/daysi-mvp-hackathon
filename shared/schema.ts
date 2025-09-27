import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertServerLogSchema = createInsertSchema(serverLogs).omit({
  id: true,
  timestamp: true,
});

export const insertServerConfigSchema = createInsertSchema(serverConfig).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertServerLog = z.infer<typeof insertServerLogSchema>;
export type ServerLog = typeof serverLogs.$inferSelect;

export type InsertServerConfig = z.infer<typeof insertServerConfigSchema>;
export type ServerConfig = typeof serverConfig.$inferSelect;

// API Response Types
export const serverStatusResponseSchema = z.object({
  status: z.string(),
  uptime: z.string(),
  port: z.union([z.string(), z.number()]),
  environment: z.string(),
});

export type ServerStatusResponse = z.infer<typeof serverStatusResponseSchema>;
