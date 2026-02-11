import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  User,
  MessageSquare,
  PartyPopper,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarPlus,
  AlertCircle,
  BadgeCheck,
} from 'lucide-react';
import { format, addDays, isAfter, isBefore, startOfDay, parseISO } from 'date-fns';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  PublicBusinessProfile,
  ReservationSettingsResponse,
  AvailabilitySlot,
  ReservationResponse,
  CreateReservationRequest,
} from '../../../backend/src/types';

// Occasion options
const OCCASIONS = [
  { value: 'none', label: 'Select an occasion (optional)' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'date_night', label: 'Date Night' },
  { value: 'business', label: 'Business Meal' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'other', label: 'Other' },
] as const;

// Business type labels
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  farm: 'Farm',
  farmstand: 'Farm Stand',
  farmers_market: 'Farmers Market',
  food_producer: 'Food Producer',
  food_store: 'Food Store',
  catering: 'Catering',
  food_truck: 'Food Truck',
};

// Helper to format time for display
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ['Date & Time', 'Guest Info', 'Confirm'];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                index < currentStep
                  ? 'bg-slate-800 text-white'
                  : index === currentStep
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              {index < currentStep ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'text-xs mt-1 font-medium transition-colors duration-300',
                index <= currentStep ? 'text-slate-900' : 'text-slate-400'
              )}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-12 h-0.5 mx-2 transition-colors duration-300',
                index < currentStep ? 'bg-slate-800' : 'bg-slate-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Success animation component
function SuccessAnimation() {
  return (
    <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 animate-[scale-in_0.3s_ease-out]">
      <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-[scale-in_0.3s_ease-out_0.2s_both]" />
    </div>
  );
}

