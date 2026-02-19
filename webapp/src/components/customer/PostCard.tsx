import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MessageCircle,
  Bookmark,
  MapPin,
  Play,
  Image as ImageIcon,
  FileText,
  Megaphone,
  Store,
  Share2,
} from 'lucide-react';
import { useTogglePostLike, useTogglePostSave } from '@/hooks/usePosts';
import type { Post } from '@/types/posts';

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(date).toLocaleDateString();
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  photo: { icon: ImageIcon, label: 'Photo', color: 'text-blue-500' },
  video: { icon: Play, label: 'Video', color: 'text-violet-500' },
  recipe_share: { icon: null, label: 'Recipe', color: 'text-amber-500' },
  article: { icon: FileText, label: 'Article', color: 'text-emerald-500' },
  announcement: { icon: Megaphone, label: 'Announcement', color: 'text-red-500' },
  story: { icon: ImageIcon, label: 'Story', color: 'text-pink-500' },
};

export function PostCard({ post }: { post: Post }) {
  const toggleLike = useTogglePostLike();
  const toggleSave = useTogglePostSave();
  const [liked, setLiked] = useState(post.is_liked ?? false);
  const [saved, setSaved] = useState(post.is_saved ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count);

  const handleLike = () => {
    toggleLike.mutate({ postId: post.id, liked });
    setLiked(!liked);
    setLikeCount(prev => liked ? Math.max(0, prev - 1) : prev + 1);
  };

  const handleSave = () => {
    toggleSave.mutate({ postId: post.id, saved });
    setSaved(!saved);
  };

  const authorName = post.author?.display_name || post.author?.kitchen_name || 'Unknown';
  const initials = authorName.slice(0, 2).toUpperCase();
  const images = post.media.filter(m => m.type === 'image');
  const video = post.media.find(m => m.type === 'video');
  const tc = TYPE_CONFIG[post.post_type] ?? TYPE_CONFIG.photo;
  const TypeIcon = tc.icon;

  return (
    <Card className="bg-card/60 border-border/40 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 pb-2">
          <Link to={post.author ? `/app/user/${post.author.user_id}` : '#'}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.avatar_url ?? undefined} alt={authorName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={post.author ? `/app/user/${post.author.user_id}` : '#'}
                className="font-semibold text-sm hover:underline truncate"
              >
                {authorName}
              </Link>
              {post.business_id && (
                <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full">
                  <Store className="h-2.5 w-2.5" />
                  Business
                </span>
              )}
              {post.post_type !== 'photo' && TypeIcon && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] ${tc.color} bg-current/10 px-1.5 py-0.5 rounded-full`}>
                  <TypeIcon className="h-2.5 w-2.5" />
                  {tc.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{post.author?.handle ? `@${post.author.handle} · ` : ''}{timeAgo(post.created_at)}</span>
              {post.location_name && (
                <>
                  <span>·</span>
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{post.location_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Media */}
        {images.length > 0 && (
          <div className="relative">
            <img
              src={images[0].url}
              alt=""
              className="w-full aspect-[4/3] object-cover bg-muted"
            />
            {images.length > 1 && (
              <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                1/{images.length}
              </span>
            )}
          </div>
        )}
        {!images.length && video && (
          <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center">
            {video.thumbnail_url && (
              <img src={video.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="bg-white/20 rounded-full p-3 z-10">
              <Play className="h-8 w-8 text-white" fill="white" />
            </div>
          </div>
        )}
        {!images.length && !video && post.recipe?.image_url && (
          <img
            src={post.recipe.image_url}
            alt={post.recipe.title ?? ''}
            className="w-full aspect-[4/3] object-cover bg-muted"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-1">
          <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={handleLike}>
            <Heart
              className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : ''}`}
            />
            {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
          </Button>
          <Link to={`/app/post/${post.id}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 px-2">
              <MessageCircle className="h-5 w-5" />
              {post.comment_count > 0 && <span className="text-xs">{post.comment_count}</span>}
            </Button>
          </Link>
          {post.share_count > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5 px-2">
              <Share2 className="h-4 w-4" />
              <span className="text-xs">{post.share_count}</span>
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="px-2" onClick={handleSave}>
            <Bookmark className={`h-5 w-5 ${saved ? 'fill-primary text-primary' : ''}`} />
          </Button>
        </div>

        {/* Caption & Body */}
        <div className="px-4 pb-4">
          {post.post_type === 'recipe_share' && post.recipe && (
            <Link to={`/app/community/${post.shared_recipe_id}`} className="font-semibold text-sm hover:underline">
              {post.recipe.title}
            </Link>
          )}
          {post.caption && (
            <p className="text-sm mt-1">
              <span className="font-semibold">{authorName} </span>
              {post.caption}
            </p>
          )}
          {post.post_type === 'article' && post.body && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{post.body}</p>
          )}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs text-blue-500">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
