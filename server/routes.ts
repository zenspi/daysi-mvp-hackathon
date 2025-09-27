import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import { storage } from "./storage";
import { insertServerLogSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for all routes
  app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true
  }));

  // API Routes
  app.get("/api/server/config", async (req, res) => {
    try {
      const config = await storage.getServerConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch server configuration" });
    }
  });

  app.get("/api/server/logs", async (req, res) => {
    try {
      const logs = await storage.getServerLogs();
      res.json(logs.slice(0, 10)); // Return latest 10 logs
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch server logs" });
    }
  });

  app.post("/api/server/logs", async (req, res) => {
    try {
      const validatedLog = insertServerLogSchema.parse(req.body);
      const log = await storage.createServerLog(validatedLog);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ error: "Invalid log data" });
    }
  });

  app.get("/api/server/status", async (req, res) => {
    try {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const uptimeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      
      // Update uptime in config
      const config = await storage.getServerConfig();
      if (config) {
        await storage.updateServerConfig({
          ...config,
          uptime: uptimeString
        });
      }

      res.json({
        status: "Running",
        uptime: uptimeString,
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || "development"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch server status" });
    }
  });

  app.post("/api/server/restart", async (req, res) => {
    res.json({ message: "Server restart initiated" });
    // In a real application, you might implement graceful restart logic here
  });

  const httpServer = createServer(app);
  return httpServer;
}
