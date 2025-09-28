import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import cors from "cors";
import { storage } from "./storage";
import { insertServerLogSchema, insertUserSchema, insertPulseSchema, insertProviderClaimSchema, users, providers, resources, pulses, providerClaims } from "@shared/schema";
import { ZodError, z } from "zod";
import { config, isDevelopment } from "./config";
import { createClient } from "@supabase/supabase-js";
import { sql, and, ilike, arrayContains, asc, desc } from "drizzle-orm";
import OpenAI from "openai";

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

// OpenAI client setup - initialized when API key is available
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
  const aiRouter = Router();
  const askRouter = Router();
  const voiceRouter = Router();
  const providerClaimsRouter = Router();

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

  // AI-Powered Healthcare Routes
  aiRouter.post("/recommend-providers", asyncHandler(async (req: Request, res: Response) => {
    console.log('[AI] Provider recommendation requested:', req.body);
    
    try {
      const { symptoms, condition, location, language = 'English' } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ success: false, error: 'OPENAI_KEY_MISSING' });
      }

      if (!symptoms && !condition) {
        return res.status(400).json({ success: false, error: 'Symptoms or condition required' });
      }
      
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return res.status(502).json({ success: false, error: 'Database configuration missing' });
      }
      
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      
      // Get all providers for AI analysis
      let query = supabase.from('providers').select('*');
      if (location) {
        query = query.ilike('borough', location);
      }
      const { data: providers } = await query.limit(20);
      
      if (!providers || providers.length === 0) {
        return res.json({ success: true, recommendations: [], guidance: 'No providers found in your area.' });
      }
      
      // AI-powered provider matching
      const analysisPrompt = `You are a healthcare navigation AI. Based on the following symptoms/condition and available providers, recommend the top 3 most suitable healthcare providers and provide guidance.

Symptoms/Condition: ${symptoms || condition}
User Location: ${location || 'Not specified'}
User Language: ${language}

Available Providers:
${providers.map(p => `- ${p.name} (${p.practice_name || 'N/A'}): ${p.specialty}, Languages: ${p.languages?.join(', ')}, Phone: ${p.phone}, Borough: ${p.borough}`).join('\n')}

Please respond with JSON in this format:
{
  "recommended_provider_ids": [array of top 3 provider IDs as numbers],
  "urgency_level": "low|medium|high|emergency",
  "guidance": "Helpful guidance about the condition and when to seek care",
  "specialties_to_consider": ["array of relevant medical specialties"],
  "next_steps": "Specific actionable next steps for the user"
}`;

      const openai = getOpenAIClient();
      if (!openai) {
        return res.status(500).json({ success: false, error: 'AI features not configured - OPENAI_API_KEY required' });
      }

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: analysisPrompt }],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(aiResponse.choices[0].message.content || '{}');
      
      // Get recommended providers with details
      const recommendedProviders = providers.filter(p => 
        analysis.recommended_provider_ids?.includes(p.id)
      );
      
      console.log(`[AI] Recommended ${recommendedProviders.length} providers with ${analysis.urgency_level} urgency`);
      
      res.json({
        success: true,
        recommendations: recommendedProviders,
        analysis: {
          urgency_level: analysis.urgency_level,
          guidance: analysis.guidance,
          specialties_to_consider: analysis.specialties_to_consider,
          next_steps: analysis.next_steps
        }
      });
      
    } catch (e: any) {
      console.error('[AI] Provider recommendation error:', e?.message);
      res.status(500).json({ success: false, error: e?.message || 'AI recommendation failed' });
    }
  }));

  aiRouter.post("/recommend-resources", asyncHandler(async (req: Request, res: Response) => {
    console.log('[AI] Resource recommendation requested:', req.body);
    
    try {
      const { need, situation, location, language = 'English' } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ success: false, error: 'OPENAI_KEY_MISSING' });
      }

      if (!need && !situation) {
        return res.status(400).json({ success: false, error: 'Need or situation description required' });
      }
      
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return res.status(502).json({ success: false, error: 'Database configuration missing' });
      }
      
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      
      // Get all resources for AI analysis
      let query = supabase.from('resources').select('*');
      if (location) {
        query = query.ilike('borough', location);
      }
      const { data: resources } = await query.limit(20);
      
      if (!resources || resources.length === 0) {
        return res.json({ success: true, recommendations: [], guidance: 'No resources found in your area.' });
      }
      
      // AI-powered resource matching
      const analysisPrompt = `You are a social services navigation AI. Based on the user's needs and available resources, recommend the top 3 most helpful resources and provide guidance.

User Need/Situation: ${need || situation}
User Location: ${location || 'Not specified'}
User Language: ${language}

Available Resources:
${resources.map(r => `- ${r.name}: ${r.category}, Languages: ${r.languages?.join(', ')}, Phone: ${r.phone}, Borough: ${r.borough}, Address: ${r.address}`).join('\n')}

Please respond with JSON in this format:
{
  "recommended_resource_ids": [array of top 3 resource IDs as numbers],
  "priority_level": "low|medium|high|urgent",
  "guidance": "Helpful guidance about accessing these resources",
  "additional_categories": ["array of other resource categories that might help"],
  "next_steps": "Specific actionable next steps for the user"
}`;

      const openai = getOpenAIClient();
      if (!openai) {
        return res.status(500).json({ success: false, error: 'AI features not configured - OPENAI_API_KEY required' });
      }

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: analysisPrompt }],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(aiResponse.choices[0].message.content || '{}');
      
      // Get recommended resources with details
      const recommendedResources = resources.filter(r => 
        analysis.recommended_resource_ids?.includes(r.id)
      );
      
      console.log(`[AI] Recommended ${recommendedResources.length} resources with ${analysis.priority_level} priority`);
      
      res.json({
        success: true,
        recommendations: recommendedResources,
        analysis: {
          priority_level: analysis.priority_level,
          guidance: analysis.guidance,
          additional_categories: analysis.additional_categories,
          next_steps: analysis.next_steps
        }
      });
      
    } catch (e: any) {
      console.error('[AI] Resource recommendation error:', e?.message);
      res.status(500).json({ success: false, error: e?.message || 'AI resource recommendation failed' });
    }
  }));

  // Smart Conversational AI Endpoint
  askRouter.post("/", asyncHandler(async (req: Request, res: Response) => {
    console.log('[ASK] Conversational AI request - length:', req.body.message?.length, 'chars, lang:', req.body.lang);
    
    try {
      const { message, lang, user, location, pulseConsent } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }
      
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return res.status(502).json({ success: false, error: 'Database configuration missing' });
      }
      
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      let currentUser = null;
      
      // 1) Upsert user if email/phone provided
      if (user && (user.email || user.phone)) {
        const userData = {
          ...user,
          language: user.language || lang || 'English'
        };
        
        // Check if user exists
        let existingUser = null;
        if (user.email) {
          const { data } = await supabase.from('users').select('*').eq('email', user.email).single();
          existingUser = data;
        }
        if (!existingUser && user.phone) {
          const { data } = await supabase.from('users').select('*').eq('phone', user.phone).single();
          existingUser = data;
        }
        
        if (existingUser) {
          currentUser = existingUser;
        } else {
          const { data: newUser, error } = await supabase.from('users').insert([userData]).select().single();
          if (!error) {
            currentUser = newUser;
            console.log(`[ASK] Created user: ${newUser.id}`);
          }
        }
      }
      
      const openai = getOpenAIClient();
      if (!openai) {
        return res.status(503).json({ success: false, error: 'OPENAI_KEY_MISSING' });
      }
      
      // HOTFIX: Support lang:'auto' and use same detection as voice interface
      let detectedLang = 'English'; // Default to English per HOTFIX requirement
      
      if (lang === 'auto' || !lang) {
        try {
          // HOTFIX: Use direct language detection logic instead of HTTP call to avoid self-call issues
          try {
            const langResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{
                role: "user",
                content: `Detect the language of this text and return confidence score in JSON format with fields "code" (en/es) and "conf" (0-1). Text: "${message}"`
              }],
              response_format: { type: "json_object" },
              max_tokens: 50
            });

            const langResult = JSON.parse(langResponse.choices[0].message.content || '{}');
            if (langResult.code && langResult.conf) {
              detectedLang = langResult.code === 'es' ? 'Spanish' : 'English';
              console.log(`[ASK] Language detected: ${detectedLang} (confidence: ${langResult.conf})`);
            } else {
              console.log('[ASK] Language detection parsing failed, defaulting to English');
            }
          } catch (langError: any) {
            console.log('[ASK] Language detection failed:', langError?.message || 'Unknown error');
            // Fallback to original method
            const langDetectPrompt = `Detect the language of this message and respond with just the language name in English: "${message}"`;
            const langResponse = await openai.chat.completions.create({
              model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
              messages: [{ role: "user", content: langDetectPrompt }]
            });
            
            const detected = (langResponse.choices[0].message.content || '').trim().toLowerCase();
            if (detected.includes('spanish') || detected.includes('español')) {
              detectedLang = 'Spanish';
            }
          }
        } catch (e) {
          console.log('[ASK] Language detection failed, defaulting to English');
        }
      } else {
        // Use provided language or user preference
        detectedLang = lang || (currentUser?.language) || 'English';
      }
      
      // 3) Intent routing - determine if care access or social needs
      const intentPrompt = `Classify this healthcare request into one category. Respond with just "providers" or "resources":

      Message: "${message}"
      
      - "providers" for: doctor, clinic, medical care, specialist, appointment, checkup, symptoms, pain, diagnosis, treatment, hospital, physician, nurse practitioner
      - "resources" for: food assistance, housing, legal aid, insurance help, benefits, WIC, food stamps, shelter, unemployment, social services, financial help`;
      
      const intentResponse = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: intentPrompt }]
      });
      
      const intent = (intentResponse.choices[0].message.content || '').trim().toLowerCase().includes('resources') ? 'resources' : 'providers';
      
      // Extract filters and location info
      const hasLocation = location?.lat && location?.lng && location?.consent;
      const filterPrompt = `Extract search filters from this message. Respond with JSON:
      
      Message: "${message}"
      Intent: ${intent}
      
      ${intent === 'providers' ? 
        `{ "specialty": "medical specialty if mentioned", "borough": "NYC borough if mentioned" }` :
        `{ "category": "resource category if mentioned", "borough": "NYC borough if mentioned" }`
      }`;
      
      const filterResponse = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: filterPrompt }],
        response_format: { type: "json_object" }
      });
      
      const filters = JSON.parse(filterResponse.choices[0].message.content || '{}');
      
      // 4) Query providers or resources
      let results = [];
      let queryParams = new URLSearchParams();
      
      if (intent === 'providers') {
        if (filters.borough) queryParams.append('borough', filters.borough);
        if (filters.specialty) queryParams.append('specialty', filters.specialty);
        if (detectedLang && detectedLang !== 'English') queryParams.append('lang', detectedLang);
        if (hasLocation) {
          queryParams.append('lat', location.lat.toString());
          queryParams.append('lng', location.lng.toString());
        }
        
        let query = supabase.from('providers').select('*');
        if (filters.borough) query = query.ilike('borough', filters.borough);
        if (filters.specialty) query = query.ilike('specialty', `%${filters.specialty}%`);
        if (detectedLang && detectedLang !== 'English') {
          query = query.contains('languages', [detectedLang]);
        }
        
        const { data } = await query.limit(10);
        let providerResults = data || [];
        
        // Distance sorting if location provided
        if (hasLocation && location.lat && location.lng) {
          const userLat = parseFloat(location.lat);
          const userLng = parseFloat(location.lng);
          
          providerResults = providerResults
            .filter(p => p.latitude && p.longitude)
            .map(provider => ({
              ...provider,
              distance_km: (calculateDistance(userLat, userLng, parseFloat(provider.latitude), parseFloat(provider.longitude)) * 1.60934).toFixed(1)
            }))
            .sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));
        }
        
        results = providerResults.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          practice_name: p.practice_name || p.practiceName,
          specialty: p.specialty,
          borough: p.borough,
          phone: p.phone,
          distance_km: p.distance_km || undefined
        }));
        
      } else { // resources
        if (filters.borough) queryParams.append('borough', filters.borough);
        if (filters.category) queryParams.append('category', filters.category);
        if (detectedLang && detectedLang !== 'English') queryParams.append('lang', detectedLang);
        if (hasLocation) {
          queryParams.append('lat', location.lat.toString());
          queryParams.append('lng', location.lng.toString());
        }
        
        let query = supabase.from('resources').select('*');
        if (filters.borough) query = query.ilike('borough', filters.borough);
        if (filters.category) query = query.ilike('category', `%${filters.category}%`);
        if (detectedLang && detectedLang !== 'English') {
          query = query.contains('languages', [detectedLang]);
        }
        
        const { data } = await query.limit(10);
        let resourceResults = data || [];
        
        // Distance sorting if location provided
        if (hasLocation && location.lat && location.lng) {
          const userLat = parseFloat(location.lat);
          const userLng = parseFloat(location.lng);
          
          resourceResults = resourceResults
            .filter(r => r.latitude && r.longitude)
            .map(resource => ({
              ...resource,
              distance_km: (calculateDistance(userLat, userLng, parseFloat(resource.latitude), parseFloat(resource.longitude)) * 1.60934).toFixed(1)
            }))
            .sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));
        }
        
        results = resourceResults.slice(0, 3).map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          borough: r.borough,
          phone: r.phone,
          distance_km: r.distance_km || undefined
        }));
      }
      
      // 5) Compose empathetic reply in chosen language
      const resultsList = results.map(r => {
        if (intent === 'providers') {
          const provider = r as any;
          return detectedLang === 'Spanish' ?
            `- ${provider.name}${provider.practice_name ? ` en ${provider.practice_name}` : ''} (${provider.specialty}) en ${provider.borough}${provider.distance_km ? `, ${provider.distance_km}km` : ''} - Tel: ${provider.phone}` :
            `- ${provider.name}${provider.practice_name ? ` at ${provider.practice_name}` : ''} (${provider.specialty}) in ${provider.borough}${provider.distance_km ? `, ${provider.distance_km}km away` : ''} - Phone: ${provider.phone}`;
        } else {
          const resource = r as any;
          return detectedLang === 'Spanish' ?
            `- ${resource.name} (${resource.category}) en ${resource.borough}${resource.distance_km ? `, ${resource.distance_km}km` : ''} - Tel: ${resource.phone}` :
            `- ${resource.name} (${resource.category}) in ${resource.borough}${resource.distance_km ? `, ${resource.distance_km}km away` : ''} - Phone: ${resource.phone}`;
        }
      }).join('\n');

      const responsePrompt = detectedLang === 'Spanish' ? 
        `Usted ha preguntado sobre: "${message}"

        Aquí están las opciones que encontré:
        ${resultsList}

        Responda en español formal (usted), tono cálido, máximo 120 palabras. 1 frase empática, luego las opciones. Ofrezca "Puedo enviarle los detalles por mensaje." Haga ≤1 pregunta aclaratoria si es necesario.` :
        
        `You asked about: "${message}"

        Here are the options I found:
        ${resultsList}

        Respond in English with empathy and warmth, max 120 words. 1 empathetic sentence, then present the options. Offer "I can text you the details." Ask ≤1 clarifying question if helpful.`;
      
      const replyResponse = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: responsePrompt }]
      });
      
      const reply = replyResponse.choices[0].message.content || 'I apologize, but I had trouble processing your request. Please try again.';
      
      // Generate pulse suggestion
      const pulsePrompt = detectedLang === 'Spanish' ? 
        `Basado en esta consulta: "${message}", sugiera 1 seguimiento proactivo en español (máx 50 palabras):` :
        `Based on this inquiry: "${message}", suggest 1 proactive follow-up tip in English (max 50 words):`;
      
      const pulseResponse = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: pulsePrompt }]
      });
      
      const pulse_suggestion = pulseResponse.choices[0].message.content || 'Stay healthy and don\'t hesitate to seek help when needed.';
      
      // 6) Store pulse if consent given
      if (pulseConsent && currentUser) {
        try {
          const pulseData = {
            userId: currentUser.id,
            type: intent,
            payload: {
              message,
              intent,
              results: results.length,
              language: detectedLang,
              suggestion: pulse_suggestion
            }
          };
          
          await supabase.from('pulses').insert([pulseData]);
          console.log(`[ASK] Stored pulse for user: ${currentUser.id}`);
        } catch (e) {
          console.log('[ASK] Failed to store pulse:', e);
        }
      }
      
      console.log(`[ASK] Processed ${intent} request in ${detectedLang}, found ${results.length} results`);
      
      res.json({
        success: true,
        reply,
        reply_lang: detectedLang,
        intent,
        results,
        pulse_suggestion
      });
      
    } catch (e: any) {
      console.error('[ASK] Error:', e?.message);
      
      // Fallback to gpt-4o-mini on gpt-5 failure
      if (e?.message?.includes('model') || e?.message?.includes('gpt-5')) {
        try {
          console.log('[ASK] Falling back to gpt-4o-mini');
          const openai = getOpenAIClient();
          if (!openai) {
            return res.status(503).json({ success: false, error: 'OPENAI_KEY_MISSING' });
          }
          const fallbackResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `Please help with this healthcare request in a caring way: "${req.body.message}"` }]
          });
          
          res.json({
            success: true,
            reply: fallbackResponse.choices[0].message.content || 'I apologize for the inconvenience. Please try again later.',
            reply_lang: req.body.lang || 'English',
            intent: 'providers',
            results: [],
            pulse_suggestion: "Consider booking a follow-up if symptoms persist."
          });
        } catch (fallbackError: any) {
          res.status(500).json({ success: false, error: fallbackError?.message || 'AI conversation failed' });
        }
      } else {
        res.status(500).json({ success: false, error: e?.message || 'Conversation processing failed' });
      }
    }
  }));

  // Voice Routes for OpenAI Realtime API with ephemeral tokens
  voiceRouter.get("/health", asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.json({ ok: false, reason: 'missing OPENAI_API_KEY' });
      }
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });
      
      if (response.ok) {
        res.json({ ok: true });
      } else {
        const errorText = await response.text();
        res.json({ 
          ok: false, 
          status: response.status, 
          reason: errorText 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        ok: false, 
        reason: error.message 
      });
    }
  }));

  voiceRouter.post("/ephemeral", asyncHandler(async (req: Request, res: Response) => {
    try {
      // SECURITY: Check origin and rate limit for ephemeral token endpoint
      const origin = req.headers.origin || req.headers.referer;
      const host = req.headers.host;
      
      // Only allow same-origin requests and replit.app domains
      if (process.env.NODE_ENV === 'production') {
        if (!origin || (!origin.includes(host!) && !origin.includes('replit.app'))) {
          console.warn(`[SECURITY] Ephemeral token request blocked from origin: ${origin}`);
          return res.status(403).json({ error: 'Forbidden - Invalid origin' });
        }
      }
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: 'OPENAI_KEY_MISSING' });
      }

      // HOTFIX: Server-side session start logging with masked OpenAI key
      const { lang = 'en', locked = true } = req.body;
      console.log('=== DAYSI VOICE SESSION START (SERVER) ===');
      console.log(`Language: ${lang} (locked: ${locked})`);
      console.log(`Origin: ${origin}`);
      console.log(`Session requested at: ${new Date().toISOString()}`);
      console.log('============================================');

      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'realtime=v1'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview',
          voice: 'verse'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return res.status(502).json({ 
          error: data.error?.message || data 
        });
      }
      
      res.json({ 
        client_secret: data.client_secret?.value 
      });
    } catch (error: any) {
      res.status(502).json({ 
        error: error.message 
      });
    }
  }));

  // Debug endpoint for testing /api/ask
  askRouter.get("/debug", (req: Request, res: Response) => {
    res.json({
      endpoint: "/api/ask",
      method: "POST",
      description: "Test the chat API endpoint",
      example_payload: {
        message: "I need help finding a doctor for chest pain",
        lang: "en",
        user: { email: "user@example.com" },
        location: null,
        pulseConsent: false
      },
      instructions: "Send POST requests to /api/ask with the payload above"
    });
  });

  // Environment Diagnostics Route
  askRouter.get("/diag", asyncHandler(async (req: Request, res: Response) => {
    const env_status = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV || 'unknown'
    };

    const services = {
      openai_reachable: false,
      supabase_reachable: false
    };

    // Test OpenAI connectivity
    try {
      if (process.env.OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          signal: AbortSignal.timeout(5000)
        });
        services.openai_reachable = response.ok;
      }
    } catch (error) {
      services.openai_reachable = false;
    }

    // Test Supabase connectivity
    try {
      if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY)) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(url, key, { auth: { persistSession: false } });
        const { data, error } = await supabase.from('users').select('count').limit(1);
        services.supabase_reachable = !error;
      }
    } catch (error) {
      services.supabase_reachable = false;
    }

    res.json({
      environment: env_status,
      services,
      timestamp: new Date().toISOString(),
      status: 'ok'
    });
  }));

  // Language Detection Route
  voiceRouter.get("/detect-language", asyncHandler(async (req: Request, res: Response) => {
    try {
      const { text } = req.query;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing or invalid text parameter' 
        });
      }

      const openai = getOpenAIClient();
      if (!openai) {
        return res.status(502).json({ 
          success: false, 
          error: 'Language detection unavailable - missing OPENAI_API_KEY' 
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Detect the language of this text and return confidence score in JSON format with fields "code" (en/es) and "conf" (0-1). Text: "${text}"`
        }],
        response_format: { type: "json_object" },
        max_tokens: 50
      });

      let result;
      try {
        result = JSON.parse(response.choices[0].message.content || '{}');
      } catch {
        result = { code: 'en', conf: 0.5 };
      }

      // Normalize response
      const code = result.language === 'spanish' || result.language === 'Spanish' || result.code === 'es' ? 'es' : 'en';
      const conf = Number(result.confidence || result.conf || 0.8);

      res.json({
        success: true,
        code: code,
        conf: Math.min(Math.max(conf, 0), 1) // Clamp between 0-1
      });

    } catch (error: any) {
      console.error('Language detection error:', error);
      res.status(500).json({
        success: false,
        error: 'Language detection failed',
        fallback: { code: 'en', conf: 0.5 }
      });
    }
  }));

  // Provider Claims Routes
  providerClaimsRouter.post("/", asyncHandler(async (req: Request, res: Response) => {
    try {
      const validatedClaim = insertProviderClaimSchema.parse(req.body);
      
      // Validate that the user exists before creating claim
      const user = await storage.getUser(validatedClaim.userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID"
        });
      }
      
      // Check if provider is already claimed by someone else
      const isAlreadyClaimed = await storage.isProviderClaimed(validatedClaim.providerId);
      if (isAlreadyClaimed) {
        return res.status(409).json({
          success: false,
          error: "This provider is already verified by another user"
        });
      }
      
      // Check for existing pending/verified claims for this provider by this user
      const existingClaims = await storage.getProviderClaimsByUser(validatedClaim.userId);
      const existingClaimForProvider = existingClaims.find(
        claim => claim.providerId === validatedClaim.providerId && 
        (claim.status === 'pending' || claim.status === 'verified')
      );
      
      if (existingClaimForProvider) {
        return res.status(409).json({
          success: false,
          error: "You already have a claim for this provider"
        });
      }
      
      const claim = await storage.createProviderClaim(validatedClaim);
      res.status(201).json({ success: true, data: claim });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          success: false, 
          error: "Validation error",
          details: error.errors 
        });
      } else {
        throw error;
      }
    }
  }));

  providerClaimsRouter.get("/:id", asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const claim = await storage.getProviderClaim(id);
    
    if (!claim) {
      throw new AppError("Provider claim not found", 404);
    }
    
    res.json({ success: true, data: claim });
  }));

  providerClaimsRouter.get("/user/:userId", asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    
    // Validate that the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    const claims = await storage.getProviderClaimsByUser(userId);
    res.json({ success: true, data: claims });
  }));

  providerClaimsRouter.get("/provider/:providerId", asyncHandler(async (req: Request, res: Response) => {
    const { providerId } = req.params;
    const claims = await storage.getProviderClaimsByProvider(providerId);
    res.json({ success: true, data: claims });
  }));

  providerClaimsRouter.patch("/:id", asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Get current claim first
    const currentClaim = await storage.getProviderClaim(id);
    if (!currentClaim) {
      throw new AppError("Provider claim not found", 404);
    }
    
    // Validate status if provided using Zod enum validation
    const statusSchema = z.enum(['pending', 'verified', 'rejected']).optional();
    try {
      if (status !== undefined) {
        statusSchema.parse(status);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be 'pending', 'verified', or 'rejected'"
      });
    }
    
    // Business rule: If verifying, ensure provider isn't already verified by someone else
    if (status === 'verified') {
      const isAlreadyClaimed = await storage.isProviderClaimed(currentClaim.providerId);
      if (isAlreadyClaimed) {
        const existingVerifiedClaims = await storage.getProviderClaimsByProvider(currentClaim.providerId);
        const otherVerifiedClaim = existingVerifiedClaims.find(claim => 
          claim.status === 'verified' && claim.id !== id
        );
        
        if (otherVerifiedClaim) {
          return res.status(409).json({
            success: false,
            error: "This provider is already verified by another user"
          });
        }
      }
    }
    
    // For verification, allow updating status and notes
    const updates: any = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    // Note: verifiedAt will be handled automatically by storage layer
    
    const updatedClaim = await storage.updateProviderClaim(id, updates);
    
    if (!updatedClaim) {
      throw new AppError("Provider claim not found", 404);
    }
    
    res.json({ success: true, data: updatedClaim });
  }));

  providerClaimsRouter.get("/check/:providerId", asyncHandler(async (req: Request, res: Response) => {
    const { providerId } = req.params;
    const isClaimed = await storage.isProviderClaimed(providerId);
    res.json({ success: true, data: { isClaimed } });
  }));

  // Mount routers
  apiRouter.use("/server", serverRouter);
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/users", usersRouter);
  apiRouter.use("/providers", providersRouter);
  apiRouter.use("/resources", resourcesRouter);
  apiRouter.use("/admin", adminRouter);
  apiRouter.use("/ai", aiRouter);
  apiRouter.use("/ask", askRouter);
  apiRouter.use("/voice", voiceRouter);
  apiRouter.use("/provider-claims", providerClaimsRouter);
  app.use("/api", apiRouter);
  app.use("/health", healthRouter); // Also mount health directly for k8s compatibility

  // Add 404 handler for API routes only (must be after all API routes)
  apiRouter.use("*", notFoundHandler);

  // Add error handling middleware (must be last)
  app.use(errorHandler);

  const httpServer = createServer(app);
  
  // Fix HMR WebSocket connection stability by setting proper timeouts
  httpServer.keepAliveTimeout = 61_000; // 61 seconds
  httpServer.headersTimeout = 65_000;   // 65 seconds  
  httpServer.timeout = 0;               // Disable request timeout
  
  return httpServer;
}
