import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  ShoppingBag,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { business } = useBusiness();

  // Mock stats for demo
  const stats = {
    todayReservations: 12,
    pendingOrders: 5,
    todayRevenue: 1847.50,
    newCustomers: 8,
  };

  const upcomingReservations = [
    { id: 1, name: 'John Smith', time: '6:00 PM', guests: 4, status: 'confirmed' },
    { id: 2, name: 'Emily Davis', time: '6:30 PM', guests: 2, status: 'confirmed' },
    { id: 3, name: 'Michael Johnson', time: '7:00 PM', guests: 6, status: 'pending' },
    { id: 4, name: 'Sarah Wilson', time: '7:30 PM', guests: 3, status: 'confirmed' },
  ];

  const recentOrders = [
    { id: 'ORD-001', type: 'Dine-in', table: 'Table 5', total: 84.50, status: 'preparing' },
    { id: 'ORD-002', type: 'Takeout', table: null, total: 42.00, status: 'ready' },
    { id: 'ORD-003', type: 'Delivery', table: null, total: 67.25, status: 'out_for_delivery' },
  ];

  const statCards = [
    {
      title: "Today's Reservations",
      value: stats.todayReservations,
      icon: CalendarDays,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      change: '+3 from yesterday',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: ShoppingBag,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: '2 need attention',
    },
    {
      title: "Today's Revenue",
      value: `$${stats.todayRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      change: '+12% from last week',
    },
    {
      title: 'New Customers',
      value: stats.newCustomers,
      icon: Users,
      color: 'text-violet-400',
      bgColor: 'bg-violet-400/10',
      change: 'This week',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {business?.name || 'Business Owner'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening at your business today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/reservations">
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Link>
          </Button>
          <Button asChild>
            <Link to="/orders">
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
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
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
              <Link to="/reservations" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {reservation.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{reservation.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{reservation.time}</span>
                        <span>-</span>
                        <Users className="h-3 w-3" />
                        <span>{reservation.guests} guests</span>
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
              <Link to="/orders" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.type} {order.table ? `- ${order.table}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${order.total.toFixed(2)}</p>
                    <Badge
                      variant="secondary"
                      className={
                        order.status === 'ready'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : order.status === 'preparing'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-blue-500/10 text-blue-400'
                      }
                    >
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
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
              <Link to="/reservations">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span>Manage Reservations</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/menu">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
                <span>Update Menu</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/customers">
                <Users className="h-5 w-5 text-blue-400" />
                <span>View Customers</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <Link to="/settings">
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
