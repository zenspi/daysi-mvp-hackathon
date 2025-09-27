import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { config, logConfig, isDevelopment } from "./config";

// ES module helper
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware for JSON parsing
app.use(express.json({ limit: config.BODY_PARSER_LIMIT }));

// Static file serving from configured directory
app.use(express.static(path.join(__dirname, "..", config.STATIC_DIR)));

// Register API routes and CORS middleware
const httpServer = await registerRoutes(app);

// Setup Vite development server integration
if (isDevelopment()) {
  await setupVite(app, httpServer);
}

// Start the server
httpServer.listen(config.PORT, config.HOST, () => {
  const formattedTime = new Date().toLocaleTimeString();
  console.log(`${formattedTime} [express] serving on port ${config.PORT}`);
  
  // Log configuration in development
  if (isDevelopment()) {
    logConfig();
  }
});

