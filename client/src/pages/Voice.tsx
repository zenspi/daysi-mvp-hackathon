import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, RefreshCw, AlertCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
// Remove translation for now - simplified interface
// import { useTranslation } from '@/hooks/useTranslation';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  language?: string;
  audioUrl?: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'ready' | 'error';
type VoiceStatus = 'idle' | 'listening' | 'processing';

export default function Voice() {
  // const { t } = useTranslation(); // Simplified interface
  const { toast } = useToast();

  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [language, setLanguage] = useState('en');
  const [hasAudioSupport] = useState(() => !!navigator.mediaDevices?.getUserMedia);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const pendingStartRef = useRef(false);

  // Auto-start when ready if user tapped early
  useEffect(() => {
    if (connectionStatus === 'ready' && pendingStartRef.current && !isRecording) {
      pendingStartRef.current = false;
      startVoiceSession();
    }
  }, [connectionStatus, isRecording]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/realtime`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[VOICE] WebSocket connected');
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connection.ready') {
            console.log('[VOICE] Voice services ready');
            setConnectionStatus('ready');
            return;
          }
          
          if (data.type === 'error') {
            console.error('[VOICE] Server error:', data.error);
            if (data.error !== 'Voice services temporarily unavailable') {
              toast({
                title: 'Voice Error',
                description: data.error,
                variant: 'destructive'
              });
            }
            return;
          }
          
          if (data.type === 'response.audio_transcript.done') {
            setCurrentTranscript('');
            setVoiceStatus('idle');
            setIsRecording(false);
            
            const assistantMessage: Message = {
              id: Date.now().toString(),
              content: data.transcript || 'Response received',
              type: 'assistant',
              timestamp: new Date(),
              language,
              audioUrl: data.audio_url
            };
            setMessages(prev => [...prev, assistantMessage]);
            
            if (data.audio_url) {
              playAudioResponse(data.audio_url);
            }
            return;
          }
          
          if (data.type === 'input_audio_buffer.speech_started') {
            setVoiceStatus('listening');
            return;
          }
          
          if (data.type === 'input_audio_buffer.speech_stopped') {
            setVoiceStatus('processing');
            return;
          }
          
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            setCurrentTranscript(data.transcript || '');
            
            const userMessage: Message = {
              id: Date.now().toString(),
              content: data.transcript || '',
              type: 'user',
              timestamp: new Date(),
              language
            };
            setMessages(prev => [...prev, userMessage]);
            return;
          }
          
        } catch (error) {
          console.error('[VOICE] Message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[VOICE] WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[VOICE] WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setVoiceStatus('idle');
        setIsRecording(false);
        setCurrentTranscript('');
        
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
        }
      };

    } catch (error) {
      console.error('[VOICE] Connection failed:', error);
      setConnectionStatus('error');
    }
  }, [toast, language, isRecording]);

  // Start voice session
  const startVoiceSession = useCallback(async () => {
    if (!hasAudioSupport || connectionStatus !== 'ready' || isRecording) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setVoiceStatus('listening');

      // Send session creation
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'session.create',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are Daysi, a helpful healthcare assistant. Provide personalized healthcare guidance and help find providers and resources. Current language: ${language}${userLocation ? `, User location: ${userLocation.lat}, ${userLocation.lng}` : ''}. Keep responses concise and helpful.`,
            voice: 'alloy',
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'g711_ulaw',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        }));
      }

    } catch (error) {
      console.error('[VOICE] Microphone access failed:', error);
      toast({
        title: 'Microphone Access Required',
        description: 'Please allow microphone access to use voice features',
        variant: 'destructive'
      });
    }
  }, [hasAudioSupport, connectionStatus, isRecording, language, userLocation, toast]);

  // Stop voice session
  const stopVoiceSession = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    
    setIsRecording(false);
    setVoiceStatus('idle');
    setCurrentTranscript('');
  }, []);

  // Play audio response
  const playAudioResponse = useCallback((audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      console.error('[VOICE] Audio playback failed:', error);
    });
  }, []);

  // Initialize on mount - auto-connect and auto-request location
  useEffect(() => {
    // Auto-request location silently in background
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setUseLocation(true);
        },
        (error) => {
          console.log('[VOICE] Location not available, continuing without it');
        }
      );
    }
    
    // Auto-connect to voice services
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [connectWebSocket]);

  // Handle orb click
  const handleOrbClick = useCallback(() => {
    if (isRecording) {
      stopVoiceSession();
    } else if (connectionStatus === 'ready') {
      startVoiceSession();
    } else {
      // User tapped early - connect and mark for auto-start
      pendingStartRef.current = true;
      connectWebSocket();
    }
  }, [isRecording, connectionStatus, startVoiceSession, stopVoiceSession, connectWebSocket]);

  // Get orb state
  const getOrbState = () => {
    if (!hasAudioSupport) return 'error';
    if (connectionStatus === 'error') return 'error';
    if (isRecording) return 'listening';
    if (voiceStatus === 'processing') return 'processing';
    if (connectionStatus === 'connecting' || pendingStartRef.current) return 'connecting';
    if (connectionStatus === 'ready') return 'ready';
    return 'disconnected';
  };

  const orbState = getOrbState();

  // Get status text
  const getStatusText = () => {
    if (!hasAudioSupport) return 'Microphone not available';
    if (connectionStatus === 'error') return 'Connection error';
    if (orbState === 'listening') return 'Listening...';
    if (orbState === 'processing') return 'Processing...';
    if (orbState === 'connecting') return 'Connecting...';
    if (orbState === 'ready') return 'Tap to speak';
    return 'Connecting...';
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Simple Header */}
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2" data-testid="voice-title">
          Ask Daysi
        </h1>
        <p className="text-gray-600 dark:text-gray-300" data-testid="voice-subtitle">
          Speak naturally to get personalized healthcare guidance
        </p>
      </div>

      {/* Main Content - Orb Interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        
        {/* Voice Orb */}
        <div className="relative mb-8">
          {/* Pulsing rings for listening/processing */}
          {orbState === 'listening' && (
            <>
              <div className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping scale-110"></div>
              <div className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping scale-125" style={{animationDelay: '0.2s'}}></div>
              <div className="absolute inset-0 rounded-full bg-green-400 opacity-10 animate-ping scale-140" style={{animationDelay: '0.4s'}}></div>
            </>
          )}
          {orbState === 'processing' && (
            <div className="absolute inset-0 rounded-full bg-violet-400 opacity-40 animate-pulse scale-110"></div>
          )}
          
          {/* Main Orb Button */}
          <button
            onClick={handleOrbClick}
            disabled={!hasAudioSupport && orbState !== 'error'}
            className={`
              relative w-40 h-40 rounded-full transition-all duration-300 transform
              ${orbState === 'listening' 
                ? 'bg-green-500 hover:bg-green-600 scale-110 shadow-2xl shadow-green-500/40' 
                : orbState === 'processing'
                  ? 'bg-violet-500 hover:bg-violet-600 scale-105 shadow-xl shadow-violet-500/40'
                  : orbState === 'ready'
                    ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-xl shadow-blue-500/30'
                    : orbState === 'connecting'
                      ? 'bg-yellow-400 animate-pulse shadow-lg shadow-yellow-400/30'
                      : orbState === 'error'
                        ? 'bg-red-500 shadow-lg shadow-red-500/30'
                        : 'bg-gray-400 shadow-lg'
              }
              ${(!hasAudioSupport && orbState !== 'error') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              border-4 border-white dark:border-gray-800
              flex items-center justify-center
              focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800
            `}
            data-testid="button-orb"
            role="button"
            aria-pressed={isRecording}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {orbState === 'connecting' ? (
              <RefreshCw className="h-12 w-12 text-white animate-spin" />
            ) : orbState === 'listening' ? (
              <Mic className="h-12 w-12 text-white" />
            ) : orbState === 'processing' ? (
              <div className="h-12 w-12 text-white flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-bounce mr-1"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce mr-1" style={{animationDelay: '0.1s'}}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            ) : orbState === 'error' ? (
              <AlertCircle className="h-12 w-12 text-white" />
            ) : (
              <Mic className="h-12 w-12 text-white" />
            )}
          </button>
        </div>
        
        {/* Status Text */}
        <p className={`text-lg font-medium mb-4 ${
          orbState === 'error' ? 'text-red-600' :
          orbState === 'listening' ? 'text-green-600' :
          orbState === 'processing' ? 'text-violet-600' :
          orbState === 'connecting' ? 'text-yellow-600' :
          'text-gray-600 dark:text-gray-300'
        }`} data-testid="status-text">
          {getStatusText()}
        </p>
        
        {/* Live Transcript */}
        {currentTranscript && (
          <div className="w-full max-w-lg p-4 bg-white/80 dark:bg-gray-800/80 rounded-lg backdrop-blur border border-gray-200 dark:border-gray-700 mb-4">
            <p className="text-gray-700 dark:text-gray-300 text-center" data-testid="text-transcript" aria-live="polite">
              "{currentTranscript}"
            </p>
          </div>
        )}
        
        {/* Last Assistant Message */}
        {messages.length > 0 && (
          <div className="w-full max-w-lg">
            {messages.slice(-1).map((message) => (
              message.type === 'assistant' && (
                <div key={message.id} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-800 dark:text-gray-200 text-center" data-testid={`message-last-${message.id}`}>
                    {message.content}
                  </p>
                  <div className="flex justify-center items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.audioUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto p-1"
                        onClick={() => playAudioResponse(message.audioUrl!)}
                        data-testid={`play-audio-${message.id}`}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}