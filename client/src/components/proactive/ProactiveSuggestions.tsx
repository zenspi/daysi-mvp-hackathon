import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Heart, 
  Calendar, 
  MapPin, 
  Thermometer, 
  Stethoscope, 
  Shield,
  Clock,
  ArrowRight,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProactiveSuggestion {
  id: string
  type: 'health_check' | 'seasonal' | 'emergency' | 'wellness' | 'medication' | 'follow_up'
  title: string
  description: string
  urgency: 'low' | 'medium' | 'high'
  action: {
    label: string
    href?: string
    onClick?: () => void
  }
  dismissible: boolean
  icon: React.ReactNode
  timeframe?: string
  category: string
}

const generateSuggestions = (): ProactiveSuggestion[] => {
  const currentHour = new Date().getHours()
  const currentMonth = new Date().getMonth()
  
  const suggestions: ProactiveSuggestion[] = []

  // Time-based suggestions
  if (currentHour >= 6 && currentHour <= 10) {
    suggestions.push({
      id: 'morning-wellness',
      type: 'wellness',
      title: 'Good Morning! Start Your Day Right',
      description: 'Begin with a healthy breakfast and stay hydrated. Consider a brief morning walk to boost your energy.',
      urgency: 'low',
      action: { label: 'Wellness Tips', href: '/resources?category=wellness' },
      dismissible: true,
      icon: <Heart className="w-5 h-5 text-pink-500" />,
      timeframe: 'Morning routine',
      category: 'Daily Wellness'
    })
  }

  // Seasonal suggestions (flu season: Oct-Feb)
  if (currentMonth >= 9 || currentMonth <= 1) {
    suggestions.push({
      id: 'flu-season',
      type: 'seasonal',
      title: 'Flu Season Protection',
      description: 'Flu activity is high in your area. Consider getting vaccinated and practicing good hygiene.',
      urgency: 'medium',
      action: { label: 'Find Vaccines', href: '/search/providers?service=vaccination' },
      dismissible: true,
      icon: <Shield className="w-5 h-5 text-blue-500" />,
      timeframe: 'Flu season',
      category: 'Preventive Care'
    })
  }

  // General health check reminder
  suggestions.push({
    id: 'annual-checkup',
    type: 'health_check',
    title: 'Annual Health Checkup',
    description: 'Regular checkups help catch health issues early. Schedule your annual physical exam.',
    urgency: 'medium',
    action: { label: 'Find Primary Care', href: '/search/providers?specialty=primary-care' },
    dismissible: true,
    icon: <Stethoscope className="w-5 h-5 text-green-500" />,
    timeframe: 'Yearly',
    category: 'Preventive Care'
  })

  // Emergency preparedness
  suggestions.push({
    id: 'emergency-prep',
    type: 'emergency',
    title: 'Emergency Preparedness',
    description: 'Make sure you have emergency contacts and know the nearest hospital location.',
    urgency: 'low',
    action: { label: 'Find Hospitals', href: '/search/providers?specialty=emergency' },
    dismissible: true,
    icon: <MapPin className="w-5 h-5 text-red-500" />,
    category: 'Emergency Care'
  })

  // Mental health check
  suggestions.push({
    id: 'mental-health',
    type: 'wellness',
    title: 'Mental Health Matters',
    description: 'Take a moment to check in with yourself. Your mental wellbeing is just as important as physical health.',
    urgency: 'low',
    action: { label: 'Mental Health Resources', href: '/resources?category=mental-health' },
    dismissible: true,
    icon: <Heart className="w-5 h-5 text-purple-500" />,
    category: 'Mental Health'
  })

  return suggestions.slice(0, 3) // Show max 3 suggestions
}

interface ProactiveSuggestionsProps {
  className?: string
  maxSuggestions?: number
}

export function ProactiveSuggestions({ className, maxSuggestions = 3 }: ProactiveSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const allSuggestions = generateSuggestions()
    const activeSuggestions = allSuggestions
      .filter(s => !dismissedIds.has(s.id))
      .slice(0, maxSuggestions)
    setSuggestions(activeSuggestions)
  }, [dismissedIds, maxSuggestions])

  const dismissSuggestion = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]))
  }

  const getUrgencyStyles = (urgency: ProactiveSuggestion['urgency']) => {
    switch (urgency) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/10'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/10'
      case 'low':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/10'
      default:
        return 'border-l-gray-300 bg-gray-50 dark:bg-gray-950/10'
    }
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Health Insights</h3>
        <Badge variant="outline" className="text-xs">
          Personalized for you
        </Badge>
      </div>

      <div className="grid gap-3">
        {suggestions.map((suggestion) => (
          <Card
            key={suggestion.id}
            className={cn(
              "border-l-4 transition-all duration-200 hover:shadow-md group",
              getUrgencyStyles(suggestion.urgency)
            )}
            data-testid={`suggestion-${suggestion.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                    {suggestion.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold mb-1">
                      {suggestion.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.category}
                      </Badge>
                      {suggestion.timeframe && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {suggestion.timeframe}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {suggestion.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`dismiss-${suggestion.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                {suggestion.description}
              </p>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between group/btn hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => {
                  if (suggestion.action.onClick) {
                    suggestion.action.onClick()
                  } else if (suggestion.action.href) {
                    window.location.href = suggestion.action.href
                  }
                }}
                data-testid={`action-${suggestion.id}`}
              >
                <span>{suggestion.action.label}</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}