import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, MapPin, Clock, Users, DollarSign, ExternalLink, Check, Star } from 'lucide-react';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  eventType: string;
  businessId: string | null;
  locationName: string | null;
  startAt: string;
  endAt: string | null;
  maxAttendees: number | null;
  priceCents: number;
  externalUrl: string | null;
  rsvpCount: number;
  status: string;
  businessName?: string | null;
  userRsvpStatus?: string | null;
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    popup: 'Pop-up', tasting: 'Tasting', class: 'Cooking Class', market: 'Market',
    dinner: 'Dinner', competition: 'Competition', tour: 'Food Tour', general: 'Event',
  };
  return map[type] || type;
}

export function EventsPage() {
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['community-events', tab],
    queryFn: async () => {
      const now = new Date().toISOString();
      let query = supabase
        .from('community_events')
        .select('*')
        .neq('status', 'cancelled');

      if (tab === 'upcoming') {
        query = query.gte('start_at', now).order('start_at', { ascending: true });
      } else {
        query = query.lt('start_at', now).order('start_at', { ascending: false });
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;

      const businessIds = [...new Set((data || []).filter(e => e.business_id).map(e => e.business_id!))];
      const businessMap = new Map<string, string>();
      if (businessIds.length > 0) {
        const { data: businesses } = await supabase
          .from('business_accounts')
          .select('id, business_name')
          .in('id', businessIds);
        businesses?.forEach((b: any) => businessMap.set(b.id, b.business_name));
      }

      let rsvpMap = new Map<string, string>();
      if (user) {
        const eventIds = (data || []).map(e => e.id);
        if (eventIds.length > 0) {
          const { data: rsvps } = await supabase
            .from('event_rsvps')
            .select('event_id, status')
            .eq('user_id', user.id)
            .in('event_id', eventIds);
          rsvps?.forEach((r: any) => rsvpMap.set(r.event_id, r.status));
        }
      }

      return (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        coverImageUrl: e.cover_image_url,
        eventType: e.event_type,
        businessId: e.business_id,
        locationName: e.location_name,
        startAt: e.start_at,
        endAt: e.end_at,
        maxAttendees: e.max_attendees,
        priceCents: e.price_cents || 0,
        externalUrl: e.external_url,
        rsvpCount: e.rsvp_count || 0,
        status: e.status,
        businessName: e.business_id ? businessMap.get(e.business_id) : null,
        userRsvpStatus: rsvpMap.get(e.id) || null,
      })) as CommunityEvent[];
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: 'going' | 'interested' | 'cancelled' }) => {
      if (!user) throw new Error('Not authenticated');

      if (status === 'cancelled') {
        await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', user.id);
      } else {
        await supabase.from('event_rsvps').upsert(
          { event_id: eventId, user_id: user.id, status },
          { onConflict: 'event_id,user_id' }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-events'] });
      toast.success('RSVP updated');
    },
    onError: () => toast.error('Failed to update RSVP'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Community Events
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover food events, cooking classes, and pop-up dinners near you
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-secondary/30">
          <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
          <TabsTrigger value="past" className="flex-1">Past Events</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No {tab} events</h3>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for new events!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden hover:border-primary/30 transition-all">
              <div className="flex flex-col md:flex-row">
                {event.coverImageUrl && (
                  <div className="md:w-48 h-40 md:h-auto overflow-hidden flex-shrink-0">
                    <img src={event.coverImageUrl} alt={event.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-5 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{event.title}</h3>
                      <Badge variant="secondary" className="mt-1 text-xs">{formatEventType(event.eventType)}</Badge>
                    </div>
                    {event.userRsvpStatus === 'going' && (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                        <Check className="h-3 w-3" /> Going
                      </Badge>
                    )}
                    {event.userRsvpStatus === 'interested' && (
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
                        <Star className="h-3 w-3" /> Interested
                      </Badge>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(event.startAt), 'EEE, MMM d · h:mm a')}
                    </span>
                    {event.locationName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.locationName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.rsvpCount} attending
                      {event.maxAttendees && ` / ${event.maxAttendees} max`}
                    </span>
                    {event.priceCents > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${(event.priceCents / 100).toFixed(2)}
                      </span>
                    )}
                    {event.priceCents === 0 && (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 text-[10px]">Free</Badge>
                    )}
                  </div>

                  {event.businessName && (
                    <p className="text-xs text-muted-foreground">
                      Hosted by <span className="font-medium text-foreground">{event.businessName}</span>
                    </p>
                  )}

                  {tab === 'upcoming' && user && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant={event.userRsvpStatus === 'going' ? 'default' : 'outline'}
                        onClick={() => rsvpMutation.mutate({
                          eventId: event.id,
                          status: event.userRsvpStatus === 'going' ? 'cancelled' : 'going',
                        })}
                        disabled={rsvpMutation.isPending}
                      >
                        {event.userRsvpStatus === 'going' ? 'Cancel RSVP' : "I'm Going"}
                      </Button>
                      {event.userRsvpStatus !== 'going' && (
                        <Button
                          size="sm"
                          variant={event.userRsvpStatus === 'interested' ? 'secondary' : 'ghost'}
                          onClick={() => rsvpMutation.mutate({
                            eventId: event.id,
                            status: event.userRsvpStatus === 'interested' ? 'cancelled' : 'interested',
                          })}
                          disabled={rsvpMutation.isPending}
                        >
                          Interested
                        </Button>
                      )}
                      {event.externalUrl && (
                        <a href={event.externalUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="h-3 w-3 mr-1" /> Details
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
