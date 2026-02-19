import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Repeat2,
  BookOpen,
  Check,
  ChevronRight,
  Users,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  repost: Repeat2,
  new_recipe: BookOpen,
  follow_request: UserPlus,
  mention: MessageCircle,
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Notifications error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Check pending follow requests
  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-follow-requests-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('follow_requests')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', user.id)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => markAllRead.mutate()}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Follow requests banner */}
      {(pendingRequests || 0) > 0 && (
        <Link to="/app/follow-requests">
          <Card className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Follow Requests</p>
                <p className="text-xs text-muted-foreground">{pendingRequests} pending</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-1">
          {notifications.map((notif: any) => {
            const Icon = iconMap[notif.type] || Bell;
            return (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer',
                  notif.is_read
                    ? 'hover:bg-secondary/30'
                    : 'bg-primary/5 hover:bg-primary/10'
                )}
                onClick={() => {
                  if (notif.target_id && notif.target_type === 'recipe') {
                    navigate(`/app/community/${notif.target_id}`);
                  } else if (notif.actor_id) {
                    navigate(`/app/user/${notif.actor_id}`);
                  }
                }}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  notif.is_read ? 'bg-secondary/30' : 'bg-primary/10'
                )}>
                  <Icon className={cn('h-4 w-4', notif.is_read ? 'text-muted-foreground' : 'text-primary')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', notif.is_read ? 'text-muted-foreground' : 'text-foreground')}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(notif.created_at)}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No notifications</h3>
          <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}

function formatTime(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
