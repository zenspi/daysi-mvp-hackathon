import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Bot, User, MapPin, Clock, Phone, ExternalLink, Loader2, Calendar } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  language?: string;
  intent?: string;
  results?: Provider[] | Resource[];
}

interface Provider {
  id: number;
  name: string;
  specialty: string;
  phone: string;
  address: string;
  languages: string[];
  distance?: number;
}

interface Resource {
  id: number;
  name: string;
  category: string;
  phone: string;
  address: string;
  description: string;
  distance?: number;
}

export default function Chat() {
  const { t, language, setLanguage } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        console.error('[CHAT] Location error:', error);
        toast({
          title: t('location.denied'),
          variant: 'destructive'
        });
      }
    );
  }, [toast, t]);

  // Send message to AI
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      content: inputText.trim(),
      type: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);
    
    try {
      // Prepare request payload
      const requestPayload: any = {
        message: messageText,
        lang: language === 'es' ? 'es' : 'en'
      };
      
      // Add user info if authenticated
      if (user) {
        requestPayload.user = {
          email: user.email,
          phone: user.phone,
          language: language === 'es' ? 'Spanish' : 'English',
          name: user.name
        };
      }
      
      // Add location if enabled
      if (useLocation && userLocation) {
        requestPayload.location = {
          lat: userLocation.lat,
          lng: userLocation.lng,
          consent: true
        };
      }
      
      
      console.log('[CHAT] Sending request:', requestPayload);
      
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });
      
      const data = await response.json();
      console.log('[CHAT] Response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success && data.reply) {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString() + '-assistant',
          content: data.reply,
          type: 'assistant',
          timestamp: new Date(),
          language: data.reply_lang,
          intent: data.intent,
          results: data.results || []
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'No response received');
      }
      
    } catch (error) {
      console.error('[CHAT] Send message error:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        content: t('errors.network'),
        type: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: t('errors.network'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, language, user, useLocation, userLocation, toast, t]);

  // Handle scheduling appointment
  const handleScheduleAppointment = useCallback((provider: Provider) => {
    // Enhanced scheduling with better UX
    const phoneNumber = provider.phone.replace(/\D/g, ''); // Clean phone number
    const bookingUrl = `https://www.zocdoc.com/search?filters=%5B%5D&insurances=%5B%5D&query=${encodeURIComponent(provider.name)}&address=${encodeURIComponent(provider.address)}`;
    
    // Open booking URL in new tab
    window.open(bookingUrl, '_blank');
    
    toast({
      title: '📅 Scheduling Options Opened',
      description: `Book online with ${provider.name} or call ${provider.phone} directly`,
      duration: 6000, // Show longer for important scheduling info
    });
    
    // Also provide direct call option as backup
    setTimeout(() => {
      toast({
        title: '💡 Quick Tip',
        description: `You can also call ${provider.name} directly at ${provider.phone} for faster booking`,
        duration: 5000,
      });
    }, 2000);
  }, [toast]);

  // Handle input key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Render provider result
  const renderProvider = (provider: Provider, index: number) => (
    <Card key={`provider-${provider.id}`} className="mb-2" data-testid={`provider-card-${provider.id}`}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium text-sm" data-testid={`provider-name-${provider.id}`}>
              {provider.name}
            </h4>
            <p className="text-xs text-muted-foreground" data-testid={`provider-specialty-${provider.id}`}>
              {provider.specialty}
            </p>
          </div>
          {provider.distance !== undefined && (
            <Badge variant="outline" className="text-xs" data-testid={`provider-distance-${provider.id}`}>
              {provider.distance.toFixed(1)} {t('search.providers.milesAway')}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3" />
          <span data-testid={`provider-address-${provider.id}`}>{provider.address}</span>
        </div>
        
        {provider.languages && provider.languages.length > 0 && (
          <div className="flex gap-1 mb-2">
            {provider.languages.map((lang, i) => (
              <Badge key={i} variant="secondary" className="text-xs" data-testid={`provider-language-${provider.id}-${i}`}>
                {lang}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`tel:${provider.phone}`, '_self')}
            data-testid={`provider-call-${provider.id}`}
          >
            <Phone className="h-3 w-3 mr-1" />
            {t('search.providers.callNow')}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1"
            onClick={() => handleScheduleAppointment(provider)}
            data-testid={`provider-schedule-${provider.id}`}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render resource result
  const renderResource = (resource: Resource, index: number) => (
    <Card key={`resource-${resource.id}`} className="mb-2" data-testid={`resource-card-${resource.id}`}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium text-sm" data-testid={`resource-name-${resource.id}`}>
              {resource.name}
            </h4>
            <p className="text-xs text-muted-foreground" data-testid={`resource-category-${resource.id}`}>
              {resource.category}
            </p>
          </div>
          {resource.distance !== undefined && (
            <Badge variant="outline" className="text-xs" data-testid={`resource-distance-${resource.id}`}>
              {resource.distance.toFixed(1)} {t('search.providers.milesAway')}
            </Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mb-2" data-testid={`resource-description-${resource.id}`}>
          {resource.description}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3" />
          <span data-testid={`resource-address-${resource.id}`}>{resource.address}</span>
        </div>
        
        <Button 
          size="sm" 
          className="w-full"
          onClick={() => window.open(`tel:${resource.phone}`, '_self')}
          data-testid={`resource-call-${resource.id}`}
        >
          <Phone className="h-3 w-3 mr-1" />
          {t('buttons.call')}
        </Button>
      </CardContent>
    </Card>
  );

  // Get language display name
  const getLanguageDisplay = (lang: string) => {
    switch (lang) {
      case 'es': return 'Español';
      case 'en': return 'English';
      default: return lang;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Simplified Chat Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold" data-testid="chat-title">
                Daysi
              </h1>
              <p className="text-xs text-muted-foreground" data-testid="chat-subtitle">
                Healthcare Navigator • Online
              </p>
            </div>
          </div>
          
          {/* Compact Controls */}
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-16 h-8 text-xs" data-testid="language-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸</SelectItem>
                <SelectItem value="es">🇪🇸</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={requestLocation}
              disabled={useLocation}
              className="h-8 px-2"
              data-testid="button-location"
            >
            <MapPin className="h-4 w-4 mr-1" />
            {useLocation ? '✓ Location' : t('voice.useLocation')}
          </Button>
          
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mr-4 max-w-[85%]" data-testid="chat-empty-state">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm font-medium">Daysi</span>
                    <span className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm space-y-2">
                    <p>👋 Hi! I'm Daysi, your healthcare navigator. I'm here to help you find the right care and resources.</p>
                    <p>Tell me what you need help with today:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• "I need a pediatrician in Brooklyn"</li>
                      <li>• "Necesito ayuda con comida en Queens"</li>
                      <li>• "I have chest pain, what should I do?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  
                  {/* Message bubble */}
                  <div className={`p-3 rounded-lg mb-2 ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white ml-4' 
                      : 'bg-gray-100 dark:bg-gray-800 mr-4'
                  }`} data-testid={`message-${message.type}-${message.id}`}>
                    
                    {/* Message header */}
                    <div className="flex items-center gap-2 mb-2">
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                      <span className="text-xs font-medium">
                        {message.type === 'user' ? (user?.name || 'You') : 'Daysi'}
                      </span>
                      <span className="text-xs opacity-75" data-testid={`message-time-${message.id}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.language && (
                        <Badge variant="secondary" className="text-xs" data-testid={`message-language-${message.id}`}>
                          {getLanguageDisplay(message.language)}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Message content */}
                    <p className="text-sm whitespace-pre-wrap" data-testid={`message-content-${message.id}`}>
                      {message.content}
                    </p>
                  </div>
                  
                  {/* Results section for assistant messages */}
                  {message.type === 'assistant' && message.results && message.results.length > 0 && (
                    <div className="mr-4 mb-2">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1" data-testid={`results-title-${message.id}`}>
                        <ExternalLink className="h-3 w-3" />
                        {message.intent === 'providers' ? t('search.providers.title') : t('search.resources.title')}
                        <Badge variant="outline" className="ml-1">
                          {message.results.length}
                        </Badge>
                      </h4>
                      
                      <div className="space-y-2" data-testid={`results-list-${message.id}`}>
                        {message.intent === 'providers'
                          ? message.results.map((provider, index) => renderProvider(provider as Provider, index))
                          : message.results.map((resource, index) => renderResource(resource as Resource, index))
                        }
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mr-4 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span className="text-xs font-medium">Daysi</span>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                  <p className="text-sm mt-2" data-testid="chat-thinking">
                    {t('chat.thinking')}
                  </p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white dark:bg-gray-900">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder={t('chat.placeholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button 
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            size="lg"
            data-testid="button-send-message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Quick suggestions when empty */}
        {messages.length === 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {[
              "I need a doctor near me",
              "Necesito ayuda con comida",
              "I have a headache"
            ].map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputText(suggestion)}
                className="text-xs"
                data-testid={`suggestion-${index}`}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}