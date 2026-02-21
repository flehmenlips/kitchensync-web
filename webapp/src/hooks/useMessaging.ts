import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  participants: ConversationParticipant[];
  unreadCount: number;
}

export interface ConversationParticipant {
  userId: string;
  role: string;
  lastReadAt: string;
  profile?: {
    displayName: string | null;
    avatarUrl: string | null;
    handle: string | null;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  content: string | null;
  messageType: string;
  mediaUrl: string | null;
  sharedContentId: string | null;
  sharedContentType: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender?: {
    displayName: string | null;
    avatarUrl: string | null;
  };
}

const KEYS = {
  conversations: ['conversations'] as const,
  messages: (convId: string) => ['messages', convId] as const,
};

async function batchProfiles(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, any>();
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, avatar_url, handle')
    .in('user_id', userIds);
  const map = new Map<string, any>();
  data?.forEach((p: any) => map.set(p.user_id, { displayName: p.display_name, avatarUrl: p.avatar_url, handle: p.handle }));
  return map;
}

export function useConversations() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.conversations,
    queryFn: async (): Promise<Conversation[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participations?.length) return [];

      const convIds = participations.map(p => p.conversation_id);
      const readMap = new Map(participations.map(p => [p.conversation_id, p.last_read_at]));

      const { data: convos } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('last_message_at', { ascending: false });

      if (!convos?.length) return [];

      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select('*')
        .in('conversation_id', convIds);

      const allUserIds = [...new Set((allParticipants || []).map((p: any) => p.user_id))];
      const profileMap = await batchProfiles(allUserIds);

      const { data: unreadCounts } = await supabase.rpc('get_unread_counts', { p_user_id: user.id }).catch(() => ({ data: null }));
      const unreadMap = new Map<string, number>();
      if (Array.isArray(unreadCounts)) {
        unreadCounts.forEach((r: any) => unreadMap.set(r.conversation_id, r.count));
      }

      return convos.map((c: any) => {
        const parts = (allParticipants || [])
          .filter((p: any) => p.conversation_id === c.id)
          .map((p: any) => ({
            userId: p.user_id,
            role: p.role,
            lastReadAt: p.last_read_at,
            profile: profileMap.get(p.user_id),
          }));

        const lastRead = readMap.get(c.id);
        const { count: unread } = (() => {
          if (!lastRead) return { count: 0 };
          return { count: unreadMap.get(c.id) ?? 0 };
        })();

        return {
          id: c.id,
          type: c.type,
          title: c.title,
          lastMessageAt: c.last_message_at,
          lastMessagePreview: c.last_message_preview,
          participants: parts,
          unreadCount: unread,
        };
      });
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        qc.invalidateQueries({ queryKey: KEYS.conversations });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}

export function useMessages(conversationId: string) {
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: KEYS.messages(conversationId),
    queryFn: async ({ pageParam }): Promise<{ items: Message[]; nextCursor: string | null }> => {
      let q = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (pageParam) q = q.lt('created_at', pageParam as string);

      const { data, error } = await q;
      if (error || !data?.length) return { items: [], nextCursor: null };

      const senderIds = [...new Set(data.filter(m => m.sender_id).map(m => m.sender_id!))];
      const profileMap = await batchProfiles(senderIds);

      const items: Message[] = data.map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        content: m.content,
        messageType: m.message_type,
        mediaUrl: m.media_url,
        sharedContentId: m.shared_content_id,
        sharedContentType: m.shared_content_type,
        isEdited: m.is_edited,
        isDeleted: m.is_deleted,
        createdAt: m.created_at,
        sender: m.sender_id ? profileMap.get(m.sender_id) : undefined,
      }));

      return {
        items,
        nextCursor: data.length === 30 ? data[data.length - 1].created_at : null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.messages(conversationId) });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  return query;
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, messageType = 'text' }: {
      conversationId: string;
      content: string;
      messageType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: KEYS.messages(conversationId) });
      qc.invalidateQueries({ queryKey: KEYS.conversations });
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ participantIds, initialMessage }: {
      participantIds: string[];
      initialMessage?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const allParticipants = [...new Set([user.id, ...participantIds])];

      if (allParticipants.length === 2) {
        const other = allParticipants.find(id => id !== user.id)!;
        const { data: existing } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (existing) {
          for (const e of existing) {
            const { data: otherPart } = await supabase
              .from('conversation_participants')
              .select('conversation_id')
              .eq('conversation_id', e.conversation_id)
              .eq('user_id', other)
              .single();

            if (otherPart) {
              const { data: conv } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', e.conversation_id)
                .eq('type', 'direct')
                .single();

              if (conv) return conv;
            }
          }
        }
      }

      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: allParticipants.length === 2 ? 'direct' : 'group',
          created_by: user.id,
        })
        .select()
        .single();

      if (convError || !conv) throw convError || new Error('Failed to create conversation');

      const participantRows = allParticipants.map(uid => ({
        conversation_id: conv.id,
        user_id: uid,
        role: uid === user.id ? 'admin' : 'member',
      }));

      await supabase.from('conversation_participants').insert(participantRows);

      if (initialMessage?.trim()) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: initialMessage.trim(),
          message_type: 'text',
        });
      }

      return conv;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.conversations });
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.conversations });
    },
  });
}
