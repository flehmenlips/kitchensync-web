import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search,
  Users,
  BookOpen,
  Calendar,
  ChefHat,
  Eye,
  Ban,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

interface UserWithRecipeCount extends UserProfile {
  recipe_count: number;
}

type StatusFilter = 'all' | 'active' | 'suspended';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRecipeCount | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isUnsuspendOpen, setIsUnsuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendUntil, setSuspendUntil] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get recipe counts for each user
      const profilesWithCounts: UserWithRecipeCount[] = [];

      for (const profile of (profiles ?? [])) {
        const typedProfile = profile as UserProfile;
        const { count } = await supabase
          .from('recipes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', typedProfile.user_id);

        profilesWithCounts.push({
          ...typedProfile,
          recipe_count: count ?? 0,
        });
      }

      return profilesWithCounts;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
      until,
    }: {
      userId: string;
      reason: string;
      until: string | null;
    }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_reason: reason,
          suspended_until: until,
        } as never)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User suspended successfully');
      setIsSuspendOpen(false);
      setSelectedUser(null);
      setSuspendReason('');
      setSuspendUntil('');
    },
    onError: (error) => {
      toast.error(`Failed to suspend user: ${error.message}`);
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_reason: null,
          suspended_until: null,
        } as never)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User unsuspended successfully');
      setIsUnsuspendOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error(`Failed to unsuspend user: ${error.message}`);
    },
  });

  const openUserDetail = (user: UserWithRecipeCount) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
  };

  const openSuspendDialog = (user: UserWithRecipeCount) => {
    setSelectedUser(user);
    setSuspendReason('');
    setSuspendUntil('');
    setIsSuspendOpen(true);
  };

  const openUnsuspendDialog = (user: UserWithRecipeCount) => {
    setSelectedUser(user);
    setIsUnsuspendOpen(true);
  };

  const handleSuspend = () => {
    if (selectedUser && suspendReason.trim()) {
      suspendMutation.mutate({
        userId: selectedUser.user_id,
        reason: suspendReason.trim(),
        until: suspendUntil ? new Date(suspendUntil).toISOString() : null,
      });
    }
  };

  const handleUnsuspend = () => {
    if (selectedUser) {
      unsuspendMutation.mutate(selectedUser.user_id);
    }
  };

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (user.display_name?.toLowerCase().includes(searchLower) ?? false) ||
      (user.kitchen_name?.toLowerCase().includes(searchLower) ?? false) ||
      user.user_id.toLowerCase().includes(searchLower);

    const isSuspended = user.is_suspended === true;

    if (statusFilter === 'active') {
      return matchesSearch && !isSuspended;
    } else if (statusFilter === 'suspended') {
      return matchesSearch && isSuspended;
    }
    return matchesSearch;
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const totalUsers = users?.length ?? 0;
  const activeUsers = users?.filter((u) => !u.is_suspended).length ?? 0;
  const suspendedUsers = users?.filter((u) => u.is_suspended === true).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts and suspensions
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or kitchen name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="suspended">Suspended Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-400/10 flex items-center justify-center">
              <Ban className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{suspendedUsers}</p>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users?.filter((u) => u.recipe_count > 0 && !u.is_suspended).length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Active Cooks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">User</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Kitchen Name</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">Recipes</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isSuspended = user.is_suspended === true;
                    return (
                      <TableRow
                        key={user.id}
                        className={`border-border/50 ${isSuspended ? 'opacity-60' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className={`h-10 w-10 ${isSuspended ? 'grayscale' : ''}`}>
                              <AvatarImage src={user.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(user.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground truncate max-w-[150px]">
                                  {user.display_name ?? 'Unnamed User'}
                                </p>
                                {isSuspended ? (
                                  <Badge variant="destructive" className="text-xs">
                                    Suspended
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.user_id.substring(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {isSuspended ? (
                            <Badge variant="destructive" className="bg-red-400/10 text-red-400 border-red-400/20">
                              <Ban className="h-3 w-3 mr-1" />
                              Suspended
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {user.kitchen_name ?? '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            {user.recipe_count}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openUserDetail(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isSuspended ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-emerald-500 hover:text-emerald-500"
                                onClick={() => openUnsuspendDialog(user)}
                                title="Unsuspend user"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openSuspendDialog(user)}
                                title="Suspend user"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'No users have signed up yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View user profile information</DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className={`h-16 w-16 ${selectedUser.is_suspended ? 'grayscale' : ''}`}>
                  <AvatarImage src={selectedUser.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getInitials(selectedUser.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedUser.display_name ?? 'Unnamed User'}
                    </h3>
                    {selectedUser.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : null}
                  </div>
                  {selectedUser.kitchen_name ? (
                    <p className="text-muted-foreground">{selectedUser.kitchen_name}</p>
                  ) : null}
                </div>
              </div>

              {selectedUser.is_suspended ? (
                <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Suspension Details</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium">Reason:</span>{' '}
                      {selectedUser.suspended_reason ?? 'No reason provided'}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">Suspended on:</span>{' '}
                      {selectedUser.suspended_at
                        ? format(new Date(selectedUser.suspended_at), 'MMM d, yyyy h:mm a')
                        : 'Unknown'}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">Expires:</span>{' '}
                      {selectedUser.suspended_until
                        ? format(new Date(selectedUser.suspended_until), 'MMM d, yyyy h:mm a')
                        : 'Permanent'}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm">Recipes</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{selectedUser.recipe_count}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Joined</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {format(new Date(selectedUser.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground mb-1">User ID</p>
                <p className="text-sm font-mono text-foreground break-all">{selectedUser.user_id}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Suspend User
            </DialogTitle>
            <DialogDescription>
              Suspend "{selectedUser?.display_name ?? 'this user'}" from using the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="suspend-reason">Reason for Suspension *</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspending this user..."
                className="mt-1.5 min-h-[100px]"
              />
            </div>
            <div>
              <Label htmlFor="suspend-until">Suspension Expiry (optional)</Label>
              <Input
                id="suspend-until"
                type="datetime-local"
                value={suspendUntil}
                onChange={(e) => setSuspendUntil(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for permanent suspension
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={suspendMutation.isPending || !suspendReason.trim()}
            >
              {suspendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsuspend Confirmation Dialog */}
      <AlertDialog open={isUnsuspendOpen} onOpenChange={setIsUnsuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsuspend User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unsuspend "{selectedUser?.display_name ?? 'this user'}"?
              They will regain full access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleUnsuspend}
            >
              {unsuspendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unsuspending...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Unsuspend
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
