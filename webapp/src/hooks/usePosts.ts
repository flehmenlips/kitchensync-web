import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Post, PostComment, CreatePostInput } from '@/types/posts';

const PAGE_SIZE = 10;

export const postKeys = {
  all: ['posts'] as const,
  explore: ['posts', 'explore'] as const,
  following: ['posts', 'following'] as const,
  user: (userId: string) => ['posts', 'user', userId] as const,
  business: (businessId: string) => ['posts', 'business', businessId] as const,
  single: (id: string) => ['posts', 'single', id] as const,
  comments: (postId: string) => ['posts', 'comments', postId] as const,
};

async function batchProfiles(userIds: string[]) {
  if (!userIds.length) return new Map<string, any>();
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, kitchen_name, handle, avatar_url')
    .in('user_id', userIds);
  const map = new Map<string, any>();
  data?.forEach(p => map.set(p.user_id, p));
  return map;
}

async function enrichPosts(rows: any[], userId?: string): Promise<Post[]> {
  if (!rows.length) return [];
  const uids = [...new Set(rows.map(r => r.user_id))];
  const profileMap = await batchProfiles(uids);

  const recipeIds = rows.filter(r => r.recipe_id).map(r => r.recipe_id!);
  const recipeMap = new Map<string, any>();
  if (recipeIds.length) {
    const { data } = await supabase.from('recipes').select('id, title, description, image_url').in('id', recipeIds);
    data?.forEach(r => recipeMap.set(r.id, r));
  }

  let likedIds = new Set<string>();
  let savedIds = new Set<string>();
  if (userId && rows.length) {
    const ids = rows.map(r => r.id);
    const [likes, saves] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', ids),
      supabase.from('post_saves').select('post_id').eq('user_id', userId).in('post_id', ids),
    ]);
    likedIds = new Set(likes.data?.map(l => l.post_id) ?? []);
    savedIds = new Set(saves.data?.map(s => s.post_id) ?? []);
  }

  return rows.map(row => ({
    ...row,
    media: row.media ?? [],
    tags: row.tags ?? [],
    author: profileMap.get(row.user_id),
    recipe: row.recipe_id ? recipeMap.get(row.recipe_id) ?? null : null,
    is_liked: likedIds.has(row.id),
    is_saved: savedIds.has(row.id),
  }));
}

async function fetchPostFeed(tab: string, userId?: string, cursor?: string) {
  let followingIds: string[] | null = null;
  if (tab === 'following' && userId) {
    const { data } = await supabase.from('user_follows').select('following_id').eq('follower_id', userId);
    followingIds = data?.map(f => f.following_id) ?? [];
    if (!followingIds.length) return { items: [], nextCursor: null };
  }

  let query = supabase
    .from('posts')
    .select('*')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (followingIds) query = query.in('user_id', followingIds);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error || !data?.length) return { items: [], nextCursor: null };

  const posts = await enrichPosts(data, userId);
  return {
    items: posts,
    nextCursor: data.length === PAGE_SIZE ? data[data.length - 1].created_at : null,
  };
}

export function usePostFeed(tab: 'explore' | 'following', userId?: string) {
  return useInfiniteQuery({
    queryKey: tab === 'explore' ? postKeys.explore : postKeys.following,
    queryFn: ({ pageParam }) => fetchPostFeed(tab, userId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: postKeys.single(postId ?? ''),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('posts').select('*').eq('id', postId!).single();
      if (error || !data) return null;
      const posts = await enrichPosts([data], user?.id);
      return posts[0] ?? null;
    },
    enabled: !!postId,
    staleTime: 60_000,
  });
}

export function usePostComments(postId: string) {
  return useInfiniteQuery({
    queryKey: postKeys.comments(postId),
    queryFn: async ({ pageParam }) => {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true })
        .limit(PAGE_SIZE);
      if (pageParam) query = query.gt('created_at', pageParam as string);
      const { data, error } = await query;
      if (error || !data?.length) return { items: [] as PostComment[], nextCursor: null };

      const uids = [...new Set(data.map(c => c.user_id))];
      const profileMap = await batchProfiles(uids);
      const comments: PostComment[] = data.map(c => ({ ...c, author: profileMap.get(c.user_id) }));
      return {
        items: comments,
        nextCursor: data.length === PAGE_SIZE ? data[data.length - 1].created_at : null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!postId,
    staleTime: 30_000,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: input.post_type,
          caption: input.caption?.trim() || null,
          body: input.body?.trim() || null,
          media: input.media ?? [],
          recipe_id: input.recipe_id ?? null,
          shared_recipe_id: input.shared_recipe_id ?? null,
          location_name: input.location_name ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          tags: input.tags ?? [],
          visibility: input.visibility ?? 'public',
          business_id: input.business_id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useTogglePostLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (liked) {
        await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', postId);
      } else {
        await supabase.from('post_likes').insert({ user_id: user.id, post_id: postId });
      }
      return !liked;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useTogglePostSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (saved) {
        await supabase.from('post_saves').delete().eq('user_id', user.id).eq('post_id', postId);
      } else {
        await supabase.from('post_saves').insert({ user_id: user.id, post_id: postId });
      }
      return !saved;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useCreatePostComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: user.id, content: content.trim() })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: postKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}
