import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Trash2,
  Eye,
  Star,
  StarOff,
  Image as ImageIcon,
  FileText,
  Megaphone,
  Play,
  Loader2,
  Filter,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Post } from '@/types/posts';

const TYPE_ICONS: Record<string, any> = {
  photo: ImageIcon,
  video: Play,
  article: FileText,
  announcement: Megaphone,
  recipe_share: ImageIcon,
  story: ImageIcon,
};

function timeAgo(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export function PostModerationPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-posts', typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('post_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Batch fetch author profiles
      const userIds = [...new Set((data ?? []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, handle, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

      return (data ?? []).map(p => ({
        ...p,
        media: p.media ?? [],
        tags: p.tags ?? [],
        author: profileMap.get(p.user_id),
      })) as Post[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success('Post deleted');
    },
    onError: () => toast.error('Failed to delete post'),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ postId, featured }: { postId: string; featured: boolean }) => {
      const { error } = await supabase.from('posts').update({ is_featured: !featured }).eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success('Updated');
    },
  });

  const filteredPosts = (posts ?? []).filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.caption?.toLowerCase().includes(q) ||
      p.body?.toLowerCase().includes(q) ||
      p.author?.display_name?.toLowerCase().includes(q) ||
      p.author?.handle?.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post Moderation</h1>
        <p className="text-sm text-muted-foreground">Review and moderate user and business posts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['photo', 'video', 'article', 'announcement'].map(type => {
          const count = (posts ?? []).filter(p => p.post_type === type).length;
          const Icon = TYPE_ICONS[type] ?? ImageIcon;
          return (
            <Card key={type}>
              <CardContent className="flex items-center gap-3 py-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{type}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts by caption, author, or tag..."
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="photo">Photos</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="article">Articles</SelectItem>
            <SelectItem value="announcement">Announcements</SelectItem>
            <SelectItem value="recipe_share">Recipe Shares</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Author</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map(post => {
                const Icon = TYPE_ICONS[post.post_type] ?? ImageIcon;
                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      {post.media?.[0]?.url ? (
                        <img src={post.media[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={post.author?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(post.author?.display_name ?? 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <p className="font-medium truncate max-w-[120px]">{post.author?.display_name ?? 'Unknown'}</p>
                          {post.author?.handle && (
                            <p className="text-xs text-muted-foreground">@{post.author.handle}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{post.post_type}</Badge>
                      {post.is_featured && <Badge className="ml-1 text-[10px] bg-yellow-500">Featured</Badge>}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm truncate">{post.caption || post.body || '—'}</p>
                      {post.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {post.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] text-blue-500">#{t}</span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {post.like_count}L · {post.comment_count}C · {post.view_count}V
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {timeAgo(post.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={post.is_featured ? 'Remove from featured' : 'Feature this post'}
                          onClick={() => toggleFeaturedMutation.mutate({ postId: post.id, featured: post.is_featured })}
                        >
                          {post.is_featured ? <StarOff className="h-4 w-4 text-yellow-500" /> : <Star className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete post"
                          onClick={() => deleteMutation.mutate(post.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredPosts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No posts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
