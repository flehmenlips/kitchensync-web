import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Bookmark,
  MapPin,
  Send,
  Trash2,
} from 'lucide-react';
import {
  usePost,
  usePostComments,
  useTogglePostLike,
  useTogglePostSave,
  useCreatePostComment,
  useDeletePost,
} from '@/hooks/usePosts';
import { PostImageCarousel } from '@/components/customer/PostImageCarousel';

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(date).toLocaleDateString();
}

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading } = usePost(id);
  const { data: commentsPages } = usePostComments(id ?? '');
  const toggleLike = useTogglePostLike();
  const toggleSave = useTogglePostSave();
  const createComment = useCreatePostComment();
  const deletePostMutation = useDeletePost();

  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (post && !synced) {
      setLikeCount(post.like_count);
      setLiked(post.is_liked ?? false);
      setSaved(post.is_saved ?? false);
      setSynced(true);
    }
  }, [post, synced]);

  const handleLike = () => {
    if (!post) return;
    toggleLike.mutate({ postId: post.id, liked });
    setLiked(!liked);
    setLikeCount(prev => liked ? Math.max(0, prev - 1) : prev + 1);
  };

  const handleSave = () => {
    if (!post) return;
    toggleSave.mutate({ postId: post.id, saved });
    setSaved(!saved);
  };

  const handleComment = () => {
    if (!post || !commentText.trim()) return;
    createComment.mutate({ postId: post.id, content: commentText.trim() });
    setCommentText('');
  };

  const comments = commentsPages?.pages.flatMap(p => p.items) ?? [];
  const images = post?.media.filter(m => m.type === 'image') ?? [];
  const video = post?.media.find(m => m.type === 'video');

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Post not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const authorName = post.author?.display_name || post.author?.kitchen_name || 'Unknown';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Post</h1>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Author */}
          <div className="flex items-center gap-3 p-4">
            <Link to={post.author ? `/app/user/${post.author.user_id}` : '#'}>
              <Avatar className="h-11 w-11">
                <AvatarImage src={post.author?.avatar_url ?? undefined} />
                <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <Link to={post.author ? `/app/user/${post.author.user_id}` : '#'} className="font-semibold hover:underline">
                {authorName}
              </Link>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span>{post.author?.handle ? `@${post.author.handle} · ` : ''}{timeAgo(post.created_at)}</span>
                {post.location_name && (
                  <>
                    <span>·</span>
                    <MapPin className="h-3 w-3" />
                    <span>{post.location_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Media */}
          {images.length > 0 && (
            <PostImageCarousel images={images} />
          )}
          {!images.length && video && (
            <div className="w-full aspect-[4/3] bg-black">
              <video
                src={video.url}
                poster={video.thumbnail_url ?? undefined}
                controls
                preload="metadata"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-1">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleLike}>
              <Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <MessageCircle className="h-5 w-5" />
              {post.comment_count > 0 && <span className="text-xs">{post.comment_count}</span>}
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={handleSave}>
              <Bookmark className={`h-5 w-5 ${saved ? 'fill-primary text-primary' : ''}`} />
            </Button>
          </div>

          {/* Caption */}
          <div className="px-4 pb-4">
            {post.caption && (
              <p className="text-sm"><span className="font-semibold">{authorName} </span>{post.caption}</p>
            )}
            {post.body && <p className="text-sm text-muted-foreground mt-2">{post.body}</p>}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map(tag => <span key={tag} className="text-xs text-blue-500">#{tag}</span>)}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="border-t">
            {comments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No comments yet</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-3 px-4 py-3 border-b last:border-b-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author?.avatar_url ?? undefined} />
                    <AvatarFallback>{(comment.author?.display_name ?? 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{comment.author?.display_name ?? 'User'} </span>
                      {comment.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(comment.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="flex gap-2 p-4 border-t">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              className="flex-1"
            />
            {commentText.trim() && (
              <Button size="icon" variant="ghost" onClick={handleComment}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
