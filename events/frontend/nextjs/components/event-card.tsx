import { Event } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime, isUpcoming } from '@/lib/utils'
import { Calendar, MapPin, Clock, Users } from 'lucide-react'

interface EventCardProps {
  event: Event
  showRSVPButton?: boolean
  onRSVP?: (eventId: string, action: 'join' | 'leave') => void
  isAttending?: boolean
}

export function EventCard({ event, showRSVPButton = false, onRSVP, isAttending = false }: EventCardProps) {
  const upcoming = event.start_datetime ? isUpcoming(event.start_datetime) : false
  
  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{event.name}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              {upcoming ? (
                <Badge variant="default">Upcoming</Badge>
              ) : (
                <Badge variant="secondary">Past</Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {event.type}
              </Badge>
              {event.status === 'cancelled' && (
                <Badge variant="destructive">Cancelled</Badge>
              )}
            </div>
          </div>
        </div>
        {event.description && (
          <CardDescription className="mt-2">
            {event.description.length > 150 
              ? `${event.description.substring(0, 150)}...` 
              : event.description
            }
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {event.start_datetime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDateTime(event.start_datetime)}</span>
            </div>
          )}
          
          {event.is_all_day && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>All Day Event</span>
            </div>
          )}
          
          {event.location_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.location_name}</span>
              {event.address && (
                <span className="text-xs">({event.address})</span>
              )}
            </div>
          )}
        </div>
        
        {showRSVPButton && onRSVP && upcoming && event.status === 'published' && (
          <div className="mt-4 flex gap-2">
            {isAttending ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onRSVP(event.id, 'leave')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Leave Event
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={() => onRSVP(event.id, 'join')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Join Event
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}