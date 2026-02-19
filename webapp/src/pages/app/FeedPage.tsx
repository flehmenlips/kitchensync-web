import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Heart,
  MessageCircle,
  Bookmark,
  BookOpen,
  Users,
  ChefHat,
} from 'lucide-react';

export function FeedPage() {
  const { user } = useCustomerAuth();
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');

  const { data: feedItems, isLoading } = useQuery({
    queryKey: ['feed', tab, user?.id],
    queryFn: async () => {
      // For "following" tab, get posts from followed users only
      let followingIds: string[] | null = null;
      if (tab === 'following' && user) {
        const { data: follows } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        followingIds = follows?.map(f => f.following_id) || [];
        if (followingIds.length === 0) return [];
      }

      // Fetch shared recipes with linked recipe details (matching iOS pattern)
      let query = supabase
        .from('user_shared_recipes')
        .select(`
          *,
          recipe:recipes (
            id, title, description, image_url, image_urls,
            prep_time, cook_time, servings, difficulty
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (followingIds) {
        query = query.in('user_id', followingIds);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[Feed] Error:', error.message);
        return [];
      }
      if (!data?.length) return [];

      // Batch fetch user profiles (matching iOS pattern)
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, kitchen_name, handle, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Batch fetch like/save status for current user (matching iOS pattern)
      const recipeIds = data.map(r => r.id);
      const [likeData, saveData] = await Promise.all([
        user ? supabase.from('recipe_likes').select('shared_recipe_id').eq('user_id', user.id).in('shared_recipe_id', recipeIds) : { data: [] },
        user ? supabase.from('recipe_saves').select('shared_recipe_id').eq('user_id', user.id).in('shared_recipe_id', recipeIds) : { data: [] },
      ]);
      const likedIds = new Set((likeData.data || []).map((l: any) => l.shared_recipe_id));
      const savedIds = new Set((saveData.data || []).map((s: any) => s.shared_recipe_id));

      // Flatten recipe details onto the feed item for easy rendering
      return data.map(item => {
        const recipe = item.recipe;
        return {
          ...item,
          title: recipe?.title || item.caption || 'Shared Recipe',
          description: recipe?.description || item.caption,
          image_url: recipe?.image_url,
          image_urls: recipe?.image_urls,
          prep_time: recipe?.prep_time,
          cook_time: recipe?.cook_time,
          servings: recipe?.servings,
          difficulty: recipe?.difficulty,
          user_profiles: profileMap.get(item.user_id) || null,
          isLiked: likedIds.has(item.id),
          isSaved: savedIds.has(item.id),
        };
      });
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'foryou' | 'following')}>
        <TabsList className="w-full bg-secondary/30">
          <TabsTrigger value="foryou" className="flex-1">For You</TabsTrigger>
          <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feed content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/60 border-border/40">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : feedItems && feedItems.length > 0 ? (
        <div className="space-y-4">
          {feedItems.map((item: any) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyFeed tab={tab} />
      )}
    </div>
  );
}

function FeedCard({ item }: { item: any }) {
  const { user } = useCustomerAuth();
  const queryClient = useQueryClient();
  const profile = item.user_profiles;
  const [liked, setLiked] = useState(item.isLiked || false);
  const [likeCount, setLikeCount] = useState(item.like_count || 0);
  const [saved, setSaved] = useState(item.isSaved || false);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (liked) {
        await supabase.from('recipe_likes').delete()
          .eq('user_id', user.id).eq('shared_recipe_id', item.id);
        // Decrement count on shared recipe
        await supabase.from('user_shared_recipes').update({ like_count: Math.max(0, likeCount - 1) }).eq('id', item.id);
      } else {
        await supabase.from('recipe_likes').insert({ user_id: user.id, shared_recipe_id: item.id });
        await supabase.from('user_shared_recipes').update({ like_count: likeCount + 1 }).eq('id', item.id);
      }
    },
    onMutate: () => {
      // Optimistic update
      setLiked(!liked);
      setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);
    },
    onError: () => {
      setLiked(!liked);
      setLikeCount(liked ? likeCount + 1 : Math.max(0, likeCount - 1));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (saved) {
        await supabase.from('recipe_saves').delete()
          .eq('user_id', user.id).eq('shared_recipe_id', item.id);
      } else {
        await supabase.from('recipe_saves').insert({ user_id: user.id, shared_recipe_id: item.id });
      }
    },
    onMutate: () => { setSaved(!saved); },
    onError: () => { setSaved(!saved); },
    onSuccess: () => {
      toast.success(saved ? 'Removed from saved' : 'Saved to collection');
    },
  });

  return (
    <Card className="bg-card/60 border-border/40 overflow-hidden">
      <CardContent className="p-0">
        {/* Author */}
        <div className="flex items-center gap-3 p-4 pb-2">
          <Link to={`/app/user/${item.user_id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {profile?.display_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link to={`/app/user/${item.user_id}`} className="text-sm font-medium text-foreground hover:underline truncate block">
              {profile?.display_name || 'User'}
            </Link>
            {profile?.kitchen_name && (
              <p className="text-xs text-muted-foreground truncate">{profile.kitchen_name}</p>
            )}
          </div>
        </div>

        {/* Image */}
        {(item.image_url || item.image_urls?.[0]) && (
          <Link to={`/app/community/${item.id}`}>
            <div className="aspect-[4/3] bg-secondary/30 overflow-hidden">
              <img
                src={item.image_url || item.image_urls[0]}
                alt={item.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
        )}

        {/* Content */}
        <div className="p-4 space-y-2">
          <Link to={`/app/community/${item.id}`}>
            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
              {item.title}
            </h3>
          </Link>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          )}

          {/* Meta */}
          {(item.prep_time || item.cook_time || item.servings) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.prep_time && <span>Prep: {item.prep_time}m</span>}
              {item.cook_time && <span>Cook: {item.cook_time}m</span>}
              {item.servings && <span>Serves {item.servings}</span>}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="ghost" size="sm"
              className={`h-8 gap-1.5 ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
              onClick={() => likeMutation.mutate()}
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              <span className="text-xs">{likeCount}</span>
            </Button>
            <Link to={`/app/community/${item.id}`}>
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-primary gap-1.5">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{item.comment_count || 0}</span>
              </Button>
            </Link>
            <Button
              variant="ghost" size="sm"
              className={`h-8 gap-1.5 ml-auto ${saved ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
              onClick={() => saveMutation.mutate()}
            >
              <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyFeed({ tab }: { tab: string }) {
  return (
    <div className="py-16 text-center space-y-4">
      {tab === 'following' ? (
        <>
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">No posts yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Follow other users to see their recipes here</p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground">
            <Link to="/app/discover">Discover Users</Link>
          </Button>
        </>
      ) : (
        <>
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Welcome to KitchenSync</h3>
            <p className="text-sm text-muted-foreground mt-1">Discover recipes, connect with foodies, and share your creations</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline">
              <Link to="/app/explore">Explore Businesses</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground">
              <Link to="/app/recipes/new">Create Recipe</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
