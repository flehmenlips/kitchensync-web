import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarDays,
  ShoppingBag,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  AlertCircle,
  Building2,
  CalendarX,
  Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AnalyticsDashboard,
  ReservationResponse,
  OrderResponse,
} from '../../../../backend/src/types';

// Helper function to format business type for display
function formatBusinessType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to format time nicely (e.g., "14:30" -> "2:30 PM")
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Helper to format order type
function formatOrderType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function DashboardPage() {
  const { business, isLoading, error, signOut } = useBusiness();

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Fetch dashboard analytics data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard', business?.id],
    queryFn: () => api.get<AnalyticsDashboard>(`/api/analytics/${business!.id}/dashboard`),
    enabled: !!business?.id,
  });

  // Fetch today's reservations
  const { data: reservationsData, isLoading: isReservationsLoading } = useQuery({
    queryKey: ['reservations', business?.id, today],
    queryFn: () => api.get<ReservationResponse[]>(`/api/reservations/${business!.id}?date=${today}`),
    enabled: !!business?.id,
  });

  // Fetch recent orders (limit 5)
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders', business?.id, 'recent'],
    queryFn: () => api.get<OrderResponse[]>(`/api/orders/${business!.id}?limit=5`),
    enabled: !!business?.id,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your business...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Failed to load business</h2>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state - no business found
  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">No business found</h2>
          <p className="text-muted-foreground mt-1">
            You don't have any businesses yet. Create one to get started.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/business/register">Create Business</Link>
          </Button>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // Filter upcoming reservations (pending or confirmed status)
  const upcomingReservations = (reservationsData || [])
    .filter((r) => r.status === 'pending' || r.status === 'confirmed')
    .slice(0, 4);

  // Get recent orders
  const recentOrders = ordersData || [];

  // Calculate stats from dashboard data
  const stats = {
    todayReservations: dashboardData?.reservations?.today ?? 0,
    pendingOrders: dashboardData?.orders?.byStatus?.pending ?? 0,
    todayRevenue: dashboardData?.revenue?.today ?? 0,
    newCustomers: dashboardData?.customers?.newThisMonth ?? 0,
  };

  const statCards = [
    {
      title: "Today's Reservations",
      value: isDashboardLoading ? null : stats.todayReservations,
      icon: CalendarDays,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      change: `${dashboardData?.reservations?.upcoming ?? 0} upcoming`,
    },
    {
      title: 'Pending Orders',
      value: isDashboardLoading ? null : stats.pendingOrders,
      icon: ShoppingBag,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: `${dashboardData?.orders?.today ?? 0} orders today`,
    },
    {
      title: "Today's Revenue",
      value: isDashboardLoading ? null : `$${stats.todayRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      change: `$${(dashboardData?.revenue?.thisWeek ?? 0).toLocaleString()} this week`,
    },
    {
      title: 'New Customers',
      value: isDashboardLoading ? null : stats.newCustomers,
      icon: Users,
      color: 'text-violet-400',
      bgColor: 'bg-violet-400/10',
      change: `${dashboardData?.customers?.total ?? 0} total`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Welcome back, {business.name}
            </h1>
            <Badge variant="secondary" className="capitalize">
              {formatBusinessType(business.type)}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Here's what's happening at your business today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/business/reservations">
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Link>
          </Button>
          <Button asChild>
            <Link to="/business/orders">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  {stat.value === null ? (
                    <Skeleton className="h-9 w-16 mb-1" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span>{stat.change}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Reservations */}
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Upcoming Reservations
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/business/reservations" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isReservationsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : upcomingReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarX className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No upcoming reservations today</p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/business/reservations">View all reservations</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {reservation.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{reservation.customerName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(reservation.reservationTime)}</span>
                          <span>-</span>
                          <Users className="h-3 w-3" />
                          <span>{reservation.partySize} guests</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={reservation.status === 'confirmed' ? 'default' : 'secondary'}
                      className={reservation.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                    >
                      {reservation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Recent Orders
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/business/orders" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isOrdersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No recent orders</p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/business/orders">View all orders</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatOrderType(order.orderType)} {order.table ? `- ${order.table.tableNumber}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">${order.totalAmount.toFixed(2)}</p>
                      <Badge
                        variant="secondary"
                        className={
                          order.status === 'ready'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : order.status === 'preparing'
                            ? 'bg-primary/10 text-primary'
                            : order.status === 'completed'
                            ? 'bg-blue-500/10 text-blue-400'
                            : ''
                        }
                      >
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/business/reservations">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span>Manage Reservations</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/business/menu">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
                <span>Update Menu</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/business/customers">
                <Users className="h-5 w-5 text-blue-400" />
                <span>View Customers</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/business/analytics">
                <TrendingUp className="h-5 w-5 text-violet-400" />
                <span>View Analytics</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
