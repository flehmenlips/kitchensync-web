import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Megaphone,
  Image as ImageIcon,
  FileText,
  Heart,
  MessageCircle,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Post } from '@/types/posts';

const TYPE_ICONS: Record<string, any> = {
  photo: ImageIcon,
  video: ImageIcon,
  article: FileText,
  announcement: Megaphone,
  story: ImageIcon,
};

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export function BusinessPostsPage() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['business-posts', business?.id],
    queryFn: async () => {
      if (!business) return [];
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Post[];
    },
    enabled: !!business?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-posts', business?.id] });
      toast.success('Post deleted');
    },
    onError: () => toast.error('Failed to delete post'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-sm text-muted-foreground">Manage your business posts and announcements</p>
        </div>
        <Button asChild>
          <Link to={`/app/create-post?businessId=${business?.id}&businessName=${encodeURIComponent(business?.businessName ?? '')}`}>
            <Plus className="h-4 w-4 mr-2" /> New Post
          </Link>
        </Button>
      </div>

      {!posts?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No posts yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Share announcements, specials, and behind-the-scenes content with your followers
            </p>
            <Button asChild>
              <Link to={`/app/create-post?businessId=${business?.id}&businessName=${encodeURIComponent(business?.businessName ?? '')}`}>
                Create Your First Post
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const Icon = TYPE_ICONS[post.post_type] ?? ImageIcon;
            return (
              <Card key={post.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="flex items-center gap-4 py-4">
                  {post.media?.[0]?.url ? (
                    <img src={post.media[0].url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{post.post_type}</Badge>
                      <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{post.caption || post.body || 'No caption'}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.like_count}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comment_count}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.view_count}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(post.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
