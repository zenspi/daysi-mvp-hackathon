import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Send, MapPin, Wifi, WifiOff, Volume2, MessageSquare, RefreshCw } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  language?: string;
  audioUrl?: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type VoiceStatus = 'idle' | 'listening' | 'processing';

export default function Voice() {
  const { t, language, setLanguage } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Connection and audio state
  const [connectionStatus, setConnectionStatus] = useState&lt;ConnectionStatus&gt;('disconnected');
  const [voiceStatus, setVoiceStatus] = useState&lt;VoiceStatus&gt;('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState&lt;Message[]&gt;([]);
  const [useLocation, setUseLocation] = useState(false);
  const [userLocation, setUserLocation] = useState&lt;{lat: number, lng: number} | null&gt;(null);
  
  // Audio and WebSocket refs
  const wsRef = useRef&lt;WebSocket | null&gt;(null);
  const mediaRecorderRef = useRef&lt;MediaRecorder | null&gt;(null);
  const audioContextRef = useRef&lt;AudioContext | null&gt;(null);
  const audioChunksRef = useRef&lt;Blob[]&gt;([]);
  const connectionIdRef = useRef&lt;string | null&gt;(null);
  
  // Check audio support
  const hasAudioSupport = typeof navigator !== 'undefined' && 
    navigator.mediaDevices && 
    navigator.mediaDevices.getUserMedia;

  // Initialize audio context
  const initializeAudio = useCallback(async () => {
    if (!hasAudioSupport) {
      toast({
        title: t('voice.noAudioSupport'),
        variant: 'destructive'
      });
      return false;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      return true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
      toast({
        title: t('voice.micPermission'),
        description: t('voice.micPermissionDenied'),
        variant: 'destructive'
      });
      return false;
    }
  }, [hasAudioSupport, toast, t]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setConnectionStatus('connecting');
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/realtime`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('[VOICE] WebSocket connected');
        setConnectionStatus('connected');
        
        // Send initial session configuration
        const sessionConfig = {
          type: 'session_config',
          language: language,
          location: userLocation,
          user: user ? { id: user.id, name: user.name } : null
        };
        
        wsRef.current?.send(JSON.stringify(sessionConfig));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('[VOICE] Message parse error:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('[VOICE] WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setVoiceStatus('idle');
        setIsRecording(false);
        
        // Auto-reconnect after delay unless intentionally closed
        if (event.code !== 1000) {
          setTimeout(connectWebSocket, 3000);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('[VOICE] WebSocket error:', error);
        setConnectionStatus('error');
        toast({
          title: t('voice.voiceConnectionError'),
          variant: 'destructive'
        });
      };
      
    } catch (error) {
      console.error('[VOICE] Connection failed:', error);
      setConnectionStatus('error');
    }
  }, [language, userLocation, user, toast, t]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'connection_established':
        connectionIdRef.current = data.connection_id;
        break;
        
      case 'transcription':
        setCurrentTranscript(data.transcript || '');
        break;
        
      case 'response':
        if (data.text) {
          const message: Message = {
            id: Date.now().toString(),
            content: data.text,
            type: 'assistant',
            timestamp: new Date(),
            language: data.language,
            audioUrl: data.audio_url
          };
          setMessages(prev => [...prev, message]);
          
          // Play audio if available
          if (data.audio_url) {
            playAudioResponse(data.audio_url);
          }
        }
        break;
        
      case 'audio_complete':
        setVoiceStatus('idle');
        break;
        
      case 'error':
        console.error('[VOICE] Server error:', data.message);
        toast({
          title: 'Voice Error',
          description: data.message,
          variant: 'destructive'
        });
        break;
    }
  }, [toast]);

  // Play audio response
  const playAudioResponse = useCallback((audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      console.error('[VOICE] Audio playback failed:', error);
    });
  }, []);

  // Start voice recording
  const startVoiceSession = useCallback(async () => {
    if (!await initializeAudio()) return;
    if (connectionStatus !== 'connected') {
      connectWebSocket();
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunk to server
          const reader = new FileReader();
          reader.onload = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'audio_chunk',
                audio: reader.result
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      mediaRecorderRef.current.onstart = () => {
        setIsRecording(true);
        setVoiceStatus('listening');
        setCurrentTranscript('');
      };
      
      mediaRecorderRef.current.onstop = () => {
        setIsRecording(false);
        setVoiceStatus('processing');
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording with 100ms chunks for real-time streaming
      mediaRecorderRef.current.start(100);
      
    } catch (error) {
      console.error('[VOICE] Recording start failed:', error);
      toast({
        title: t('voice.micPermissionDenied'),
        variant: 'destructive'
      });
    }
  }, [connectionStatus, connectWebSocket, initializeAudio, toast, t]);

  // Stop voice recording
  const stopVoiceSession = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'audio_end' }));
    }
  }, [isRecording]);

  // Send text message
  const sendTextMessage = useCallback(() => {
    if (!textInput.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: textInput.trim(),
      type: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send to server
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text_message',
        text: textInput.trim(),
        language: language
      }));
    } else {
      // Fallback to REST API
      handleTextFallback(textInput.trim());
    }
    
    setTextInput('');
  }, [textInput, language]);

  // Fallback to text API when voice is unavailable
  const handleTextFallback = useCallback(async (message: string) => {
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          language,
          location: userLocation
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.response) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: data.response,
          type: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('[VOICE] Text fallback failed:', error);
      toast({
        title: t('errors.network'),
        variant: 'destructive'
      });
    }
  }, [language, userLocation, toast, t]);

  // Request user location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: t('location.error'),
        variant: 'destructive'
      });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        setUseLocation(true);
        
        toast({
          title: t('location.banner.title'),
          description: 'Location updated for better recommendations'
        });
      },
      (error) => {
        console.error('[VOICE] Location error:', error);
        toast({
          title: t('location.denied'),
          variant: 'destructive'
        });
      }
    );
  }, [toast, t]);

  // Initialize on mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [connectWebSocket, isRecording]);

  // Get connection status display
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: Wifi, color: 'text-green-600', text: t('voice.connected') };
      case 'connecting':
        return { icon: RefreshCw, color: 'text-yellow-600', text: t('voice.connecting') };
      case 'error':
        return { icon: WifiOff, color: 'text-red-600', text: t('voice.disconnected') };
      default:
        return { icon: WifiOff, color: 'text-gray-400', text: t('voice.disconnected') };
    }
  };

  const connectionDisplay = getConnectionDisplay();
  const ConnectionIcon = connectionDisplay.icon;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold" data-testid="voice-title">
              {t('voice.title')}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="voice-subtitle">
              {t('voice.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <ConnectionIcon className={`h-5 w-5 ${connectionDisplay.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
            <span className={`text-xs ${connectionDisplay.color}`} data-testid="connection-status">
              {connectionDisplay.text}
            </span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px]" data-testid="language-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={requestLocation}
            disabled={useLocation}
            data-testid="button-location"
          >
            <MapPin className="h-4 w-4 mr-1" />
            {useLocation ? '✓ Location' : t('voice.useLocation')}
          </Button>
          
          {connectionStatus !== 'connected' && (
            <Button
              variant="outline" 
              size="sm"
              onClick={connectWebSocket}
              data-testid="button-reconnect"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('voice.reconnect')}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
        
        {/* Voice Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                {voiceStatus === 'listening' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="animate-pulse">🎤</div>
                    <span data-testid="voice-listening">{t('voice.listening')}</span>
                  </div>
                )}
                {voiceStatus === 'processing' && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin">⚙️</div>
                    <span data-testid="voice-processing">{t('voice.processing')}</span>
                  </div>
                )}
                {voiceStatus === 'idle' && (
                  <span className="text-muted-foreground" data-testid="voice-idle">
                    {t('voice.micButton')}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button
                    size="lg"
                    onClick={startVoiceSession}
                    disabled={!hasAudioSupport || connectionStatus === 'connecting'}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-start-voice"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    {t('voice.startVoice')}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopVoiceSession}
                    data-testid="button-stop-voice"
                  >
                    <MicOff className="h-5 w-5 mr-2" />
                    {t('voice.stopVoice')}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Live Transcript */}
            {currentTranscript && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium mb-1" data-testid="transcript-label">
                  {t('voice.transcript')}
                </h4>
                <p className="text-sm" data-testid="current-transcript">
                  {currentTranscript}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation History */}
        <Card className="flex-1 min-h-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg" data-testid="conversation-title">
              {t('voice.conversation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8" data-testid="no-messages">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t('common.start_by_talking')}</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`} data-testid={`message-${message.type}-${message.id}`}>
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs opacity-75">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        {message.language && (
                          <Badge variant="secondary" className="text-xs">
                            {message.language.toUpperCase()}
                          </Badge>
                        )}
                        {message.audioUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-1"
                            onClick={() => playAudioResponse(message.audioUrl!)}
                            data-testid={`play-audio-${message.id}`}
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Text Input Fallback */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder={t('voice.typeMessage')}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
                className="flex-1"
                data-testid="input-text-message"
              />
              <Button 
                onClick={sendTextMessage}
                disabled={!textInput.trim()}
                data-testid="button-send-text"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}