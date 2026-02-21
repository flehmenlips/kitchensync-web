import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays,
  Plus,
  Clock,
  Users,
  Phone,
  Mail,
  MessageSquare,
  PartyPopper,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Armchair,
  Edit2,
  Loader2,
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useBusiness } from '@/contexts/BusinessContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// API Types
interface ReservationApi {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  durationMinutes: number;
  tableId: string | null;
  table?: { id: string; tableNumber: string; section: string | null };
  seatingPreference: string | null;
  specialRequests: string | null;
  occasion: string | null;
  status: string;
  internalNotes: string | null;
  source: string;
  createdAt: string;
}

interface TableApi {
  id: string;
  tableNumber: string;
  capacityMin: number;
  capacityMax: number;
  section: string | null;
  isActive: boolean;
}

interface AvailabilitySlot {
  time: string;
  available: boolean;
  remainingCapacity?: number;
}

// Local Types (UI)
type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled';
type SeatingPreference = 'indoor' | 'outdoor' | 'patio' | 'bar' | 'private_room' | 'no_preference';
type Occasion = 'birthday' | 'anniversary' | 'business' | 'date_night' | 'other' | 'none';

interface Reservation {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  partySize: number;
  duration: number;
  status: ReservationStatus;
  tableAssignment: string | null;
  tableId: string | null;
  seatingPreference: SeatingPreference;
  specialRequests: string | null;
  occasion: Occasion;
  internalNotes: string | null;
  createdAt: string;
}

// Map API reservation to local UI type
function mapApiReservation(res: ReservationApi): Reservation {
  return {
    id: res.id,
    customerName: res.customerName,
    customerEmail: res.customerEmail,
    customerPhone: res.customerPhone || '',
    date: res.reservationDate,
    time: res.reservationTime,
    partySize: res.partySize,
    duration: res.durationMinutes,
    status: res.status as ReservationStatus,
    tableAssignment: res.table?.tableNumber || null,
    tableId: res.tableId,
    seatingPreference: (res.seatingPreference || 'no_preference') as SeatingPreference,
    specialRequests: res.specialRequests,
    occasion: (res.occasion || 'none') as Occasion,
    internalNotes: res.internalNotes,
    createdAt: res.createdAt,
  };
}

