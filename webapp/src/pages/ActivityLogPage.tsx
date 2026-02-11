import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ActivityAction, TargetType, ActivityLogEntry } from '@/hooks/useActivityLog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Search,
  History,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Ban,
  CheckCircle,
  FileText,
  Users,
  Shield,
  ChefHat,
  ToggleLeft,
  ToggleRight,
  Star,
  StarOff,
  Layers,
  BadgeCheck,
  XCircle,
  Package,
  Receipt,
  RefreshCw,
  Wallet,
  ArrowRightCircle,
  AlertCircle,
} from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';

type DateRange = '7' | '30' | '90' | 'all';

const ACTION_CONFIG: Record<ActivityAction, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  create_recipe: { label: 'Create Recipe', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: Plus },
  update_recipe: { label: 'Update Recipe', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: Pencil },
  delete_recipe: { label: 'Delete Recipe', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: Trash2 },
  feature_recipe: { label: 'Feature Recipe', color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: Star },
  unfeature_recipe: { label: 'Unfeature Recipe', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20', icon: StarOff },
  bulk_activate_recipes: { label: 'Bulk Activate', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: ToggleRight },
  bulk_deactivate_recipes: { label: 'Bulk Deactivate', color: 'bg-amber-400/10 text-amber-400 border-amber-400/20', icon: ToggleLeft },
  bulk_feature_recipes: { label: 'Bulk Feature', color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: Star },
  bulk_unfeature_recipes: { label: 'Bulk Unfeature', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20', icon: StarOff },
  bulk_delete_recipes: { label: 'Bulk Delete', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: Layers },
  create_content: { label: 'Create Content', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: Plus },
  update_content: { label: 'Update Content', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: Pencil },
  delete_content: { label: 'Delete Content', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: Trash2 },
  suspend_user: { label: 'Suspend User', color: 'bg-amber-400/10 text-amber-400 border-amber-400/20', icon: Ban },
  unsuspend_user: { label: 'Unsuspend User', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: CheckCircle },
  create_admin: { label: 'Create Admin', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: Plus },
  update_admin: { label: 'Update Admin', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: Pencil },
  delete_admin: { label: 'Delete Admin', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: Trash2 },
  review_report: { label: 'Review Report', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: FileText },
  dismiss_report: { label: 'Dismiss Report', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20', icon: FileText },
  action_report: { label: 'Action Report', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: FileText },
  approve_creator: { label: 'Approve Creator', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: BadgeCheck },
  reject_creator: { label: 'Reject Creator', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: XCircle },
  activate_product: { label: 'Activate Product', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: ToggleRight },
  deactivate_product: { label: 'Deactivate Product', color: 'bg-amber-400/10 text-amber-400 border-amber-400/20', icon: ToggleLeft },
  update_product: { label: 'Update Product', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: Pencil },
  update_order_status: { label: 'Update Order Status', color: 'bg-purple-400/10 text-purple-400 border-purple-400/20', icon: RefreshCw },
  create_payout: { label: 'Create Payout', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: Plus },
  process_payout: { label: 'Process Payout', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: ArrowRightCircle },
  complete_payout: { label: 'Complete Payout', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: CheckCircle },
  fail_payout: { label: 'Fail Payout', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: AlertCircle },
};

const TARGET_ICONS: Record<TargetType, React.ComponentType<{ className?: string }>> = {
  recipe: ChefHat,
  content: FileText,
  user: Users,
  admin: Shield,
  report: FileText,
  product: Package,
  order: Receipt,
  payout: Wallet,
};

const ITEMS_PER_PAGE = 20;

export function ActivityLogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<ActivityAction | 'all'>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch activity logs with admin profiles
  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ['activity-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select(`
          *,
          admin_profile:user_profiles!admin_user_id(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((entry) => ({
        ...entry,
        admin_profile: Array.isArray(entry.admin_profile)
          ? entry.admin_profile[0]
          : entry.admin_profile,
      })) as ActivityLogEntry[];
    },
  });

  // Get unique admins for filter dropdown
  const uniqueAdmins = useMemo(() => {
    if (!activityLogs) return [];
    const adminMap = new Map<string, { id: string; name: string }>();
    activityLogs.forEach((log) => {
      if (!adminMap.has(log.admin_user_id)) {
        adminMap.set(log.admin_user_id, {
          id: log.admin_user_id,
          name: log.admin_profile?.display_name ?? 'Unknown Admin',
        });
      }
    });
    return Array.from(adminMap.values());
  }, [activityLogs]);

  // Filter logs based on all criteria
  const filteredLogs = useMemo(() => {
    if (!activityLogs) return [];

    return activityLogs.filter((log) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        log.target_name.toLowerCase().includes(searchLower) ||
        (log.admin_profile?.display_name?.toLowerCase().includes(searchLower) ?? false);

      // Action filter
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;

      // Admin filter
      const matchesAdmin = adminFilter === 'all' || log.admin_user_id === adminFilter;

      // Date range filter
      let matchesDate = true;
      if (dateRange !== 'all') {
        const daysAgo = parseInt(dateRange);
        const cutoffDate = subDays(new Date(), daysAgo);
        matchesDate = isAfter(new Date(log.created_at), cutoffDate);
      }

      return matchesSearch && matchesAction && matchesAdmin && matchesDate;
    });
  }, [activityLogs, searchQuery, actionFilter, adminFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to first page when filters change
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: format(date, 'MMM d, yyyy'),
      time: format(date, 'h:mm a'),
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Activity Log</h1>
        <p className="text-muted-foreground mt-1">
          Track admin actions across the platform
        </p>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by target name or admin..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>

            {/* Filter dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Action Type Filter */}
              <Select
                value={actionFilter}
                onValueChange={(value: ActivityAction | 'all') =>
                  handleFilterChange(setActionFilter, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create_recipe">Create Recipe</SelectItem>
                  <SelectItem value="update_recipe">Update Recipe</SelectItem>
                  <SelectItem value="delete_recipe">Delete Recipe</SelectItem>
                  <SelectItem value="feature_recipe">Feature Recipe</SelectItem>
                  <SelectItem value="unfeature_recipe">Unfeature Recipe</SelectItem>
                  <SelectItem value="bulk_activate_recipes">Bulk Activate Recipes</SelectItem>
                  <SelectItem value="bulk_deactivate_recipes">Bulk Deactivate Recipes</SelectItem>
                  <SelectItem value="bulk_feature_recipes">Bulk Feature Recipes</SelectItem>
                  <SelectItem value="bulk_unfeature_recipes">Bulk Unfeature Recipes</SelectItem>
                  <SelectItem value="bulk_delete_recipes">Bulk Delete Recipes</SelectItem>
                  <SelectItem value="create_content">Create Content</SelectItem>
                  <SelectItem value="update_content">Update Content</SelectItem>
                  <SelectItem value="delete_content">Delete Content</SelectItem>
                  <SelectItem value="suspend_user">Suspend User</SelectItem>
                  <SelectItem value="unsuspend_user">Unsuspend User</SelectItem>
                  <SelectItem value="create_admin">Create Admin</SelectItem>
                  <SelectItem value="update_admin">Update Admin</SelectItem>
                  <SelectItem value="delete_admin">Delete Admin</SelectItem>
                </SelectContent>
              </Select>

              {/* Admin Filter */}
              <Select
                value={adminFilter}
                onValueChange={(value) => handleFilterChange(setAdminFilter, value)}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50">
                  <SelectValue placeholder="All Admins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  {uniqueAdmins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{filteredLogs.length}</p>
            <p className="text-sm text-muted-foreground">Total Actions</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">
              {filteredLogs.filter((l) => l.action.startsWith('create')).length}
            </p>
            <p className="text-sm text-muted-foreground">Creates</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-400">
              {filteredLogs.filter((l) => l.action.startsWith('update')).length}
            </p>
            <p className="text-sm text-muted-foreground">Updates</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-400">
              {filteredLogs.filter((l) => l.action.startsWith('delete')).length}
            </p>
            <p className="text-sm text-muted-foreground">Deletes</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : paginatedLogs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Timestamp</TableHead>
                      <TableHead className="text-muted-foreground">Admin</TableHead>
                      <TableHead className="text-muted-foreground">Action</TableHead>
                      <TableHead className="text-muted-foreground">Target</TableHead>
                      <TableHead className="text-muted-foreground hidden lg:table-cell">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => {
                      const actionConfig = ACTION_CONFIG[log.action];
                      const ActionIcon = actionConfig?.icon ?? History;
                      const TargetIcon = TARGET_ICONS[log.target_type] ?? FileText;
                      const timestamp = formatTimestamp(log.created_at);

                      return (
                        <TableRow key={log.id} className="border-border/50">
                          <TableCell>
                            <div className="min-w-[120px]">
                              <p className="font-medium text-foreground">{timestamp.date}</p>
                              <p className="text-xs text-muted-foreground">{timestamp.time}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={log.admin_profile?.avatar_url ?? undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(log.admin_profile?.display_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-foreground truncate max-w-[120px]">
                                {log.admin_profile?.display_name ?? 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={actionConfig?.color ?? 'bg-secondary text-foreground'}
                            >
                              <ActionIcon className="h-3 w-3 mr-1" />
                              {actionConfig?.label ?? log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-secondary/50 flex items-center justify-center">
                                <TargetIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <span className="text-foreground truncate max-w-[150px]">
                                {log.target_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {log.metadata ? (
                              <span className="text-xs text-muted-foreground font-mono">
                                {JSON.stringify(log.metadata).substring(0, 50)}
                                {JSON.stringify(log.metadata).length > 50 ? '...' : ''}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of{' '}
                    {filteredLogs.length}
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
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No activity found</h3>
              <p className="text-muted-foreground">
                {searchQuery || actionFilter !== 'all' || adminFilter !== 'all' || dateRange !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No admin actions have been logged yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
