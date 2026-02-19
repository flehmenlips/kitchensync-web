import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  UserPlus,
  UserMinus,
  Users,
  ChefHat,
} from 'lucide-react';

export function DiscoverUsersPage() {
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Get users (excluding self)
  const { data: users, isLoading } = useQuery({
    queryKey: ['discover-users', search],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (user) {
        query = query.neq('user_id', user.id);
      }

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,kitchen_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
  });

  // Get who we're following
  const { data: followingIds } = useQuery({
    queryKey: ['my-following-ids', user?.id],
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
          .eq('follower_id', user.id)
          .eq('following_id', targetId);
      } else {
        await supabase.from('user_follows').insert({
          follower_id: user.id,
          following_id: targetId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-following-ids'] });
      queryClient.invalidateQueries({ queryKey: ['discover-users'] });
    },
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Discover People</h1>
        <p className="text-sm text-muted-foreground">Find and follow other foodies</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary/30 border-border/50"
        />
      </div>

      {/* User list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card/60 border-border/40">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : users && users.length > 0 ? (
        <div className="space-y-2">
          {users.map((u: any) => {
            const isFollowing = followingIds?.has(u.user_id) || false;
            const initials = u.display_name
              ? u.display_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              : 'U';

            return (
              <Card key={u.id} className="bg-card/60 border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Link to={`/app/user/${u.user_id}`}>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/app/user/${u.user_id}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
                        {u.display_name || 'User'}
                      </Link>
                      {u.kitchen_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ChefHat className="h-3 w-3" />
                          {u.kitchen_name}
                        </p>
                      )}
                    </div>
                    {user && (
                      <Button
                        variant={isFollowing ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => followMutation.mutate({ targetId: u.user_id, isFollowing })}
                        disabled={followMutation.isPending}
                        className={isFollowing ? 'text-xs' : 'bg-primary text-primary-foreground text-xs'}
                      >
                        {isFollowing ? (
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
          <h3 className="text-lg font-semibold text-foreground">No users found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Try a different search term' : 'Be the first to join!'}
          </p>
        </div>
      )}
    </div>
  );
}
