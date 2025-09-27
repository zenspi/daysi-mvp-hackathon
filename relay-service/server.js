import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const app = express();

// Configure CORS for the web interface
app.use(cors({
  origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'healthcare-voice-relay',
    timestamp: new Date().toISOString()
  });
});

// Start HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎤 Healthcare Voice Relay Server running on port ${PORT}`);
  console.log(`🔑 OpenAI API Key configured: ${OPENAI_API_KEY.substring(0, 7)}...`);
  console.log(`🌐 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// WebSocket server for voice relay
const wss = new WebSocketServer({ 
  server,
  path: '/realtime'
});

const activeConnections = new Map();
const MAX_CONNECTIONS = 50;
const SESSION_TIMEOUT = 300000; // 5 minutes

console.log('🎤 WebSocket relay server initialized at /realtime');

wss.on('connection', async (browserWS, request) => {
  // Check connection limits
  if (activeConnections.size >= MAX_CONNECTIONS) {
    console.log('[RELAY] Max connections reached, rejecting new connection');
    browserWS.close(1008, 'Server at capacity');
    return;
  }

  const connectionId = uuidv4();
  const clientIP = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  console.log(`[RELAY] New connection: ${connectionId} from ${clientIP}`);

  // Initialize connection state
  const connection = {
    id: connectionId,
    browserWS,
    openaiWS: null,
    startTime: Date.now()
  };
  activeConnections.set(connectionId, connection);

  // Setup session timeout
  const sessionTimeout = setTimeout(() => {
    console.log(`[RELAY] Session timeout for ${connectionId}`);
    cleanup();
  }, SESSION_TIMEOUT);

  async function initializeOpenAI() {
    try {
      console.log(`[RELAY] Initializing OpenAI connection for ${connectionId}...`);
      
      const model = process.env.MODEL_REALTIME || 'gpt-4o-realtime-preview';
      const openaiWS = new WebSocket(`wss://api.openai.com/v1/realtime?model=${model}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      connection.openaiWS = openaiWS;

      openaiWS.on('open', () => {
        console.log(`[RELAY] ✅ OpenAI connection established for ${connectionId}`);
        
        // Send initial session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            model: model,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            instructions: `You are a helpful healthcare navigation assistant. Provide empathetic, concise responses.
              
              Language Guidelines:
              - For Spanish: Use formal "usted" tone, warm and respectful. Keep responses under 120 words.
              - For English: Use empathetic tone, maximum 120 words.
              - Auto-detect language from user input.
              
              Focus on:
              - Healthcare provider recommendations
              - Social services guidance
              - Emergency triage when appropriate
              - Practical next steps and contact information`,
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        };
        
        openaiWS.send(JSON.stringify(sessionConfig));
        
        // Wait a moment for OpenAI to process session config before notifying browser
        setTimeout(() => {
          if (browserWS.readyState === WebSocket.OPEN) {
            browserWS.send(JSON.stringify({
              type: 'connection.ready',
              connection_id: connectionId
            }));
          }
        }, 100);
      });

      openaiWS.on('message', (data) => {
        try {
          // Forward all OpenAI messages to browser
          if (data instanceof Buffer) {
            // Binary audio data from OpenAI
            if (browserWS.readyState === WebSocket.OPEN) {
              browserWS.send(data);
            }
          } else {
            // JSON messages (transcripts, tool calls, etc.)
            const message = JSON.parse(data.toString());
            if (browserWS.readyState === WebSocket.OPEN) {
              browserWS.send(JSON.stringify(message));
            }
          }
        } catch (error) {
          console.error(`[RELAY] Error processing OpenAI message for ${connectionId}:`, error);
        }
      });

      openaiWS.on('close', (code, reason) => {
        console.log(`[RELAY] OpenAI connection closed for ${connectionId}: ${code} ${reason}`);
        if (browserWS.readyState === WebSocket.OPEN) {
          browserWS.send(JSON.stringify({ 
            type: 'error', 
            message: 'OpenAI connection closed' 
          }));
        }
      });

      openaiWS.on('error', (error) => {
        console.error(`[RELAY] OpenAI WebSocket error for ${connectionId}:`, error);
        if (browserWS.readyState === WebSocket.OPEN) {
          browserWS.send(JSON.stringify({ 
            type: 'error', 
            message: 'OpenAI connection error: ' + error.message 
          }));
        }
      });

    } catch (error) {
      console.error(`[RELAY] Failed to initialize OpenAI connection for ${connectionId}:`, error);
      if (browserWS.readyState === WebSocket.OPEN) {
        browserWS.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to connect to OpenAI: ' + error.message 
        }));
      }
    }
  }

  function cleanup() {
    console.log(`[RELAY] Cleaning up connection ${connectionId}`);
    clearTimeout(sessionTimeout);
    
    if (connection.openaiWS) {
      connection.openaiWS.close();
    }
    
    if (browserWS.readyState === WebSocket.OPEN) {
      browserWS.close();
    }
    
    activeConnections.delete(connectionId);
  }

  // Handle browser WebSocket messages (forward to OpenAI)
  browserWS.on('message', (data) => {
    try {
      if (connection.openaiWS && connection.openaiWS.readyState === WebSocket.OPEN) {
        // Forward browser messages to OpenAI
        if (data instanceof Buffer) {
          // Binary audio data from browser
          connection.openaiWS.send(data);
        } else {
          // JSON messages
          const message = JSON.parse(data.toString());
          connection.openaiWS.send(JSON.stringify(message));
        }
      }
    } catch (error) {
      console.error(`[RELAY] Error forwarding browser message for ${connectionId}:`, error);
    }
  });

  browserWS.on('close', () => {
    console.log(`[RELAY] Browser connection closed for ${connectionId}`);
    cleanup();
  });

  browserWS.on('error', (error) => {
    console.error(`[RELAY] Browser WebSocket error for ${connectionId}:`, error);
    cleanup();
  });

  // Initialize OpenAI connection
  await initializeOpenAI();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});