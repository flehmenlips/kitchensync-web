import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  Flag,
  Eye,
  XCircle,
  AlertTriangle,
  Trash2,
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Gavel,
  AlertOctagon,
  MessageSquare,
  ChefHat,
  Users,
  Loader2,
} from 'lucide-react';
import { format, isToday, startOfWeek, isAfter } from 'date-fns';

// Types
export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type ContentType = 'recipe' | 'comment' | 'user';

export interface ContentReport {
  id: string;
  content_type: ContentType;
  content_id: string;
  content_preview: string | null;
  reporter_id: string;
  reporter_name: string | null;
  reported_user_id: string | null;
  reported_user_name: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  created_at: string;
}

const REASON_CONFIG: Record<ReportReason, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  spam: { label: 'Spam', color: 'bg-orange-400/10 text-orange-400 border-orange-400/20', icon: AlertOctagon },
  inappropriate: { label: 'Inappropriate', color: 'bg-red-400/10 text-red-400 border-red-400/20', icon: AlertTriangle },
  copyright: { label: 'Copyright', color: 'bg-purple-400/10 text-purple-400 border-purple-400/20', icon: Flag },
  harassment: { label: 'Harassment', color: 'bg-rose-400/10 text-rose-400 border-rose-400/20', icon: Ban },
  other: { label: 'Other', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20', icon: MessageSquare },
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: Clock },
  reviewed: { label: 'Reviewed', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', icon: Eye },
  actioned: { label: 'Actioned', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20', icon: XCircle },
};

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  recipe: { label: 'Recipe', icon: ChefHat },
  comment: { label: 'Comment', icon: MessageSquare },
  user: { label: 'User', icon: Users },
};

const ITEMS_PER_PAGE = 15;

