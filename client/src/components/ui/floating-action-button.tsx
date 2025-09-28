import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { LucideIcon } from "lucide-react"

const fabVariants = cva(
  "fixed z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 flex items-center justify-center font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary/50",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent/50",
        gradient: "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 focus:ring-blue-500/50",
      },
      size: {
        sm: "w-12 h-12 text-sm",
        default: "w-14 h-14 text-base",
        lg: "w-16 h-16 text-lg",
        xl: "w-20 h-20 text-xl",
      },
      position: {
        "bottom-right": "bottom-6 right-6",
        "bottom-left": "bottom-6 left-6", 
        "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
        "top-right": "top-6 right-6",
        "top-left": "top-6 left-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      position: "bottom-right",
    },
  }
)

export interface FloatingActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof fabVariants> {
  icon?: LucideIcon
  label?: string
  showLabel?: boolean
  pulse?: boolean
}

const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    position, 
    icon: Icon, 
    label, 
    showLabel = false,
    pulse = false,
    children,
    ...props 
  }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false)

    return (
      <div className="relative">
        {/* Pulse effect */}
        {pulse && (
          <div className={cn(
            fabVariants({ variant, size, position, className }),
            "animate-ping opacity-75 pointer-events-none"
          )} />
        )}
        
        {/* Main button */}
        <button
          className={cn(fabVariants({ variant, size, position, className }))}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          ref={ref}
          aria-label={label}
          {...props}
        >
          {Icon && <Icon className={cn("transition-transform", isHovered && "rotate-12")} />}
          {children}
          
          {/* Ripple effect */}
          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
        </button>

        {/* Label tooltip */}
        {label && showLabel && (
          <div className={cn(
            "absolute whitespace-nowrap bg-background/90 backdrop-blur-sm text-foreground text-sm px-3 py-1 rounded-lg shadow-lg border transition-all duration-200",
            position?.includes("right") ? "right-full mr-3 top-1/2 -translate-y-1/2" : "left-full ml-3 top-1/2 -translate-y-1/2",
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )}>
            {label}
            {/* Arrow */}
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 w-0 h-0",
              position?.includes("right") 
                ? "left-full border-l-4 border-l-background/90 border-t-2 border-t-transparent border-b-2 border-b-transparent"
                : "right-full border-r-4 border-r-background/90 border-t-2 border-t-transparent border-b-2 border-b-transparent"
            )} />
          </div>
        )}
      </div>
    )
  }
)
FloatingActionButton.displayName = "FloatingActionButton"

export { FloatingActionButton, fabVariants }