import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Clock,
  DollarSign,
  MoreHorizontal,
  Utensils,
  Package,
  Truck,
} from 'lucide-react';

export function OrdersPage() {
  // Mock orders for demo
  const orders = [
    {
      id: 'ORD-001',
      customer: 'Table 5',
      type: 'dine_in',
      items: 4,
      total: 84.50,
      status: 'preparing',
      time: '12 mins ago',
      server: 'Alex',
    },
    {
      id: 'ORD-002',
      customer: 'John D.',
      type: 'takeout',
      items: 2,
      total: 42.00,
      status: 'ready',
      time: '8 mins ago',
      server: null,
    },
    {
      id: 'ORD-003',
      customer: 'Sarah W.',
      type: 'delivery',
      items: 3,
      total: 67.25,
      status: 'out_for_delivery',
      time: '25 mins ago',
      server: null,
    },
    {
      id: 'ORD-004',
      customer: 'Table 2',
      type: 'dine_in',
      items: 6,
      total: 156.00,
      status: 'served',
      time: '45 mins ago',
      server: 'Maria',
    },
    {
      id: 'ORD-005',
      customer: 'Mike R.',
      type: 'takeout',
      items: 1,
      total: 18.50,
      status: 'pending',
      time: '2 mins ago',
      server: null,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'preparing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ready':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'out_for_delivery':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'served':
        return 'bg-muted text-muted-foreground';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dine_in':
        return Utensils;
      case 'takeout':
        return Package;
      case 'delivery':
        return Truck;
      default:
        return ShoppingBag;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all incoming orders
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="default" size="sm">All Orders</Button>
        <Button variant="outline" size="sm">
          <Utensils className="h-4 w-4 mr-1" />
          Dine-in
        </Button>
        <Button variant="outline" size="sm">
          <Package className="h-4 w-4 mr-1" />
          Takeout
        </Button>
        <Button variant="outline" size="sm">
          <Truck className="h-4 w-4 mr-1" />
          Delivery
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">23</p>
            <p className="text-sm text-muted-foreground">Today's Orders</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">5</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-400">3</p>
            <p className="text-sm text-muted-foreground">Preparing</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">$1,847</p>
            <p className="text-sm text-muted-foreground">Today's Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Active Orders</CardTitle>
          <CardDescription>Orders that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.map((order) => {
              const TypeIcon = getTypeIcon(order.type);
              return (
                <div
                  key={order.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{order.id}</p>
                        <Badge variant="outline" className="text-xs">
                          {order.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customer} - {order.items} items
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{order.time}</span>
                        {order.server ? (
                          <>
                            <span>-</span>
                            <span>Server: {order.server}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-16 md:ml-0">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {order.total.toFixed(2)}
                      </p>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
