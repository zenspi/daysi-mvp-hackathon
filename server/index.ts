import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { config, logConfig, isDevelopment } from "./config";
import { initializeDatabase, testConnection } from "./db";
import { setStorageMode } from "./storage";
import { registerRealtime } from "./realtime";

// ES module helper
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware for JSON parsing
app.use(express.json({ limit: config.BODY_PARSER_LIMIT }));

// Static file serving from configured directory
if (isDevelopment()) {
  app.use(express.static(path.join(__dirname, "..", config.STATIC_DIR)));
} else {
  // In production, serve from dist/public
  app.use(express.static(path.join(__dirname, config.STATIC_DIR)));
}

// Register API routes and CORS middleware
const httpServer = await registerRoutes(app);

// Initialize and test database connection before starting server
const dbInitialized = initializeDatabase();
const dbConnected = dbInitialized ? await testConnection() : false;

// Configure storage mode based on database connectivity
setStorageMode(dbConnected);

// Register Realtime WebSocket functionality BEFORE static file serving
registerRealtime(app, httpServer);

// Setup Vite development server integration OR serve static files
// Force production mode to bypass HMR connection issues
const forceProductionMode = true; // Set to true to completely bypass HMR
if (!forceProductionMode && isDevelopment()) {
  await setupVite(app, httpServer);
} else {
  // Serve built static files (bypasses HMR entirely)
  const { serveStatic } = await import("./vite");
  serveStatic(app);
  console.log("🚀 Running in static file mode - HMR bypassed for stability");
}

// Start the server
httpServer.listen(config.PORT, config.HOST, () => {
  const formattedTime = new Date().toLocaleTimeString();
  console.log(`${formattedTime} [express] serving on port ${config.PORT}`);
  
  // Log configuration in development
  if (isDevelopment()) {
    logConfig();
  }
  
  // API key verification log
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    console.log(`🔑 OpenAI API Key: configured (${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)})`);
  } else {
    console.log(`⚠️  OpenAI API Key: NOT CONFIGURED - AI features will be unavailable`);
  }
});