// Helper functions
function getStatusColor(status: ReservationStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'confirmed':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'seated':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'completed':
      return 'bg-muted text-muted-foreground border-muted';
    case 'cancelled':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return '';
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function getOccasionLabel(occasion: Occasion): string {
  switch (occasion) {
    case 'birthday': return 'Birthday';
    case 'anniversary': return 'Anniversary';
    case 'business': return 'Business';
    case 'date_night': return 'Date Night';
    case 'other': return 'Special Occasion';
    case 'none': return 'None';
    default: return '';
  }
}

function getSeatingLabel(preference: SeatingPreference): string {
  switch (preference) {
    case 'indoor': return 'Indoor';
    case 'outdoor': return 'Outdoor';
    case 'patio': return 'Patio';
    case 'bar': return 'Bar';
    case 'private_room': return 'Private Room';
    case 'no_preference': return 'No Preference';
    default: return '';
  }
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

export function ReservationsPage() {
  const { business } = useBusiness();
  const { toast } = useToast();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<TableApi[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    date: '',
    time: '',
    partySize: '2',
    seatingPreference: 'no_preference' as SeatingPreference,
    specialRequests: '',
    occasion: 'none' as Occasion,
  });

  // Loading states
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New reservation form state
  const [newReservation, setNewReservation] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    date: new Date(),
    time: '',
    partySize: '2',
    seatingPreference: 'no_preference' as SeatingPreference,
    specialRequests: '',
    occasion: 'none' as Occasion,
  });

  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    if (!business?.id) return;

    setIsLoadingReservations(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await api.get<ReservationApi[]>(`/api/reservations/${business.id}?date=${dateStr}`);
      setReservations((data || []).map(mapApiReservation));
    } catch (err) {
      console.error('Error fetching reservations:', err);
      toast({
        title: 'Error',
        description: 'Failed to load reservations',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingReservations(false);
    }
  }, [business?.id, selectedDate, toast]);

  // Fetch tables
  const fetchTables = useCallback(async () => {
    if (!business?.id) return;

    setIsLoadingTables(true);
    try {
      const data = await api.get<TableApi[]>(`/api/reservations/${business.id}/tables`);
      setTables(data || []);
    } catch (err) {
      console.error('Error fetching tables:', err);
      // Don't show error toast for tables - they might not exist yet
    } finally {
      setIsLoadingTables(false);
    }
  }, [business?.id]);

  // Fetch available slots for new reservation
  const fetchAvailableSlots = useCallback(async (date: Date, partySize: number) => {
    if (!business?.id) return;

    setIsLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const data = await api.get<AvailabilitySlot[]>(
        `/api/reservations/${business.id}/availability?date=${dateStr}&partySize=${partySize}`
      );
      setAvailableSlots(data || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
      // Fall back to default time slots
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [business?.id]);

  // Initial load
  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Fetch slots when new reservation dialog opens
  useEffect(() => {
    if (isNewReservationOpen) {
      fetchAvailableSlots(newReservation.date, parseInt(newReservation.partySize, 10));
    }
  }, [isNewReservationOpen, newReservation.date, newReservation.partySize, fetchAvailableSlots]);

  // Filter reservations by status
  const filteredReservations = reservations.filter(res => {
    return statusFilter === 'all' || res.status === statusFilter;
  }).sort((a, b) => a.time.localeCompare(b.time));

  // Calculate stats
  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    pending: reservations.filter(r => r.status === 'pending').length,
    totalCovers: reservations
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.partySize, 0),
  };

  // Generate time slots (fallback if no availability data)
  const defaultTimeSlots = [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  ];

  // Use available slots if we have them, otherwise use default
  const timeSlots = availableSlots.length > 0
    ? availableSlots.filter(s => s.available).map(s => s.time)
    : defaultTimeSlots;

  // Action handlers
  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    if (!business?.id) return;

    setIsSubmitting(true);
    try {
      await api.put(`/api/reservations/${business.id}/${id}/status`, { status: newStatus });
      toast({
        title: 'Status Updated',
        description: `Reservation ${newStatus === 'confirmed' ? 'confirmed' : newStatus === 'seated' ? 'seated' : newStatus === 'completed' ? 'completed' : 'updated'}`,
      });
      await fetchReservations();
      // Update selected reservation if it's the one we just changed
      if (selectedReservation?.id === id) {
        const updated = reservations.find(r => r.id === id);
        if (updated) {
          setSelectedReservation({ ...updated, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update reservation status',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = (id: string) => handleStatusChange(id, 'confirmed');
  const handleSeat = (id: string) => handleStatusChange(id, 'seated');
  const handleComplete = (id: string) => handleStatusChange(id, 'completed');

  const handleCancel = async () => {
    if (!selectedReservation || !business?.id) return;

    setIsSubmitting(true);
    try {
      await api.put(`/api/reservations/${business.id}/${selectedReservation.id}/status`, {
        status: 'cancelled',
        internalNotes: cancelReason ? `Cancellation reason: ${cancelReason}` : undefined,
      });
      toast({
        title: 'Reservation Cancelled',
        description: 'The reservation has been cancelled',
      });
      setIsCancelDialogOpen(false);
      setCancelReason('');
      await fetchReservations();
      setSelectedReservation(null);
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      toast({
        title: 'Error',
        description: 'Failed to cancel reservation',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReservation = async () => {
    if (!business?.id) return;

    if (!newReservation.customerName || !newReservation.customerEmail || !newReservation.time) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/reservations/${business.id}`, {
        customerName: newReservation.customerName,
        customerEmail: newReservation.customerEmail,
        customerPhone: newReservation.customerPhone || null,
        reservationDate: format(newReservation.date, 'yyyy-MM-dd'),
        reservationTime: newReservation.time,
        partySize: parseInt(newReservation.partySize, 10),
        seatingPreference: newReservation.seatingPreference === 'no_preference' ? null : newReservation.seatingPreference,
        specialRequests: newReservation.specialRequests || null,
        occasion: newReservation.occasion === 'none' ? null : newReservation.occasion,
        source: 'admin',
      });

      toast({
        title: 'Reservation Created',
        description: `Reservation for ${newReservation.customerName} has been created`,
      });

      setIsNewReservationOpen(false);
      setNewReservation({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        date: new Date(),
        time: '',
        partySize: '2',
        seatingPreference: 'no_preference',
        specialRequests: '',
        occasion: 'none',
      });

      // Refetch if we created a reservation for the currently selected date
      if (format(newReservation.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) {
        await fetchReservations();
      }
    } catch (err) {
      console.error('Error creating reservation:', err);
      toast({
        title: 'Error',
        description: 'Failed to create reservation',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTableChange = async (tableId: string) => {
    if (!selectedReservation || !business?.id) return;

    setIsSubmitting(true);
    try {
      await api.put(`/api/reservations/${business.id}/${selectedReservation.id}`, {
        tableId: tableId || null,
      });
      toast({
        title: 'Table Updated',
        description: 'Table assignment has been updated',
      });
      await fetchReservations();
      // Update selected reservation with new table
      const table = tables.find(t => t.id === tableId);
      setSelectedReservation({
        ...selectedReservation,
        tableId: tableId || null,
        tableAssignment: table?.tableNumber || null,
      });
    } catch (err) {
      console.error('Error updating table:', err);
      toast({
        title: 'Error',
        description: 'Failed to update table assignment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditReservation = (reservation: Reservation) => {
    setEditForm({
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      customerPhone: reservation.customerPhone,
      date: reservation.date,
      time: reservation.time,
      partySize: reservation.partySize.toString(),
      seatingPreference: reservation.seatingPreference,
      specialRequests: reservation.specialRequests || '',
      occasion: reservation.occasion,
    });
    setIsEditOpen(true);
  };

  const handleEditReservation = async () => {
    if (!selectedReservation || !business?.id) return;
    if (!editForm.customerName || !editForm.customerEmail || !editForm.time) return;

    setIsSubmitting(true);
    try {
      await api.put(`/api/reservations/${business.id}/${selectedReservation.id}`, {
        customerName: editForm.customerName,
        customerEmail: editForm.customerEmail,
        customerPhone: editForm.customerPhone || null,
        reservationDate: editForm.date,
        reservationTime: editForm.time,
        partySize: parseInt(editForm.partySize, 10),
        seatingPreference: editForm.seatingPreference === 'no_preference' ? null : editForm.seatingPreference,
        specialRequests: editForm.specialRequests || null,
        occasion: editForm.occasion === 'none' ? null : editForm.occasion,
      });

      toast({
        title: 'Reservation Updated',
        description: `Reservation for ${editForm.customerName} has been updated`,
      });

      setIsEditOpen(false);
      await fetchReservations();
      setSelectedReservation(null);
    } catch (err) {
      console.error('Error updating reservation:', err);
      toast({
        title: 'Error',
        description: 'Failed to update reservation',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state when business is not yet loaded
  if (!business) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reservations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your bookings and table assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarDays className="h-4 w-4 mr-2" />
                {formatDateLabel(selectedDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Dialog open={isNewReservationOpen} onOpenChange={setIsNewReservationOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>New Reservation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Customer Name *</label>
                  <Input
                    placeholder="Full name"
                    value={newReservation.customerName}
                    onChange={(e) => setNewReservation({ ...newReservation, customerName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email *</label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newReservation.customerEmail}
                      onChange={(e) => setNewReservation({ ...newReservation, customerEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone</label>
                    <Input
                      placeholder="(555) 123-4567"
                      value={newReservation.customerPhone}
                      onChange={(e) => setNewReservation({ ...newReservation, customerPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Date *</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {format(newReservation.date, 'MMM d, yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newReservation.date}
                          onSelect={(date) => date && setNewReservation({ ...newReservation, date, time: '' })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Time *</label>
                    <Select
                      value={newReservation.time}
                      onValueChange={(value) => setNewReservation({ ...newReservation, time: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingSlots ? 'Loading...' : 'Select time'} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {formatTime(slot)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Party Size</label>
                    <Select
                      value={newReservation.partySize}
                      onValueChange={(value) => setNewReservation({ ...newReservation, partySize: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} {size === 1 ? 'guest' : 'guests'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Seating Preference</label>
                    <Select
                      value={newReservation.seatingPreference}
                      onValueChange={(value) => setNewReservation({ ...newReservation, seatingPreference: value as SeatingPreference })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_preference">No Preference</SelectItem>
                        <SelectItem value="indoor">Indoor</SelectItem>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="patio">Patio</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="private_room">Private Room</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Occasion</label>
                  <Select
                    value={newReservation.occasion}
                    onValueChange={(value) => setNewReservation({ ...newReservation, occasion: value as Occasion })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="date_night">Date Night</SelectItem>
                      <SelectItem value="other">Other Special Occasion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Special Requests</label>
                  <Textarea
                    placeholder="Any dietary restrictions, accessibility needs, or special requests..."
                    value={newReservation.specialRequests}
                    onChange={(e) => setNewReservation({ ...newReservation, specialRequests: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewReservationOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReservation} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Reservation'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Reservations</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">{stats.confirmed}</p>
            <p className="text-sm text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{stats.totalCovers}</p>
            <p className="text-sm text-muted-foreground">Total Covers</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-panel Layout */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Panel - Reservation List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{formatDateLabel(selectedDate)}'s Schedule</CardTitle>
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto">
                  <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs px-2">Pending</TabsTrigger>
                  <TabsTrigger value="confirmed" className="text-xs px-2">Confirmed</TabsTrigger>
                  <TabsTrigger value="seated" className="text-xs px-2">Seated</TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs px-2">Done</TabsTrigger>
                  <TabsTrigger value="cancelled" className="text-xs px-2">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {isLoadingReservations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReservations.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No reservations found</p>
                        <p className="text-sm">Try adjusting the filter or date</p>
                      </div>
                    ) : (
                      filteredReservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          onClick={() => setSelectedReservation(reservation)}
                          className={`p-4 rounded-lg cursor-pointer transition-all ${
                            selectedReservation?.id === reservation.id
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-secondary/30 hover:bg-secondary/50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-semibold text-primary">
                                  {getInitials(reservation.customerName)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {reservation.customerName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatTime(reservation.time)}</span>
                                  <span>-</span>
                                  <Users className="h-3 w-3" />
                                  <span>{reservation.partySize}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Badge className={`${getStatusColor(reservation.status)} text-xs`}>
                                    {reservation.status}
                                  </Badge>
                                  {reservation.tableAssignment ? (
                                    <Badge variant="outline" className="text-xs">
                                      {reservation.tableAssignment}
                                    </Badge>
                                  ) : null}
                                  {reservation.specialRequests ? (
                                    <MessageSquare className="h-3 w-3 text-amber-400" />
                                  ) : null}
                                  {reservation.occasion !== 'none' ? (
                                    <PartyPopper className="h-3 w-3 text-violet-400" />
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Reservation Details */}
        <div className="lg:col-span-3">
          {selectedReservation ? (
            <Card className="bg-card border-border/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {getInitials(selectedReservation.customerName)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{selectedReservation.customerName}</CardTitle>
                      <Badge className={`mt-1 ${getStatusColor(selectedReservation.status)}`}>
                        {selectedReservation.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditReservation(selectedReservation)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedReservation.customerEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedReservation.customerPhone || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Reservation Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Reservation Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{format(parseISO(selectedReservation.date), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-sm font-medium">{formatTime(selectedReservation.time)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Party Size</p>
                      <p className="text-sm font-medium">{selectedReservation.partySize} guests</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium">{selectedReservation.duration} min</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Table & Seating */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Table Assignment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Assigned Table</label>
                      <Select
                        value={selectedReservation.tableId || ''}
                        onValueChange={handleTableChange}
                        disabled={isSubmitting || isLoadingTables}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingTables ? 'Loading...' : 'Assign table'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No table assigned</SelectItem>
                          {tables.filter(t => t.isActive).map((table) => (
                            <SelectItem key={table.id} value={table.id}>
                              {table.tableNumber} {table.section ? `(${table.section})` : ''} - {table.capacityMin}-{table.capacityMax} guests
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Seating Preference</label>
                      <div className="flex items-center gap-2 h-10 px-3 bg-secondary/50 rounded-md">
                        <Armchair className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{getSeatingLabel(selectedReservation.seatingPreference)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Requests & Occasion */}
                {(selectedReservation.specialRequests || selectedReservation.occasion !== 'none') ? (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Special Requests
                      </h3>
                      {selectedReservation.occasion !== 'none' ? (
                        <div className="flex items-center gap-2 mb-2">
                          <PartyPopper className="h-4 w-4 text-violet-400" />
                          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20">
                            {getOccasionLabel(selectedReservation.occasion)}
                          </Badge>
                        </div>
                      ) : null}
                      {selectedReservation.specialRequests ? (
                        <p className="text-sm bg-secondary/30 p-3 rounded-lg">
                          {selectedReservation.specialRequests}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}

                <Separator />

                {/* Internal Notes */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Internal Notes
                  </h3>
                  <Textarea
                    placeholder="Add notes for staff..."
                    defaultValue={selectedReservation.internalNotes || ''}
                    rows={2}
                    className="bg-secondary/30"
                  />
                </div>

                <Separator />

                {/* Status Actions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Actions
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedReservation.status === 'pending' ? (
                      <Button
                        onClick={() => handleConfirm(selectedReservation.id)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Confirm
                      </Button>
                    ) : null}
                    {selectedReservation.status === 'confirmed' ? (
                      <Button
                        onClick={() => handleSeat(selectedReservation.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Armchair className="h-4 w-4 mr-2" />
                        )}
                        Seat Guest
                      </Button>
                    ) : null}
                    {selectedReservation.status === 'seated' ? (
                      <Button
                        onClick={() => handleComplete(selectedReservation.id)}
                        variant="outline"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Complete
                      </Button>
                    ) : null}
                    {selectedReservation.status !== 'cancelled' && selectedReservation.status !== 'completed' ? (
                      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="text-red-400 hover:text-red-300 border-red-500/20">
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cancel Reservation</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <p className="text-sm text-muted-foreground">
                              Are you sure you want to cancel the reservation for{' '}
                              <span className="font-medium text-foreground">
                                {selectedReservation.customerName}
                              </span>{' '}
                              at {formatTime(selectedReservation.time)}?
                            </p>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Cancellation Reason</label>
                              <Textarea
                                placeholder="Enter reason for cancellation..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                              Keep Reservation
                            </Button>
                            <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                'Cancel Reservation'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border/50">
              <CardContent className="flex flex-col items-center justify-center h-[600px] text-center">
                <CalendarDays className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No Reservation Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select a reservation from the list to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Reservation Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Reservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Customer Name *</label>
              <Input
                placeholder="Full name"
                value={editForm.customerName}
                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email *</label>
                <Input
                  type="email"
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Time *</label>
                <Select value={editForm.time} onValueChange={(value) => setEditForm({ ...editForm, time: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {defaultTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{formatTime(slot)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Party Size</label>
                <Select value={editForm.partySize} onValueChange={(value) => setEditForm({ ...editForm, partySize: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((s) => (
                      <SelectItem key={s} value={s.toString()}>{s} {s === 1 ? 'guest' : 'guests'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Seating</label>
                <Select value={editForm.seatingPreference} onValueChange={(v) => setEditForm({ ...editForm, seatingPreference: v as SeatingPreference })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_preference">No Preference</SelectItem>
                    <SelectItem value="indoor">Indoor</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="patio">Patio</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="private_room">Private Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Occasion</label>
                <Select value={editForm.occasion} onValueChange={(v) => setEditForm({ ...editForm, occasion: v as Occasion })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="date_night">Date Night</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Special Requests</label>
              <Textarea
                value={editForm.specialRequests}
                onChange={(e) => setEditForm({ ...editForm, specialRequests: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleEditReservation} disabled={isSubmitting || !editForm.customerName || !editForm.time}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
