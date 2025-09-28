import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Phone, Bot, User, Send, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Provider, Resource } from "@shared/schema";

// Translations
const translations = {
  en: {
    'chat.emptyTitle': 'Hi! How can I help you today?',
    'chat.emptySubtitle': 'Ask me about healthcare providers, social services, or any health-related questions.',
    'chat.placeholder': 'Type your message...',
    'voice.useLocation': 'Location',
    'search.providers.resultsTitle': 'Healthcare Providers',
    'search.resources.resultsTitle': 'Resources Found',
    'buttons.call': 'Call',
    'buttons.directions': 'Directions'
  },
  es: {
    'chat.emptyTitle': '¡Hola! ¿Cómo puedo ayudarte hoy?',
    'chat.emptySubtitle': 'Pregúntame sobre proveedores de salud, servicios sociales o cualquier pregunta relacionada con la salud.',
    'chat.placeholder': 'Escribe tu mensaje...',
    'voice.useLocation': 'Ubicación',
    'search.providers.resultsTitle': 'Proveedores de Salud',
    'search.resources.resultsTitle': 'Recursos Encontrados',
    'buttons.call': 'Llamar',
    'buttons.directions': 'Direcciones'
  }
};

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  results?: Provider[] | Resource[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [useLocation, setUseLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const t = (key: string) => translations[language][key as keyof typeof translations[typeof language]] || key;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Request location permission
  const requestLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      setUseLocation(true);
      toast({
        title: "Location enabled",
        description: "I'll use your location for better recommendations."
      });
    } catch (error) {
      toast({
        title: "Location access denied",
        description: "I'll still help you without location data.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          lang: language,
          pulseConsent: false
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.reply,
          timestamp: new Date(),
          intent: data.intent,
          results: data.results || []
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render provider results
  const renderProvider = (provider: Provider, index: number) => (
    <Card key={`provider-${provider.id}`} className="mt-2">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-sm">{provider.name}</h4>
          <Badge variant="secondary" className="text-xs">{provider.specialty}</Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{provider.address}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button size="sm" className="text-xs" onClick={() => window.open(`tel:${provider.phone}`, '_self')}>
            <Phone className="h-3 w-3 mr-1" />
            {t('buttons.call')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render resource results
  const renderResource = (resource: Resource, index: number) => (
    <Card key={`resource-${resource.id}`} className="mt-2">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-sm">{resource.name}</h4>
          <Badge variant="outline" className="text-xs">{resource.category}</Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{resource.address}</span>
          </div>
        </div>
        <Button size="sm" className="mt-2 text-xs" onClick={() => window.open(`tel:${resource.phone}`, '_self')}>
          <Phone className="h-3 w-3 mr-1" />
          {t('buttons.call')}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold" data-testid="chat-title">
                Daysi [DEV MODE WORKING!]
              </h1>
              <p className="text-xs text-muted-foreground" data-testid="chat-subtitle">
                Healthcare Navigator • Online
              </p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(value: "en" | "es") => setLanguage(value)}>
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
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 py-2">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2" data-testid="chat-empty-title">
                  {t('chat.emptyTitle')}
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm" data-testid="chat-empty-subtitle">
                  {t('chat.emptySubtitle')}
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${index}`}
                >
                  {message.type === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-12'
                        : 'bg-muted text-foreground mr-12'
                    }`}
                    data-testid={`message-content-${index}`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    
                    {/* Show results if available */}
                    {message.results && message.results.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {message.intent === 'find_providers' ? t('search.providers.resultsTitle') : t('search.resources.resultsTitle')}
                        </p>
                        {message.intent === 'find_providers' 
                          ? message.results.map((provider: Provider, idx: number) => renderProvider(provider, idx))
                          : message.results.map((resource: Resource, idx: number) => renderResource(resource, idx))
                        }
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))
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