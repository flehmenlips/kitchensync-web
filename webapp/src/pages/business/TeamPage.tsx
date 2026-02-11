import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  UserCog,
  Plus,
  Search,
  Mail,
  MoreHorizontal,
  Shield,
  Calendar,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { api } from '@/lib/api';

// Type for team member from API
interface TeamMember {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string | null;
  invitedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
}

export function TeamPage() {
  const { business } = useBusiness();

  // Fetch team members from API
  const { data: team = [], isLoading, error } = useQuery({
    queryKey: ['team', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      return api.get<TeamMember[]>(`/api/business/${business.id}/team`);
    },
    enabled: !!business?.id,
  });

  // Calculate stats from real data
  const totalStaff = team.length;
  const activeCount = team.filter(m => m.status === 'active').length;
  const onLeaveCount = team.filter(m => m.status === 'on_leave' || m.status === 'inactive').length;
  const invitedCount = team.filter(m => m.status === 'invited').length;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'manager':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'chef':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'server':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'bartender':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'host':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'staff':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'invited':
        return 'bg-blue-500/10 text-blue-400';
      case 'on_leave':
        return 'bg-amber-500/10 text-amber-400';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage your staff, schedules, and permissions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search team members..."
          className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{totalStaff}</p>
            )}
            <p className="text-sm text-muted-foreground">Total Staff</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
            )}
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <p className="text-2xl font-bold text-amber-400">{onLeaveCount}</p>
            )}
            <p className="text-sm text-muted-foreground">On Leave / Inactive</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <p className="text-2xl font-bold text-blue-400">{invitedCount}</p>
            )}
            <p className="text-sm text-muted-foreground">Pending Invites</p>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>All staff and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              Failed to load team members. Please try again.
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">No team members yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first team member to get started
              </p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      {member.user?.avatarUrl ? (
                        <AvatarImage src={member.user.avatarUrl} alt={member.user?.name || 'Team member'} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(member.user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">
                          {member.user?.name || 'Unknown User'}
                        </p>
                        <Badge className={getRoleColor(member.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {member.role}
                        </Badge>
                        <Badge variant="secondary" className={getStatusColor(member.status)}>
                          {member.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.user?.email || 'No email'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-16 md:ml-0">
                    <div className="text-right space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        {member.status === 'invited' ? 'Invited:' : 'Joined:'}{' '}
                        {formatDate(member.joinedAt || member.invitedAt || member.createdAt)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
