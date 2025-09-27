import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';
import { Server } from 'http';

interface ActiveConnection {
  id: string;
  browserWS: WebSocket;
  openaiWS: WebSocket | null;
  startTime: number;
}

const activeConnections = new Map<string, ActiveConnection>();
const MAX_CONNECTIONS = 10;
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function registerRealtime(app: Express, server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/realtime',
    verifyClient: (info: any) => {
      // Basic same-origin check
      const origin = info.origin;
      const host = info.req.headers.host;
      
      if (!origin || !host) return false;
      
      // Allow localhost and same host connections
      if (origin.includes('localhost') || origin.includes(host)) {
        return true;
      }
      
      return false;
    }
  });

  console.log('🎤 Realtime WebSocket server initialized at /realtime');

  wss.on('connection', async (browserWS, request) => {
    // Check connection limits
    if (activeConnections.size >= MAX_CONNECTIONS) {
      console.log('[REALTIME] Max connections reached, rejecting new connection');
      browserWS.close(1008, 'Server at capacity');
      return;
    }

    const connectionId = uuidv4();
    console.log(`[REALTIME] New browser connection: ${connectionId}`);

    // Initialize connection state
    const connection: ActiveConnection = {
      id: connectionId,
      browserWS,
      openaiWS: null,
      startTime: Date.now()
    };
    activeConnections.set(connectionId, connection);

    // Setup session timeout
    const sessionTimeout = setTimeout(() => {
      console.log(`[REALTIME] Session timeout for ${connectionId}`);
      cleanup();
    }, SESSION_TIMEOUT);

    async function initializeOpenAI() {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          browserWS.send(JSON.stringify({ 
            type: 'error', 
            message: 'OpenAI API key not configured' 
          }));
          return;
        }

        const model = process.env.MODEL_REALTIME || 'gpt-4o-realtime-preview';
        const openaiWS = new WebSocket(`wss://api.openai.com/v1/realtime?model=${model}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        connection.openaiWS = openaiWS;

        openaiWS.on('open', () => {
          console.log(`[REALTIME] OpenAI connection established for ${connectionId}`);
          
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
          }, 100); // 100ms delay to ensure session is configured
        });

        openaiWS.on('message', (data) => {
          try {
            // Forward all OpenAI messages to browser
            if (data instanceof Buffer) {
              // Binary audio data from OpenAI
              browserWS.send(data);
            } else {
              // JSON messages (transcripts, tool calls, etc.)
              const message = JSON.parse(data.toString());
              browserWS.send(JSON.stringify(message));
            }
          } catch (error) {
            console.error(`[REALTIME] Error processing OpenAI message for ${connectionId}:`, error);
          }
        });

        openaiWS.on('close', (code, reason) => {
          console.log(`[REALTIME] OpenAI connection closed for ${connectionId}: ${code} ${reason}`);
          browserWS.send(JSON.stringify({ 
            type: 'error', 
            message: 'OpenAI connection closed' 
          }));
        });

        openaiWS.on('error', (error) => {
          console.error(`[REALTIME] OpenAI WebSocket error for ${connectionId}:`, error);
          browserWS.send(JSON.stringify({ 
            type: 'error', 
            message: 'OpenAI connection error' 
          }));
        });

      } catch (error) {
        console.error(`[REALTIME] Failed to initialize OpenAI connection for ${connectionId}:`, error);
        browserWS.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to connect to OpenAI Realtime API' 
        }));
      }
    }

    function cleanup() {
      console.log(`[REALTIME] Cleaning up connection ${connectionId}`);
      clearTimeout(sessionTimeout);
      
      if (connection.openaiWS) {
        connection.openaiWS.close();
      }
      
      if (connection.browserWS.readyState === WebSocket.OPEN) {
        connection.browserWS.close();
      }
      
      activeConnections.delete(connectionId);
    }

    // Handle browser messages
    browserWS.on('message', async (data) => {
      try {
        if (!connection.openaiWS) {
          // Initialize OpenAI connection on first message
          await initializeOpenAI();
          if (!connection.openaiWS) return;
        }

        if (connection.openaiWS.readyState !== WebSocket.OPEN) {
          browserWS.send(JSON.stringify({ 
            type: 'error', 
            message: 'OpenAI connection not ready' 
          }));
          return;
        }

        if (data instanceof Buffer) {
          // Binary audio data from browser
          // Wrap in input_audio_buffer.append frame for OpenAI
          const audioFrame = {
            type: 'input_audio_buffer.append',
            audio: data.toString('base64')
          };
          connection.openaiWS.send(JSON.stringify(audioFrame));
          
          // Let server VAD handle response triggering automatically
          // Don't commit/create per chunk - it causes fragmented responses
        } else {
          // JSON message from browser
          let message;
          try {
            message = JSON.parse(data.toString());
          } catch (e) {
            console.error(`[REALTIME] Invalid JSON from browser ${connectionId}:`, e);
            return;
          }

          // Handle special browser-specific messages
          if (message.type === 'session.update') {
            console.log(`[REALTIME] Forwarding session update for ${connectionId}`);
          }

          // Forward to OpenAI
          connection.openaiWS.send(JSON.stringify(message));
        }
      } catch (error) {
        console.error(`[REALTIME] Error processing browser message for ${connectionId}:`, error);
      }
    });

    browserWS.on('close', () => {
      console.log(`[REALTIME] Browser disconnected: ${connectionId}`);
      cleanup();
    });

    browserWS.on('error', (error) => {
      console.error(`[REALTIME] Browser WebSocket error for ${connectionId}:`, error);
      cleanup();
    });

    // Send ready message to browser
    browserWS.send(JSON.stringify({ 
      type: 'connection.ready', 
      connection_id: connectionId 
    }));
  });

  // Cleanup old connections periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, connection] of activeConnections) {
      if (now - connection.startTime > SESSION_TIMEOUT) {
        console.log(`[REALTIME] Auto-cleaning expired connection: ${id}`);
        if (connection.openaiWS) connection.openaiWS.close();
        if (connection.browserWS.readyState === WebSocket.OPEN) {
          connection.browserWS.close();
        }
        activeConnections.delete(id);
      }
    }
  }, 60000); // Check every minute

  console.log(`🎤 Realtime WebSocket server ready. Active connections limit: ${MAX_CONNECTIONS}`);
}