import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CreatorPayout, CreatorEarning, PayoutStatus } from '@/types/database';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  Wallet,
  Eye,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Calendar,
  Loader2,
  Plus,
  ArrowRightCircle,
  AlertCircle,
  User,
  Receipt,
} from 'lucide-react';
import { format, subDays, isAfter, startOfMonth } from 'date-fns';

// Status configuration
const STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: ArrowRightCircle },
  completed: { label: 'Completed', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: XCircle },
};

const PAYOUT_STATUSES: PayoutStatus[] = ['pending', 'processing', 'completed', 'failed'];

type SortOption = 'newest' | 'oldest' | 'amount_high' | 'amount_low';
type DateRange = '7' | '30' | '90' | 'all';

const ITEMS_PER_PAGE = 10;

// Aggregated creator earnings type
interface CreatorPendingEarnings {
  creator_id: string;
  creator_name: string | null;
  unpaid_amount_cents: number;
  order_count: number;
}

export function PayoutsPage() {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [selectedPayout, setSelectedPayout] = useState<CreatorPayout | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFailReasonOpen, setIsFailReasonOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [selectedCreatorForPayout, setSelectedCreatorForPayout] = useState<CreatorPendingEarnings | null>(null);

  // Fetch payouts
  const { data: payouts, isLoading: isLoadingPayouts } = useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_payouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('creator_payouts table not found:', error.message);
        return [] as CreatorPayout[];
      }

      return (data ?? []) as CreatorPayout[];
    },
  });

  // Fetch pending earnings
  const { data: pendingEarnings, isLoading: isLoadingEarnings } = useQuery({
    queryKey: ['pending-earnings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('is_paid', false);

      if (error) {
        console.warn('creator_earnings table not found:', error.message);
        return [] as CreatorEarning[];
      }

      return (data ?? []) as CreatorEarning[];
    },
  });

  // Aggregate pending earnings by creator
  const creatorPendingEarnings = useMemo(() => {
    if (!pendingEarnings) return [];

    const creatorMap = new Map<string, CreatorPendingEarnings>();

    pendingEarnings.forEach((earning) => {
      const existing = creatorMap.get(earning.creator_id);
      if (existing) {
        existing.unpaid_amount_cents += earning.amount_cents;
        existing.order_count += 1;
      } else {
        creatorMap.set(earning.creator_id, {
          creator_id: earning.creator_id,
          creator_name: earning.creator_name,
          unpaid_amount_cents: earning.amount_cents,
          order_count: 1,
        });
      }
    });

    return Array.from(creatorMap.values()).sort(
      (a, b) => b.unpaid_amount_cents - a.unpaid_amount_cents
    );
  }, [pendingEarnings]);

  // Process payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: async (payout: CreatorPayout) => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('creator_payouts')
        .update({
          status: 'processing',
          updated_at: now,
        })
        .eq('id', payout.id);

      if (error) throw error;
      return payout;
    },
    onSuccess: async (payout) => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      await logActivity(
        'process_payout',
        'payout',
        payout.id,
        `Payout to ${payout.creator_name ?? 'Unknown'}`,
        { amount_cents: payout.amount_cents }
      );
      toast.success('Payout is now processing');
      // Update selected payout if detail dialog is open
      if (selectedPayout?.id === payout.id) {
        setSelectedPayout({ ...payout, status: 'processing' });
      }
    },
    onError: (error) => {
      toast.error(`Failed to process payout: ${error.message}`);
    },
  });

  // Complete payout mutation
  const completePayoutMutation = useMutation({
    mutationFn: async ({ payout, stripeTransferId }: { payout: CreatorPayout; stripeTransferId?: string }) => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('creator_payouts')
        .update({
          status: 'completed',
          processed_at: now,
          stripe_transfer_id: stripeTransferId ?? null,
          updated_at: now,
        })
        .eq('id', payout.id);

      if (error) throw error;
      return payout;
    },
    onSuccess: async (payout) => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      await logActivity(
        'complete_payout',
        'payout',
        payout.id,
        `Payout to ${payout.creator_name ?? 'Unknown'}`,
        { amount_cents: payout.amount_cents }
      );
      toast.success('Payout marked as completed');
      if (selectedPayout?.id === payout.id) {
        setSelectedPayout({ ...payout, status: 'completed', processed_at: new Date().toISOString() });
      }
    },
    onError: (error) => {
      toast.error(`Failed to complete payout: ${error.message}`);
    },
  });

  // Fail payout mutation
  const failPayoutMutation = useMutation({
    mutationFn: async ({ payout, reason }: { payout: CreatorPayout; reason: string }) => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('creator_payouts')
        .update({
          status: 'failed',
          failed_reason: reason,
          updated_at: now,
        })
        .eq('id', payout.id);

      if (error) throw error;
      return { payout, reason };
    },
    onSuccess: async ({ payout, reason }) => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      await logActivity(
        'fail_payout',
        'payout',
        payout.id,
        `Payout to ${payout.creator_name ?? 'Unknown'}`,
        { amount_cents: payout.amount_cents, reason }
      );
      toast.success('Payout marked as failed');
      setIsFailReasonOpen(false);
      setFailReason('');
      if (selectedPayout?.id === payout.id) {
        setSelectedPayout({ ...payout, status: 'failed', failed_reason: reason });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update payout: ${error.message}`);
    },
  });

  // Create payout mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (creator: CreatorPendingEarnings) => {
      const now = new Date().toISOString();
      const periodStart = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('creator_payouts')
        .insert({
          creator_id: creator.creator_id,
          creator_name: creator.creator_name,
          amount_cents: creator.unpaid_amount_cents,
          period_start: periodStart,
          period_end: now,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Mark earnings as paid
      await supabase
        .from('creator_earnings')
        .update({ is_paid: true, payout_id: data.id })
        .eq('creator_id', creator.creator_id)
        .eq('is_paid', false);

      return data as CreatorPayout;
    },
    onSuccess: async (payout) => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-earnings'] });
      await logActivity(
        'create_payout',
        'payout',
        payout.id,
        `Payout to ${payout.creator_name ?? 'Unknown'}`,
        { amount_cents: payout.amount_cents }
      );
      toast.success('Payout created successfully');
      setIsCreateOpen(false);
      setSelectedCreatorForPayout(null);
    },
    onError: (error) => {
      toast.error(`Failed to create payout: ${error.message}`);
    },
  });

  // Get unique creators for filter
  const uniqueCreators = useMemo(() => {
    if (!payouts) return [];
    const creatorMap = new Map<string, { id: string; name: string }>();
    payouts.forEach((payout) => {
      if (!creatorMap.has(payout.creator_id)) {
        creatorMap.set(payout.creator_id, {
          id: payout.creator_id,
          name: payout.creator_name ?? 'Unknown Creator',
        });
      }
    });
    return Array.from(creatorMap.values());
  }, [payouts]);

  // Filter and sort payouts
  const filteredPayouts = useMemo(() => {
    if (!payouts) return [];

    const filtered = payouts.filter((payout) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        payout.id.toLowerCase().includes(searchLower) ||
        (payout.creator_name?.toLowerCase().includes(searchLower) ?? false) ||
        (payout.creator_email?.toLowerCase().includes(searchLower) ?? false);

      const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
      const matchesCreator = creatorFilter === 'all' || payout.creator_id === creatorFilter;

      // Date range filter
      let matchesDate = true;
      if (dateRange !== 'all') {
        const daysAgo = parseInt(dateRange);
        const cutoffDate = subDays(new Date(), daysAgo);
        matchesDate = isAfter(new Date(payout.created_at), cutoffDate);
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
        case 'amount_high':
          return b.amount_cents - a.amount_cents;
        case 'amount_low':
          return a.amount_cents - b.amount_cents;
        default:
          return 0;
      }
    });

    return filtered;
  }, [payouts, searchQuery, statusFilter, creatorFilter, dateRange, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredPayouts.length / ITEMS_PER_PAGE);
  const paginatedPayouts = filteredPayouts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalPaidOut = useMemo(() => {
    if (!payouts) return 0;
    return payouts
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount_cents, 0);
  }, [payouts]);

  const pendingPayoutsAmount = useMemo(() => {
    if (!payouts) return 0;
    return payouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.amount_cents, 0);
  }, [payouts]);

  const payoutsThisMonth = useMemo(() => {
    if (!payouts) return 0;
    const monthStart = startOfMonth(new Date());
    return payouts
      .filter((p) => {
        const payoutDate = new Date(p.created_at);
        return payoutDate >= monthStart && p.status === 'completed';
      })
      .reduce((sum, p) => sum + p.amount_cents, 0);
  }, [payouts]);

  const failedPayoutsCount = useMemo(() => {
    if (!payouts) return 0;
    return payouts.filter((p) => p.status === 'failed').length;
  }, [payouts]);

  // Handlers
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  const openDetailDialog = (payout: CreatorPayout) => {
    setSelectedPayout(payout);
    setIsDetailOpen(true);
  };

  const openCreateDialog = (creator: CreatorPendingEarnings) => {
    setSelectedCreatorForPayout(creator);
    setIsCreateOpen(true);
  };

  const openFailReasonDialog = () => {
    setIsFailReasonOpen(true);
  };

  const handleFailPayout = () => {
    if (!selectedPayout || !failReason.trim()) return;
    failPayoutMutation.mutate({ payout: selectedPayout, reason: failReason.trim() });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Payouts</h1>
        <p className="text-muted-foreground mt-1">
          Manage creator payouts and earnings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatPrice(totalPaidOut)}</p>
              <p className="text-sm text-muted-foreground">Total Paid Out</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatPrice(pendingPayoutsAmount)}</p>
              <p className="text-sm text-muted-foreground">Pending Payouts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatPrice(payoutsThisMonth)}</p>
              <p className="text-sm text-muted-foreground">Paid This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-400/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{failedPayoutsCount}</p>
              <p className="text-sm text-muted-foreground">Failed Payouts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Earnings Section */}
      {creatorPendingEarnings.length > 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pending Earnings</h2>
                <p className="text-sm text-muted-foreground">Creators with unpaid earnings</p>
              </div>
            </div>
            <div className="space-y-3">
              {creatorPendingEarnings.slice(0, 5).map((creator) => (
                <div
                  key={creator.creator_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {creator.creator_name ?? 'Unknown Creator'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {creator.order_count} order{creator.order_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-foreground">
                      {formatPrice(creator.unpaid_amount_cents)}
                    </span>
                    <Button size="sm" onClick={() => openCreateDialog(creator)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create Payout
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : isLoadingEarnings ? (
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by payout ID or creator..."
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
                onValueChange={(value: PayoutStatus | 'all') =>
                  handleFilterChange(setStatusFilter, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {PAYOUT_STATUSES.map((status) => (
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
                  <SelectItem value="amount_high">Amount: High to Low</SelectItem>
                  <SelectItem value="amount_low">Amount: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoadingPayouts ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : paginatedPayouts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Payout ID</TableHead>
                      <TableHead className="text-muted-foreground">Creator</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground hidden md:table-cell">Period</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground hidden lg:table-cell">Processed</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayouts.map((payout) => {
                      const statusConfig = STATUS_CONFIG[payout.status];
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={payout.id} className="border-border/50">
                          <TableCell>
                            <span className="font-mono text-sm text-foreground">
                              {payout.id.substring(0, 8)}...
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[150px]">
                                {payout.creator_name ?? 'Unknown'}
                              </p>
                              {payout.creator_email ? (
                                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {payout.creator_email}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-foreground">
                              {formatPrice(payout.amount_cents)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {payout.processed_at ? formatDate(payout.processed_at) : '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDetailDialog(payout)}
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredPayouts.length)} of{' '}
                    {filteredPayouts.length}
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
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No payouts found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || creatorFilter !== 'all' || dateRange !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No payouts have been created yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              Payout Details
            </DialogTitle>
            <DialogDescription>
              {selectedPayout ? `Payout ${selectedPayout.id.substring(0, 8)}...` : 'View payout information'}
            </DialogDescription>
          </DialogHeader>

          {selectedPayout ? (
            <div className="space-y-4">
              {/* Payout ID and Status */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">
                  {selectedPayout.id}
                </span>
                <Badge variant="outline" className={STATUS_CONFIG[selectedPayout.status].color}>
                  {(() => {
                    const StatusIcon = STATUS_CONFIG[selectedPayout.status].icon;
                    return <StatusIcon className="h-3 w-3 mr-1" />;
                  })()}
                  {STATUS_CONFIG[selectedPayout.status].label}
                </Badge>
              </div>

              {/* Creator Info */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Creator</p>
                </div>
                <p className="font-medium text-foreground">{selectedPayout.creator_name ?? 'Unknown'}</p>
                {selectedPayout.creator_email ? (
                  <p className="text-sm text-muted-foreground">{selectedPayout.creator_email}</p>
                ) : null}
              </div>

              {/* Amount */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Amount</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(selectedPayout.amount_cents)}
                </p>
              </div>

              {/* Period */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Period</p>
                </div>
                <p className="text-foreground">
                  {formatDate(selectedPayout.period_start)} - {formatDate(selectedPayout.period_end)}
                </p>
              </div>

              {/* Status Timeline */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase">Timeline</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-400/10">
                      <Plus className="h-3 w-3 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Created</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(selectedPayout.created_at)}
                      </p>
                    </div>
                  </div>
                  {selectedPayout.status === 'processing' || selectedPayout.status === 'completed' ? (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-400/10">
                        <ArrowRightCircle className="h-3 w-3 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Processing</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(selectedPayout.updated_at)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {selectedPayout.status === 'completed' ? (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-400/10">
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedPayout.processed_at ? formatDateTime(selectedPayout.processed_at) : '-'}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {selectedPayout.status === 'failed' ? (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-red-400/10">
                        <XCircle className="h-3 w-3 text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Failed</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(selectedPayout.updated_at)}
                        </p>
                        {selectedPayout.failed_reason ? (
                          <p className="text-xs text-red-400 mt-1">{selectedPayout.failed_reason}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Stripe Transfer ID */}
              {selectedPayout.stripe_transfer_id ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Stripe Transfer ID</p>
                  </div>
                  <p className="font-mono text-sm text-foreground">{selectedPayout.stripe_transfer_id}</p>
                </div>
              ) : null}

              {/* Actions */}
              {selectedPayout.status === 'pending' ? (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => processPayoutMutation.mutate(selectedPayout)}
                    disabled={processPayoutMutation.isPending}
                  >
                    {processPayoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRightCircle className="h-4 w-4 mr-2" />
                    )}
                    Process Payout
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-400 hover:text-red-400"
                    onClick={openFailReasonDialog}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Failed
                  </Button>
                </div>
              ) : null}

              {selectedPayout.status === 'processing' ? (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => completePayoutMutation.mutate({ payout: selectedPayout })}
                    disabled={completePayoutMutation.isPending}
                  >
                    {completePayoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark as Completed
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-400 hover:text-red-400"
                    onClick={openFailReasonDialog}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Failed
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Payout Confirmation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-muted-foreground" />
              Create Payout
            </DialogTitle>
            <DialogDescription>
              Create a new payout for this creator
            </DialogDescription>
          </DialogHeader>

          {selectedCreatorForPayout ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">Creator</p>
                <p className="font-medium text-foreground">
                  {selectedCreatorForPayout.creator_name ?? 'Unknown Creator'}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">Amount</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(selectedCreatorForPayout.unpaid_amount_cents)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  From {selectedCreatorForPayout.order_count} order{selectedCreatorForPayout.order_count !== 1 ? 's' : ''}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                This will create a pending payout and mark all current earnings as paid.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedCreatorForPayout && createPayoutMutation.mutate(selectedCreatorForPayout)}
              disabled={createPayoutMutation.isPending}
            >
              {createPayoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fail Reason Dialog */}
      <Dialog open={isFailReasonOpen} onOpenChange={setIsFailReasonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              Mark Payout as Failed
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for the failure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Enter failure reason..."
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFailReasonOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFailPayout}
              disabled={!failReason.trim() || failPayoutMutation.isPending}
            >
              {failPayoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Mark as Failed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
