import { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  ChefHat,
  Users,
  Loader2,
} from 'lucide-react';

export function FollowersPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useCustomerAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialTab = searchParams.get('tab') === 'following' ? 'following' : 'followers';
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);

  const targetUserId = id || user?.id;

  const { data: profile } = useQuery({
    queryKey: ['user-profile-name', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', targetUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId,
  });

  const { data: followers, isLoading: loadingFollowers } = useQuery({
    queryKey: ['followers-list', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', targetUserId);
      if (!data?.length) return [];

      const ids = data.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, kitchen_name, avatar_url, handle')
        .in('user_id', ids);
      return profiles || [];
    },
    enabled: !!targetUserId && tab === 'followers',
  });

  const { data: following, isLoading: loadingFollowing } = useQuery({
    queryKey: ['following-list', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', targetUserId);
      if (!data?.length) return [];

      const ids = data.map(f => f.following_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, kitchen_name, avatar_url, handle')
        .in('user_id', ids);
      return profiles || [];
    },
    enabled: !!targetUserId && tab === 'following',
  });

  // Track who current user follows (for follow/unfollow buttons)
  const { data: myFollowingIds } = useQuery({
    queryKey: ['my-following-set', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);
      return new Set((data || []).map(f => f.following_id));
    },
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async ({ targetId, isFollowing }: { targetId: string; isFollowing: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (isFollowing) {
        await supabase.from('user_follows').delete()
          .eq('follower_id', user.id).eq('following_id', targetId);
      } else {
        await supabase.from('user_follows').insert({
          follower_id: user.id, following_id: targetId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-following-set'] });
      queryClient.invalidateQueries({ queryKey: ['followers-list'] });
      queryClient.invalidateQueries({ queryKey: ['following-list'] });
    },
  });

  const isOwnProfile = targetUserId === user?.id;
  const displayName = isOwnProfile ? 'You' : (profile?.display_name || 'User');
  const items = tab === 'followers' ? followers : following;
  const isLoading = tab === 'followers' ? loadingFollowers : loadingFollowing;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'followers' | 'following')}>
        <TabsList className="w-full bg-secondary/30">
          <TabsTrigger value="followers" className="flex-1">Followers</TabsTrigger>
          <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((p: any) => {
            const isFollowed = myFollowingIds?.has(p.user_id) || false;
            const isSelf = p.user_id === user?.id;
            const initials = p.display_name
              ? p.display_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              : 'U';

            return (
              <Card key={p.user_id} className="bg-card/60 border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Link to={`/app/user/${p.user_id}`}>
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={p.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/app/user/${p.user_id}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
                        {p.display_name || 'User'}
                      </Link>
                      {p.kitchen_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <ChefHat className="h-3 w-3 shrink-0" />
                          {p.kitchen_name}
                        </p>
                      )}
                    </div>
                    {!isSelf && user && (
                      <Button
                        variant={isFollowed ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => followMutation.mutate({ targetId: p.user_id, isFollowing: isFollowed })}
                        disabled={followMutation.isPending}
                        className={isFollowed ? 'text-xs' : 'bg-primary text-primary-foreground text-xs'}
                      >
                        {isFollowed ? (
                          <><UserMinus className="h-3 w-3 mr-1" /> Unfollow</>
                        ) : (
                          <><UserPlus className="h-3 w-3 mr-1" /> Follow</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          </p>
        </div>
      )}
    </div>
  );
}
