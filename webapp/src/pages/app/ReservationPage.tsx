import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Users as UsersIcon,
  Loader2,
  CheckCircle2,
  Building2,
} from 'lucide-react';

export function ReservationPage() {
  const { id: businessId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data: business, isLoading: bizLoading } = useQuery({
    queryKey: ['business-profile', businessId],
    queryFn: async () => api.get<any>(`/api/business/${businessId}`),
    enabled: !!businessId,
  });

  const { data: settings } = useQuery({
    queryKey: ['reservation-settings', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();
      return data || {
        max_party_size: 20,
        min_party_size: 1,
        slot_duration_minutes: 30,
        advance_booking_days: 30,
      };
    },
    enabled: !!businessId,
  });

  const { data: hours } = useQuery({
    queryKey: ['business-hours', businessId],
    queryFn: async () => {
      try {
        return await api.get<any[]>(`/api/business/${businessId}/hours`);
      } catch {
        return [];
      }
    },
    enabled: !!businessId,
  });

  const { data: existingReservations } = useQuery({
    queryKey: ['date-reservations', businessId, date],
    queryFn: async () => {
      if (!date) return [];
      const { data } = await supabase
        .from('reservations')
        .select('time, party_size, status')
        .eq('business_id', businessId)
        .eq('date', date)
        .in('status', ['confirmed', 'pending']);
      return data || [];
    },
    enabled: !!businessId && !!date,
  });

  // Generate available time slots
  const timeSlots = useMemo(() => {
    if (!date || !hours?.length) {
      // Default hours if not set
      const slots: string[] = [];
      for (let h = 11; h <= 21; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
        slots.push(`${h.toString().padStart(2, '0')}:30`);
      }
      return slots;
    }
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const todayHours = hours.find((h: any) => h.day_of_week === dayOfWeek);
    if (!todayHours || todayHours.is_closed) return [];

    const slots: string[] = [];
    const open = todayHours.open_time || '11:00';
    const close = todayHours.close_time || '22:00';
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);
    const interval = settings?.slot_duration_minutes || 30;

    let current = openH * 60 + openM;
    const end = closeH * 60 + closeM - interval;
    while (current <= end) {
      const hh = Math.floor(current / 60).toString().padStart(2, '0');
      const mm = (current % 60).toString().padStart(2, '0');
      slots.push(`${hh}:${mm}`);
      current += interval;
    }
    return slots;
  }, [date, hours, settings]);

  const bookedTimes = new Set(existingReservations?.map(r => r.time) || []);

  // Date range
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (settings?.advance_booking_days || 30));
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const createReservation = useMutation({
    mutationFn: async () => {
      if (!user || !businessId) throw new Error('Missing data');
      const { error } = await supabase.from('reservations').insert({
        business_id: businessId,
        user_id: user.id,
        date,
        time,
        party_size: partySize,
        guest_name: name,
        guest_email: email,
        guest_phone: phone,
        notes,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmed(true);
    },
    onError: (err) => {
      toast.error('Failed to create reservation. Please try again.');
    },
  });

  if (bizLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Reservation Requested!</h2>
        <p className="text-sm text-muted-foreground">
          Your reservation at <span className="font-medium text-foreground">{business?.businessName}</span> for{' '}
          <span className="font-medium text-foreground">{partySize} guests</span> on{' '}
          <span className="font-medium text-foreground">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span> at{' '}
          <span className="font-medium text-foreground">{time}</span> has been submitted.
        </p>
        <p className="text-xs text-muted-foreground">You'll receive a confirmation once the restaurant approves your reservation.</p>
        <div className="flex gap-2 justify-center pt-4">
          <Button variant="outline" onClick={() => navigate(`/app/business/${businessId}`)}>
            Back to Business
          </Button>
          <Button className="bg-primary text-primary-foreground" onClick={() => navigate('/app/explore')}>
            Explore More
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Make a Reservation</h1>
          {business && (
            <Link to={`/app/business/${businessId}`} className="text-sm text-primary hover:underline">
              {business.businessName}
            </Link>
          )}
        </div>
      </div>

      {/* Date picker */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setTime(''); }}
              min={today}
              max={maxDateStr}
              className="bg-secondary/30 border-border/50"
            />
          </div>

          {/* Time slots */}
          {date && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Time
              </Label>
              {timeSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot) => {
                    const booked = bookedTimes.has(slot);
                    return (
                      <Button
                        key={slot}
                        variant={time === slot ? 'default' : 'outline'}
                        size="sm"
                        disabled={booked}
                        className={
                          time === slot
                            ? 'bg-primary text-primary-foreground'
                            : booked
                            ? 'opacity-40'
                            : 'border-border/50 text-muted-foreground hover:text-foreground'
                        }
                        onClick={() => setTime(slot)}
                      >
                        {slot}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No available slots for this date.</p>
              )}
            </div>
          )}

          {/* Party size */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-primary" />
              Party Size
            </Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border/50"
                onClick={() => setPartySize(Math.max(settings?.min_party_size || 1, partySize - 1))}
              >
                -
              </Button>
              <span className="text-lg font-semibold text-foreground w-8 text-center">{partySize}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border/50"
                onClick={() => setPartySize(Math.min(settings?.max_party_size || 20, partySize + 1))}
              >
                +
              </Button>
              <span className="text-xs text-muted-foreground">guests</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest info */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Guest Information</h3>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary/30 border-border/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="bg-secondary/30 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-secondary/30 border-border/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Special Requests</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dietary restrictions, special occasions, etc."
              className="bg-secondary/30 border-border/50 resize-none"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        className="w-full bg-primary text-primary-foreground py-6 text-base"
        disabled={!date || !time || !name.trim() || createReservation.isPending}
        onClick={() => createReservation.mutate()}
      >
        {createReservation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CalendarDays className="h-4 w-4 mr-2" />
        )}
        Request Reservation
      </Button>
    </div>
  );
}
