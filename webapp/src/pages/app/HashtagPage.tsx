import { useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { PostCard } from '@/components/customer/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Hash, Loader2 } from 'lucide-react';
import type { Post } from '@/types/posts';
import { useEffect, useRef } from 'react';

const PAGE_SIZE = 15;

async function batchProfiles(ids: string[]) {
  if (!ids.length) return new Map<string, any>();
  const { data } = await supabase.from('user_profiles').select('user_id, display_name, avatar_url, handle').in('user_id', ids);
  return new Map((data || []).map((p: any) => [p.user_id, p]));
}

export function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const { user } = useCustomerAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['hashtag-posts', tag],
    queryFn: async ({ pageParam }): Promise<{ items: Post[]; nextCursor: string | null }> => {
      const { data: postHashtags } = await supabase
        .from('post_hashtags')
        .select('post_id')
        .eq('hashtag_id', (
          await supabase.from('hashtags').select('id').eq('name', tag).single()
        ).data?.id ?? '');

      if (!postHashtags?.length) return { items: [], nextCursor: null };

      const postIds = postHashtags.map(ph => ph.post_id);

      let query = supabase
        .from('posts')
        .select('*')
        .in('id', postIds)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) query = query.lt('created_at', pageParam as string);

      const { data: posts, error } = await query;
      if (error || !posts?.length) return { items: [], nextCursor: null };

      const userIds = [...new Set(posts.map(p => p.user_id))];
      const profileMap = await batchProfiles(userIds);

      let likedIds = new Set<string>();
      let savedIds = new Set<string>();
      if (user) {
        const ids = posts.map(p => p.id);
        const [likes, saves] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', ids),
          supabase.from('post_saves').select('post_id').eq('user_id', user.id).in('post_id', ids),
        ]);
        likes.data?.forEach((l: any) => likedIds.add(l.post_id));
        saves.data?.forEach((s: any) => savedIds.add(s.post_id));
      }

      const items: Post[] = posts.map((p: any) => ({
        ...p,
        author: profileMap.get(p.user_id) || null,
        is_liked: likedIds.has(p.id),
        is_saved: savedIds.has(p.id),
      }));

      return {
        items,
        nextCursor: posts.length === PAGE_SIZE ? posts[posts.length - 1].created_at : null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!tag,
  });

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap(p => p.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Hash className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">#{tag}</h1>
          <p className="text-sm text-muted-foreground">{posts.length} posts</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/60">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center">
          <Hash className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No posts with #{tag}</h3>
          <p className="text-sm text-muted-foreground mt-1">Be the first to post with this hashtag!</p>
        </div>
      )}
    </div>
  );
}
