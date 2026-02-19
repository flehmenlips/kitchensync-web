import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  UserCheck,
  UserX,
  Users,
  Loader2,
  ChefHat,
} from 'lucide-react';

export function FollowRequestsPage() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['follow-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('follow_requests')
        .select('*')
        .eq('target_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error || !data?.length) return [];

      // Fetch requester profiles
      const ids = data.map(r => r.requester_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, kitchen_name, avatar_url, handle')
        .in('user_id', ids);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return data.map(r => ({
        ...r,
        profile: profileMap.get(r.requester_id) || null,
      }));
    },
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const request = requests?.find(r => r.id === requestId);
      if (!request || !user) throw new Error('Request not found');

      const { error: updateErr } = await supabase.from('follow_requests').update({ status: 'approved' }).eq('id', requestId);
      if (updateErr) throw updateErr;

      const { error: insertErr } = await supabase.from('user_follows').insert({
        follower_id: request.requester_id,
        following_id: user.id,
      });
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests'] });
      queryClient.invalidateQueries({ queryKey: ['followers-list'] });
      toast.success('Follow request approved');
    },
    onError: () => toast.error('Failed to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await supabase.from('follow_requests').update({ status: 'rejected' }).eq('id', requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests'] });
      toast.success('Follow request rejected');
    },
    onError: () => toast.error('Failed to reject request'),
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      if (!user || !requests?.length) return;
      // Approve all and create follows
      for (const request of requests) {
        await supabase.from('follow_requests').update({ status: 'approved' }).eq('id', request.id);
        await supabase.from('user_follows').insert({
          follower_id: request.requester_id,
          following_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests'] });
      queryClient.invalidateQueries({ queryKey: ['followers-list'] });
      toast.success('All requests approved');
    },
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Follow Requests</h1>
            <p className="text-xs text-muted-foreground">
              {requests?.length || 0} pending {(requests?.length || 0) === 1 ? 'request' : 'requests'}
            </p>
          </div>
        </div>
        {(requests?.length || 0) > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => approveAllMutation.mutate()}
            disabled={approveAllMutation.isPending}
            className="text-xs"
          >
            <UserCheck className="h-3 w-3 mr-1" />
            Approve All
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : requests && requests.length > 0 ? (
        <div className="space-y-2">
          {requests.map((req: any) => {
            const p = req.profile;
            const initials = p?.display_name
              ? p.display_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              : 'U';

            return (
              <Card key={req.id} className="bg-card/60 border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="h-11 w-11 cursor-pointer"
                      onClick={() => navigate(`/app/user/${req.requester_id}`)}
                    >
                      <AvatarImage src={p?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-foreground hover:text-primary cursor-pointer truncate"
                        onClick={() => navigate(`/app/user/${req.requester_id}`)}
                      >
                        {p?.display_name || 'User'}
                      </p>
                      {p?.kitchen_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <ChefHat className="h-3 w-3 shrink-0" />
                          {p.kitchen_name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground text-xs h-8"
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending}
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <UserX className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div>
            <h3 className="text-base font-semibold text-foreground">No pending requests</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When someone requests to follow you, it will appear here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
