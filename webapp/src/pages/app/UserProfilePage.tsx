import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  UserCheck,
  ChefHat,
  BookOpen,
  Loader2,
} from 'lucide-react';

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!id,
  });

  // Use denormalized counts from user_profiles (matching iOS pattern)
  const stats = profile ? {
    followers: profile.follower_count || 0,
    following: profile.following_count || 0,
    recipes: profile.shared_recipe_count || 0,
  } : { followers: 0, following: 0, recipes: 0 };

  // Check follow status: following, pending request, or none
  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', user?.id, id],
    queryFn: async () => {
      if (!user || !id || user.id === id) return 'none' as const;
      // Check if already following
      const { data: follow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .maybeSingle();
      if (follow) return 'following' as const;

      // Check if there's a pending follow request
      const { data: request } = await supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('target_id', id)
        .eq('status', 'pending')
        .maybeSingle();
      if (request) return 'requested' as const;

      return 'none' as const;
    },
    enabled: !!user && !!id && user.id !== id,
  });
  const isFollowing = followStatus === 'following';

  const { data: sharedRecipes } = useQuery({
    queryKey: ['user-shared-recipes', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('user_shared_recipes')
        .select(`
          *,
          recipe:recipes (
            id, title, description, image_url, image_urls
          )
        `)
        .eq('user_id', id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(12);
      // Flatten recipe details
      return (data || []).map(item => ({
        ...item,
        title: item.recipe?.title || item.caption || 'Recipe',
        image_url: item.recipe?.image_url,
        image_urls: item.recipe?.image_urls,
      }));
    },
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('Missing data');
      if (isFollowing) {
        // Unfollow
        await supabase.from('user_follows').delete()
          .eq('follower_id', user.id)
          .eq('following_id', id);
      } else if (followStatus === 'requested') {
        // Cancel pending request
        await supabase.from('follow_requests').delete()
          .eq('requester_id', user.id)
          .eq('target_id', id)
          .eq('status', 'pending');
      } else {
        // Check if target requires follow approval
        if (profile?.require_follow_approval || profile?.is_private) {
          // Send follow request
          await supabase.from('follow_requests').insert({
            requester_id: user.id,
            target_id: id,
            status: 'pending',
          });
          toast.success('Follow request sent');
        } else {
          // Direct follow
          await supabase.from('user_follows').insert({
            follower_id: user.id,
            following_id: id,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', id] });
    },
  });

  const isOwnProfile = user?.id === id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <h3 className="text-lg font-semibold text-foreground">User not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const initials = profile.display_name
    ? profile.display_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Profile header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <Avatar className="h-20 w-20 border-2 border-primary/20">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">{profile.display_name || 'User'}</h1>
          {profile.kitchen_name && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <ChefHat className="h-3 w-3" />
              {profile.kitchen_name}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="font-semibold text-foreground">{stats?.recipes || 0}</p>
            <p className="text-muted-foreground text-xs">Recipes</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <Link to={`/app/followers/${id}`} className="text-center hover:opacity-80 transition-opacity">
            <p className="font-semibold text-foreground">{stats?.followers || 0}</p>
            <p className="text-muted-foreground text-xs">Followers</p>
          </Link>
          <Separator orientation="vertical" className="h-8" />
          <Link to={`/app/followers/${id}`} className="text-center hover:opacity-80 transition-opacity">
            <p className="font-semibold text-foreground">{stats?.following || 0}</p>
            <p className="text-muted-foreground text-xs">Following</p>
          </Link>
        </div>

        {!isOwnProfile && user && (
          <Button
            variant={isFollowing || followStatus === 'requested' ? 'outline' : 'default'}
            size="sm"
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            className={isFollowing || followStatus === 'requested' ? '' : 'bg-primary text-primary-foreground'}
          >
            {isFollowing ? (
              <><UserMinus className="h-3.5 w-3.5 mr-1.5" /> Unfollow</>
            ) : followStatus === 'requested' ? (
              <><UserCheck className="h-3.5 w-3.5 mr-1.5" /> Requested</>
            ) : (
              <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Follow</>
            )}
          </Button>
        )}
      </div>

      {/* Shared recipes */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Shared Recipes
        </h2>
        {sharedRecipes && sharedRecipes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sharedRecipes.map((recipe: any) => (
              <div
                key={recipe.id}
                className="aspect-square rounded-lg bg-secondary/30 border border-border/40 overflow-hidden hover:border-primary/30 transition-colors relative cursor-pointer"
                onClick={() => navigate(`/app/community/${recipe.id}`)}
              >
                {(recipe.image_url || recipe.image_urls?.[0]) ? (
                  <img src={recipe.image_url || recipe.image_urls[0]} alt={recipe.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white font-medium truncate">{recipe.title}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No shared recipes yet
          </div>
        )}
      </div>
    </div>
  );
}
