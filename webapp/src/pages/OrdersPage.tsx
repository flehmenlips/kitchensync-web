import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/types/database';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Search,
  Receipt,
  Eye,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  User,
  MapPin,
  Calendar,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { format, subDays, isAfter, startOfDay, endOfDay, isToday, startOfMonth } from 'date-fns';

// Status configuration
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: Clock },
  paid: { label: 'Paid', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: DollarSign },
  shipped: { label: 'Shipped', color: 'bg-purple-400/10 text-purple-400 border-purple-400/20', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: XCircle },
};

const ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

type SortOption = 'newest' | 'oldest' | 'total_high' | 'total_low';
type DateRange = '7' | '30' | '90' | 'all';

const ITEMS_PER_PAGE = 10;

export function OrdersPage() {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');

  // Fetch orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet
        console.warn('orders table not found:', error.message);
        return [] as Order[];
      }

      return (data ?? []) as Order[];
    },
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, status }: { order: Order; status: OrderStatus }) => {
      const now = new Date().toISOString();
      const newStatusHistory = [
        ...(order.status_history || []),
        { status, timestamp: now },
      ];

      const { error } = await supabase
        .from('orders')
        .update({
          status,
          status_history: newStatusHistory,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;
      return { order, status };
    },
    onSuccess: async ({ order, status }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      await logActivity(
        'update_order_status',
        'order',
        order.id,
        order.order_number,
        { old_status: order.status, new_status: status }
      );
      toast.success(`Order status updated to ${STATUS_CONFIG[status].label}`);
      setNewStatus('');
      // Update selected order if detail dialog is open
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({
          ...order,
          status,
          status_history: [...(order.status_history || []), { status, timestamp: new Date().toISOString() }],
        });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  // Get unique creators for filter
  const uniqueCreators = useMemo(() => {
    if (!orders) return [];
    const creatorMap = new Map<string, { id: string; name: string }>();
    orders.forEach((order) => {
      if (!creatorMap.has(order.creator_id)) {
        creatorMap.set(order.creator_id, {
          id: order.creator_id,
          name: order.creator_name ?? 'Unknown Creator',
        });
      }
    });
    return Array.from(creatorMap.values());
  }, [orders]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    const filtered = orders.filter((order) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        order.order_number.toLowerCase().includes(searchLower) ||
        (order.customer_name?.toLowerCase().includes(searchLower) ?? false) ||
        (order.customer_email?.toLowerCase().includes(searchLower) ?? false);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesCreator = creatorFilter === 'all' || order.creator_id === creatorFilter;

      // Date range filter
      let matchesDate = true;
      if (dateRange !== 'all') {
        const daysAgo = parseInt(dateRange);
        const cutoffDate = subDays(new Date(), daysAgo);
        matchesDate = isAfter(new Date(order.created_at), cutoffDate);
      }

      return matchesSearch && matchesStatus && matchesCreator && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'total_high':
          return b.total_cents - a.total_cents;
        case 'total_low':
          return a.total_cents - b.total_cents;
        default:
          return 0;
      }
    });

    return filtered;
  }, [orders, searchQuery, statusFilter, creatorFilter, dateRange, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalOrders = orders?.length ?? 0;
  const pendingOrders = orders?.filter((o) => o.status === 'pending').length ?? 0;

  const revenueToday = useMemo(() => {
    if (!orders) return 0;
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    return orders
      .filter((o) => {
        const orderDate = new Date(o.created_at);
        return orderDate >= todayStart && orderDate <= todayEnd && o.status !== 'cancelled';
      })
      .reduce((sum, o) => sum + o.total_cents, 0);
  }, [orders]);

  const revenueMonth = useMemo(() => {
    if (!orders) return 0;
    const monthStart = startOfMonth(new Date());
    return orders
      .filter((o) => {
        const orderDate = new Date(o.created_at);
        return orderDate >= monthStart && o.status !== 'cancelled';
      })
      .reduce((sum, o) => sum + o.total_cents, 0);
  }, [orders]);

  // Handlers
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  const openDetailDialog = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus('');
    setIsDetailOpen(true);
  };

  const handleStatusUpdate = () => {
    if (!selectedOrder || !newStatus) return;
    updateStatusMutation.mutate({ order: selectedOrder, status: newStatus });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground mt-1">
          Manage marketplace orders and track fulfillment
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingOrders}</p>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatPrice(revenueToday)}</p>
              <p className="text-sm text-muted-foreground">Revenue Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatPrice(revenueMonth)}</p>
              <p className="text-sm text-muted-foreground">Revenue This Month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>

            {/* Filter dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value: OrderStatus | 'all') =>
                  handleFilterChange(setStatusFilter, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_CONFIG[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Range Filter */}
              <Select
                value={dateRange}
                onValueChange={(value: DateRange) =>
                  handleFilterChange(setDateRange, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              {/* Creator Filter */}
              <Select
                value={creatorFilter}
                onValueChange={(value) => handleFilterChange(setCreatorFilter, value)}
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <SelectValue placeholder="All Creators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  {uniqueCreators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => handleFilterChange(setSortBy, value)}
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="total_high">Total: High to Low</SelectItem>
                  <SelectItem value="total_low">Total: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : paginatedOrders.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Order #</TableHead>
                      <TableHead className="text-muted-foreground">Customer</TableHead>
                      <TableHead className="text-muted-foreground hidden md:table-cell">Creator</TableHead>
                      <TableHead className="text-muted-foreground hidden lg:table-cell">Items</TableHead>
                      <TableHead className="text-muted-foreground">Total</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground hidden md:table-cell">Date</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((order) => {
                      const statusConfig = STATUS_CONFIG[order.status];
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={order.id} className="border-border/50">
                          <TableCell>
                            <span className="font-mono font-medium text-foreground">
                              {order.order_number}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[150px]">
                                {order.customer_name ?? 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {order.customer_email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-foreground truncate max-w-[120px]">
                              {order.creator_name ?? 'Unknown'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">
                                {order.items?.length ?? 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-foreground">
                              {formatPrice(order.total_cents)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {formatOrderDate(order.created_at)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDetailDialog(order)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 ? (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of{' '}
                    {filteredOrders.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No orders found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || creatorFilter !== 'all' || dateRange !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No orders have been placed yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              {selectedOrder ? `Order ${selectedOrder.order_number}` : 'View order information'}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-4">
              {/* Order Number and Status */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-semibold text-foreground">
                  {selectedOrder.order_number}
                </span>
                <Badge variant="outline" className={STATUS_CONFIG[selectedOrder.status].color}>
                  {(() => {
                    const StatusIcon = STATUS_CONFIG[selectedOrder.status].icon;
                    return <StatusIcon className="h-3 w-3 mr-1" />;
                  })()}
                  {STATUS_CONFIG[selectedOrder.status].label}
                </Badge>
              </div>

              {/* Customer Info */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Customer</p>
                </div>
                <p className="font-medium text-foreground">{selectedOrder.customer_name ?? 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customer_email}</p>
                <Link
                  to={`/users?search=${encodeURIComponent(selectedOrder.customer_email ?? '')}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  View Customer Profile
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Creator Info */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">Creator</p>
                <p className="font-medium text-foreground">{selectedOrder.creator_name ?? 'Unknown'}</p>
              </div>

              {/* Order Items */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase">Order Items</p>
                <div className="space-y-3">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, index) => (
                      <div key={item.id || index} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.product_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity} x {formatPrice(item.price_cents)}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {formatPrice(item.quantity * item.price_cents)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No items</p>
                  )}
                </div>
              </div>

              {/* Order Totals */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase">Order Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatPrice(selectedOrder.subtotal_cents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground">{formatPrice(selectedOrder.shipping_cents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground">{formatPrice(selectedOrder.tax_cents)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{formatPrice(selectedOrder.total_cents)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Shipping Address</p>
                  </div>
                  <div className="text-sm text-foreground">
                    <p>{selectedOrder.shipping_address.name}</p>
                    <p>{selectedOrder.shipping_address.line1}</p>
                    {selectedOrder.shipping_address.line2 ? (
                      <p>{selectedOrder.shipping_address.line2}</p>
                    ) : null}
                    <p>
                      {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}{' '}
                      {selectedOrder.shipping_address.postal_code}
                    </p>
                    <p>{selectedOrder.shipping_address.country}</p>
                  </div>
                </div>
              ) : null}

              {/* Status Timeline */}
              {selectedOrder.status_history && selectedOrder.status_history.length > 0 ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase">Status History</p>
                  <div className="space-y-3">
                    {selectedOrder.status_history.map((entry, index) => {
                      const config = STATUS_CONFIG[entry.status];
                      const Icon = config?.icon ?? Clock;
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${config?.color ?? 'bg-secondary'}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {config?.label ?? entry.status}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                            </p>
                            {entry.note ? (
                              <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Order Date */}
              <p className="text-xs text-muted-foreground">
                Order placed: {format(new Date(selectedOrder.created_at), 'MMM d, yyyy h:mm a')}
              </p>

              {/* Update Status */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm font-medium text-foreground mb-3">Update Status</p>
                <div className="flex gap-2">
                  <Select
                    value={newStatus}
                    onValueChange={(value: OrderStatus) => setNewStatus(value)}
                  >
                    <SelectTrigger className="flex-1 bg-secondary/50">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.filter((s) => s !== selectedOrder.status).map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_CONFIG[status].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Update'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
