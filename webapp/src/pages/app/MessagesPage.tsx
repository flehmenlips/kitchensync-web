import { useState, useRef, useEffect } from 'react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Plus,
  Search,
  Check,
  CheckCheck,
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { supabase } from '@/lib/supabase';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useCreateConversation,
  useMarkConversationRead,
  type Conversation,
  type Message,
} from '@/hooks/useMessaging';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function MessagesPage() {
  const { user } = useCustomerAuth();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [initialMsg, setInitialMsg] = useState('');

  const { data: conversations = [], isLoading: convsLoading } = useConversations();
  const createConversation = useCreateConversation();

  const { data: searchResults } = useQuery({
    queryKey: ['search-users-msg', searchUser],
    queryFn: async () => {
      if (!searchUser.trim()) return [];
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url, handle')
        .or(`display_name.ilike.%${searchUser}%,handle.ilike.%${searchUser}%`)
        .neq('user_id', user?.id ?? '')
        .limit(10);
      return data || [];
    },
    enabled: searchUser.length >= 2,
  });

  const handleStartChat = async () => {
    if (!selectedUserId) return;
    try {
      const conv = await createConversation.mutateAsync({
        participantIds: [selectedUserId],
        initialMessage: initialMsg.trim() || undefined,
      });
      setSelectedConvId(conv.id);
      setIsNewChatOpen(false);
      setSearchUser('');
      setSelectedUserId(null);
      setInitialMsg('');
    } catch {
      // handle error
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find(p => p.userId !== user?.id);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Conversation List */}
      <div className={cn(
        'w-full md:w-80 border-r border-border/50 flex flex-col',
        selectedConvId ? 'hidden md:flex' : 'flex'
      )}>
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Messages</h2>
          <Button size="icon" variant="ghost" onClick={() => setIsNewChatOpen(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {convsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <Button size="sm" className="mt-3" onClick={() => setIsNewChatOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Start a chat
              </Button>
            </div>
          ) : (
            <div>
              {conversations.map(conv => {
                const other = getOtherParticipant(conv);
                const name = conv.title || other?.profile?.displayName || 'Chat';
                const isSelected = selectedConvId === conv.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn(
                      'w-full text-left p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors',
                      isSelected && 'bg-primary/5 border-l-2 border-primary'
                    )}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={other?.profile?.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(name[0] ?? 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground truncate">{name}</p>
                        <span className="text-[10px] text-muted-foreground">{formatMessageTime(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessagePreview || 'No messages'}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat View */}
      {selectedConvId ? (
        <ChatView
          conversationId={selectedConvId}
          conversation={conversations.find(c => c.id === selectedConvId)}
          currentUserId={user?.id ?? ''}
          onBack={() => setSelectedConvId(null)}
        />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Select a conversation</h3>
            <p className="text-sm text-muted-foreground mt-1">Choose from your existing chats or start a new one</p>
          </div>
        </div>
      )}

      {/* New Chat Dialog */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for a user..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchResults && searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {searchResults.map((u: any) => (
                  <button
                    key={u.user_id}
                    onClick={() => setSelectedUserId(u.user_id)}
                    className={cn(
                      'w-full text-left p-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors',
                      selectedUserId === u.user_id && 'bg-primary/10'
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback>{(u.display_name?.[0] ?? 'U').toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.display_name || u.handle}</p>
                      {u.handle && <p className="text-xs text-muted-foreground">@{u.handle}</p>}
                    </div>
                    {selectedUserId === u.user_id && <Check className="h-4 w-4 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            )}
            {selectedUserId && (
              <Input
                placeholder="Type a message (optional)..."
                value={initialMsg}
                onChange={(e) => setInitialMsg(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewChatOpen(false)}>Cancel</Button>
            <Button onClick={handleStartChat} disabled={!selectedUserId || createConversation.isPending}>
              {createConversation.isPending ? 'Creating...' : 'Start Chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChatView({ conversationId, conversation, currentUserId, onBack }: {
  conversationId: string;
  conversation?: Conversation;
  currentUserId: string;
  onBack: () => void;
}) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messagesData, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  const messages = messagesData?.pages.flatMap(p => p.items).reverse() ?? [];

  const other = conversation?.participants.find(p => p.userId !== currentUserId);
  const chatName = conversation?.title || other?.profile?.displayName || 'Chat';

  useEffect(() => {
    markRead.mutate(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate({ conversationId, content: text.trim() });
    setText('');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat header */}
      <div className="p-3 border-b border-border/50 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={other?.profile?.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {(chatName[0] ?? 'U').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm text-foreground">{chatName}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-48" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div className={cn('flex items-end gap-2 max-w-[70%]', isMine && 'flex-row-reverse')}>
                  {!isMine && (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={msg.sender?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {(msg.sender?.displayName?.[0] ?? 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div className={cn(
                      'px-3 py-2 rounded-2xl text-sm',
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary/50 text-foreground rounded-bl-sm'
                    )}>
                      {msg.isDeleted ? (
                        <span className="italic text-muted-foreground">Message deleted</span>
                      ) : (
                        msg.content
                      )}
                    </div>
                    <p className={cn('text-[10px] text-muted-foreground mt-0.5', isMine ? 'text-right' : 'text-left')}>
                      {format(new Date(msg.createdAt), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!text.trim() || sendMessage.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
