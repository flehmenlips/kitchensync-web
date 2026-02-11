import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Shield, Trash2, Loader2, Crown, UserCog, Edit3, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

interface AdminUserData {
  id: string;
  user_id?: string;
  email?: string;
  role: AdminRole;
  created_at: string;
}

const roles: AdminRole[] = ['superadmin', 'admin', 'content_editor'];

const roleColors: Record<AdminRole, string> = {
  superadmin: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  admin: 'bg-primary/10 text-primary border-primary/20',
  content_editor: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
};

const roleIcons: Record<AdminRole, React.ComponentType<{ className?: string }>> = {
  superadmin: Crown,
  admin: Shield,
  content_editor: Edit3,
};

const roleDescriptions: Record<AdminRole, string> = {
  superadmin: 'Full access to all features including admin management',
  admin: 'Can manage recipes, tips, and view users',
  content_editor: 'Can only manage shared recipes and tips',
};

export function AdminUsersPage() {
  const { isSuperAdmin, adminUser } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUserData | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('content_editor');

  // Debug log
  console.log('AdminUsersPage - isSuperAdmin:', isSuperAdmin, 'adminUser:', adminUser);

  const { data: admins, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      console.log('Fetching admin users...');
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Admin users query result:', data, 'error:', error);
      if (error) throw error;
      return (data ?? []) as AdminUserData[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AdminRole }) => {
      // First, look up the user by email in auth.users
      // Since we can't directly query auth.users, we'll need to handle this differently
      // For now, we'll create the admin user with the email
      // In a real setup, you'd use a server function or edge function to look up the user_id

      const { error } = await supabase.from('admin_users').insert({
        email,
        role,
        user_id: email, // This should be the actual user_id from auth.users
      } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Admin added successfully');
      setIsAddOpen(false);
      setEmail('');
      setRole('content_editor');
    },
    onError: (error) => {
      toast.error(`Failed to add admin: ${error.message}`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AdminRole }) => {
      const { error } = await supabase.from('admin_users').update({ role } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated successfully');
      setIsEditOpen(false);
      setSelectedAdmin(null);
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Admin removed successfully');
      setIsDeleteOpen(false);
      setSelectedAdmin(null);
    },
    onError: (error) => {
      toast.error(`Failed to remove admin: ${error.message}`);
    },
  });

  const openEdit = (admin: AdminUserData) => {
    setSelectedAdmin(admin);
    setRole(admin.role);
    setIsEditOpen(true);
  };

  const openDelete = (admin: AdminUserData) => {
    setSelectedAdmin(admin);
    setIsDeleteOpen(true);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive/50 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-muted-foreground max-w-md">
          Only superadmins can manage admin users. Contact a superadmin if you need access to this feature.
        </p>
      </div>
    );
  }

  // Show error if query failed
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive/50 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Error Loading Admin Users</h1>
        <p className="text-muted-foreground max-w-md">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage admin access and permissions
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Role Legend */}
      <div className="grid sm:grid-cols-3 gap-4">
        {roles.map((r) => {
          const Icon = roleIcons[r];
          return (
            <Card key={r} className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${roleColors[r]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base capitalize">{r.replace('_', ' ')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{roleDescriptions[r]}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admins Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : admins && admins.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">Admin</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Added</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const Icon = roleIcons[admin.role];
                    const isCurrentUser = (admin.user_id || admin.id) === adminUser?.user_id;
                    return (
                      <TableRow key={admin.id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${roleColors[admin.role]}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[200px]">
                                {admin.email}
                                {isCurrentUser ? (
                                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                ) : null}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                ID: {(admin.user_id || admin.id).substring(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleColors[admin.role]}>
                            {admin.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {format(new Date(admin.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(admin)}
                              disabled={isCurrentUser}
                              title={isCurrentUser ? "Can't edit your own role" : 'Edit role'}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDelete(admin)}
                              disabled={isCurrentUser}
                              title={isCurrentUser ? "Can't remove yourself" : 'Remove admin'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
              <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No admins found</h3>
              <p className="text-muted-foreground mb-4">Add your first admin to get started</p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
            <DialogDescription>
              Add a new admin user. They must already have a KitchenSync account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: AdminRole) => setRole(value)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{roleDescriptions[role]}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate({ email, role })}
              disabled={addMutation.isPending || !email}
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Admin'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedAdmin?.email}
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select value={role} onValueChange={(value: AdminRole) => setRole(value)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{roleDescriptions[role]}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedAdmin && updateRoleMutation.mutate({ id: selectedAdmin.id, role })}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin access for "{selectedAdmin?.email}"?
              They will no longer be able to access the admin console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedAdmin && deleteMutation.mutate(selectedAdmin.id)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
