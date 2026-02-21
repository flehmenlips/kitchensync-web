import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Clock,
  Utensils,
  Star,
  UserX,
  Loader2,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useBusiness } from '@/contexts/BusinessContext';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

// Types for analytics data
interface AnalyticsDashboard {
  // Key metrics
  todayRevenue: number;
  todayOrders: number;
  newCustomers: number;
  averageOrderValue: number;
  // Comparison with previous period
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  aovChange: number;
  // Revenue trend (last 7 days)
  revenueTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  // Orders by status
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  // Orders by hour (peak hours)
  ordersByHour: Array<{
    hour: number;
    count: number;
  }>;
  // Popular menu items
  popularItems: Array<{
    id: string;
    name: string;
    category: string;
    orderCount: number;
    revenue: number;
  }>;
  // Top spending customers
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    visitCount: number;
    lastVisit: string;
  }>;
  // Reservation stats
  reservationStats: {
    upcomingCount: number;
    todayCount: number;
    noShowRate: number;
    averagePartySize: number;
  };
}

// Chart colors
const COLORS = {
  primary: '#f97316', // Orange
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6',
  violet: '#8b5cf6',
  muted: '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  confirmed: COLORS.info,
  preparing: COLORS.violet,
  ready: COLORS.success,
  completed: COLORS.muted,
  cancelled: COLORS.danger,
};

export function BusinessAnalyticsPage() {
  const { business } = useBusiness();
  const businessId = business?.id;
  const [dateRange, setDateRange] = useState('7d');

  // Fetch analytics data
  const { data: analytics, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['business-analytics', businessId, dateRange],
    queryFn: async (): Promise<AnalyticsDashboard> => {
      if (!businessId) {
        throw new Error('No business selected');
      }

      return api.get<AnalyticsDashboard>(
        `/api/analytics/${businessId}/dashboard?range=${dateRange}`
      );
    },
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Business performance insights</p>
        </div>
        <Card className="bg-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <BarChart3 className="h-16 w-16 text-muted-foreground/40" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">No analytics data yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Analytics data will appear here once your business starts receiving orders and reservations.
                Check back after your first day of activity.
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your business performance and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Revenue"
          value={formatCurrency(analytics.todayRevenue)}
          change={analytics.revenueChange}
          icon={DollarSign}
          iconBgColor="bg-emerald-500/10"
          iconColor="text-emerald-500"
        />
        <MetricCard
          title="Today's Orders"
          value={analytics.todayOrders.toString()}
          change={analytics.ordersChange}
          icon={ShoppingBag}
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />
        <MetricCard
          title="New Customers"
          value={analytics.newCustomers.toString()}
          change={analytics.customersChange}
          icon={Users}
          iconBgColor="bg-blue-500/10"
          iconColor="text-blue-500"
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(analytics.averageOrderValue)}
          change={analytics.aovChange}
          icon={TrendingUp}
          iconBgColor="bg-violet-500/10"
          iconColor="text-violet-500"
        />
      </div>

      {/* Revenue Trend Chart */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue Trend
          </CardTitle>
          <CardDescription>Daily revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Orders by Status
            </CardTitle>
            <CardDescription>Distribution of today's orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                    labelLine={false}
                  >
                    {analytics.ordersByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || COLORS.muted}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm capitalize text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Hour */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Peak Hours
            </CardTitle>
            <CardDescription>Order volume by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.ordersByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="hour"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Orders']}
                    labelFormatter={(hour) => `${hour}:00 - ${hour}:59`}
                  />
                  <Bar
                    dataKey="count"
                    fill={COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular Menu Items */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Popular Menu Items
            </CardTitle>
            <CardDescription>Top 5 selling items this period</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.popularItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{item.orderCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Spending Customers */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Top Customers
            </CardTitle>
            <CardDescription>Highest spending customers this period</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topCustomers.map((customer, index) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-semibold text-blue-500">
                          {customer.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Last visit: {format(new Date(customer.lastVisit), 'MMM d')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{customer.visitCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(customer.totalSpent)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Reservation Stats */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Reservation Statistics
          </CardTitle>
          <CardDescription>Overview of your reservation performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Today</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics.reservationStats.todayCount}</p>
              <p className="text-xs text-muted-foreground">reservations</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Upcoming</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics.reservationStats.upcomingCount}</p>
              <p className="text-xs text-muted-foreground">this week</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">No-Show Rate</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics.reservationStats.noShowRate}%</p>
              <p className="text-xs text-muted-foreground">last 30 days</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-violet-500" />
                <span className="text-sm text-muted-foreground">Avg Party Size</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics.reservationStats.averagePartySize}</p>
              <p className="text-xs text-muted-foreground">guests</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
}

function MetricCard({ title, value, change, icon: Icon, iconBgColor, iconColor }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className={`w-10 h-10 rounded-lg ${iconBgColor} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% vs yesterday</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