export function ReservationBookingPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [searchParams] = useSearchParams();

  // Embed mode settings from URL params
  const isEmbedMode = searchParams.get('embed') === 'true';
  const embedTheme = searchParams.get('theme') || 'light';
  const embedAccentColor = searchParams.get('accent') || '#1e293b';

  // Dynamic styles for embed mode
  const embedStyles = useMemo(() => {
    if (!isEmbedMode) return {};
    return {
      '--embed-accent': embedAccentColor,
      '--embed-bg': embedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
      '--embed-text': embedTheme === 'dark' ? '#ffffff' : '#1e293b',
      '--embed-muted': embedTheme === 'dark' ? '#a1a1aa' : '#64748b',
      '--embed-border': embedTheme === 'dark' ? '#27272a' : '#e2e8f0',
      '--embed-card': embedTheme === 'dark' ? '#27272a' : '#f8fafc',
    } as React.CSSProperties;
  }, [isEmbedMode, embedTheme, embedAccentColor]);

  // Send message to parent window (for widget communication)
  const sendMessageToParent = useCallback((action: string, data?: Record<string, unknown>) => {
    if (isEmbedMode && window.parent !== window) {
      window.parent.postMessage({
        type: 'kitchensync-reservation',
        action,
        ...data,
      }, '*');
    }
  }, [isEmbedMode]);

  // Form state
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [partySize, setPartySize] = useState<number>(2);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [occasion, setOccasion] = useState('none');
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationResponse | null>(null);

  // Fetch business profile
  const {
    data: business,
    isLoading: isLoadingBusiness,
    error: businessError,
  } = useQuery({
    queryKey: ['business', businessSlug],
    queryFn: async () => {
      if (!businessSlug) throw new Error('No business slug provided');
      const data = await api.get<PublicBusinessProfile>(`/api/business/slug/${businessSlug}`);
      return data;
    },
    enabled: !!businessSlug,
  });

  // Fetch reservation settings
  const { data: settings } = useQuery({
    queryKey: ['reservationSettings', business?.id],
    queryFn: async () => {
      if (!business?.id) throw new Error('No business ID');
      const data = await api.get<ReservationSettingsResponse>(`/api/reservations/${business.id}/settings`);
      return data;
    },
    enabled: !!business?.id,
  });

  // Fetch available time slots
  const {
    data: availableSlots,
    isLoading: isLoadingSlots,
  } = useQuery({
    queryKey: ['availability', business?.id, selectedDate, partySize],
    queryFn: async () => {
      if (!business?.id || !selectedDate) throw new Error('Missing required data');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await api.get<AvailabilitySlot[]>(
        `/api/reservations/${business.id}/availability?date=${dateStr}&partySize=${partySize}`
      );
      return data;
    },
    enabled: !!business?.id && !!selectedDate,
  });

  // Create reservation mutation
  const createReservation = useMutation({
    mutationFn: async (data: CreateReservationRequest) => {
      if (!business?.id) throw new Error('No business ID');
      const response = await api.post<ReservationResponse>(`/api/reservations/${business.id}`, data);
      return response;
    },
    onSuccess: (data) => {
      setConfirmedReservation(data);
      setStep(3);
      // Notify parent window of successful reservation
      sendMessageToParent('success', { reservation: data });
    },
  });

  // Calculate date constraints
  const minDate = settings ? addDays(new Date(), Math.ceil(settings.minAdvanceHours / 24)) : new Date();
  const maxDate = settings ? addDays(new Date(), settings.bookingWindowDays) : addDays(new Date(), 30);
  const minParty = settings?.minPartySize || 1;
  const maxParty = settings?.maxPartySize || 12;

  // Reset time when date or party size changes
  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate, partySize]);

  // Filter available slots
  const availableTimeSlots = availableSlots?.filter(slot => slot.available) || [];

  // Check if date is disabled
  const isDateDisabled = useCallback(
    (date: Date) => {
      const dateToCheck = startOfDay(date);
      return isBefore(dateToCheck, startOfDay(minDate)) || isAfter(dateToCheck, startOfDay(maxDate));
    },
    [minDate, maxDate]
  );

  // Handle form submission
  const handleSubmit = () => {
    if (!selectedDate || !selectedTime || !guestName || !guestEmail) return;

    const reservationData: CreateReservationRequest = {
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: guestPhone || undefined,
      reservationDate: format(selectedDate, 'yyyy-MM-dd'),
      reservationTime: selectedTime,
      partySize,
      specialRequests: specialRequests || undefined,
      occasion: occasion !== 'none' ? occasion : undefined,
      source: 'website',
    };

    createReservation.mutate(reservationData);
  };

  // Handle reset for another reservation
  const handleReset = () => {
    setStep(0);
    setSelectedDate(undefined);
    setSelectedTime('');
    setPartySize(2);
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setSpecialRequests('');
    setOccasion('none');
    setConfirmedReservation(null);
  };

  // Loading state
  if (isLoadingBusiness) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center",
          isEmbedMode ? "" : "bg-gradient-to-b from-slate-50 to-white"
        )}
        style={isEmbedMode ? { background: embedTheme === 'dark' ? '#1a1a1a' : '#ffffff' } : undefined}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          <p className="text-slate-600">Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (businessError || !business) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center p-4",
          isEmbedMode ? "" : "bg-gradient-to-b from-slate-50 to-white"
        )}
        style={isEmbedMode ? { background: embedTheme === 'dark' ? '#1a1a1a' : '#ffffff' } : undefined}
      >
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Restaurant Not Found</h2>
            <p className="text-slate-600">
              We could not find the restaurant you are looking for. Please check the URL and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format address
  const addressParts = [business.addressLine1, business.city, business.state].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

  return (
    <div
      className={cn(
        "min-h-screen",
        isEmbedMode ? "" : "bg-gradient-to-b from-slate-50 to-white"
      )}
      style={isEmbedMode ? { ...embedStyles, background: embedTheme === 'dark' ? '#1a1a1a' : '#ffffff' } : undefined}
    >
      {/* Custom animation styles */}
      <style>{`
        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide-in {
          animation: fade-slide-in 0.3s ease-out forwards;
        }
      `}</style>

      {/* Hero Header - hidden in embed mode */}
      {!isEmbedMode && (
        <div
          className="relative h-64 md:h-80 bg-cover bg-center"
          style={{
            backgroundImage: business.coverImageUrl
              ? `url(${business.coverImageUrl})`
              : 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                {business.logoUrl ? (
                  <img
                    src={business.logoUrl}
                    alt={business.businessName}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border-2 border-white/20 shadow-lg"
                  />
                ) : null}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className="bg-white/10 text-white/90 border-white/20 backdrop-blur-sm"
                    >
                      {BUSINESS_TYPE_LABELS[business.businessType] || business.businessType}
                    </Badge>
                    {business.isVerified && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 backdrop-blur-sm"
                      >
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
                    {business.businessName}
                  </h1>
                  {business.description && (
                    <p className="text-white/80 text-sm md:text-base line-clamp-2">
                      {business.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-white/70 text-sm">
                    {fullAddress && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{fullAddress}</span>
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        <span>{business.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header for Embed Mode */}
      {isEmbedMode && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.businessName}
                className="w-10 h-10 rounded-lg object-cover"
              />
            )}
            <div>
              <h2 className="font-semibold" style={{ color: embedTheme === 'dark' ? '#fff' : '#1e293b' }}>
                {business.businessName}
              </h2>
              <p className="text-xs" style={{ color: embedTheme === 'dark' ? '#a1a1aa' : '#64748b' }}>
                {BUSINESS_TYPE_LABELS[business.businessType] || business.businessType}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={cn(
        "max-w-2xl mx-auto px-4",
        isEmbedMode ? "py-4" : "py-8 md:py-12"
      )}>
        {/* Confirmation View */}
        {step === 3 && confirmedReservation ? (
          <div className="animate-fade-slide-in">
            <Card className="border-0 shadow-xl">
              <CardContent className="p-8 md:p-12 text-center">
                <SuccessAnimation />
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  Reservation Confirmed!
                </h2>
                <p className="text-slate-600 mb-8">
                  Your table at {business.businessName} has been booked.
                </p>

                {/* Reservation Summary */}
                <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left">
                  <h3 className="font-semibold text-slate-900 mb-4">Reservation Details</h3>
                  <div className="grid gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Date</p>
                        <p className="font-medium text-slate-900">
                          {format(parseISO(confirmedReservation.reservationDate), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Time</p>
                        <p className="font-medium text-slate-900">
                          {formatTime(confirmedReservation.reservationTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <Users className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Party Size</p>
                        <p className="font-medium text-slate-900">
                          {confirmedReservation.partySize} {confirmedReservation.partySize === 1 ? 'guest' : 'guests'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Name</p>
                        <p className="font-medium text-slate-900">{confirmedReservation.customerName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                  A confirmation email has been sent to {confirmedReservation.customerEmail}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      // Create calendar event URL (Google Calendar)
                      const startDate = parseISO(confirmedReservation.reservationDate);
                      const [hours, minutes] = confirmedReservation.reservationTime.split(':');
                      startDate.setHours(parseInt(hours), parseInt(minutes));
                      const endDate = new Date(startDate.getTime() + confirmedReservation.durationMinutes * 60000);

                      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Reservation at ${business.businessName}`)}&dates=${format(startDate, "yyyyMMdd'T'HHmmss")}/${format(endDate, "yyyyMMdd'T'HHmmss")}&details=${encodeURIComponent(`Party size: ${confirmedReservation.partySize}`)}&location=${encodeURIComponent(fullAddress || business.businessName)}`;
                      window.open(calendarUrl, '_blank');
                    }}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Add to Calendar
                  </Button>
                  <Button onClick={handleReset}>
                    Make Another Reservation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Booking Form */
          <div className="animate-fade-slide-in">
            <Card className="border-0 shadow-xl">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 text-center mb-2">
                  Reserve a Table
                </h2>
                <p className="text-slate-600 text-center mb-6">
                  Book your dining experience at {business.businessName}
                </p>

                <StepIndicator currentStep={step} />

                {/* Step 1: Date, Time & Party Size */}
                {step === 0 && (
                  <div className="space-y-6 animate-fade-slide-in">
                    {/* Party Size */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Party Size
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: maxParty - minParty + 1 }, (_, i) => minParty + i).map(
                          (size) => (
                            <Button
                              key={size}
                              type="button"
                              variant={partySize === size ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setPartySize(size)}
                              className={cn(
                                'min-w-[48px] transition-all',
                                partySize === size
                                  ? 'bg-slate-900 hover:bg-slate-800'
                                  : 'hover:bg-slate-100'
                              )}
                            >
                              {size}
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Select Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal h-12',
                              !selectedDate && 'text-slate-500'
                            )}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {selectedDate
                              ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                              : 'Choose a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={isDateDisabled}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time Selection */}
                    {selectedDate && (
                      <div className="space-y-2 animate-fade-slide-in">
                        <Label className="text-slate-700 font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Select Time
                        </Label>
                        {isLoadingSlots ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                          </div>
                        ) : availableTimeSlots.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-lg">
                            <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-slate-600 font-medium">No availability</p>
                            <p className="text-sm text-slate-500">
                              Please select a different date or party size
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {availableTimeSlots.map((slot) => (
                              <Button
                                key={slot.time}
                                type="button"
                                variant={selectedTime === slot.time ? 'default' : 'outline'}
                                onClick={() => setSelectedTime(slot.time)}
                                className={cn(
                                  'h-11 transition-all',
                                  selectedTime === slot.time
                                    ? 'bg-slate-900 hover:bg-slate-800'
                                    : 'hover:bg-slate-100'
                                )}
                              >
                                {formatTime(slot.time)}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800"
                      onClick={() => setStep(1)}
                      disabled={!selectedDate || !selectedTime}
                    >
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Step 2: Guest Information */}
                {step === 1 && (
                  <div className="space-y-6 animate-fade-slide-in">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700 font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-700 font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone <span className="text-slate-400">(optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="occasion" className="text-slate-700 font-medium flex items-center gap-2">
                        <PartyPopper className="h-4 w-4" />
                        Occasion
                      </Label>
                      <Select value={occasion} onValueChange={setOccasion}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select an occasion (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {OCCASIONS.map((occ) => (
                            <SelectItem key={occ.value} value={occ.value}>
                              {occ.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="requests" className="text-slate-700 font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Special Requests <span className="text-slate-400">(optional)</span>
                      </Label>
                      <Textarea
                        id="requests"
                        placeholder="Dietary restrictions, accessibility needs, or other requests..."
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => setStep(0)}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        className="flex-1 h-12 bg-slate-900 hover:bg-slate-800"
                        onClick={() => setStep(2)}
                        disabled={!guestName || !guestEmail}
                      >
                        Review
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Review & Confirm */}
                {step === 2 && (
                  <div className="space-y-6 animate-fade-slide-in">
                    <div className="bg-slate-50 rounded-xl p-6">
                      <h3 className="font-semibold text-slate-900 mb-4">Review Your Reservation</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-slate-600">Date</span>
                          <span className="font-medium text-slate-900">
                            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-slate-600">Time</span>
                          <span className="font-medium text-slate-900">
                            {selectedTime && formatTime(selectedTime)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-slate-600">Party Size</span>
                          <span className="font-medium text-slate-900">
                            {partySize} {partySize === 1 ? 'guest' : 'guests'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-slate-600">Name</span>
                          <span className="font-medium text-slate-900">{guestName}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-slate-600">Email</span>
                          <span className="font-medium text-slate-900">{guestEmail}</span>
                        </div>
                        {guestPhone && (
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600">Phone</span>
                            <span className="font-medium text-slate-900">{guestPhone}</span>
                          </div>
                        )}
                        {occasion !== 'none' && (
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600">Occasion</span>
                            <span className="font-medium text-slate-900">
                              {OCCASIONS.find((o) => o.value === occasion)?.label}
                            </span>
                          </div>
                        )}
                        {specialRequests && (
                          <div className="py-2">
                            <span className="text-slate-600 block mb-1">Special Requests</span>
                            <span className="text-slate-900 text-sm">{specialRequests}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {createReservation.error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Unable to complete reservation</p>
                          <p className="text-sm text-red-600">
                            {createReservation.error instanceof Error
                              ? createReservation.error.message
                              : 'Please try again or contact the restaurant directly.'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => setStep(1)}
                        disabled={createReservation.isPending}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        className="flex-1 h-12 bg-slate-900 hover:bg-slate-800"
                        onClick={handleSubmit}
                        disabled={createReservation.isPending}
                      >
                        {createReservation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Booking...
                          </>
                        ) : (
                          'Complete Reservation'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer - hidden in embed mode (widget has its own) */}
        {!isEmbedMode && (
          <p className="text-center text-slate-500 text-sm mt-8">
            Powered by KitchenSync
          </p>
        )}
      </div>
    </div>
  );
}

export default ReservationBookingPage;
