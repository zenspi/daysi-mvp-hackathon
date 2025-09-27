import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import cors from "cors";
import { storage } from "./storage";
import { insertServerLogSchema } from "@shared/schema";
import { ZodError } from "zod";
import { config, isDevelopment } from "./config";
import { createClient } from "@supabase/supabase-js";

// Async error wrapper utility
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class for application errors
class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error logging utility
const logError = (error: Error, req?: Request) => {
  const timestamp = new Date().toISOString();
  const method = req?.method || 'Unknown';
  const path = req?.path || 'Unknown';
  const ip = req?.ip || 'Unknown';
  
  console.error(`[${timestamp}] ERROR: ${error.message}`);
  console.error(`Request: ${method} ${path} from ${ip}`);
  console.error(`Stack: ${error.stack}`);
};

// Global error handling middleware
const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logError(error, req);

  // Handle different error types
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "Validation error",
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(isDevelopment() && { stack: error.stack })
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: isDevelopment() 
      ? error.message 
      : "Internal server error",
    ...(isDevelopment() && { stack: error.stack })
  });
};

// 404 handler
const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
};

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  
  // Log request start
  console.log(`[${timestamp}] REQUEST: ${req.method} ${req.path} from ${ip}`);
  
  // Override res.json to capture response data
  const originalJson = res.json;
  let responseData: any;
  
  res.json = function(data: any) {
    responseData = data;
    return originalJson.call(this, data);
  };
  
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const endTimestamp = new Date().toISOString();
    
    // Log response details
    console.log(`[${endTimestamp}] RESPONSE: ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    
    // Store detailed log in storage for dashboard
    if (storage && req.path.startsWith('/api/')) {
      try {
        await storage.createServerLog({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime: duration
        });
      } catch (error) {
        // Silent error - don't break the request flow
        console.error('Failed to store request log:', error);
      }
    }
  });
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for all routes
  app.use(cors({
    origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN.split(","),
    credentials: config.CORS_CREDENTIALS
  }));

  // Add enhanced request logging middleware
  app.use(requestLogger);

  // API Router Organization
  const apiRouter = Router();
  const serverRouter = Router();
  const healthRouter = Router();
  const providersRouter = Router();

  // Server Management Routes
  serverRouter.get("/config", asyncHandler(async (req: Request, res: Response) => {
    const serverConfig = await storage.getServerConfig();
    if (!serverConfig) {
      throw new AppError("Server configuration not found", 404);
    }
    res.json({ success: true, data: serverConfig });
  }));

  serverRouter.get("/logs", asyncHandler(async (req: Request, res: Response) => {
    const logs = await storage.getServerLogs();
    res.json({ success: true, data: logs.slice(0, 10) });
  }));

  serverRouter.post("/logs", asyncHandler(async (req: Request, res: Response) => {
    const validatedLog = insertServerLogSchema.parse(req.body);
    const log = await storage.createServerLog(validatedLog);
    res.status(201).json({ success: true, data: log });
  }));

  serverRouter.get("/status", asyncHandler(async (req: Request, res: Response) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    // Update uptime in server config
    const serverConfig = await storage.getServerConfig();
    if (serverConfig) {
      await storage.updateServerConfig({
        ...serverConfig,
        uptime: uptimeString
      });
    }

    res.json({
      success: true,
      data: {
        status: "Running",
        uptime: uptimeString,
        port: config.PORT,
        environment: config.NODE_ENV
      }
    });
  }));

  serverRouter.post("/restart", asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, message: "Server restart initiated" });
    // In a real application, you might implement graceful restart logic here
  }));

  // Health Check Routes
  healthRouter.get("/", (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    });
  });

  // Healthz route - as specified in requirements
  app.get('/healthz', (req: Request, res: Response) => {
    console.log('[HEALTHZ] Health check requested');
    const ok = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE;
    const response = { 
      ok, 
      uptime: process.uptime(), 
      env: { 
        supabaseUrlSet: !!process.env.SUPABASE_URL,
        serviceRoleSet: !!process.env.SUPABASE_SERVICE_ROLE 
      }
    };
    console.log(`[HEALTHZ] Response:`, response);
    res.json(response);
  });

  healthRouter.get("/ready", (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: "ready",
        timestamp: new Date().toISOString()
      }
    });
  });

  healthRouter.get("/live", (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: "alive",
        timestamp: new Date().toISOString()
      }
    });
  });

  // Providers Routes with Supabase
  providersRouter.get("/", asyncHandler(async (req: Request, res: Response) => {
    console.log('[PROVIDERS] Request received:', req.query);
    
    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE;
      
      console.log(`[ENV] SUPABASE_URL set: ${!!url}, starts with https: ${!!url && url.startsWith('https://')}`);
      console.log(`[ENV] SUPABASE_SERVICE_ROLE set: ${!!key}`);
      
      if (!url || !key || !url.startsWith('https://')) {
        console.error('[PROVIDERS] Invalid env', { url, keySet: !!key });
        return res.status(502).json({ 
          success: false, 
          error: `Supabase env invalid. URL startsWith https? ${!!url && url.startsWith('https://')}, key set? ${!!key}`
        });
      }
      
      console.log('[PROVIDERS] Creating Supabase client');
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      
      console.log('[PROVIDERS] Querying providers table');
      const { data, error } = await supabase.from('providers').select('*').limit(50);
      
      if (error) {
        console.error('[PROVIDERS] Supabase error:', error);
        throw error;
      }
      
      console.log(`[PROVIDERS] Successfully retrieved ${data?.length || 0} providers`);
      res.json({ success: true, data });
    } catch (e: any) {
      console.error('[PROVIDERS] Error:', e?.message, e?.stack);
      res.status(502).json({ success: false, error: e?.message || 'Upstream error' });
    }
  }));

  // Mount routers
  apiRouter.use("/server", serverRouter);
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/providers", providersRouter);
  app.use("/api", apiRouter);
  app.use("/health", healthRouter); // Also mount health directly for k8s compatibility

  // Add 404 handler (must be after all routes)
  app.use("*", notFoundHandler);

  // Add error handling middleware (must be last)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
