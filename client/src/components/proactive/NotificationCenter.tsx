import { useState, useEffect } from "react"
import { Bell, BellRing, X, Heart, Calendar, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface ProactiveNotification {
  id: string
  type: 'health_tip' | 'reminder' | 'alert' | 'suggestion'
  title: string
  message: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  priority: 'low' | 'medium' | 'high'
  timestamp: Date
  read: boolean
  category: string
}

const mockNotifications: ProactiveNotification[] = [
  {
    id: '1',
    type: 'health_tip',
    title: 'Daily Wellness Tip',
    message: 'Based on your recent searches about nutrition, consider adding more omega-3 rich foods to your diet. Salmon, walnuts, and chia seeds are excellent sources.',
    action: { label: 'Learn More', href: '/resources?category=nutrition' },
    priority: 'low',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    read: false,
    category: 'Nutrition'
  },
  {
    id: '2',
    type: 'reminder',
    title: 'Health Check Reminder',
    message: 'It\'s been a while since your last general check-up. Consider scheduling an appointment with a primary care physician.',
    action: { label: 'Find Providers', href: '/search/providers' },
    priority: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
    category: 'Preventive Care'
  },
  {
    id: '3',
    type: 'alert',
    title: 'Flu Season Alert',
    message: 'Flu activity is increasing in your area. Consider getting a flu shot if you haven\'t already.',
    action: { label: 'Find Vaccination Sites', href: '/search/providers?specialty=vaccination' },
    priority: 'high',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    read: true,
    category: 'Public Health'
  },
  {
    id: '4',
    type: 'suggestion',
    title: 'Mental Health Resources',
    message: 'Taking care of your mental health is just as important as physical health. We have resources that might help.',
    action: { label: 'Explore Resources', href: '/resources?category=mental-health' },
    priority: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: false,
    category: 'Mental Health'
  }
]

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<ProactiveNotification[]>(mockNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getNotificationIcon = (type: ProactiveNotification['type']) => {
    switch (type) {
      case 'health_tip':
        return <Heart className="w-4 h-4" />
      case 'reminder':
        return <Calendar className="w-4 h-4" />
      case 'alert':
        return <AlertTriangle className="w-4 h-4" />
      case 'suggestion':
        return <Info className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: ProactiveNotification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      case 'low':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
      default:
        return 'border-l-gray-300 bg-gray-50 dark:bg-gray-950/20'
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <FloatingActionButton
        variant="gradient"
        icon={unreadCount > 0 ? BellRing : Bell}
        label="Notifications"
        showLabel={false}
        pulse={unreadCount > 0}
        onClick={() => setIsOpen(true)}
        className={cn("relative", className)}
        data-testid="notification-fab"
      >
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-pulse"
            data-testid={`notification-count-${unreadCount}`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </FloatingActionButton>

      {/* Notification Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <Card className="relative w-full max-w-md max-h-[80vh] flex flex-col animate-fade-in-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Health Insights</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                    data-testid="button-mark-all-read"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-notifications"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-4">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications yet</p>
                  <p className="text-sm">We'll let you know when we have helpful health insights for you.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "border-l-4 p-3 rounded-r-lg transition-all duration-200 hover:shadow-md cursor-pointer",
                      getPriorityColor(notification.priority),
                      !notification.read && "shadow-sm"
                    )}
                    onClick={() => markAsRead(notification.id)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getNotificationIcon(notification.type)}
                        <h4 className={cn(
                          "font-medium text-sm",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeNotification(notification.id)
                        }}
                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                        data-testid={`button-remove-${notification.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {notification.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      
                      {notification.action && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (notification.action?.onClick) {
                              notification.action.onClick()
                            } else if (notification.action?.href) {
                              window.location.href = notification.action.href
                            }
                          }}
                          data-testid={`action-${notification.id}`}
                        >
                          {notification.action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}