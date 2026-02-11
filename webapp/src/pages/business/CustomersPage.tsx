import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  Star,
  MoreHorizontal,
  Loader2,
  Settings,
  Award,
  TrendingUp,
  History,
  Gift,
  Edit,
  Trash2,
  MessageSquare,
  DollarSign,
  Crown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useBusiness } from '@/contexts/BusinessContext';
import { format, formatDistanceToNow } from 'date-fns';

// Types based on backend schemas
interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  totalVisits: number;
  totalSpent: number;
  averageSpend: number;
  lastVisitAt: string | null;
  tags: string[] | null;
  loyaltyTier: string | null;
  loyaltyPoints: number | null;
  source: string;
  createdAt: string;
}

interface CustomerWithLoyalty {
  id: string;
  businessId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  smsOptIn: boolean;
  tags: string | null;
  internalNotes: string | null;
  dietaryRestrictions: string | null;
  preferences: string | null;
  totalVisits: number;
  totalSpent: number;
  averageSpend: number;
  lastVisitAt: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  loyaltyPoints: {
    pointsBalance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    tier: string;
  } | null;
}

interface CustomerActivity {
  id: string;
  customerId: string;
  businessId: string;
  activityType: string;
  orderId: string | null;
  reservationId: string | null;
  description: string | null;
  amount: number | null;
  metadata: string | null;
  createdAt: string;
}

interface LoyaltyTransaction {
  id: string;
  transactionType: string;
  points: number;
  balanceAfter: number;
  orderId: string | null;
  description: string | null;
  processedBy: string | null;
  createdAt: string;
}

interface LoyaltyInfo {
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  tier: string;
  transactions: LoyaltyTransaction[];
}

interface LoyaltySettings {
  id: string;
  businessId: string;
  isEnabled: boolean;
  programName: string;
  pointsPerDollar: number;
  minimumSpend: number | null;
  pointsPerReward: number;
  rewardValue: number;
  maxRedemptionPercent: number;
  tierThresholds: string | null;
  pointsExpireDays: number | null;
}

interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  activeCustomers: number;
  averageCustomerValue: number;
  topSpenders: CustomerListItem[];
  tierBreakdown: Record<string, number>;
}

