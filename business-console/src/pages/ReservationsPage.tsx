import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Clock,
  Users,
  Phone,
  MoreHorizontal,
} from 'lucide-react';

export function ReservationsPage() {
  // Mock reservations for demo
  const reservations = [
    {
      id: 1,
      name: 'John Smith',
      phone: '(555) 123-4567',
      email: 'john@email.com',
      date: '2024-02-08',
      time: '6:00 PM',
      guests: 4,
      table: 'Table 5',
      status: 'confirmed',
      notes: 'Anniversary dinner',
    },
    {
      id: 2,
      name: 'Emily Davis',
      phone: '(555) 234-5678',
      email: 'emily@email.com',
      date: '2024-02-08',
      time: '6:30 PM',
      guests: 2,
      table: 'Table 3',
      status: 'confirmed',
      notes: '',
    },
    {
      id: 3,
      name: 'Michael Johnson',
      phone: '(555) 345-6789',
      email: 'michael@email.com',
      date: '2024-02-08',
      time: '7:00 PM',
      guests: 6,
      table: 'Table 8',
      status: 'pending',
      notes: 'Birthday party - need cake service',
    },
    {
      id: 4,
      name: 'Sarah Wilson',
      phone: '(555) 456-7890',
      email: 'sarah@email.com',
      date: '2024-02-08',
      time: '7:30 PM',
      guests: 3,
      table: 'Table 2',
      status: 'confirmed',
      notes: 'Vegetarian options needed',
    },
    {
      id: 5,
      name: 'Robert Brown',
      phone: '(555) 567-8901',
      email: 'robert@email.com',
      date: '2024-02-08',
      time: '8:00 PM',
      guests: 2,
      table: 'Bar',
      status: 'waitlisted',
      notes: '',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'waitlisted':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return '';
    }
  };

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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        <Button variant="outline">
          <CalendarDays className="h-4 w-4 mr-2" />
          Today
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-sm text-muted-foreground">Today's Reservations</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">8</p>
            <p className="text-sm text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">3</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">45</p>
            <p className="text-sm text-muted-foreground">Total Guests</p>
          </CardContent>
        </Card>
      </div>

      {/* Reservations List */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
          <CardDescription>February 8, 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {reservation.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{reservation.name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {reservation.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {reservation.guests} guests
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {reservation.phone}
                      </span>
                    </div>
                    {reservation.notes ? (
                      <p className="text-xs text-muted-foreground/80 italic">
                        Note: {reservation.notes}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-16 md:ml-0">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{reservation.table}</p>
                    <Badge className={getStatusColor(reservation.status)}>
                      {reservation.status}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
