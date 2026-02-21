import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Loader2,
  Plus,
} from 'lucide-react';
import { usePostFeed } from '@/hooks/usePosts';
import { PostCard } from '@/components/customer/PostCard';
import { StoryRow } from '@/components/customer/StoryRow';
import { StoryViewer } from '@/components/customer/StoryViewer';
import { useActiveStories } from '@/hooks/useStories';
import type { StoryGroup } from '@/types/stories';
import type { Post } from '@/types/posts';

function formatTime(val: unknown): string {
  if (val == null || val === '') return '';
  const s = String(val);
  return /^\d+$/.test(s) ? `${s} min` : s;
}

const PAGE_SIZE = 10;

async function fetchFeedPage(tab: string, user: any, cursor?: string) {
  let followingIds: string[] | null = null;
  if (tab === 'following' && user) {
    const { data: follows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id);
    followingIds = follows?.map(f => f.following_id) || [];
    if (followingIds.length === 0) return { items: [], nextCursor: null };
  }

  // "For You" sorts by popularity, "Following" by recency
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
    .limit(PAGE_SIZE);

  // Both tabs paginate by created_at for stable cursor-based pagination.
  // "For You" uses a secondary sort by like_count within each page for variety,
  // but the cursor must match the primary sort column.
  query = query.order('created_at', { ascending: false });

  if (followingIds) {
    query = query.in('user_id', followingIds);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) {
    if (error.message?.includes('aborted') || (error as any).name === 'AbortError') throw error;
    return { items: [], nextCursor: null };
  }
  if (!data?.length) return { items: [], nextCursor: null };

  // Batch fetch profiles
  const userIds = [...new Set(data.map(r => r.user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, kitchen_name, handle, avatar_url')
    .in('user_id', userIds);
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  // Batch fetch like/save status
  const recipeIds = data.map(r => r.id);
  const [likeData, saveData] = await Promise.all([
    user ? supabase.from('recipe_likes').select('shared_recipe_id').eq('user_id', user.id).in('shared_recipe_id', recipeIds) : { data: [] },
    user ? supabase.from('recipe_saves').select('shared_recipe_id').eq('user_id', user.id).in('shared_recipe_id', recipeIds) : { data: [] },
  ]);
  const likedIds = new Set((likeData.data || []).map((l: any) => l.shared_recipe_id));
  const savedIds = new Set((saveData.data || []).map((s: any) => s.shared_recipe_id));

  let items = data.map(item => {
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

  // "For You": sort each page by popularity client-side
  if (tab === 'foryou') {
    items.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
  }

  const nextCursor = data.length === PAGE_SIZE ? data[data.length - 1].created_at : null;
  return { items, nextCursor };
}

export function FeedPage() {
  const { user } = useCustomerAuth();
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyGroupIndex, setStoryGroupIndex] = useState(0);
  const { data: storyGroups = [] } = useActiveStories();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed', tab, user?.id],
    queryFn: ({ pageParam }) => fetchFeedPage(tab, user, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!user,
  });

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const feedItems = data?.pages.flatMap(p => p.items) || [];

  // Posts feed
  const { data: postData } = usePostFeed(tab === 'foryou' ? 'explore' : 'following', user?.id);
  const postItems: Post[] = postData?.pages.flatMap(p => p.items) ?? [];
  const nonRecipePosts = postItems.filter(p => p.post_type !== 'recipe_share');

  // Merge recipe feed items and posts into a unified timeline
  type UnifiedItem = { kind: 'recipe'; data: any } | { kind: 'post'; data: Post };
  const unified: UnifiedItem[] = [
    ...feedItems.map((r: any) => ({ kind: 'recipe' as const, data: r })),
    ...nonRecipePosts.map(p => ({ kind: 'post' as const, data: p })),
  ].sort((a, b) => {
    const aTime = new Date(a.data.created_at).getTime();
    const bTime = new Date(b.data.created_at).getTime();
    return bTime - aTime;
  });

  const handleStoryClick = (group: StoryGroup, idx: number) => {
    const allIdx = storyGroups.findIndex(g => g.user_id === group.user_id && g.business_id === group.business_id);
    setStoryGroupIndex(allIdx >= 0 ? allIdx : idx);
    setStoryViewerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Stories row */}
      <StoryRow onStoryClick={handleStoryClick} />

      {/* Story viewer overlay */}
      {storyViewerOpen && storyGroups.length > 0 && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={storyGroupIndex}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'foryou' | 'following')} className="flex-1">
          <TabsList className="w-full bg-secondary/30">
            <TabsTrigger value="foryou" className="flex-1">For You</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
          </TabsList>
        </Tabs>
        <Link to="/app/create-post" className="ml-3">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Post
          </Button>
        </Link>
      </div>

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
      ) : unified.length > 0 ? (
        <div className="space-y-4">
          {unified.map(item =>
            item.kind === 'recipe' ? (
              <FeedCard key={`recipe-${item.data.id}`} item={item.data} />
            ) : (
              <PostCard key={`post-${item.data.id}`} post={item.data} />
            )
          )}
          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="py-4 text-center">
            {isFetchingNextPage && (
              <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
            )}
          </div>
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

  // Sync local state when props change (e.g. feed refetch)
  useEffect(() => { setLiked(item.isLiked || false); }, [item.isLiked]);
  useEffect(() => { setLikeCount(item.like_count || 0); }, [item.like_count]);
  useEffect(() => { setSaved(item.isSaved || false); }, [item.isSaved]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (liked) {
        await supabase.from('recipe_likes').delete()
          .eq('user_id', user.id).eq('shared_recipe_id', item.id);
        // Use actual count from server to avoid drift
        const { data: fresh } = await supabase.from('user_shared_recipes').select('like_count').eq('id', item.id).single();
        const serverCount = fresh?.like_count ?? likeCount;
        await supabase.from('user_shared_recipes').update({ like_count: Math.max(0, serverCount - 1) }).eq('id', item.id);
      } else {
        await supabase.from('recipe_likes').insert({ user_id: user.id, shared_recipe_id: item.id });
        const { data: fresh } = await supabase.from('user_shared_recipes').select('like_count').eq('id', item.id).single();
        const serverCount = fresh?.like_count ?? likeCount;
        await supabase.from('user_shared_recipes').update({ like_count: serverCount + 1 }).eq('id', item.id);
      }
    },
    onMutate: () => {
      const prevLiked = liked;
      const prevCount = likeCount;
      setLiked(!liked);
      setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);
      return { prevLiked, prevCount };
    },
    onError: (_err: unknown, _vars: unknown, context: { prevLiked: boolean; prevCount: number } | undefined) => {
      if (context) {
        setLiked(context.prevLiked);
        setLikeCount(context.prevCount);
      }
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
    onMutate: () => {
      const wasSaved = saved;
      setSaved(!saved);
      return { wasSaved };
    },
    onError: (_err: unknown, _vars: unknown, context: { wasSaved: boolean } | undefined) => {
      if (context) setSaved(context.wasSaved);
    },
    onSuccess: (_data: unknown, _vars: unknown, context: { wasSaved: boolean } | undefined) => {
      toast.success(context?.wasSaved ? 'Removed from saved' : 'Saved to collection');
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
              {item.prep_time && <span>Prep: {formatTime(item.prep_time)}</span>}
              {item.cook_time && <span>Cook: {formatTime(item.cook_time)}</span>}
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
