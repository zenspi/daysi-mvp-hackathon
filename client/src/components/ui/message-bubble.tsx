import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Bot, User } from "lucide-react"

interface MessageBubbleProps {
  content: string
  type: 'user' | 'assistant'
  timestamp: Date
  isTyping?: boolean
  className?: string
}

export function MessageBubble({ 
  content, 
  type, 
  timestamp, 
  isTyping = false,
  className 
}: MessageBubbleProps) {
  const isUser = type === 'user'
  
  return (
    <div className={cn(
      "flex gap-3 max-w-[85%] animate-fade-in-up",
      isUser ? "ml-auto flex-row-reverse" : "mr-auto",
      className
    )}>
      {/* Avatar */}
      <Avatar className={cn(
        "w-8 h-8 flex-shrink-0",
        isUser ? "order-2" : "order-1"
      )}>
        <AvatarFallback className={cn(
          "text-xs font-medium",
          isUser 
            ? "bg-sky-500 text-white" 
            : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Container */}
      <div className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Message Bubble */}
        <div className={cn(
          "px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md relative",
          isUser 
            ? "bg-sky-500 text-white rounded-br-md" 
            : "bg-background border border-border rounded-bl-md",
          isTyping && "animate-pulse"
        )}>
          {/* Message Content */}
          <div className={cn(
            "text-sm leading-relaxed",
            isUser ? "text-white" : "text-foreground"
          )}>
            {isTyping ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            ) : (
              <span className="whitespace-pre-wrap break-words">{content}</span>
            )}
          </div>

          {/* Message Tail */}
          <div className={cn(
            "absolute top-3 w-0 h-0",
            isUser 
              ? "right-0 translate-x-full border-l-[8px] border-l-sky-500 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"
              : "left-0 -translate-x-full border-r-[8px] border-r-background border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"
          )} />
        </div>

        {/* Timestamp */}
        <span className={cn(
          "text-xs text-muted-foreground px-2",
          isUser ? "text-right" : "text-left"
        )}>
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}