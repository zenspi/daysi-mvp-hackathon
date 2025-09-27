import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Create connection with proper error handling
let sql: postgres.Sql<{}> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function initializeDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("⚠️  DATABASE_URL not provided, skipping database initialization");
      return false;
    }

    // Create the connection with SSL configuration for Supabase
    sql = postgres(process.env.DATABASE_URL, {
      ssl: "require",
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    db = drizzle(sql, { schema });
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    return false;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

// Test database connection
export async function testConnection() {
  try {
    if (!sql || !db) {
      console.log("⚠️  Database not initialized");
      return false;
    }
    
    const result = await sql`SELECT 1 as test`;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    console.log("⚠️  Continuing without database connection - using fallback mode");
    return false;
  }
}