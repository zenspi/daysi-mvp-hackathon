import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: boolean
  gradient?: boolean
  interactive?: boolean
  loading?: boolean
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ 
    className, 
    hover = false, 
    glow = false, 
    gradient = false, 
    interactive = false,
    loading = false,
    children, 
    ...props 
  }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          hover && "hover:shadow-lg hover:-translate-y-1",
          glow && "shadow-2xl hover:shadow-primary/25",
          gradient && "bg-gradient-to-br from-background via-background/50 to-muted/30",
          interactive && "cursor-pointer active:scale-[0.98] hover:scale-[1.02]",
          loading && "animate-pulse pointer-events-none",
          className
        )}
        {...props}
      >
        {/* Loading shimmer overlay */}
        {loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/50 to-transparent shimmer" />
        )}
        
        {/* Glow effect */}
        {glow && (
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur opacity-0 hover:opacity-100 transition-opacity duration-300" />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Interactive overlay */}
        {interactive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/5 opacity-0 hover:opacity-100 transition-opacity duration-200" />
        )}
      </Card>
    )
  }
)
EnhancedCard.displayName = "EnhancedCard"

export { EnhancedCard }