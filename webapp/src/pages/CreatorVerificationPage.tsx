import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';
import {
  Search,
  BadgeCheck,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  ChefHat,
  BookOpen,
  ExternalLink,
  CalendarDays,
  TrendingUp,
  Heart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Youtube,
  Twitter,
} from 'lucide-react';
import { format, startOfMonth, isAfter } from 'date-fns';

// Types
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type CreatorTier = 'basic' | 'pro' | 'partner';

export interface CreatorVerificationRequest {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  portfolio_url: string | null;
  social_proof: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  follower_count: number;
  recipe_count: number;
  engagement_rate: number | null;
  status: VerificationStatus;
  admin_notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  tier: CreatorTier;
  commission_rate: number;
  is_verified: boolean;
  verified_at: string;
  gmv_total: number;
  created_at: string;
}

const STATUS_CONFIG: Record<VerificationStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: XCircle },
};

const TIER_CONFIG: Record<CreatorTier, { label: string; color: string; commission: string; requirements: string }> = {
  basic: { label: 'Basic', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20', commission: '15%', requirements: 'Default on approval' },
  pro: { label: 'Pro', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', commission: '12%', requirements: '1K followers, $1K GMV' },
  partner: { label: 'Partner', color: 'bg-purple-400/10 text-purple-400 border-purple-400/20', commission: '10%', requirements: '10K followers, $10K GMV' },
};

const ITEMS_PER_PAGE = 10;

export function CreatorVerificationPage() {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<CreatorVerificationRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch verification requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['creator-verification-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_verification_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet - return empty array
        console.warn('creator_verification_requests table not found:', error.message);
        return [] as CreatorVerificationRequest[];
      }

      return (data ?? []) as CreatorVerificationRequest[];
    },
  });

  // Fetch verified creators count
  const { data: verifiedCreatorsCount } = useQuery({
    queryKey: ['verified-creators-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('creator_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

      if (error) {
        console.warn('creator_profiles table not found:', error.message);
        return 0;
      }

      return count ?? 0;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ request, notes }: { request: CreatorVerificationRequest; notes: string }) => {
      // Update the verification request
      const { error: updateError } = await supabase
        .from('creator_verification_requests')
        .update({
          status: 'approved',
          admin_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Create creator profile entry
      const { error: profileError } = await supabase
        .from('creator_profiles')
        .insert({
          user_id: request.user_id,
          tier: 'basic',
          commission_rate: 15,
          is_verified: true,
          verified_at: new Date().toISOString(),
          gmv_total: 0,
        });

      if (profileError) {
        console.warn('Failed to create creator profile:', profileError.message);
        // Don't throw - the request was still approved
      }

      // Update user profile to set is_verified
      const { error: userError } = await supabase
        .from('user_profiles')
        .update({ is_verified: true } as never)
        .eq('user_id', request.user_id);

      if (userError) {
        console.warn('Failed to update user profile:', userError.message);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['creator-verification-requests'] });
      queryClient.invalidateQueries({ queryKey: ['verified-creators-count'] });
      if (selectedRequest) {
        await logActivity(
          'approve_creator' as never,
          'user' as never,
          selectedRequest.user_id,
          selectedRequest.display_name ?? 'Unknown Creator',
          { request_id: selectedRequest.id }
        );
      }
      toast.success('Creator approved successfully');
      setIsApproveOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: (error) => {
      toast.error(`Failed to approve creator: ${error.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ request, reason }: { request: CreatorVerificationRequest; reason: string }) => {
      const { error } = await supabase
        .from('creator_verification_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['creator-verification-requests'] });
      if (selectedRequest) {
        await logActivity(
          'reject_creator' as never,
          'user' as never,
          selectedRequest.user_id,
          selectedRequest.display_name ?? 'Unknown Creator',
          { request_id: selectedRequest.id, reason: rejectionReason }
        );
      }
      toast.success('Creator verification rejected');
      setIsRejectOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error(`Failed to reject request: ${error.message}`);
    },
  });

  // Update admin notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      const { error } = await supabase
        .from('creator_verification_requests')
        .update({ admin_notes: notes })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-verification-requests'] });
      toast.success('Notes updated');
    },
    onError: (error) => {
      toast.error(`Failed to update notes: ${error.message}`);
    },
  });

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (!requests) return [];

    return requests.filter((request) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        (request.display_name?.toLowerCase().includes(searchLower) ?? false) ||
        request.user_id.toLowerCase().includes(searchLower) ||
        (request.bio?.toLowerCase().includes(searchLower) ?? false);

      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const monthStart = startOfMonth(new Date());
  const pendingCount = requests?.filter((r) => r.status === 'pending').length ?? 0;
  const approvedThisMonth = requests?.filter(
    (r) => r.status === 'approved' && r.reviewed_at && isAfter(new Date(r.reviewed_at), monthStart)
  ).length ?? 0;
  const rejectedThisMonth = requests?.filter(
    (r) => r.status === 'rejected' && r.reviewed_at && isAfter(new Date(r.reviewed_at), monthStart)
  ).length ?? 0;

  // Handlers
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  const openDetailDialog = (request: CreatorVerificationRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes ?? '');
    setIsDetailOpen(true);
  };

  const openApproveDialog = (request: CreatorVerificationRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes ?? '');
    setIsApproveOpen(true);
  };

  const openRejectDialog = (request: CreatorVerificationRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setIsRejectOpen(true);
  };

  const handleSaveNotes = () => {
    if (selectedRequest) {
      updateNotesMutation.mutate({ requestId: selectedRequest.id, notes: adminNotes });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Creator Verification</h1>
        <p className="text-muted-foreground mt-1">
          Review and process creator verification requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{approvedThisMonth}</p>
              <p className="text-sm text-muted-foreground">Approved This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-400/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rejectedThisMonth}</p>
              <p className="text-sm text-muted-foreground">Rejected This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BadgeCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{verifiedCreatorsCount ?? 0}</p>
              <p className="text-sm text-muted-foreground">Verified Creators</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Creator Tiers Info */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Creator Tier Levels</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(TIER_CONFIG).map(([tier, config]) => (
              <div key={tier} className="flex items-center gap-2">
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {config.commission} commission - {config.requirements}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or bio..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value: VerificationStatus | 'all') =>
                handleFilterChange(setStatusFilter, value)
              }
            >
              <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : paginatedRequests.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">User</TableHead>
                      <TableHead className="text-muted-foreground hidden md:table-cell">Followers</TableHead>
                      <TableHead className="text-muted-foreground hidden md:table-cell">Recipes</TableHead>
                      <TableHead className="text-muted-foreground hidden lg:table-cell">Portfolio</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground hidden lg:table-cell">Submitted</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((request) => {
                      const statusConfig = STATUS_CONFIG[request.status];
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={request.id} className="border-border/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={request.avatar_url ?? undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(request.display_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate max-w-[150px]">
                                  {request.display_name ?? 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {request.user_id.substring(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {formatNumber(request.follower_count)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <ChefHat className="h-4 w-4" />
                              {request.recipe_count}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {request.portfolio_url ? (
                              <a
                                href={request.portfolio_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline text-sm"
                              >
                                View
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {format(new Date(request.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDetailDialog(request)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {request.status === 'pending' ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-emerald-500 hover:text-emerald-500"
                                    onClick={() => openApproveDialog(request)}
                                    title="Approve"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => openRejectDialog(request)}
                                    title="Reject"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : null}
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredRequests.length)} of{' '}
                    {filteredRequests.length}
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
              <BadgeCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No verification requests</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No creator verification requests have been submitted yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-muted-foreground" />
              Verification Request
            </DialogTitle>
            <DialogDescription>
              Review creator verification details
            </DialogDescription>
          </DialogHeader>

          {selectedRequest ? (
            <div className="space-y-4">
              {/* User Profile Summary */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedRequest.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getInitials(selectedRequest.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedRequest.display_name ?? 'Unknown'}
                    </h3>
                    <Badge variant="outline" className={STATUS_CONFIG[selectedRequest.status].color}>
                      {STATUS_CONFIG[selectedRequest.status].label}
                    </Badge>
                  </div>
                  {selectedRequest.bio ? (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {selectedRequest.bio}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatNumber(selectedRequest.follower_count)}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{selectedRequest.recipe_count}</p>
                  <p className="text-xs text-muted-foreground">Recipes</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {selectedRequest.engagement_rate ? `${selectedRequest.engagement_rate.toFixed(1)}%` : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
              </div>

              {/* Portfolio URL */}
              {selectedRequest.portfolio_url ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-2">Portfolio</p>
                  <a
                    href={selectedRequest.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline text-sm break-all"
                  >
                    {selectedRequest.portfolio_url}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
              ) : null}

              {/* Social Links */}
              {(selectedRequest.instagram_url || selectedRequest.youtube_url || selectedRequest.twitter_url) ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-2">Social Links</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedRequest.instagram_url ? (
                      <a
                        href={selectedRequest.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-pink-500 hover:underline text-sm"
                      >
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </a>
                    ) : null}
                    {selectedRequest.youtube_url ? (
                      <a
                        href={selectedRequest.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-red-500 hover:underline text-sm"
                      >
                        <Youtube className="h-4 w-4" />
                        YouTube
                      </a>
                    ) : null}
                    {selectedRequest.twitter_url ? (
                      <a
                        href={selectedRequest.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sky-500 hover:underline text-sm"
                      >
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Social Proof */}
              {selectedRequest.social_proof ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-2">Social Proof</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedRequest.social_proof}
                  </p>
                </div>
              ) : null}

              {/* Submission Date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Submitted: {format(new Date(selectedRequest.created_at), 'MMM d, yyyy h:mm a')}
              </div>

              {/* Rejection Reason (if rejected) */}
              {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason ? (
                <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20">
                  <p className="text-xs text-red-400 mb-1">Rejection Reason</p>
                  <p className="text-sm text-foreground">{selectedRequest.rejection_reason}</p>
                </div>
              ) : null}

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  className="min-h-[80px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={updateNotesMutation.isPending}
                >
                  {updateNotesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Notes'
                  )}
                </Button>
              </div>

              {/* Action Buttons for Pending Requests */}
              {selectedRequest.status === 'pending' ? (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openRejectDialog(selectedRequest);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openApproveDialog(selectedRequest);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Approve Creator
            </AlertDialogTitle>
            <AlertDialogDescription>
              Approve "{selectedRequest?.display_name ?? 'this creator'}" for verification?
              They will receive the Basic tier (15% commission) and their profile will be marked as verified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="approve-notes">Admin Notes (optional)</Label>
            <Textarea
              id="approve-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add any notes..."
              className="mt-1.5 min-h-[60px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => selectedRequest && approveMutation.mutate({ request: selectedRequest, notes: adminNotes })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Creator
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject Verification
            </DialogTitle>
            <DialogDescription>
              Reject "{selectedRequest?.display_name ?? 'this creator'}" verification request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                className="mt-1.5 min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be recorded in the request history.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && rejectMutation.mutate({ request: selectedRequest, reason: rejectionReason })}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