interface CustomerListResponse {
  data: CustomerListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export function CustomersPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithLoyalty | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [adjustPointsDialogOpen, setAdjustPointsDialogOpen] = useState(false);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);

  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    marketingOptIn: false,
    smsOptIn: false,
    tags: '',
    internalNotes: '',
    dietaryRestrictions: '',
  });

  // Points adjustment state
  const [pointsAdjustment, setPointsAdjustment] = useState({ points: 0, description: '' });

  // Note state
  const [newNote, setNewNote] = useState('');

  // Fetch customers
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', businessId, searchQuery, selectedTier],
    queryFn: async () => {
      if (!businessId) return { data: [], pagination: { total: 0, limit: 50, offset: 0 } };
      let url = `/api/customers/${businessId}?limit=50`;
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (selectedTier !== 'all') {
        url += `&tier=${selectedTier}`;
      }
      return api.get<CustomerListResponse>(url);
    },
    enabled: !!businessId,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['customer-stats', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      return api.get<CustomerStats>(`/api/customers/${businessId}/stats/summary`);
    },
    enabled: !!businessId,
  });

  // Fetch customer details
  const { data: customerDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['customer', businessId, selectedCustomer?.id],
    queryFn: async () => {
      if (!businessId || !selectedCustomer?.id) return null;
      return api.get<CustomerWithLoyalty>(`/api/customers/${businessId}/${selectedCustomer.id}`);
    },
    enabled: !!businessId && !!selectedCustomer?.id && detailsDialogOpen,
  });

  // Fetch customer activities
  const { data: customerActivities } = useQuery({
    queryKey: ['customer-activities', businessId, selectedCustomer?.id],
    queryFn: async () => {
      if (!businessId || !selectedCustomer?.id) return [];
      return api.get<CustomerActivity[]>(`/api/customers/${businessId}/${selectedCustomer.id}/activities`);
    },
    enabled: !!businessId && !!selectedCustomer?.id && detailsDialogOpen,
  });

  // Fetch customer loyalty
  const { data: customerLoyalty } = useQuery({
    queryKey: ['customer-loyalty', businessId, selectedCustomer?.id],
    queryFn: async () => {
      if (!businessId || !selectedCustomer?.id) return null;
      return api.get<LoyaltyInfo>(`/api/customers/${businessId}/${selectedCustomer.id}/loyalty`);
    },
    enabled: !!businessId && !!selectedCustomer?.id && detailsDialogOpen,
  });

  // Fetch loyalty settings
  const { data: loyaltySettings } = useQuery({
    queryKey: ['loyalty-settings', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      return api.get<LoyaltySettings>(`/api/customers/${businessId}/settings/loyalty`);
    },
    enabled: !!businessId,
  });

  // Create customer mutation
  const createCustomer = useMutation({
    mutationFn: async (data: typeof newCustomer) => {
      return api.post<CustomerWithLoyalty>(`/api/customers/${businessId}`, {
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats', businessId] });
      setCreateDialogOpen(false);
      resetNewCustomerForm();
    },
  });

  // Update customer mutation
  const updateCustomer = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<CustomerWithLoyalty> }) => {
      return api.put<CustomerWithLoyalty>(`/api/customers/${businessId}/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
      queryClient.invalidateQueries({ queryKey: ['customer', businessId] });
    },
  });

  // Delete customer mutation
  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      return api.delete(`/api/customers/${businessId}/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats', businessId] });
      setDetailsDialogOpen(false);
      setSelectedCustomer(null);
    },
  });

  // Add activity (note) mutation
  const addActivity = useMutation({
    mutationFn: async (data: { customerId: string; activityType: string; description: string }) => {
      return api.post<CustomerActivity>(`/api/customers/${businessId}/${data.customerId}/activities`, {
        activityType: data.activityType,
        description: data.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-activities', businessId] });
      setAddNoteDialogOpen(false);
      setNewNote('');
    },
  });

  // Adjust points mutation
  const adjustPoints = useMutation({
    mutationFn: async (data: { customerId: string; points: number; description: string }) => {
      return api.post<LoyaltyInfo>(`/api/customers/${businessId}/${data.customerId}/loyalty/adjust`, {
        points: data.points,
        description: data.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-loyalty', businessId] });
      queryClient.invalidateQueries({ queryKey: ['customer', businessId] });
      setAdjustPointsDialogOpen(false);
      setPointsAdjustment({ points: 0, description: '' });
    },
  });

  // Update loyalty settings mutation
  const updateLoyaltySettings = useMutation({
    mutationFn: async (data: Partial<LoyaltySettings>) => {
      return api.put<LoyaltySettings>(`/api/customers/${businessId}/settings/loyalty`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-settings', businessId] });
    },
  });

  const customers = (customersData as CustomerListResponse)?.data || [];

  const resetNewCustomerForm = () => {
    setNewCustomer({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      marketingOptIn: false,
      smsOptIn: false,
      tags: '',
      internalNotes: '',
      dietaryRestrictions: '',
    });
  };

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case 'platinum':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'gold':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'silver':
        return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
      case 'bronze':
      default:
        return 'bg-orange-700/10 text-orange-400 border-orange-700/20';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return DollarSign;
      case 'reservation':
        return Calendar;
      case 'loyalty_earned':
      case 'loyalty_redeemed':
        return Gift;
      case 'note':
        return MessageSquare;
      default:
        return History;
    }
  };

  const openCustomerDetails = (customer: CustomerListItem) => {
    setSelectedCustomer({
      id: customer.id,
      businessId: businessId || '',
      userId: null,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      marketingOptIn: false,
      smsOptIn: false,
      tags: customer.tags ? JSON.stringify(customer.tags) : null,
      internalNotes: null,
      dietaryRestrictions: null,
      preferences: null,
      totalVisits: customer.totalVisits,
      totalSpent: customer.totalSpent,
      averageSpend: customer.averageSpend,
      lastVisitAt: customer.lastVisitAt,
      source: customer.source,
      createdAt: customer.createdAt,
      updatedAt: customer.createdAt,
      loyaltyPoints: customer.loyaltyPoints !== null ? {
        pointsBalance: customer.loyaltyPoints,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        tier: customer.loyaltyTier || 'bronze',
      } : null,
    });
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer relationships and loyalty program
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Loyalty Settings
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedTier} onValueChange={setSelectedTier}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold text-foreground">
                {stats?.totalCustomers?.toLocaleString() || 0}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-2xl font-bold text-emerald-400">
                +{stats?.newCustomersThisMonth || 0}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">New This Month</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-2xl font-bold text-primary">
                ${stats?.averageCustomerValue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Avg. Spend</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-violet-400" />
              <p className="text-2xl font-bold text-violet-400">
                {stats?.activeCustomers || 0}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Active (30 days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {customers.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No customers yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building your customer base by adding your first customer.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Customers List */}
      {customers.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Recent Customers</CardTitle>
            <CardDescription>
              {(customersData as CustomerListResponse)?.pagination?.total || customers.length} customers total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => openCustomerDetails(customer)}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {customer.firstName?.[0]}{customer.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {customer.firstName} {customer.lastName}
                        </p>
                        {customer.loyaltyTier && (
                          <Badge className={getTierColor(customer.loyaltyTier)}>
                            <Star className="h-3 w-3 mr-1" />
                            {customer.loyaltyTier}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                      {customer.tags && customer.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {customer.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{customer.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 ml-16 md:ml-0">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">{customer.totalVisits}</p>
                      <p className="text-xs text-muted-foreground">Visits</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-emerald-400">
                        ${customer.totalSpent?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                    </div>
                    {customer.loyaltyPoints !== null && (
                      <div className="text-center hidden sm:block">
                        <p className="text-lg font-semibold text-primary">
                          {customer.loyaltyPoints?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Points</p>
                      </div>
                    )}
                    <div className="text-center hidden sm:block">
                      <p className="text-sm text-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {customer.lastVisitAt
                          ? formatDistanceToNow(new Date(customer.lastVisitAt), { addSuffix: true })
                          : 'Never'}
                      </p>
                      <p className="text-xs text-muted-foreground">Last Visit</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openCustomerDetails(customer); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this customer?')) {
                              deleteCustomer.mutate(customer.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {customerDetails?.firstName?.[0]}{customerDetails?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{customerDetails?.firstName} {customerDetails?.lastName}</span>
                {customerDetails?.loyaltyPoints && (
                  <Badge className={`ml-2 ${getTierColor(customerDetails.loyaltyPoints.tier)}`}>
                    <Crown className="h-3 w-3 mr-1" />
                    {customerDetails.loyaltyPoints.tier}
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {isLoadingDetails ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : customerDetails ? (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{customerDetails.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{customerDetails.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-secondary/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{customerDetails.totalVisits}</p>
                    <p className="text-sm text-muted-foreground">Total Visits</p>
                  </div>
                  <div className="text-center p-4 bg-secondary/30 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-400">${customerDetails.totalSpent?.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                  </div>
                  <div className="text-center p-4 bg-secondary/30 rounded-lg">
                    <p className="text-2xl font-bold text-primary">${customerDetails.averageSpend?.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Avg. Spend</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Marketing Emails</Label>
                    <p className="font-medium">{customerDetails.marketingOptIn ? 'Opted In' : 'Opted Out'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">SMS Notifications</Label>
                    <p className="font-medium">{customerDetails.smsOptIn ? 'Opted In' : 'Opted Out'}</p>
                  </div>
                </div>

                {customerDetails.dietaryRestrictions && (
                  <div>
                    <Label className="text-muted-foreground">Dietary Restrictions</Label>
                    <p className="font-medium">{customerDetails.dietaryRestrictions}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-muted-foreground">Internal Notes</Label>
                    <Button size="sm" variant="ghost" onClick={() => setAddNoteDialogOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Note
                    </Button>
                  </div>
                  <p className="p-3 bg-secondary/30 rounded-lg text-sm">
                    {customerDetails.internalNotes || 'No notes yet'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Customer since {format(new Date(customerDetails.createdAt), 'PPP')}</span>
                  <span>-</span>
                  <span>Source: {customerDetails.source}</span>
                </div>
              </TabsContent>

              <TabsContent value="loyalty" className="space-y-4 mt-4">
                {customerLoyalty ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-primary">
                            {customerLoyalty.pointsBalance?.toLocaleString() || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Current Points</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/30">
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-foreground">
                            {customerLoyalty.lifetimeEarned?.toLocaleString() || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Lifetime Earned</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setAdjustPointsDialogOpen(true)}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Adjust Points
                    </Button>

                    <div>
                      <Label className="text-muted-foreground mb-2 block">Recent Transactions</Label>
                      <div className="space-y-2">
                        {customerLoyalty.transactions?.length > 0 ? (
                          customerLoyalty.transactions.slice(0, 10).map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {tx.transactionType === 'earned' ? 'Points Earned' :
                                   tx.transactionType === 'redeemed' ? 'Points Redeemed' :
                                   tx.transactionType === 'adjusted' ? 'Points Adjusted' :
                                   'Points Expired'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {tx.description || format(new Date(tx.createdAt), 'PPp')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {tx.points >= 0 ? '+' : ''}{tx.points}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Balance: {tx.balanceAfter}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-4">No transactions yet</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loyalty program not enabled or customer not enrolled</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <div className="space-y-3">
                  {customerActivities && customerActivities.length > 0 ? (
                    customerActivities.map((activity) => {
                      const ActivityIcon = getActivityIcon(activity.activityType);
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ActivityIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm capitalize">
                              {activity.activityType.replace('_', ' ')}
                            </p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                            )}
                            {activity.amount && (
                              <p className="text-sm text-emerald-400">${activity.amount.toFixed(2)}</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No activity recorded yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Add a customer to your database to track their visits and loyalty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                  placeholder="Smith"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={newCustomer.tags}
                onChange={(e) => setNewCustomer({ ...newCustomer, tags: e.target.value })}
                placeholder="vip, regular, birthday-feb"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
              <Input
                id="dietaryRestrictions"
                value={newCustomer.dietaryRestrictions}
                onChange={(e) => setNewCustomer({ ...newCustomer, dietaryRestrictions: e.target.value })}
                placeholder="Vegetarian, allergic to nuts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={newCustomer.internalNotes}
                onChange={(e) => setNewCustomer({ ...newCustomer, internalNotes: e.target.value })}
                placeholder="Prefers window seating..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="marketing">Marketing Emails</Label>
              <Switch
                id="marketing"
                checked={newCustomer.marketingOptIn}
                onCheckedChange={(checked) => setNewCustomer({ ...newCustomer, marketingOptIn: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms">SMS Notifications</Label>
              <Switch
                id="sms"
                checked={newCustomer.smsOptIn}
                onCheckedChange={(checked) => setNewCustomer({ ...newCustomer, smsOptIn: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCustomer.mutate(newCustomer)}
              disabled={!newCustomer.firstName || !newCustomer.lastName || createCustomer.isPending}
            >
              {createCustomer.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loyalty Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loyalty Program Settings</DialogTitle>
            <DialogDescription>
              Configure your loyalty program rules and rewards.
            </DialogDescription>
          </DialogHeader>
          {loyaltySettings ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Loyalty Program</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to earn and redeem points</p>
                </div>
                <Switch
                  checked={loyaltySettings.isEnabled}
                  onCheckedChange={(checked) =>
                    updateLoyaltySettings.mutate({ isEnabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="programName">Program Name</Label>
                <Input
                  id="programName"
                  value={loyaltySettings.programName}
                  onChange={(e) =>
                    updateLoyaltySettings.mutate({ programName: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pointsPerDollar">Points per $1</Label>
                  <Input
                    id="pointsPerDollar"
                    type="number"
                    min={1}
                    value={loyaltySettings.pointsPerDollar}
                    onChange={(e) =>
                      updateLoyaltySettings.mutate({ pointsPerDollar: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointsPerReward">Points per Reward</Label>
                  <Input
                    id="pointsPerReward"
                    type="number"
                    min={1}
                    value={loyaltySettings.pointsPerReward}
                    onChange={(e) =>
                      updateLoyaltySettings.mutate({ pointsPerReward: parseInt(e.target.value) || 100 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rewardValue">Reward Value ($)</Label>
                  <Input
                    id="rewardValue"
                    type="number"
                    min={0}
                    step={0.01}
                    value={loyaltySettings.rewardValue}
                    onChange={(e) =>
                      updateLoyaltySettings.mutate({ rewardValue: parseFloat(e.target.value) || 5 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRedemption">Max Redemption %</Label>
                  <Input
                    id="maxRedemption"
                    type="number"
                    min={0}
                    max={100}
                    value={loyaltySettings.maxRedemptionPercent}
                    onChange={(e) =>
                      updateLoyaltySettings.mutate({ maxRedemptionPercent: parseFloat(e.target.value) || 50 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimumSpend">Minimum Spend to Earn ($)</Label>
                <Input
                  id="minimumSpend"
                  type="number"
                  min={0}
                  step={0.01}
                  value={loyaltySettings.minimumSpend || ''}
                  placeholder="No minimum"
                  onChange={(e) =>
                    updateLoyaltySettings.mutate({
                      minimumSpend: e.target.value ? parseFloat(e.target.value) : null
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expireDays">Points Expire After (days)</Label>
                <Input
                  id="expireDays"
                  type="number"
                  min={0}
                  value={loyaltySettings.pointsExpireDays || ''}
                  placeholder="Never expire"
                  onChange={(e) =>
                    updateLoyaltySettings.mutate({
                      pointsExpireDays: e.target.value ? parseInt(e.target.value) : null
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSettingsDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={adjustPointsDialogOpen} onOpenChange={setAdjustPointsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Loyalty Points</DialogTitle>
            <DialogDescription>
              Add or remove points from this customer's balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="points">Points (negative to subtract)</Label>
              <Input
                id="points"
                type="number"
                value={pointsAdjustment.points}
                onChange={(e) => setPointsAdjustment({ ...pointsAdjustment, points: parseInt(e.target.value) || 0 })}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={pointsAdjustment.description}
                onChange={(e) => setPointsAdjustment({ ...pointsAdjustment, description: e.target.value })}
                placeholder="Birthday bonus, correction, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustPointsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedCustomer) {
                  adjustPoints.mutate({
                    customerId: selectedCustomer.id,
                    points: pointsAdjustment.points,
                    description: pointsAdjustment.description,
                  });
                }
              }}
              disabled={pointsAdjustment.points === 0 || adjustPoints.isPending}
            >
              {adjustPoints.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Adjust Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add an internal note about this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Customer mentioned they're celebrating their anniversary..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedCustomer && newNote.trim()) {
                  addActivity.mutate({
                    customerId: selectedCustomer.id,
                    activityType: 'note',
                    description: newNote.trim(),
                  });
                }
              }}
              disabled={!newNote.trim() || addActivity.isPending}
            >
              {addActivity.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
