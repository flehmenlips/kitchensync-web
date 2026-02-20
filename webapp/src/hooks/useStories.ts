import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Story, StoryWithAuthor, StoryGroup } from '../types/stories';

export const STORY_KEYS = {
  all: ['stories'] as const,
  active: ['stories', 'active'] as const,
  user: (userId: string) => ['stories', 'user', userId] as const,
  highlights: (userId: string) => ['stories', 'highlights', userId] as const,
};

async function fetchActiveStories(): Promise<StoryGroup[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .eq('is_highlight', false)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return [];

  const rows = data as Story[];
  const userIds = [...new Set(rows.map(r => r.user_id))];
  const profileMap = new Map<string, Record<string, unknown>>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, kitchen_name, handle, avatar_url')
      .in('user_id', userIds);
    profiles?.forEach((p: any) => profileMap.set(p.user_id, p));
  }

  const businessIds = [...new Set(rows.filter(r => r.business_id).map(r => r.business_id!))];
  const businessMap = new Map<string, string>();
  if (businessIds.length > 0) {
    const { data: businesses } = await supabase
      .from('business_accounts')
      .select('id, business_name')
      .in('id', businessIds);
    businesses?.forEach((b: any) => businessMap.set(b.id, b.business_name));
  }

  const viewedIds = new Set<string>();
  if (user) {
    const storyIds = rows.map(r => r.id);
    const { data: views } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', user.id)
      .in('story_id', storyIds);
    views?.forEach((v: any) => viewedIds.add(v.story_id));
  }

  const groupMap = new Map<string, StoryGroup>();
  for (const row of rows) {
    const groupKey = row.business_id ?? row.user_id;
    const profile = profileMap.get(row.user_id) as any;
    const author = profile ?? { user_id: row.user_id, display_name: null, kitchen_name: null, handle: null, avatar_url: null };
    const story: StoryWithAuthor = {
      ...row,
      author,
      is_viewed: viewedIds.has(row.id),
      business_name: row.business_id ? businessMap.get(row.business_id) ?? null : null,
    };

    if (groupMap.has(groupKey)) {
      const group = groupMap.get(groupKey)!;
      group.stories.push(story);
      if (!story.is_viewed) group.has_unviewed = true;
    } else {
      groupMap.set(groupKey, {
        user_id: row.user_id,
        business_id: row.business_id,
        author,
        business_name: row.business_id ? businessMap.get(row.business_id) ?? null : null,
        stories: [story],
        has_unviewed: !story.is_viewed,
        latest_at: row.created_at,
      });
    }
  }

  const groups = Array.from(groupMap.values());
  groups.sort((a, b) => {
    if (a.has_unviewed && !b.has_unviewed) return -1;
    if (!a.has_unviewed && b.has_unviewed) return 1;
    return new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime();
  });

  return groups;
}

export function useActiveStories() {
  return useQuery<StoryGroup[]>({
    queryKey: STORY_KEYS.active,
    queryFn: fetchActiveStories,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useMarkStoryViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('story_views')
        .upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: 'story_id,viewer_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORY_KEYS.active });
    },
  });
}
