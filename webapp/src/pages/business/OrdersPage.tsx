import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingBag,
  Plus,
  Search,
  Clock,
  DollarSign,
  MoreHorizontal,
  Utensils,
  Package,
  Truck,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChefHat,
  Eye,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useBusiness } from '@/contexts/BusinessContext';
import { format, formatDistanceToNow } from 'date-fns';

interface OrderItem {
  id: string;
  itemName: string;
  itemPrice: number;
  quantity: number;
  modifiers: string | null;
  modifiersTotal: number;
  totalPrice: number;
  specialRequests: string | null;
  status: string;
}

interface Order {
  id: string;
  businessId: string;
  orderNumber: string;
  orderType: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  tableId: string | null;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  status: string;
  source: string;
  specialInstructions: string | null;
  createdAt: string;
  items?: OrderItem[];
  table?: {
    id: string;
    tableNumber: string;
    section: string | null;
  } | null;
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export function BusinessOrdersPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', businessId, selectedType, selectedStatus],
    queryFn: async () => {
      if (!businessId) return { data: [], pagination: { total: 0 } };
      let url = `/api/orders/${businessId}?limit=50`;
      if (selectedType !== 'all') {
        url += `&orderType=${selectedType}`;
      }
      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }
      const result = await api.get<{ data: Order[]; pagination: { total: number } }>(url);
      return result;
    },
    enabled: !!businessId,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['order-stats', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const today = format(new Date(), 'yyyy-MM-dd');
      return api.get<OrderStats>(`/api/orders/${businessId}/stats/summary?date=${today}`);
    },
    enabled: !!businessId,
  });

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status, cancellationReason }: { orderId: string; status: string; cancellationReason?: string }) => {
      return api.put<Order>(`/api/orders/${businessId}/${orderId}/status`, { status, cancellationReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', businessId] });
      queryClient.invalidateQueries({ queryKey: ['order-stats', businessId] });
    },
  });

  // Update payment status mutation
  const updatePayment = useMutation({
    mutationFn: async ({ orderId, paymentStatus, paymentMethod }: { orderId: string; paymentStatus: string; paymentMethod?: string }) => {
      return api.put<Order>(`/api/orders/${businessId}/${orderId}`, { paymentStatus, paymentMethod });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', businessId] });
      queryClient.invalidateQueries({ queryKey: ['order-stats', businessId] });
    },
  });

  const orders = (ordersData as { data: Order[] })?.data || [];

  // Filter orders by search
  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.table?.tableNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'confirmed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'preparing':
        return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
      case 'ready':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return '';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'refunded':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
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

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'completed';
      default:
        return null;
    }
  };

  const getNextStatusLabel = (currentStatus: string): string => {
    const next = getNextStatus(currentStatus);
    switch (next) {
      case 'confirmed':
        return 'Confirm Order';
      case 'preparing':
        return 'Start Preparing';
      case 'ready':
        return 'Mark Ready';
      case 'completed':
        return 'Complete Order';
      default:
        return '';
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  if (isLoading) {
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
          <Input
            type="text"
            placeholder="Search by order #, customer, or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedType('all')}
        >
          All Orders
        </Button>
        <Button
          variant={selectedType === 'dine_in' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedType('dine_in')}
        >
          <Utensils className="h-4 w-4 mr-1" />
          Dine-in
        </Button>
        <Button
          variant={selectedType === 'takeout' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedType('takeout')}
        >
          <Package className="h-4 w-4 mr-1" />
          Takeout
        </Button>
        <Button
          variant={selectedType === 'delivery' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedType('delivery')}
        >
          <Truck className="h-4 w-4 mr-1" />
          Delivery
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{stats?.totalOrders || 0}</p>
            <p className="text-sm text-muted-foreground">Today's Orders</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">{stats?.pendingOrders || 0}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-violet-400">{stats?.preparingOrders || 0}</p>
            <p className="text-sm text-muted-foreground">Preparing</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">
              ${(stats?.totalRevenue || 0).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Today's Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">
              Orders will appear here as they come in.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      {filteredOrders.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedStatus === 'all' ? 'All Orders' : `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Orders`}
            </CardTitle>
            <CardDescription>{filteredOrders.length} orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const TypeIcon = getTypeIcon(order.orderType);
                const nextStatus = getNextStatus(order.status);

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{order.orderNumber}</p>
                          <Badge variant="outline" className="text-xs">
                            {order.orderType.replace('_', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customerName}
                          {order.table && ` - Table ${order.table.tableNumber}`}
                          {order.items && ` - ${order.items.length} items`}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</span>
                          <span className="text-muted-foreground/50">|</span>
                          <span>via {order.source}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-16 md:ml-0">
                      <div className="text-right mr-2">
                        <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {order.totalAmount.toFixed(2)}
                        </p>
                      </div>

                      {/* Quick Actions */}
                      {nextStatus && order.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ orderId: order.id, status: nextStatus })}
                          disabled={updateStatus.isPending}
                        >
                          {updateStatus.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            getNextStatusLabel(order.status)
                          )}
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openOrderDetails(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openOrderDetails(order)}>
                            <Receipt className="h-4 w-4 mr-2" />
                            Print Receipt
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {order.paymentStatus === 'pending' && (
                            <DropdownMenuItem
                              onClick={() => updatePayment.mutate({ orderId: order.id, paymentStatus: 'paid', paymentMethod: 'cash' })}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'completed' && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => updateStatus.mutate({ orderId: order.id, status: 'cancelled', cancellationReason: 'Cancelled by staff' })}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                  {selectedOrder.customerPhone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                  )}
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Type</Label>
                  <p className="font-medium capitalize">{selectedOrder.orderType.replace('_', ' ')}</p>
                  {selectedOrder.table && (
                    <p className="text-sm text-muted-foreground">Table {selectedOrder.table.tableNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={`${getStatusColor(selectedOrder.status)} mt-1`}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment</Label>
                  <Badge className={`${getPaymentStatusColor(selectedOrder.paymentStatus)} mt-1`}>
                    {selectedOrder.paymentStatus}
                  </Badge>
                  {selectedOrder.paymentMethod && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedOrder.paymentMethod}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <Label className="text-muted-foreground mb-2 block">Items</Label>
                <div className="space-y-2 bg-secondary/30 rounded-lg p-4">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {item.quantity}x {item.itemName}
                        </p>
                        {item.modifiers && (
                          <p className="text-sm text-muted-foreground">
                            {JSON.parse(item.modifiers).map((m: { name: string }) => m.name).join(', ')}
                          </p>
                        )}
                        {item.specialRequests && (
                          <p className="text-sm text-amber-500">Note: {item.specialRequests}</p>
                        )}
                      </div>
                      <p className="font-medium">${item.totalPrice.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {selectedOrder.specialInstructions && (
                <div>
                  <Label className="text-muted-foreground">Special Instructions</Label>
                  <p className="mt-1 p-3 bg-amber-500/10 text-amber-500 rounded-lg">
                    {selectedOrder.specialInstructions}
                  </p>
                </div>
              )}

              {/* Order Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${selectedOrder.taxAmount.toFixed(2)}</span>
                </div>
                {selectedOrder.tipAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tip</span>
                    <span>${selectedOrder.tipAmount.toFixed(2)}</span>
                  </div>
                )}
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-500">
                    <span>Discount</span>
                    <span>-${selectedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground">
                <p>Created: {format(new Date(selectedOrder.createdAt), 'PPpp')}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            {selectedOrder && getNextStatus(selectedOrder.status) && selectedOrder.status !== 'cancelled' && (
              <Button
                onClick={() => {
                  const nextStatus = getNextStatus(selectedOrder.status);
                  if (nextStatus) {
                    updateStatus.mutate({ orderId: selectedOrder.id, status: nextStatus });
                    setDetailsDialogOpen(false);
                  }
                }}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {getNextStatusLabel(selectedOrder.status)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
