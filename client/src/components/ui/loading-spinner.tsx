import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const spinnerVariants = cva(
  "animate-spin rounded-full border-solid border-current",
  {
    variants: {
      variant: {
        default: "border-2 border-r-transparent",
        dots: "border-2 border-r-transparent border-t-transparent",
        pulse: "border-2 border-current animate-pulse",
        gradient: "border-2 border-transparent bg-gradient-to-r from-primary to-secondary rounded-full",
      },
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6", 
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, variant, size, label, ...props }, ref) => {
    return (
      <div className="flex flex-col items-center gap-2" ref={ref} {...props}>
        <div
          className={cn(spinnerVariants({ variant, size, className }))}
          role="status"
          aria-label={label || "Loading..."}
        />
        {label && (
          <span className="text-sm text-muted-foreground animate-pulse">
            {label}
          </span>
        )}
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner, spinnerVariants }