import { z } from "zod";

// Environment configuration schema
const configSchema = z.object({
  // Server configuration
  PORT: z.string().default("5000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  
  // Logging configuration
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z.enum(["json", "simple"]).default("simple"),
  
  // CORS configuration
  CORS_ORIGIN: z.string().default("*"),
  CORS_CREDENTIALS: z.string().default("true").transform(val => val === "true"),
  
  // Body parser configuration
  BODY_PARSER_LIMIT: z.string().default("50mb"),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number), // 15 minutes
  RATE_LIMIT_MAX: z.string().default("100").transform(Number), // 100 requests per window
  
  // Database configuration (for future use)
  DATABASE_URL: z.string().optional(),
  
  // Security
  SESSION_SECRET: z.string().optional(),
  
  // Health check configuration
  HEALTH_CHECK_ENABLED: z.string().default("true").transform(val => val === "true"),
  
  // Static files
  STATIC_DIR: z.string().default("public"),
});

// Parse and validate environment variables
function loadConfig() {
  try {
    const config = configSchema.parse(process.env);
    return config;
  } catch (error) {
    console.error("❌ Invalid environment configuration:");
    console.error(error);
    process.exit(1);
  }
}

// Export configuration
export const config = loadConfig();

// Configuration helper functions
export const isDevelopment = () => config.NODE_ENV === "development";
export const isProduction = () => config.NODE_ENV === "production";
export const isTest = () => config.NODE_ENV === "test";

// Log configuration on startup
export function logConfig() {
  console.log("🔧 Server Configuration:");
  console.log(`   Environment: ${config.NODE_ENV}`);
  console.log(`   Port: ${config.PORT}`);
  console.log(`   Host: ${config.HOST}`);
  console.log(`   CORS Origin: ${config.CORS_ORIGIN}`);
  console.log(`   Log Level: ${config.LOG_LEVEL}`);
  console.log(`   Rate Limit: ${config.RATE_LIMIT_MAX} requests per ${config.RATE_LIMIT_WINDOW_MS / 1000}s`);
  console.log(`   Static Directory: ${config.STATIC_DIR}`);
  console.log(`   Health Check: ${config.HEALTH_CHECK_ENABLED ? "enabled" : "disabled"}`);
}

// Configuration for different deployment stages
export const deploymentConfigs = {
  development: {
    LOG_LEVEL: "debug",
    CORS_ORIGIN: "*",
    RATE_LIMIT_MAX: "1000", // More lenient for development
  },
  production: {
    LOG_LEVEL: "info",
    CORS_ORIGIN: process.env.ALLOWED_ORIGINS || "https://yourdomain.com",
    RATE_LIMIT_MAX: "100",
    BODY_PARSER_LIMIT: "10mb", // Stricter for production
  },
  test: {
    LOG_LEVEL: "error",
    CORS_ORIGIN: "*",
    RATE_LIMIT_MAX: "10000", // Very lenient for testing
  }
};