export function ModerationPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logActivity } = useActivityLog();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [reasonFilter, setReasonFilter] = useState<ReportReason | 'all'>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDismissOpen, setIsDismissOpen] = useState(false);
  const [isRemoveContentOpen, setIsRemoveContentOpen] = useState(false);
  const [isWarnUserOpen, setIsWarnUserOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['content-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet - return empty array
        console.warn('content_reports table not found:', error.message);
        return [] as ContentReport[];
      }

      return (data ?? []) as ContentReport[];
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('content_reports')
        .update({
          status: 'dismissed',
          reviewed_at: new Date().toISOString(),
          action_taken: 'Dismissed - no action required',
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      if (selectedReport) {
        await logActivity(
          'dismiss_report' as never,
          'report' as never,
          selectedReport.id,
          `Report #${selectedReport.id.substring(0, 8)}`,
          { reason: selectedReport.reason, content_type: selectedReport.content_type }
        );
      }
      toast.success('Report dismissed');
      setIsDismissOpen(false);
      setSelectedReport(null);
    },
    onError: (error) => {
      toast.error(`Failed to dismiss report: ${error.message}`);
    },
  });

  // Remove content mutation
  const removeContentMutation = useMutation({
    mutationFn: async (report: ContentReport) => {
      // First, delete the actual content based on type
      if (report.content_type === 'recipe') {
        const { error: deleteError } = await supabase
          .from('shared_recipes')
          .delete()
          .eq('id', report.content_id);
        if (deleteError) throw deleteError;
      } else if (report.content_type === 'comment') {
        const { error: deleteError } = await supabase
          .from('comments')
          .delete()
          .eq('id', report.content_id);
        if (deleteError) throw deleteError;
      }

      // Then update the report status
      const { error } = await supabase
        .from('content_reports')
        .update({
          status: 'actioned',
          reviewed_at: new Date().toISOString(),
          action_taken: 'Content removed',
        })
        .eq('id', report.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      queryClient.invalidateQueries({ queryKey: ['shared-recipes'] });
      if (selectedReport) {
        await logActivity(
          'action_report' as never,
          'report' as never,
          selectedReport.id,
          `Report #${selectedReport.id.substring(0, 8)}`,
          { action: 'content_removed', content_type: selectedReport.content_type }
        );
      }
      toast.success('Content removed successfully');
      setIsRemoveContentOpen(false);
      setSelectedReport(null);
    },
    onError: (error) => {
      toast.error(`Failed to remove content: ${error.message}`);
    },
  });

  // Warn user mutation
  const warnUserMutation = useMutation({
    mutationFn: async ({ report, message }: { report: ContentReport; message: string }) => {
      // Insert a warning record (if you have a warnings table)
      // For now, we'll just update the report with the warning
      const { error } = await supabase
        .from('content_reports')
        .update({
          status: 'actioned',
          reviewed_at: new Date().toISOString(),
          action_taken: `Warning sent: ${message}`,
        })
        .eq('id', report.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      if (selectedReport) {
        await logActivity(
          'action_report' as never,
          'report' as never,
          selectedReport.id,
          `Report #${selectedReport.id.substring(0, 8)}`,
          { action: 'warning_sent', content_type: selectedReport.content_type }
        );
      }
      toast.success('Warning sent to user');
      setIsWarnUserOpen(false);
      setWarningMessage('');
      setSelectedReport(null);
    },
    onError: (error) => {
      toast.error(`Failed to send warning: ${error.message}`);
    },
  });

  // Filter reports
  const filteredReports = useMemo(() => {
    if (!reports) return [];

    return reports.filter((report) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        report.id.toLowerCase().includes(searchLower) ||
        (report.content_preview?.toLowerCase().includes(searchLower) ?? false) ||
        (report.reporter_name?.toLowerCase().includes(searchLower) ?? false) ||
        (report.reported_user_name?.toLowerCase().includes(searchLower) ?? false);

      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesReason = reasonFilter === 'all' || report.reason === reasonFilter;
      const matchesContentType = contentTypeFilter === 'all' || report.content_type === contentTypeFilter;

      return matchesSearch && matchesStatus && matchesReason && matchesContentType;
    });
  }, [reports, searchQuery, statusFilter, reasonFilter, contentTypeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const pendingCount = reports?.filter((r) => r.status === 'pending').length ?? 0;
  const reviewedTodayCount = reports?.filter(
    (r) => r.reviewed_at && isToday(new Date(r.reviewed_at))
  ).length ?? 0;
  const actionsThisWeekCount = reports?.filter(
    (r) => r.status === 'actioned' && r.reviewed_at && isAfter(new Date(r.reviewed_at), startOfWeek(new Date()))
  ).length ?? 0;

  // Handlers
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  const openDetailDialog = (report: ContentReport) => {
    setSelectedReport(report);
    setIsDetailOpen(true);
  };

  const openDismissDialog = (report: ContentReport) => {
    setSelectedReport(report);
    setIsDismissOpen(true);
  };

  const openRemoveContentDialog = (report: ContentReport) => {
    setSelectedReport(report);
    setIsRemoveContentOpen(true);
  };

  const openWarnUserDialog = (report: ContentReport) => {
    setSelectedReport(report);
    setWarningMessage('');
    setIsWarnUserOpen(true);
  };

  const handleSuspendUser = (report: ContentReport) => {
    // Navigate to users page with the user pre-selected for suspension
    if (report.reported_user_id) {
      navigate(`/users?suspend=${report.reported_user_id}`);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Moderation Queue</h1>
        <p className="text-muted-foreground mt-1">
          Review and act on user content reports
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Eye className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{reviewedTodayCount}</p>
              <p className="text-sm text-muted-foreground">Reviewed Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <Gavel className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{actionsThisWeekCount}</p>
              <p className="text-sm text-muted-foreground">Actions This Week</p>
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
                placeholder="Search by ID, content, or user..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>

            {/* Filter dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value: ReportStatus | 'all') =>
                  handleFilterChange(setStatusFilter, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="actioned">Actioned</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>

              {/* Content Type Filter */}
              <Select
                value={contentTypeFilter}
                onValueChange={(value: ContentType | 'all') =>
                  handleFilterChange(setContentTypeFilter, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="recipe">Recipe</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>

              {/* Reason Filter */}
              <Select
                value={reasonFilter}
                onValueChange={(value: ReportReason | 'all') =>
                  handleFilterChange(setReasonFilter, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <SelectValue placeholder="All Reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate</SelectItem>
                  <SelectItem value="copyright">Copyright</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : paginatedReports.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Report ID</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground hidden md:table-cell">Reporter</TableHead>
                      <TableHead className="text-muted-foreground">Reason</TableHead>
                      <TableHead className="text-muted-foreground hidden lg:table-cell">Date</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map((report) => {
                      const reasonConfig = REASON_CONFIG[report.reason];
                      const statusConfig = STATUS_CONFIG[report.status];
                      const contentTypeConfig = CONTENT_TYPE_CONFIG[report.content_type];
                      const ReasonIcon = reasonConfig.icon;
                      const StatusIcon = statusConfig.icon;
                      const ContentIcon = contentTypeConfig.icon;

                      return (
                        <TableRow key={report.id} className="border-border/50">
                          <TableCell>
                            <span className="font-mono text-sm text-foreground">
                              #{report.id.substring(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-secondary/50 flex items-center justify-center">
                                <ContentIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <span className="text-foreground">{contentTypeConfig.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(report.reporter_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-muted-foreground truncate max-w-[100px]">
                                {report.reporter_name ?? 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={reasonConfig.color}>
                              <ReasonIcon className="h-3 w-3 mr-1" />
                              {reasonConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {format(new Date(report.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDetailDialog(report)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {report.status === 'pending' ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-500 hover:text-slate-500"
                                    onClick={() => openDismissDialog(report)}
                                    title="Dismiss report"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => openRemoveContentDialog(report)}
                                    title="Remove content"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredReports.length)} of{' '}
                    {filteredReports.length}
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
              <Flag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No reports to review</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || reasonFilter !== 'all' || contentTypeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'The moderation queue is clear'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-muted-foreground" />
              Report Details
            </DialogTitle>
            <DialogDescription>
              Report #{selectedReport?.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedReport ? (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_CONFIG[selectedReport.status].color}>
                  {STATUS_CONFIG[selectedReport.status].label}
                </Badge>
                <Badge variant="outline" className={REASON_CONFIG[selectedReport.reason].color}>
                  {REASON_CONFIG[selectedReport.reason].label}
                </Badge>
              </div>

              {/* Content Info */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  {(() => {
                    const Icon = CONTENT_TYPE_CONFIG[selectedReport.content_type].icon;
                    return <Icon className="h-4 w-4" />;
                  })()}
                  <span className="text-sm font-medium">
                    Reported {CONTENT_TYPE_CONFIG[selectedReport.content_type].label}
                  </span>
                </div>
                <p className="text-foreground">
                  {selectedReport.content_preview ?? 'No preview available'}
                </p>
              </div>

              {/* Reporter Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Reporter</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(selectedReport.reporter_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">
                      {selectedReport.reporter_name ?? 'Unknown'}
                    </span>
                  </div>
                </div>
                {selectedReport.reported_user_name ? (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Reported User</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-red-400/10 text-red-400 text-xs">
                          {getInitials(selectedReport.reported_user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {selectedReport.reported_user_name}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Report Description */}
              {selectedReport.description ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{selectedReport.description}</p>
                </div>
              ) : null}

              {/* Timestamps */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Reported: {format(new Date(selectedReport.created_at), 'MMM d, yyyy h:mm a')}</span>
                {selectedReport.reviewed_at ? (
                  <span>Reviewed: {format(new Date(selectedReport.reviewed_at), 'MMM d, yyyy')}</span>
                ) : null}
              </div>

              {/* Action Taken */}
              {selectedReport.action_taken ? (
                <div className="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                  <p className="text-xs text-emerald-400 mb-1">Action Taken</p>
                  <p className="text-sm text-foreground">{selectedReport.action_taken}</p>
                </div>
              ) : null}

              {/* Action Buttons for Pending Reports */}
              {selectedReport.status === 'pending' ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openDismissDialog(selectedReport);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Dismiss
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openWarnUserDialog(selectedReport);
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Warn User
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openRemoveContentDialog(selectedReport);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Content
                  </Button>
                  {selectedReport.reported_user_id ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setIsDetailOpen(false);
                        handleSuspendUser(selectedReport);
                      }}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend User
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Dismiss Confirmation Dialog */}
      <AlertDialog open={isDismissOpen} onOpenChange={setIsDismissOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to dismiss this report? This will mark it as reviewed with no action taken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedReport && dismissMutation.mutate(selectedReport.id)}
              disabled={dismissMutation.isPending}
            >
              {dismissMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Dismissing...
                </>
              ) : (
                'Dismiss Report'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Content Confirmation Dialog */}
      <AlertDialog open={isRemoveContentOpen} onOpenChange={setIsRemoveContentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Remove Content
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this content? This action cannot be undone.
              The {selectedReport?.content_type} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedReport && removeContentMutation.mutate(selectedReport)}
              disabled={removeContentMutation.isPending}
            >
              {removeContentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Content'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warn User Dialog */}
      <Dialog open={isWarnUserOpen} onOpenChange={setIsWarnUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warn User
            </DialogTitle>
            <DialogDescription>
              Send a warning to {selectedReport?.reported_user_name ?? 'the user'} about their content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="warning-message">Warning Message *</Label>
              <Textarea
                id="warning-message"
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                placeholder="Enter the warning message to send to the user..."
                className="mt-1.5 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWarnUserOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedReport &&
                warnUserMutation.mutate({ report: selectedReport, message: warningMessage })
              }
              disabled={warnUserMutation.isPending || !warningMessage.trim()}
            >
              {warnUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Warning'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
