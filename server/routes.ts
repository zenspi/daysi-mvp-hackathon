import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import cors from "cors";
import { storage } from "./storage";
import { insertServerLogSchema, insertUserSchema, users, providers, resources } from "@shared/schema";
import { ZodError } from "zod";
import { config, isDevelopment } from "./config";
import { createClient } from "@supabase/supabase-js";
import { sql, and, ilike, arrayContains, asc, desc } from "drizzle-orm";

// Async error wrapper utility
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Distance calculation utility (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
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
  const usersRouter = Router();
  const resourcesRouter = Router();
  const adminRouter = Router();

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

  // Health Check Routes - Updated to verify Supabase connection
  healthRouter.get("/", asyncHandler(async (req: Request, res: Response) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
    
    let ok = false;
    
    if (url && key && url.startsWith('https://')) {
      try {
        const supabase = createClient(url, key, { auth: { persistSession: false } });
        const { data, error } = await supabase.from('providers').select('id').limit(1);
        ok = !error;
      } catch (e) {
        ok = false;
      }
    }
    
    res.json({ ok });
  }));

  // Healthz route - as specified in requirements
  app.get('/healthz', (req: Request, res: Response) => {
    console.log('[HEALTHZ] Health check requested');
    const ok = !!process.env.SUPABASE_URL && (!!process.env.SUPABASE_SERVICE_ROLE || !!process.env.SUPABASE_ANON_KEY);
    const response = { 
      ok, 
      uptime: process.uptime(), 
      env: { 
        supabaseUrlSet: !!process.env.SUPABASE_URL,
        serviceRoleSet: !!process.env.SUPABASE_SERVICE_ROLE,
        anonKeySet: !!process.env.SUPABASE_ANON_KEY
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

  // Users Routes
  usersRouter.post("/", asyncHandler(async (req: Request, res: Response) => {
    console.log('[USERS] Creating/fetching user:', req.body);
    
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return res.status(502).json({ success: false, error: 'Supabase configuration missing' });
      }
      
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      
      // Check if user exists by email or phone
      let existingUser = null;
      if (validatedData.email) {
        const { data } = await supabase.from('users').select('*').eq('email', validatedData.email).single();
        existingUser = data;
      }
      if (!existingUser && validatedData.phone) {
        const { data } = await supabase.from('users').select('*').eq('phone', validatedData.phone).single();
        existingUser = data;
      }
      
      if (existingUser) {
        console.log(`[USERS] Returning existing user: ${existingUser.id}`);
        return res.json({ success: true, user: existingUser });
      }
      
      // Create new user
      const { data: newUser, error } = await supabase.from('users').insert([validatedData]).select().single();
      
      if (error) {
        console.error('[USERS] Creation error:', error);
        throw error;
      }
      
      console.log(`[USERS] Created new user: ${newUser.id}`);
      res.json({ success: true, user: newUser });
    } catch (e: any) {
      console.error('[USERS] Error:', e?.message);
      res.status(502).json({ success: false, error: e?.message || 'User creation failed' });
    }
  }));

  usersRouter.get("/:id", asyncHandler(async (req: Request, res: Response) => {
    console.log(`[USERS] Getting user: ${req.params.id}`);
    
    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return res.status(502).json({ success: false, error: 'Supabase configuration missing' });
      }
      
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data: user, error } = await supabase.from('users').select('*').eq('id', req.params.id).single();
      
      if (error) {
        console.error('[USERS] Fetch error:', error);
        throw error;
      }
      
      res.json({ success: true, user });
    } catch (e: any) {
      console.error('[USERS] Error:', e?.message);
      res.status(404).json({ success: false, error: 'User not found' });
    }
  }));

  // Enhanced Providers Routes with Distance Sorting
  providersRouter.get("/", asyncHandler(async (req: Request, res: Response) => {
    console.log('[PROVIDERS] Request received:', req.query);
    
    try {
      const { borough, specialty, lang, lat, lng } = req.query;
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return res.status(502).json({ success: false, error: 'Supabase configuration missing' });
      }
      
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      let query = supabase.from('providers').select('*');
      
      // Apply filters
      if (borough) {
        query = query.ilike('borough', borough as string);
      }
      if (specialty) {
        query = query.ilike('specialty', `%${specialty}%`);
      }
      if (lang) {
        query = query.contains('languages', [lang as string]);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) {
        console.error('[PROVIDERS] Query error:', error);
        throw error;
      }
      
      let results = data || [];
      
      // Distance sorting if lat/lng provided
      if (lat && lng) {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        
        results = results
          .filter(p => p.latitude && p.longitude)
          .map(provider => ({
            ...provider,
            distance: calculateDistance(userLat, userLng, parseFloat(provider.latitude), parseFloat(provider.longitude))
          }))
          .sort((a, b) => a.distance - b.distance);
      }
      
      console.log(`[PROVIDERS] Successfully retrieved ${results.length} providers`);
      res.json({ success: true, data: results });
    } catch (e: any) {
      console.error('[PROVIDERS] Error:', e?.message);
      res.status(502).json({ success: false, error: e?.message || 'Provider query failed' });
    }
  }));

  // Resources Routes
  resourcesRouter.get("/", asyncHandler(async (req: Request, res: Response) => {
    console.log('[RESOURCES] Request received:', req.query);
    
    try {
      const { borough, category, lang, lat, lng } = req.query;
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return res.status(502).json({ success: false, error: 'Supabase configuration missing' });
      }
      
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      let query = supabase.from('resources').select('*');
      
      // Apply filters
      if (borough) {
        query = query.ilike('borough', borough as string);
      }
      if (category) {
        query = query.ilike('category', `%${category}%`);
      }
      if (lang) {
        query = query.contains('languages', [lang as string]);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) {
        console.error('[RESOURCES] Query error:', error);
        throw error;
      }
      
      let results = data || [];
      
      // Distance sorting if lat/lng provided
      if (lat && lng) {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        
        results = results
          .filter(r => r.latitude && r.longitude)
          .map(resource => ({
            ...resource,
            distance: calculateDistance(userLat, userLng, parseFloat(resource.latitude), parseFloat(resource.longitude))
          }))
          .sort((a, b) => a.distance - b.distance);
      }
      
      console.log(`[RESOURCES] Successfully retrieved ${results.length} resources`);
      res.json({ success: true, data: results });
    } catch (e: any) {
      console.error('[RESOURCES] Error:', e?.message);
      res.status(502).json({ success: false, error: e?.message || 'Resource query failed' });
    }
  }));

  // Admin Routes
  adminRouter.get("/overview", asyncHandler(async (req: Request, res: Response) => {
    console.log('[ADMIN] Overview requested');
    
    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return res.status(502).json({ success: false, error: 'Supabase configuration missing' });
      }
      
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      
      // Get counts for all tables
      const [usersCount, providersCount, resourcesCount] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('providers').select('id', { count: 'exact' }),
        supabase.from('resources').select('id', { count: 'exact' })
      ]);
      
      const overview = {
        users: usersCount.count || 0,
        providers: providersCount.count || 0,
        resources: resourcesCount.count || 0
      };
      
      console.log('[ADMIN] Overview:', overview);
      res.json({ success: true, data: overview });
    } catch (e: any) {
      console.error('[ADMIN] Error:', e?.message);
      res.status(502).json({ success: false, error: e?.message || 'Admin overview failed' });
    }
  }));

  // Mount routers
  apiRouter.use("/server", serverRouter);
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/users", usersRouter);
  apiRouter.use("/providers", providersRouter);
  apiRouter.use("/resources", resourcesRouter);
  apiRouter.use("/admin", adminRouter);
  app.use("/api", apiRouter);
  app.use("/health", healthRouter); // Also mount health directly for k8s compatibility

  // Add 404 handler (must be after all routes)
  app.use("*", notFoundHandler);

  // Add error handling middleware (must be last)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
